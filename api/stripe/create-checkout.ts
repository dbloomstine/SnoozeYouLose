import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { jwtVerify } from 'jose'
import Stripe from 'stripe'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY
const jwtSecret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-in-production')
const stripeSecretKey = process.env.STRIPE_SECRET_KEY

async function getAuthenticatedUser(req: VercelRequest) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  try {
    const { payload } = await jwtVerify(token, jwtSecret)
    const userId = payload.userId as string
    if (!userId || !supabaseUrl || !supabaseKey) return null

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: user } = await supabase.from('users').select().eq('id', userId).single()
    return user
  } catch {
    return null
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!stripeSecretKey) {
    return res.status(500).json({ error: 'Stripe not configured' })
  }

  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { amount } = req.body // Amount in dollars

    if (!amount || amount < 1 || amount > 500) {
      return res.status(400).json({ error: 'Amount must be between $1 and $500' })
    }

    const stripe = new Stripe(stripeSecretKey)

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
              description: `Add $${amount} to your wallet`,
            },
            unit_amount: amount * 100, // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/?payment=success`,
      cancel_url: `${baseUrl}/?payment=cancelled`,
      metadata: {
        userId: user.id,
        amount: amount.toString(),
      },
    })

    return res.status(200).json({
      sessionId: session.id,
      url: session.url
    })
  } catch (error: any) {
    console.error('Stripe checkout error:', error)
    return res.status(500).json({ error: error.message })
  }
}
