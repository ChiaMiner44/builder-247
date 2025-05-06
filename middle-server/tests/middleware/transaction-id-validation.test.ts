import { Request, Response, NextFunction } from 'express';
import { transactionIdMiddleware } from '../../src/middleware/transaction-id-validation';
import { v4 as uuidv4 } from 'uuid';

describe('Transaction ID Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('Default Configuration', () => {
    const middleware = transactionIdMiddleware();

    it('should reject request when no transaction ID is provided', () => {
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Transaction ID is required'
      }));
    });

    it('should generate transaction ID when configured to do so', () => {
      const middleware = transactionIdMiddleware({ generateIfMissing: true });
      
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.headers['x-transaction-id']).toBeTruthy();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Valid Transaction ID', () => {
    it('should accept valid UUID v4', () => {
      const validUuid = uuidv4();
      mockReq.headers = { 'x-transaction-id': validUuid };
      const middleware = transactionIdMiddleware();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq['transactionId']).toBe(validUuid);
    });
  });

  describe('Invalid Transaction ID', () => {
    it('should reject malformed transaction ID', () => {
      const invalidUuid = 'not-a-valid-uuid';
      mockReq.headers = { 'x-transaction-id': invalidUuid };
      const middleware = transactionIdMiddleware();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Invalid Transaction ID'
      }));
    });
  });

  describe('Custom Configuration', () => {
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

    it('should allow optional transaction ID', () => {
      const middleware = transactionIdMiddleware({ required: false });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});