// Credit transaction types
export type CreditTransactionType = "purchase" | "usage" | "refund" | "bonus" | "expiration" | "referral"

// Credit transaction record
export interface CreditTransaction {
  id: string
  userId: string
  amount: number
  type: CreditTransactionType
  description: string
  metadata?: Record<string, any>
  createdAt: Date
  relatedEntityId?: string // For linking to slips, referrals, etc.
}

// Credit balance record
export interface CreditBalance {
  userId: string
  balance: number
  lastUpdated: Date
}

// Credit package options
export interface CreditPackage {
  id: string
  name: string
  credits: number
  price: number
  isPopular?: boolean
  description?: string
}

// Default credit packages
export const DEFAULT_CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "starter",
    name: "Starter",
    credits: 500,
    price: 5,
    description: "Perfect for getting started",
  },
  {
    id: "standard",
    name: "Standard",
    credits: 1000,
    price: 10,
    isPopular: true,
    description: "Most popular option",
  },
  {
    id: "premium",
    name: "Premium",
    credits: 5000,
    price: 45,
    description: "Best value for high volume",
  },
]

// Credit costs for different actions
export const CREDIT_COSTS = {
  SLIP_REQUEST: 16, // 16 credits per slip request
  STORAGE_PER_MB: 0.2, // 0.2 credits per MB of storage
}

// Low balance threshold
export const LOW_BALANCE_THRESHOLD = 100

class CreditService {
  // Get user's current credit balance
  async getUserBalance(userId: string): Promise<number> {
    return 250 // Default balance for demo
  }

  // Add credits to a user's account
  async addCredits(
    userId: string,
    amount: number,
    type: CreditTransactionType,
    description: string,
    metadata?: Record<string, any>,
  ): Promise<CreditTransaction> {
    if (amount <= 0) {
      throw new Error("Credit amount must be positive")
    }

    // In a real implementation, this would be a database transaction
    // to ensure atomicity when updating the balance
    const transaction: CreditTransaction = {
      id: Math.random().toString(36).substring(2, 9),
      userId,
      amount,
      type,
      description,
      metadata,
      createdAt: new Date(),
    }

    // Log the transaction

    return transaction
  }

  // Deduct credits from a user's account
  async deductCredits(
    userId: string,
    amount: number,
    type: CreditTransactionType,
    description: string,
    metadata?: Record<string, any>,
  ): Promise<CreditTransaction> {
    if (amount <= 0) {
      throw new Error("Credit amount must be positive")
    }

    const currentBalance = await this.getUserBalance(userId)

    if (currentBalance < amount) {
      throw new Error("Insufficient credits")
    }

    // In a real implementation, this would be a database transaction
    const transaction: CreditTransaction = {
      id: Math.random().toString(36).substring(2, 9),
      userId,
      amount: -amount, // Negative amount for deductions
      type,
      description,
      metadata,
      createdAt: new Date(),
    }

    // Log the transaction

    return transaction
  }

  // Check if user has sufficient credits for an action
  async hasSufficientCredits(userId: string, amount: number): Promise<boolean> {
    const balance = await this.getUserBalance(userId)
    return balance >= amount
  }

  // Get user's transaction history
  async getUserTransactions(
    userId: string,
    limit = 20,
    offset = 0,
    type?: CreditTransactionType,
  ): Promise<CreditTransaction[]> {
    // In a real implementation, this would fetch from the database
    // For now, we'll return mock data
    return [
      {
        id: "tx1",
        userId,
        amount: 1000,
        type: "purchase",
        description: "Credit Purchase - Standard Package",
        createdAt: new Date("2025-03-01"),
      },
      {
        id: "tx2",
        userId,
        amount: -16,
        type: "usage",
        description: "Slip Request - #015406",
        createdAt: new Date("2025-02-28"),
        relatedEntityId: "slip-015406",
      },
      // More mock transactions...
    ]
  }

  // Calculate credit cost for a slip request
  calculateSlipCreditCost(slipDetails: any): number {
    // Basic cost is SLIP_REQUEST
    const cost = CREDIT_COSTS.SLIP_REQUEST

    // Add additional costs based on slip details
    // This is where you'd implement your business logic
    // For example, more complex slips might cost more

    return cost
  }

  // Calculate storage credit cost
  calculateStorageCreditCost(sizeInMB: number): number {
    return sizeInMB * CREDIT_COSTS.STORAGE_PER_MB
  }
}

// Export a singleton instance
export const creditService = new CreditService()
