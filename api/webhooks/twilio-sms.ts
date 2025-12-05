import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

// This webhook is called by Twilio when the user replies to an SMS

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).send(smsResponse('Service unavailable'))
  }

  try {
    const { From, Body } = req.body // Twilio sends these fields

    if (!From || !Body) {
      return res.status(400).send(smsResponse('Invalid request'))
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Clean up phone number and message
    const phoneNumber = From.replace('+1', '').replace('+', '')
    const code = Body.trim()

    // Find user by phone number
    const { data: user } = await supabase
      .from('users')
      .select()
      .eq('phone_number', phoneNumber)
      .single()

    if (!user) {
      return res.status(200).send(smsResponse(
        "We don't recognize this number. Please sign up at our website first."
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
      return res.status(200).send(smsResponse(
        `Wrong code. Your code is: ${alarm.verification_code}\n\nReply with the correct code to keep your $${alarm.stake_amount}!`
      ))
    }
  } catch (error: any) {
    console.error('SMS webhook error:', error)
    return res.status(500).send(smsResponse('An error occurred. Please try again.'))
  }
}

function smsResponse(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${message}</Message>
</Response>`
}
