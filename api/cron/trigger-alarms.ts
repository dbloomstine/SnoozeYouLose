import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import twilio from 'twilio'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY
const twilioSid = process.env.TWILIO_ACCOUNT_SID
const twilioToken = process.env.TWILIO_AUTH_TOKEN
const twilioPhone = process.env.TWILIO_PHONE_NUMBER

function isTwilioConfigured(): boolean {
  return !!(twilioSid && twilioToken && twilioPhone)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret OR allow Vercel cron (which sends specific headers)
  const cronSecret = req.headers['x-cron-secret']
  const isVercelCron = req.headers['x-vercel-cron'] === '1'

  if (!isVercelCron && cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Database not configured' })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const now = new Date().toISOString()

    // Get all pending alarms that should be triggered
    const { data: alarms, error: alarmsError } = await supabase
      .from('alarms')
      .select()
      .eq('status', 'pending')
      .lte('scheduled_for', now)

    if (alarmsError) {
      console.error('Error fetching alarms:', alarmsError)
      return res.status(500).json({ error: alarmsError.message })
    }

    console.log(`Found ${alarms?.length || 0} alarms to trigger`)

    const results = []

    for (const alarm of alarms || []) {
      try {
        // Get user for phone number
        const { data: user } = await supabase
          .from('users')
          .select()
          .eq('id', alarm.user_id)
          .single()

        if (!user) {
          console.error(`User not found for alarm ${alarm.id}`)
          continue
        }

        // Update alarm status to ringing
        await supabase
          .from('alarms')
          .update({ status: 'ringing', updated_at: new Date().toISOString() })
          .eq('id', alarm.id)

        let smsSuccess = false
        let callSuccess = false

        if (isTwilioConfigured()) {
          const client = twilio(twilioSid!, twilioToken!)
          // Format phone number to E.164 format
          const digits = user.phone_number.replace(/\D/g, '')
          const phoneNumber = digits.length === 10 ? `+1${digits}` : `+${digits}`

          // Deep link to open the app directly to alarm screen
          const appLink = 'https://snooze-you-lose.vercel.app?alarm=ring'

          // Send SMS
          try {
            await client.messages.create({
              body: `WAKE UP! $${alarm.stake_amount} on the line!\n\nCode: ${alarm.verification_code}\n\nTap to wake up: ${appLink}`,
              from: twilioPhone,
              to: phoneNumber
            })
            smsSuccess = true
          } catch (smsError: any) {
            console.error('SMS error:', smsError.message)
          }

          // Make call
          try {
            const baseUrl = process.env.VERCEL_URL
              ? `https://${process.env.VERCEL_URL}`
              : 'https://snooze-you-lose.vercel.app'
            const webhookUrl = `${baseUrl}/api/webhooks/twilio-call?alarmId=${alarm.id}`

            const codeSpaced = alarm.verification_code.split('').join(' ')
            await client.calls.create({
              twiml: `
                <Response>
                  <Say voice="alice">Wake up! This is your Snooze You Lose alarm. You have ${alarm.stake_amount} dollars at stake. Your verification code is ${codeSpaced}. I repeat, your code is ${codeSpaced}.</Say>
                  <Gather numDigits="4" action="${webhookUrl}" method="POST">
                    <Say voice="alice">Enter your 4 digit code now.</Say>
                  </Gather>
                  <Say voice="alice">We didn't receive any input. Goodbye.</Say>
                </Response>
              `,
              from: twilioPhone,
              to: phoneNumber
            })
            callSuccess = true
          } catch (callError: any) {
            console.error('Call error:', callError.message)
          }
        }

        results.push({
          alarmId: alarm.id,
          sms: smsSuccess,
          call: callSuccess
        })

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
