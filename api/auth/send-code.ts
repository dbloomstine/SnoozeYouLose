import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import twilio from 'twilio'

// Environment config
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY
const twilioSid = process.env.TWILIO_ACCOUNT_SID
const twilioToken = process.env.TWILIO_AUTH_TOKEN
const twilioPhone = process.env.TWILIO_PHONE_NUMBER

function isTwilioConfigured(): boolean {
  return !!(twilioSid && twilioToken && twilioPhone)
}

function generateCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { phoneNumber } = req.body

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' })
    }

    const code = generateCode()
    const id = generateId()

    // Save to database
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey)

      // Delete existing verifications for this phone
      await supabase.from('verifications').delete().eq('phone_number', phoneNumber)

      // Insert new verification
      const { error } = await supabase.from('verifications').insert({
        id,
        phone_number: phoneNumber,
        code,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        verified: false,
        created_at: new Date().toISOString()
      })

      if (error) {
        console.error('Database error:', error)
        return res.status(500).json({ error: 'Database error', details: error.message })
      }
    }

    // Send SMS
    if (isTwilioConfigured()) {
      try {
        const client = twilio(twilioSid!, twilioToken!)
        await client.messages.create({
          body: `Your Snooze You Lose verification code is: ${code}\n\nThis code expires in 10 minutes.`,
          from: twilioPhone,
          to: '+1' + phoneNumber
        })
      } catch (smsError: any) {
        console.error('SMS error:', smsError)
        return res.status(500).json({ error: 'Failed to send SMS', details: smsError.message })
      }
    }

    const response: any = {
      success: true,
      message: 'Verification code sent'
    }

    // In test mode, include the code
    if (!isTwilioConfigured()) {
      response.testMode = true
      response.code = code
    }

    return res.status(200).json(response)
  } catch (error: any) {
    console.error('Send code error:', error)
    return res.status(500).json({ error: error.message })
  }
}
