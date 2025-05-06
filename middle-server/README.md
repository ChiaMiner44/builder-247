# Middle Server

## Transaction ID Validation Middleware

The Transaction ID Validation Middleware provides a robust way to validate and manage transaction IDs in your Express.js application.

### Usage Example

```typescript
import express from 'express';
import { transactionIdMiddleware } from './middleware/transaction-id-validation';

const app = express();

// Default configuration: Requires transaction ID, generates if missing
app.use(transactionIdMiddleware());

// Or with custom configuration
app.use(transactionIdMiddleware({
  required: true,        // Transaction ID is mandatory
  generateIfMissing: true, // Generate a UUID if not provided
  headerName: 'X-Custom-Transaction-ID' // Custom header name
}));

// Your routes and other middleware
```

### Middleware Options

- `required` (default: `true`): Whether a transaction ID is mandatory
- `generateIfMissing` (default: `true`): Generate a UUID if no transaction ID is provided
- `headerName` (default: `'X-Transaction-ID'`): Custom header name for transaction ID

### Validation Rules

- Validates UUID v4 format
- Supports custom header names
- Optional generation of transaction IDs
- Attaches transaction ID to `req['transactionId']` for further use