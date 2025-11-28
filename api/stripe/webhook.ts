import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { getUserById, updateUserBalance } from '../lib/database'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-11-17.clover' as any
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

export const config = {
  api: {
    bodyParser: false
  }
}

async function buffer(readable: any) {
  const chunks = []
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const buf = await buffer(req)
  const sig = req.headers['stripe-signature'] as string

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).json({ error: `Webhook Error: ${err.message}` })
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    const userId = session.metadata?.userId
    const amount = parseInt(session.metadata?.amount || '0', 10)

    if (!userId || !amount) {
      console.error('Missing metadata in session:', session.id)
      return res.status(400).json({ error: 'Missing metadata' })
    }

    console.log(`Payment successful for user ${userId}, amount: $${amount}`)

    // Update user's wallet balance
    try {
      const user = await getUserById(userId)
      if (!user) {
        console.error('User not found:', userId)
        return res.status(500).json({ error: 'User not found' })
      }

      const newBalance = user.wallet_balance + amount
      await updateUserBalance(userId, newBalance)
      console.log(`Updated wallet for user ${userId}: $${newBalance}`)
    } catch (err) {
      console.error('Failed to update wallet:', err)
      return res.status(500).json({ error: 'Failed to update wallet' })
    }
  }

  return res.status(200).json({ received: true })
}
