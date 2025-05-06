import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

interface TransactionIdValidationOptions {
  // Optional configuration for transaction ID validation
  required?: boolean;
  generateIfMissing?: boolean;
  headerName?: string;
}

const DEFAULT_OPTIONS: TransactionIdValidationOptions = {
  required: true,
  generateIfMissing: true,
  headerName: 'X-Transaction-ID'
};

/**
 * Middleware for validating and managing transaction IDs
 * @param options Configuration options for transaction ID validation
 * @returns Express middleware function
 */
export const transactionIdMiddleware = (
  options: TransactionIdValidationOptions = {}
) => {
  const config = { ...DEFAULT_OPTIONS, ...options };

  return (req: Request, res: Response, next: NextFunction) => {
    const transactionId = req.headers[config.headerName.toLowerCase()];

    // Check if transaction ID is required but missing
    if (config.required && !transactionId) {
      if (config.generateIfMissing) {
        // Generate a new transaction ID if configured to do so
        req.headers[config.headerName.toLowerCase()] = uuidv4();
      } else {
        // Reject the request if no transaction ID is provided
        return res.status(400).json({
          error: 'Transaction ID is required',
          message: `Missing ${config.headerName} header`
        });
      }
    }

    // Validate transaction ID format (UUID v4)
    if (transactionId && typeof transactionId === 'string') {
      try {
        // Validate UUID v4 format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        
        if (!uuidRegex.test(transactionId)) {
          return res.status(400).json({
            error: 'Invalid Transaction ID',
            message: 'Transaction ID must be a valid UUID v4'
          });
        }
      } catch {
        return res.status(400).json({
          error: 'Invalid Transaction ID',
          message: 'Transaction ID is malformed'
        });
      }
    }

    // Attach transaction ID to req object for further use
    req['transactionId'] = req.headers[config.headerName.toLowerCase()];

    next();
  };
};