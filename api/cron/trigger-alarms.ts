import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  getPendingAlarmsToTrigger,
  updateAlarmStatus,
  getUserById
} from '../lib/database'
import { sendAlarmSMS, makeAlarmCall, isTwilioConfigured } from '../lib/twilio'

// This endpoint should be called by a cron job every minute
// In Vercel, you can use vercel.json to set up cron jobs

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret to prevent unauthorized access
  const cronSecret = req.headers['x-cron-secret']
  if (cronSecret !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // Get all pending alarms that should be triggered
    const alarms = await getPendingAlarmsToTrigger()

    console.log(`Found ${alarms.length} alarms to trigger`)

    const results = []

    for (const alarm of alarms) {
      try {
        // Get user for phone number
        const user = await getUserById(alarm.user_id)
        if (!user) {
          console.error(`User not found for alarm ${alarm.id}`)
          continue
        }

        // Update alarm status to ringing
        await updateAlarmStatus(alarm.id, 'ringing')

        // Build webhook URL for call responses
        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3000'
        const webhookUrl = `${baseUrl}/api/webhooks/twilio-call?alarmId=${alarm.id}`

        // Send SMS
        const smsResult = await sendAlarmSMS(
          user.phone_number,
          alarm.verification_code,
          alarm.stake_amount
        )

        // Make call
        const callResult = await makeAlarmCall(
          user.phone_number,
          alarm.verification_code,
          alarm.stake_amount,
          webhookUrl
        )

        results.push({
          alarmId: alarm.id,
          sms: smsResult.success,
          call: callResult.success
        })

        // Schedule failure check (5 minutes from now)
        // In production, you'd use a proper job queue like BullMQ or Vercel's cron
        // For now, we'll handle this with another cron endpoint

        console.log(`Triggered alarm ${alarm.id} for user ${user.phone_number}`)
      } catch (error: any) {
        console.error(`Error triggering alarm ${alarm.id}:`, error)
        results.push({
          alarmId: alarm.id,
          error: error.message
        })
      }
    }

    return res.status(200).json({
      triggered: results.length,
      results,
      twilioConfigured: isTwilioConfigured()
    })
  } catch (error: any) {
    console.error('Trigger alarms error:', error)
    return res.status(500).json({ error: error.message })
  }
}
