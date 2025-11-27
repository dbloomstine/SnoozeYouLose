import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticateRequest } from '../lib/auth'
import { updateUserBalance } from '../lib/database'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { amount } = req.body

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' })
    }

    // In production, this would integrate with Stripe
    // For now, just add the funds (test mode)
    const newBalance = user.wallet_balance + amount
    const updatedUser = await updateUserBalance(user.id, newBalance)

    return res.status(200).json({
      success: true,
      walletBalance: updatedUser.wallet_balance,
      testMode: true // Flag that this is test mode (no real payment)
    })
  } catch (error: any) {
    console.error('Add funds error:', error)
    return res.status(500).json({ error: error.message })
  }
}
