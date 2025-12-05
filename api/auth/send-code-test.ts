import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import twilio from 'twilio'

// Inline config
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY
const twilioSid = process.env.TWILIO_ACCOUNT_SID
const twilioToken = process.env.TWILIO_AUTH_TOKEN
const twilioPhone = process.env.TWILIO_PHONE_NUMBER

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { phoneNumber } = req.body

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' })
    }

    // Generate a 4-digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString()
    const id = Math.random().toString(36).substring(2, 15)

    // Try to save to database
    let dbResult = 'skipped'
    if (supabaseUrl && supabaseKey) {
      try {
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
          dbResult = 'error: ' + error.message
        } else {
          dbResult = 'success'
        }
      } catch (e: any) {
        dbResult = 'exception: ' + e.message
      }
    }

    // Try to send SMS
    let smsResult = 'skipped'
    if (twilioSid && twilioToken && twilioPhone) {
      try {
        const client = twilio(twilioSid, twilioToken)
        const message = await client.messages.create({
          body: `Your Snooze You Lose verification code is: ${code}`,
          from: twilioPhone,
          to: '+1' + phoneNumber
        })
        smsResult = 'success: ' + message.sid
      } catch (e: any) {
        smsResult = 'error: ' + e.message
      }
    }

    return res.status(200).json({
      success: true,
      code, // For testing only!
      dbResult,
      smsResult
    })
  } catch (error: any) {
    return res.status(500).json({ error: error.message, stack: error.stack })
  }
}
