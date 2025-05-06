import { Request } from 'express';

export interface TransactionUniquenessCriteria {
  id: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface ITransactionUniquenessService {
  /**
   * Check if a transaction is unique
   * @param criteria Transaction uniqueness criteria
   * @returns Promise resolving to boolean (true if unique, false if duplicate)
   */
  isUnique(criteria: TransactionUniquenessCriteria): Promise<boolean>;

  /**
   * Mark a transaction as processed
   * @param criteria Transaction uniqueness criteria
   */
  markProcessed(criteria: TransactionUniquenessCriteria): Promise<void>;
}

export class InMemoryTransactionUniquenessService implements ITransactionUniquenessService {
  private processedTransactions = new Set<string>();

  async isUnique(criteria: TransactionUniquenessCriteria): Promise<boolean> {
    return !this.processedTransactions.has(criteria.id);
  }

  async markProcessed(criteria: TransactionUniquenessCriteria): Promise<void> {
    this.processedTransactions.add(criteria.id);
  }

  // Method for testing to clear processed transactions
  clearProcessedTransactions(): void {
    this.processedTransactions.clear();
  }
}