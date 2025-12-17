"use client"

import { toast } from "@/hooks/use-toast"

export interface ErrorRecoveryOptions {
  showToast?: boolean
  retryCount?: number
  maxRetries?: number
  retryDelay?: number
  onRetry?: () => void
  onSuccess?: () => void
  onFailure?: (error: Error) => void
}

export class ErrorRecovery {
  private static instance: ErrorRecovery
  private retryAttempts: Map<string, number> = new Map()

  static getInstance(): ErrorRecovery {
    if (!ErrorRecovery.instance) {
      ErrorRecovery.instance = new ErrorRecovery()
    }
    return ErrorRecovery.instance
  }

  /**
   * Attempts to recover from an error with automatic retry logic
   */
  async attemptRecovery<T>(
    operation: () => Promise<T>,
    error: Error,
    options: ErrorRecoveryOptions = {}
  ): Promise<T | null> {
    const {
      showToast = true,
      retryCount = 0,
      maxRetries = 3,
      retryDelay = 1000,
      onRetry,
      onSuccess,
      onFailure
    } = options

    const operationId = this.getOperationId(operation)
    const currentAttempts = this.retryAttempts.get(operationId) || 0

    if (currentAttempts >= maxRetries) {
      if (showToast) {
        toast({
          title: "Operation Failed",
          description: `Failed after ${maxRetries} attempts. Please try again later.`,
          variant: "destructive"
        })
      }
      onFailure?.(error)
      return null
    }

    // Increment retry count
    this.retryAttempts.set(operationId, currentAttempts + 1)

    if (showToast && currentAttempts > 0) {
      toast({
        title: "Retrying...",
        description: `Attempt ${currentAttempts + 1} of ${maxRetries}`,
        variant: "default"
      })
    }

    try {
      // Wait before retrying (exponential backoff)
      if (currentAttempts > 0) {
        await this.delay(retryDelay * Math.pow(2, currentAttempts - 1))
      }

      onRetry?.()
      const result = await operation()
      
      // Reset retry count on success
      this.retryAttempts.delete(operationId)
      onSuccess?.()
      
      if (showToast && currentAttempts > 0) {
        toast({
          title: "Success",
          description: "Operation completed successfully after retry.",
          variant: "default"
        })
      }

      return result
    } catch (retryError) {
      // Recursively attempt recovery
      return this.attemptRecovery(operation, retryError as Error, {
        ...options,
        retryCount: currentAttempts + 1
      })
    }
  }

  /**
   * Clears retry attempts for a specific operation
   */
  clearRetryAttempts(operation: () => Promise<any>): void {
    const operationId = this.getOperationId(operation)
    this.retryAttempts.delete(operationId)
  }

  /**
   * Clears all retry attempts
   */
  clearAllRetryAttempts(): void {
    this.retryAttempts.clear()
  }

  /**
   * Gets the current retry count for an operation
   */
  getRetryCount(operation: () => Promise<any>): number {
    const operationId = this.getOperationId(operation)
    return this.retryAttempts.get(operationId) || 0
  }

  /**
   * Provides user-friendly error recovery suggestions
   */
  getRecoverySuggestions(error: Error): string[] {
    const message = error.message.toLowerCase()
    const suggestions: string[] = []

    if (message.includes('network') || message.includes('fetch')) {
      suggestions.push('Check your internet connection')
      suggestions.push('Try refreshing the page')
      suggestions.push('Wait a moment and try again')
    }

    if (message.includes('unauthorized') || message.includes('401')) {
      suggestions.push('Log out and log back in')
      suggestions.push('Clear your browser cache')
      suggestions.push('Check if your session has expired')
    }

    if (message.includes('timeout')) {
      suggestions.push('Check your internet connection speed')
      suggestions.push('Try again with a smaller amount of data')
      suggestions.push('Wait a moment and retry')
    }

    if (message.includes('validation') || message.includes('invalid')) {
      suggestions.push('Check all required fields are filled')
      suggestions.push('Verify the format of your input')
      suggestions.push('Make sure all data is valid')
    }

    if (message.includes('permission') || message.includes('403')) {
      suggestions.push('Contact your administrator for access')
      suggestions.push('Check if your role has the required permissions')
      suggestions.push('Verify you\'re logged into the correct account')
    }

    if (message.includes('500') || message.includes('server')) {
      suggestions.push('Try again in a few minutes')
      suggestions.push('Contact support if the problem continues')
      suggestions.push('Check our status page for known issues')
    }

    // Default suggestions if no specific ones found
    if (suggestions.length === 0) {
      suggestions.push('Try refreshing the page')
      suggestions.push('Clear your browser cache')
      suggestions.push('Try using a different browser')
      suggestions.push('Contact support if the problem persists')
    }

    return suggestions
  }

  /**
   * Determines if an error is recoverable
   */
  isRecoverableError(error: Error): boolean {
    const message = error.message.toLowerCase()
    
    // Network errors are usually recoverable
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return true
    }

    // Server errors (5xx) are usually recoverable
    if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) {
      return true
    }

    // Authentication errors might be recoverable
    if (message.includes('unauthorized') || message.includes('401')) {
      return true
    }

    // Validation errors are usually not recoverable without user action
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return false
    }

    // Permission errors are usually not recoverable without admin action
    if (message.includes('permission') || message.includes('403') || message.includes('forbidden')) {
      return false
    }

    // Default to recoverable for unknown errors
    return true
  }

  private getOperationId(operation: () => Promise<any>): string {
    return operation.toString().slice(0, 50) + Date.now()
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export singleton instance
export const errorRecovery = ErrorRecovery.getInstance()

// Utility functions for common error recovery patterns
export const errorRecoveryUtils = {
  /**
   * Wraps an async operation with automatic error recovery
   */
  withRecovery: async <T>(
    operation: () => Promise<T>,
    options: ErrorRecoveryOptions = {}
  ): Promise<T | null> => {
    try {
      return await operation()
    } catch (error) {
      return errorRecovery.attemptRecovery(operation, error as Error, options)
    }
  },

  /**
   * Provides a user-friendly error message with recovery suggestions
   */
  getUserFriendlyMessage: (error: Error): { message: string; suggestions: string[] } => {
    const suggestions = errorRecovery.getRecoverySuggestions(error)
    
    let message = "Something went wrong"
    if (error.message.includes('network')) {
      message = "Network connection issue"
    } else if (error.message.includes('unauthorized')) {
      message = "Authentication required"
    } else if (error.message.includes('timeout')) {
      message = "Request timed out"
    } else if (error.message.includes('validation')) {
      message = "Invalid input provided"
    } else if (error.message.includes('permission')) {
      message = "Access denied"
    } else if (error.message.includes('500')) {
      message = "Server error occurred"
    }

    return { message, suggestions }
  },

  /**
   * Logs error with context for debugging
   */
  logError: (error: Error, context?: Record<string, any>) => {
    console.error('Error with context:', {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR',
      url: typeof window !== 'undefined' ? window.location.href : 'SSR'
    })
  }
}
