import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { performance } from 'perf_hooks';
import winston from 'winston';

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

// Uniqueness tracking (in-memory for demonstration)
const processedTransactionIds = new Set<string>();

interface TransactionIdValidationOptions {
  required?: boolean;
  generateIfMissing?: boolean;
  headerName?: string;
  maxLatency?: number;
}

const DEFAULT_OPTIONS: TransactionIdValidationOptions = {
  required: true,
  generateIfMissing: true,
  headerName: 'X-Transaction-ID',
  maxLatency: 100 // ms
};

interface TransactionMetadata {
  timestamp: number;
  method: string;
  path: string;
  ipAddress: string;
}

/**
 * Middleware for robust transaction ID validation
 * @param options Configuration for transaction ID validation
 * @returns Express middleware function
 */
export const transactionIdMiddleware = (
  options: TransactionIdValidationOptions = {}
) => {
  const config = { ...DEFAULT_OPTIONS, ...options };

  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = performance.now();

    // Extract or generate transaction ID
    const transactionId = (req.headers[config.headerName.toLowerCase()] as string) 
      || (config.generateIfMissing ? uuidv4() : null);

    // Validate transaction ID is present if required
    if (config.required && !transactionId) {
      return res.status(400).json({
        error: 'Transaction Validation Failed',
        message: `Missing required ${config.headerName} header`
      });
    }

    // Validate UUID v4 format
    if (transactionId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      
      if (!uuidRegex.test(transactionId)) {
        return res.status(400).json({
          error: 'Transaction Validation Failed',
          message: 'Invalid transaction ID format'
        });
      }

      // Check for transaction ID uniqueness
      if (processedTransactionIds.has(transactionId)) {
        const metadata: TransactionMetadata = {
          timestamp: Date.now(),
          method: req.method,
          path: req.path,
          ipAddress: req.ip
        };

        logger.warn('Duplicate Transaction ID Detected', {
          transactionId,
          metadata
        });

        return res.status(409).json({
          error: 'Transaction Conflict',
          message: 'Transaction ID has already been processed'
        });
      }

      // Mark transaction ID as processed
      processedTransactionIds.add(transactionId);
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

// Utility to clear processed transaction IDs (for testing/cleanup)
export const clearProcessedTransactionIds = () => {
  processedTransactionIds.clear();
};