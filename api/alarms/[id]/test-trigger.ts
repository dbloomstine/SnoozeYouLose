import type { VercelRequest, VercelResponse } from '@vercel/node'
import twilio from 'twilio'
import {
  getAuthenticatedUser,
  getSupabaseClient,
  isConfigured,
  formatE164
} from '../../lib/security'

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER

function isTwilioConfigured(): boolean {
  return !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER)
}

// Test endpoint to manually trigger an alarm for testing
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!isConfigured()) {
    return res.status(500).json({ error: 'Server not configured' })
  }

  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { id } = req.query

    // Validate alarm ID format
    if (typeof id !== 'string' || !id || !/^[a-zA-Z0-9-]+$/.test(id)) {
      return res.status(400).json({ error: 'Invalid alarm ID' })
    }

    const supabase = getSupabaseClient()

    const { data: alarm, error: alarmError } = await supabase
      .from('alarms')
      .select()
      .eq('id', id)
      .single()

    if (alarmError || !alarm) {
      return res.status(404).json({ error: 'Alarm not found' })
    }

    if (alarm.user_id !== user.id) {
      return res.status(403).json({ error: 'Not your alarm' })
    }

    if (alarm.status !== 'pending') {
      return res.status(400).json({ error: 'Can only trigger pending alarms' })
    }

    // Update alarm status to ringing
    await supabase
      .from('alarms')
      .update({
        status: 'ringing',
        triggered_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    const twilioConfigured = isTwilioConfigured()

    // If Twilio is configured, send real SMS/call
    if (twilioConfigured) {
      const client = twilio(TWILIO_ACCOUNT_SID!, TWILIO_AUTH_TOKEN!)
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'https://snooze-you-lose.vercel.app'
      const webhookUrl = `${baseUrl}/api/webhooks/twilio-call?alarmId=${alarm.id}`

      // Format phone number to E.164 format
      const phoneNumber = formatE164(user.phone_number)

      // Deep link to open the app directly to alarm screen
      const appLink = 'https://snooze-you-lose.vercel.app?alarm=ring'

      // Send SMS and make call in parallel
      try {
        await Promise.all([
          // SMS with clickable link
          client.messages.create({
            body: `WAKE UP! $${alarm.stake_amount} on the line!\n\nCode: ${alarm.verification_code}\n\nTap to wake up: ${appLink}`,
            from: TWILIO_PHONE_NUMBER,
            to: phoneNumber
          }),
          // Voice call
          client.calls.create({
            twiml: `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Wake up! This is your Snooze You Lose alarm. You have ${alarm.stake_amount} dollars on the line.</Say>
  <Gather numDigits="4" action="${webhookUrl}" method="POST">
    <Say voice="alice">Enter your 4 digit code now. Your code is ${alarm.verification_code.split('').join(' ')}.</Say>
  </Gather>
  <Say voice="alice">No input received. Your stake may be forfeited. Goodbye.</Say>
</Response>`,
            from: TWILIO_PHONE_NUMBER,
            to: phoneNumber
          })
        ])
      } catch (twilioError: any) {
        console.error('Twilio error:', twilioError.message)
        // Still return success since alarm was triggered, just SMS/call failed
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Alarm triggered',
      code: alarm.verification_code,
      twilioConfigured
    })
  } catch (error: any) {
    console.error('Test trigger error:', error)
    return res.status(500).json({ error: 'An error occurred' })
  }
}
