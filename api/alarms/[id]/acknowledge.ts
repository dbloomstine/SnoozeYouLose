import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticateRequest } from '../../lib/auth'
import { getAlarmById, updateAlarmStatus, updateUserBalance, getUserById } from '../../lib/database'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { id } = req.query
    const { code } = req.body

    if (typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid alarm ID' })
    }

    if (!code) {
      return res.status(400).json({ error: 'Verification code is required' })
    }

    const alarm = await getAlarmById(id)
    if (!alarm) {
      return res.status(404).json({ error: 'Alarm not found' })
    }

    if (alarm.user_id !== user.id) {
      return res.status(403).json({ error: 'Not your alarm' })
    }

    if (alarm.status !== 'ringing') {
      return res.status(400).json({ error: 'Alarm is not ringing' })
    }

    // Verify the code
    if (alarm.verification_code !== code) {
      return res.status(400).json({ error: 'Invalid verification code' })
    }

    // Refund the stake (they woke up!)
    const currentUser = await getUserById(user.id)
    if (currentUser) {
      await updateUserBalance(user.id, currentUser.wallet_balance + alarm.stake_amount)
    }

    // Update alarm status
    await updateAlarmStatus(id, 'acknowledged', {
      acknowledged_at: new Date().toISOString()
    })

    return res.status(200).json({
      success: true,
      message: 'Alarm acknowledged! Your stake has been refunded.'
    })
  } catch (error: any) {
    console.error('Acknowledge alarm error:', error)
    return res.status(500).json({ error: error.message })
  }
}
