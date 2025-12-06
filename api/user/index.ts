import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getAuthenticatedUser } from '../lib/security'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    return res.status(200).json({
      id: user.id,
      phoneNumber: user.phone_number,
      walletBalance: user.wallet_balance
    })
  } catch (error: any) {
    console.error('Get user error:', error)
    return res.status(500).json({ error: 'An error occurred' })
  }
}
