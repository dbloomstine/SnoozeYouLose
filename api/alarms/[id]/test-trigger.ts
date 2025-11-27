import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticateRequest } from '../../lib/auth'
import { getAlarmById, updateAlarmStatus, getUserById } from '../../lib/database'
import { sendAlarmSMS, makeAlarmCall, isTwilioConfigured } from '../../lib/twilio'

// Test endpoint to manually trigger an alarm for testing
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
      return res.status(400).json({ error: 'Can only trigger pending alarms' })
    }

    // Update alarm status to ringing
    await updateAlarmStatus(id, 'ringing')

    // Get user for phone number
    const alarmUser = await getUserById(alarm.user_id)

    // If Twilio is configured, send real SMS/call
    if (isTwilioConfigured() && alarmUser) {
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000'
      const webhookUrl = `${baseUrl}/api/webhooks/twilio-call?alarmId=${alarm.id}`

      // Send SMS and make call in parallel
      await Promise.all([
        sendAlarmSMS(alarmUser.phone_number, alarm.verification_code, alarm.stake_amount),
        makeAlarmCall(alarmUser.phone_number, alarm.verification_code, alarm.stake_amount, webhookUrl)
      ])
    }

    return res.status(200).json({
      success: true,
      message: 'Alarm triggered',
      code: alarm.verification_code, // Return code for test mode
      twilioConfigured: isTwilioConfigured()
    })
  } catch (error: any) {
    console.error('Test trigger error:', error)
    return res.status(500).json({ error: error.message })
  }
}
