import { Request, Response, NextFunction } from 'express';
import { transactionIdMiddleware, clearProcessedTransactionIds } from '../../src/middleware/transaction-id-validation';
import { v4 as uuidv4 } from 'uuid';

describe('Transaction ID Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    // Clear processed transaction IDs before each test
    clearProcessedTransactionIds();

    mockReq = {
      headers: {},
      method: 'GET',
      path: '/test',
      ip: '127.0.0.1'
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('Basic Validation', () => {
    it('should reject request when no transaction ID is provided and required', () => {
      const middleware = transactionIdMiddleware();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Transaction Validation Failed'
      }));
    });

    it('should generate transaction ID when configured to do so', () => {
      const middleware = transactionIdMiddleware({ generateIfMissing: true });
      
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.headers['x-transaction-id']).toBeTruthy();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Uniqueness Handling', () => {
    it('should reject duplicate transaction IDs', () => {
      const middleware = transactionIdMiddleware();
      const uniqueId = uuidv4();

      // First request with transaction ID
      mockReq.headers = { 'x-transaction-id': uniqueId };
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Reset mocks
      mockRes.status = jest.fn().mockReturnThis();
      mockRes.json = jest.fn();
      mockNext = jest.fn();

      // Second request with same transaction ID
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Transaction Conflict'
      }));
    });
  });

  describe('Format Validation', () => {
    it('should reject malformed transaction ID', () => {
      const middleware = transactionIdMiddleware();
      const invalidUuid = 'not-a-valid-uuid';
      mockReq.headers = { 'x-transaction-id': invalidUuid };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Transaction Validation Failed'
      }));
    });
  });

  describe('Performance and Metadata', () => {
    it('should attach transaction metadata to request', () => {
      const middleware = transactionIdMiddleware({ generateIfMissing: true });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq['transactionId']).toBeTruthy();
      expect(mockReq['transactionMetadata']).toEqual(expect.objectContaining({
        id: expect.any(String),
        receivedAt: expect.any(Date),
        processingTime: expect.any(Number)
      }));
    });

    it('should work with custom header name', () => {
      const customHeaderName = 'X-Custom-Transaction-ID';
      const validUuid = uuidv4();
      mockReq.headers = { 'x-custom-transaction-id': validUuid };
      
      const middleware = transactionIdMiddleware({ 
        headerName: customHeaderName 
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq['transactionId']).toBe(validUuid);
    });
  });

  describe('Configurable Options', () => {
    it('should allow optional transaction ID', () => {
      const middleware = transactionIdMiddleware({ 
        required: false,
        generateIfMissing: false 
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});