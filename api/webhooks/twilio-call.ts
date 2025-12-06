import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { validateTwilioSignature } from '../lib/security'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN

// This webhook is called by Twilio when the user enters digits during a call

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Validate Twilio signature to prevent spoofed requests
  if (TWILIO_AUTH_TOKEN) {
    const signature = req.headers['x-twilio-signature'] as string
    const host = req.headers['x-forwarded-host'] || req.headers.host || ''
    const protocol = req.headers['x-forwarded-proto'] || 'https'
    const fullUrl = `${protocol}://${host}${req.url || ''}`

    if (!signature || !validateTwilioSignature(TWILIO_AUTH_TOKEN, signature, fullUrl, req.body || {})) {
      console.error('Invalid Twilio signature for call webhook')
      return res.status(403).send(twimlResponse('Unauthorized request'))
    }
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).send(twimlResponse('Service unavailable'))
  }

  try {
    const { alarmId } = req.query
    const { Digits } = req.body // Twilio sends the pressed digits in this field

    if (typeof alarmId !== 'string' || !alarmId) {
      return res.status(400).send(twimlResponse('Invalid request'))
    }

    // Validate alarmId format to prevent injection
    if (!/^[a-zA-Z0-9-]+$/.test(alarmId)) {
      return res.status(400).send(twimlResponse('Invalid alarm'))
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const { data: alarm, error: alarmError } = await supabase
      .from('alarms')
      .select()
      .eq('id', alarmId)
      .single()

    if (alarmError || !alarm) {
      return res.status(404).send(twimlResponse('Alarm not found'))
    }

    if (alarm.status !== 'ringing') {
      return res.status(400).send(twimlResponse('Alarm is no longer ringing'))
    }

    // Validate Digits input
    if (!Digits || typeof Digits !== 'string' || !/^\d{4}$/.test(Digits)) {
      return res.status(200).send(twimlRetry('Please enter your 4 digit verification code.'))
    }

    // Check if the entered digits match the verification code
    if (Digits === alarm.verification_code) {
      // Success! Get user and refund the stake
      const { data: user } = await supabase
        .from('users')
        .select()
        .eq('id', alarm.user_id)
        .single()

      if (user) {
        await supabase
          .from('users')
          .update({
            wallet_balance: user.wallet_balance + alarm.stake_amount,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)
      }

      await supabase
        .from('alarms')
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', alarm.id)

      return res.status(200).send(twimlResponse(
        `Correct! You're awake and you kept your ${alarm.stake_amount} dollars. Have a great day!`
      ))
    } else {
      // Wrong code - give them another chance
      // Don't reveal the code in error message for security
      return res.status(200).send(twimlRetry(
        'That code was incorrect. Check your phone and try again.'
      ))
    }
  } catch (error: any) {
    console.error('Twilio call webhook error:', error)
    return res.status(500).send(twimlResponse('An error occurred'))
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function twimlResponse(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${escapeXml(message)}</Say>
</Response>`
}

function twimlRetry(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="4" method="POST">
    <Say voice="alice">${escapeXml(message)}</Say>
  </Gather>
  <Say voice="alice">No input received. Goodbye.</Say>
</Response>`
}
