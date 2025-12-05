import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY
const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export const config = {
  api: {
    bodyParser: false, // Stripe needs raw body for signature verification
  },
}

async function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!stripeSecretKey || !stripeWebhookSecret || !supabaseUrl || !supabaseKey) {
    console.error('Missing configuration')
    return res.status(500).json({ error: 'Server configuration error' })
  }

  const stripe = new Stripe(stripeSecretKey)
  const sig = req.headers['stripe-signature'] as string

  let event: Stripe.Event

  try {
    const rawBody = await getRawBody(req)
    event = stripe.webhooks.constructEvent(rawBody, sig, stripeWebhookSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).json({ error: `Webhook Error: ${err.message}` })
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    const userId = session.metadata?.userId
    const amount = parseFloat(session.metadata?.amount || '0')

    if (!userId || !amount) {
      console.error('Missing metadata in session:', session.id)
      return res.status(400).json({ error: 'Missing metadata' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get current user balance
    const { data: user, error: userError } = await supabase
      .from('users')
      .select()
      .eq('id', userId)
      .single()

    if (userError || !user) {
      console.error('User not found:', userId)
      return res.status(400).json({ error: 'User not found' })
    }

    // Update user balance
    const newBalance = (user.wallet_balance || 0) + amount
    const { error: updateError } = await supabase
      .from('users')
      .update({
        wallet_balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Failed to update balance:', updateError)
      return res.status(500).json({ error: 'Failed to update balance' })
    }

    console.log(`Added $${amount} to user ${userId}. New balance: $${newBalance}`)
  }

  return res.status(200).json({ received: true })
}
