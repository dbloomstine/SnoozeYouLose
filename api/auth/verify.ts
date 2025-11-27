import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyCode, getUserByPhone, createUser } from '../lib/database'
import { sign } from '../lib/jwt'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { phoneNumber, code } = req.body

    if (!phoneNumber || !code) {
      return res.status(400).json({ error: 'Phone number and code are required' })
    }

    // Verify the code
    const isValid = await verifyCode(phoneNumber, code)

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid or expired code' })
    }

    // Get or create user
    let user = await getUserByPhone(phoneNumber)
    if (!user) {
      user = await createUser(phoneNumber)
    }

    // Generate JWT token
    const token = await sign({ userId: user.id })

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        phoneNumber: user.phone_number,
        walletBalance: user.wallet_balance
      }
    })
  } catch (error: any) {
    console.error('Verify error:', error)
    return res.status(500).json({ error: error.message })
  }
}
