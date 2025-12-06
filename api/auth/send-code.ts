import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import twilio from 'twilio'
import {
  generateSecureId,
  generateVerificationCode,
  validatePhoneNumber,
  formatE164,
  checkRateLimit
} from '../lib/security'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER

function isTwilioConfigured(): boolean {
  return !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { phoneNumber } = req.body

    // Validate phone number format
    const validatedPhone = validatePhoneNumber(phoneNumber)
    if (!validatedPhone) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit US phone number' })
    }

    // Rate limiting: max 5 codes per phone per 15 minutes
    const phoneRateLimit = checkRateLimit(`send-code:${validatedPhone}`, 5, 900)
    if (!phoneRateLimit.allowed) {
      return res.status(429).json({
        error: `Too many requests. Please try again in ${Math.ceil(phoneRateLimit.resetIn / 60)} minutes.`
      })
    }

    // Rate limiting: max 20 codes per IP per hour (prevent SMS bombing)
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown'
    const ipRateLimit = checkRateLimit(`send-code-ip:${ip}`, 20, 3600)
    if (!ipRateLimit.allowed) {
      return res.status(429).json({
        error: 'Too many requests from this location. Please try again later.'
      })
    }

    const code = generateVerificationCode()
    const id = generateSecureId()

    // Save to database
    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

      // Delete existing verifications for this phone (limit pending codes)
      await supabase
        .from('verifications')
        .delete()
        .eq('phone_number', validatedPhone)

      // Insert new verification
      const { error } = await supabase.from('verifications').insert({
        id,
        phone_number: validatedPhone,
        code,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
        verified: false,
        created_at: new Date().toISOString()
      })

      if (error) {
        console.error('Database error:', error)
        return res.status(500).json({ error: 'Failed to create verification' })
      }
    }

    // Send SMS via Twilio
    if (isTwilioConfigured()) {
      try {
        const client = twilio(TWILIO_ACCOUNT_SID!, TWILIO_AUTH_TOKEN!)
        await client.messages.create({
          body: `Your Snooze You Lose code is: ${code}\n\nThis code expires in 10 minutes. Don't share it with anyone.`,
          from: TWILIO_PHONE_NUMBER,
          to: formatE164(validatedPhone)
        })
      } catch (smsError: any) {
        console.error('SMS error:', smsError.message)
        return res.status(500).json({ error: 'Failed to send verification code. Please try again.' })
      }

      return res.status(200).json({
        success: true,
        message: 'Verification code sent'
      })
    }

    // Test mode - return code (only when Twilio not configured)
    return res.status(200).json({
      success: true,
      message: 'Verification code sent',
      testMode: true,
      code // Only in test mode
    })
  } catch (error: any) {
    console.error('Send code error:', error)
    return res.status(500).json({ error: 'An error occurred. Please try again.' })
  }
}
