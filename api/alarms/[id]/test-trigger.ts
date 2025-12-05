import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { jwtVerify } from 'jose'
import twilio from 'twilio'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY
const jwtSecret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-in-production')
const twilioSid = process.env.TWILIO_ACCOUNT_SID
const twilioToken = process.env.TWILIO_AUTH_TOKEN
const twilioPhone = process.env.TWILIO_PHONE_NUMBER

async function getAuthenticatedUser(req: VercelRequest) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  try {
    const { payload } = await jwtVerify(token, jwtSecret)
    const userId = payload.userId as string
    if (!userId || !supabaseUrl || !supabaseKey) return null

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: user } = await supabase.from('users').select().eq('id', userId).single()
    return user
  } catch {
    return null
  }
}

// Test endpoint to manually trigger an alarm for testing
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Database not configured' })
  }

  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { id } = req.query
    if (typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid alarm ID' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: alarm } = await supabase
      .from('alarms')
      .select()
      .eq('id', id)
      .single()

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
    await supabase
      .from('alarms')
      .update({
        status: 'ringing',
        triggered_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    const twilioConfigured = !!(twilioSid && twilioToken && twilioPhone)

    // If Twilio is configured, send real SMS/call
    if (twilioConfigured) {
      const client = twilio(twilioSid, twilioToken)
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'https://snooze-you-lose.vercel.app'
      const webhookUrl = `${baseUrl}/api/webhooks/twilio-call?alarmId=${alarm.id}`

      // Send SMS and make call in parallel
      await Promise.all([
        // SMS
        client.messages.create({
          body: `🚨 WAKE UP! Your $${alarm.stake_amount} alarm is ringing! Enter code ${alarm.verification_code} to keep your money. You have 5 minutes!`,
          from: twilioPhone,
          to: user.phone_number
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
          from: twilioPhone,
          to: user.phone_number
        })
      ])
    }

    return res.status(200).json({
      success: true,
      message: 'Alarm triggered',
      code: alarm.verification_code,
      twilioConfigured
    })
  } catch (error: any) {
    console.error('Test trigger error:', error)
    return res.status(500).json({ error: error.message })
  }
}
