import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { performance } from 'perf_hooks';
import winston from 'winston';
import { 
  ITransactionUniquenessService, 
  InMemoryTransactionUniquenessService 
} from '../services/transaction-uniqueness/interfaces';

// Create a logger for transaction ID tracking
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'transaction-id.log' })
  ]
});

interface TransactionIdValidationOptions {
  required?: boolean;
  generateIfMissing?: boolean;
  headerName?: string;
  maxLatency?: number;
  uniquenessService?: ITransactionUniquenessService;
}

const DEFAULT_OPTIONS: TransactionIdValidationOptions = {
  required: true,
  generateIfMissing: true,
  headerName: 'X-Transaction-ID',
  maxLatency: 100, // ms
  uniquenessService: new InMemoryTransactionUniquenessService()
};

/**
 * Middleware for robust transaction ID validation
 * @param options Configuration for transaction ID validation
 * @returns Express middleware function
 */
export const transactionIdMiddleware = (
  options: TransactionIdValidationOptions = {}
) => {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const uniquenessService = config.uniquenessService;

  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = performance.now();

    // Extract or generate transaction ID
    const transactionId = (req.headers[config.headerName.toLowerCase()] as string) 
      || (config.generateIfMissing ? uuidv4() : null);

    // Validate transaction ID is present if required
    if (config.required && !transactionId) {
      logger.warn('Transaction ID validation failed: Missing transaction ID', {
        method: req.method,
        path: req.path
      });

      return res.status(400).json({
        error: 'Transaction Validation Failed',
        message: `Missing required ${config.headerName} header`
      });
    }

    // Validate UUID v4 format
    if (transactionId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      
      if (!uuidRegex.test(transactionId)) {
        logger.warn('Transaction ID validation failed: Invalid format', {
          transactionId,
          method: req.method,
          path: req.path
        });

        return res.status(400).json({
          error: 'Transaction Validation Failed',
          message: 'Invalid transaction ID format'
        });
      }

      // Check transaction uniqueness
      try {
        const isUnique = await uniquenessService.isUnique({
          id: transactionId,
          timestamp: Date.now(),
          metadata: {
            method: req.method,
            path: req.path,
            ipAddress: req.ip
          }
        });

        if (!isUnique) {
          logger.warn('Duplicate transaction ID detected', {
            transactionId,
            method: req.method,
            path: req.path
          });

          return res.status(409).json({
            error: 'Transaction Conflict',
            message: 'Transaction ID has already been processed'
          });
        }

        // Mark transaction as processed
        await uniquenessService.markProcessed({
          id: transactionId,
          timestamp: Date.now(),
          metadata: {
            method: req.method,
            path: req.path,
            ipAddress: req.ip
          }
        });
      } catch (error) {
        logger.error('Transaction uniqueness check failed', {
          error: error.message,
          transactionId
        });

        return res.status(500).json({
          error: 'Transaction Validation Error',
          message: 'Unable to validate transaction uniqueness'
        });
      }
    }

    // Performance check
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    
    if (processingTime > config.maxLatency) {
      logger.warn('Transaction ID Validation Exceeded Latency Threshold', {
        processingTime,
        maxLatency: config.maxLatency
      });
    }

    // Attach transaction metadata
    req['transactionId'] = transactionId;
    req['transactionMetadata'] = {
      id: transactionId,
      receivedAt: new Date(),
      processingTime
    };

    // Log successful transaction ID validation
    logger.info('Transaction ID Validated', {
      transactionId,
      method: req.method,
      path: req.path
    });

    next();
  };
};