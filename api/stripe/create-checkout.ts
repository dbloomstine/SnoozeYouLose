import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { verify, getTokenFromHeader } from '../lib/jwt'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-11-17.clover' as any
})

const AMOUNTS = [5, 10, 25, 50, 100]

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verify auth
  const token = getTokenFromHeader(req.headers.authorization)
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const payload = await verify(token)
  if (!payload) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  const { amount } = req.body

  if (!amount || !AMOUNTS.includes(amount)) {
    return res.status(400).json({ error: 'Invalid amount. Must be one of: ' + AMOUNTS.join(', ') })
  }

  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:5173'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Add $${amount} to Snooze You Lose`,
              description: 'Wallet funds for alarm stakes'
            },
            unit_amount: amount * 100 // Stripe uses cents
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: `${baseUrl}/?payment=success`,
      cancel_url: `${baseUrl}/?payment=cancelled`,
      metadata: {
        userId: payload.userId,
        amount: amount.toString()
      }
    })

    return res.status(200).json({ url: session.url })
  } catch (error: any) {
    console.error('Stripe error:', error)
    return res.status(500).json({ error: 'Failed to create checkout session' })
  }
}
