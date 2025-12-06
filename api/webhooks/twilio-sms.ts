import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { validateTwilioSignature, validatePhoneNumber } from '../lib/security'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN

// This webhook is called by Twilio when the user replies to an SMS

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Validate Twilio signature to prevent spoofed requests
  if (TWILIO_AUTH_TOKEN) {
    const signature = req.headers['x-twilio-signature'] as string
    const host = req.headers['x-forwarded-host'] || req.headers.host || ''
    const protocol = req.headers['x-forwarded-proto'] || 'https'
    const fullUrl = `${protocol}://${host}${req.url || ''}`

    if (!signature || !validateTwilioSignature(TWILIO_AUTH_TOKEN, signature, fullUrl, req.body || {})) {
      console.error('Invalid Twilio signature for SMS webhook')
      return res.status(403).send(smsResponse('Unauthorized request'))
    }
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).send(smsResponse('Service unavailable'))
  }

  try {
    const { From, Body } = req.body // Twilio sends these fields

    if (!From || !Body) {
      return res.status(400).send(smsResponse('Invalid request'))
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Clean up and validate phone number
    const rawPhone = From.replace(/^\+1/, '').replace(/^\+/, '')
    const phoneNumber = validatePhoneNumber(rawPhone)

    if (!phoneNumber) {
      return res.status(200).send(smsResponse(
        "We couldn't process your phone number. Please try again."
      ))
    }

    // Sanitize and extract code from message
    const code = Body.trim().replace(/\D/g, '').slice(0, 4)

    // Find user by phone number
    const { data: user } = await supabase
      .from('users')
      .select()
      .eq('phone_number', phoneNumber)
      .single()

    if (!user) {
      return res.status(200).send(smsResponse(
        "We don't recognize this number. Please sign up at snooze-you-lose.vercel.app first."
      ))
    }

    // Get active alarm
    const { data: alarm } = await supabase
      .from('alarms')
      .select()
      .eq('user_id', user.id)
      .in('status', ['pending', 'ringing'])
      .single()

    if (!alarm || alarm.status !== 'ringing') {
      return res.status(200).send(smsResponse(
        "You don't have an active alarm ringing right now."
      ))
    }

    // Validate code format
    if (code.length !== 4) {
      return res.status(200).send(smsResponse(
        `Please reply with your 4-digit code to acknowledge your alarm and keep your $${alarm.stake_amount}.`
      ))
    }

    // Check code
    if (code === alarm.verification_code) {
      // Success! Refund the stake
      await supabase
        .from('users')
        .update({
          wallet_balance: user.wallet_balance + alarm.stake_amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      await supabase
        .from('alarms')
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', alarm.id)

      return res.status(200).send(smsResponse(
        `You're awake! Your $${alarm.stake_amount} has been refunded. Have a great day!`
      ))
    } else {
      // Don't reveal the actual code in error messages for security
      return res.status(200).send(smsResponse(
        `Wrong code. Check the original message we sent and try again. You have $${alarm.stake_amount} at stake!`
      ))
    }
  } catch (error: any) {
    console.error('SMS webhook error:', error)
    return res.status(500).send(smsResponse('An error occurred. Please try again.'))
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

function smsResponse(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`
}
