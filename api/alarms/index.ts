import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticateRequest } from '../lib/auth'
import {
  createAlarm,
  getAlarmsForUser,
  getActiveAlarmForUser,
  updateUserBalance
} from '../lib/database'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // GET - List alarms
    if (req.method === 'GET') {
      const alarms = await getAlarmsForUser(user.id)
      const activeAlarm = await getActiveAlarmForUser(user.id)

      return res.status(200).json({
        alarms: alarms.map(formatAlarm),
        activeAlarm: activeAlarm ? formatAlarm(activeAlarm) : null
      })
    }

    // POST - Create alarm
    if (req.method === 'POST') {
      const { scheduledFor, stakeAmount } = req.body

      if (!scheduledFor || !stakeAmount) {
        return res.status(400).json({ error: 'scheduledFor and stakeAmount are required' })
      }

      if (stakeAmount <= 0) {
        return res.status(400).json({ error: 'Stake amount must be positive' })
      }

      if (user.wallet_balance < stakeAmount) {
        return res.status(400).json({ error: 'Insufficient balance' })
      }

      // Check for existing active alarm
      const existingAlarm = await getActiveAlarmForUser(user.id)
      if (existingAlarm) {
        return res.status(400).json({ error: 'You already have an active alarm' })
      }

      // Deduct stake from wallet
      await updateUserBalance(user.id, user.wallet_balance - stakeAmount)

      // Create alarm
      const alarm = await createAlarm(user.id, new Date(scheduledFor), stakeAmount)

      return res.status(201).json({
        success: true,
        alarm: formatAlarm(alarm)
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('Alarms error:', error)
    return res.status(500).json({ error: error.message })
  }
}

function formatAlarm(alarm: any) {
  return {
    id: alarm.id,
    scheduledFor: alarm.scheduled_for,
    stakeAmount: alarm.stake_amount,
    status: alarm.status,
    createdAt: alarm.created_at,
    acknowledgedAt: alarm.acknowledged_at
  }
}
