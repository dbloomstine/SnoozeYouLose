import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

// This webhook is called by Twilio when the user enters digits during a call

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).send(twimlResponse('Service unavailable'))
  }

  try {
    const { alarmId } = req.query
    const { Digits } = req.body // Twilio sends the pressed digits in this field

    if (typeof alarmId !== 'string') {
      return res.status(400).send(twimlResponse('Invalid alarm'))
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: alarm } = await supabase
      .from('alarms')
      .select()
      .eq('id', alarmId)
      .single()

    if (!alarm) {
      return res.status(404).send(twimlResponse('Alarm not found'))
    }

    if (alarm.status !== 'ringing') {
      return res.status(400).send(twimlResponse('Alarm is no longer ringing'))
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
      return res.status(200).send(twimlRetry(
        `That code was incorrect. Your code is ${alarm.verification_code.split('').join(' ')}. Please try again.`
      ))
    }
  } catch (error: any) {
    console.error('Twilio webhook error:', error)
    return res.status(500).send(twimlResponse('An error occurred'))
  }
}

function twimlResponse(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${message}</Say>
</Response>`
}

function twimlRetry(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="4" method="POST">
    <Say voice="alice">${message}</Say>
  </Gather>
  <Say voice="alice">No input received. Goodbye.</Say>
</Response>`
}
