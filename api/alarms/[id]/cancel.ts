import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticateRequest } from '../../lib/auth'
import { getAlarmById, updateAlarmStatus, updateUserBalance } from '../../lib/database'

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
    if (typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid alarm ID' })
    }

    const alarm = await getAlarmById(id)
    if (!alarm) {
      return res.status(404).json({ error: 'Alarm not found' })
    }

    if (alarm.user_id !== user.id) {
      return res.status(403).json({ error: 'Not your alarm' })
    }

    if (alarm.status !== 'pending') {
      return res.status(400).json({ error: 'Can only cancel pending alarms' })
    }

    // Refund the stake
    await updateUserBalance(user.id, user.wallet_balance + alarm.stake_amount)

    // Update alarm status
    await updateAlarmStatus(id, 'cancelled')

    return res.status(200).json({
      success: true,
      message: 'Alarm cancelled and stake refunded'
    })
  } catch (error: any) {
    console.error('Cancel alarm error:', error)
    return res.status(500).json({ error: error.message })
  }
}
