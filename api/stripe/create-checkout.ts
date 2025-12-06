import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { getAuthenticatedUser, validateStakeAmount } from '../lib/security'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Stripe not configured' })
  }

  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { amount } = req.body // Amount in dollars

    // Validate amount using the same validation as stake
    const validation = validateStakeAmount(amount)
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error })
    }

    const validatedAmount = validation.value!
    const stripe = new Stripe(STRIPE_SECRET_KEY)

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://snooze-you-lose.vercel.app'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Snooze You Lose Wallet Funds',
              description: `Add $${validatedAmount} to your wallet`,
            },
            unit_amount: Math.round(validatedAmount * 100), // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/?payment=success`,
      cancel_url: `${baseUrl}/?payment=cancelled`,
      metadata: {
        userId: user.id,
        amount: validatedAmount.toString(),
      },
    })

    return res.status(200).json({
      sessionId: session.id,
      url: session.url
    })
  } catch (error: any) {
    console.error('Stripe checkout error:', error)
    return res.status(500).json({ error: 'Failed to create checkout session' })
  }
}
