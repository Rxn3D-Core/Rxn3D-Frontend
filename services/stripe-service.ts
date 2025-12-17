import Stripe from "stripe"
import type { CreditPackage } from "./credit-service"

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

class StripeService {
  // Create a payment intent for credit purchase
  async createCreditPurchaseIntent(amount: number, credits: number, userId: string): Promise<string> {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          type: "credit_purchase",
          credits: String(credits),
          userId,
        },
      })

      return paymentIntent.client_secret!
    } catch (error) {
      console.error("Error creating payment intent:", error)
      throw new Error("Failed to create payment intent")
    }
  }

  // Process a successful payment and add credits
  async processSuccessfulPayment(paymentIntentId: string): Promise<{
    success: boolean
    credits?: number
    userId?: string
  }> {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

      if (paymentIntent.status !== "succeeded") {
        return { success: false }
      }

      const credits = Number(paymentIntent.metadata.credits)
      const userId = paymentIntent.metadata.userId

      return {
        success: true,
        credits,
        userId,
      }
    } catch (error) {
      console.error("Error processing payment:", error)
      return { success: false }
    }
  }

  // Create a Stripe Checkout session for credit purchase
  async createCheckoutSession(
    creditPackage: CreditPackage,
    userId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<string> {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${creditPackage.name} Credit Package`,
                description: `${creditPackage.credits} Slip Credits`,
              },
              unit_amount: Math.round(creditPackage.price * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl,
        metadata: {
          type: "credit_purchase",
          credits: String(creditPackage.credits),
          userId,
          packageId: creditPackage.id,
        },
      })

      return session.url!
    } catch (error) {
      console.error("Error creating checkout session:", error)
      throw new Error("Failed to create checkout session")
    }
  }

  // Set up a subscription for auto-refill
  async createAutoRefillSubscription(
    userId: string,
    creditAmount: number,
    pricePerMonth: number,
    threshold: number,
  ): Promise<string> {
    try {
      // First, create a product for this auto-refill
      const product = await stripe.products.create({
        name: `Auto-Refill: ${creditAmount} Credits`,
        description: `Automatically adds ${creditAmount} credits when balance falls below ${threshold}`,
        metadata: {
          type: "credit_auto_refill",
          credits: String(creditAmount),
          threshold: String(threshold),
        },
      })

      // Create a price for the product
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(pricePerMonth * 100), // Convert to cents
        currency: "usd",
        recurring: {
          interval: "month",
        },
      })

      // Create a subscription
      const subscription = await stripe.subscriptions.create({
        customer: userId, // Assuming userId is the Stripe customer ID
        items: [
          {
            price: price.id,
          },
        ],
        metadata: {
          type: "credit_auto_refill",
          userId,
          credits: String(creditAmount),
          threshold: String(threshold),
        },
      })

      return subscription.id
    } catch (error) {
      console.error("Error creating auto-refill subscription:", error)
      throw new Error("Failed to create auto-refill subscription")
    }
  }
}

// Export a singleton instance
export const stripeService = new StripeService()
