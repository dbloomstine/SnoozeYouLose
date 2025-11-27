import twilio from 'twilio'

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const twilioPhone = process.env.TWILIO_PHONE_NUMBER

// Only create client if credentials are available
const client = accountSid && authToken ? twilio(accountSid, authToken) : null

export function isTwilioConfigured(): boolean {
  return !!(accountSid && authToken && twilioPhone)
}

/**
 * Send an SMS message
 */
export async function sendSMS(to: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!client || !twilioPhone) {
    console.log('[TEST MODE] Would send SMS to', to, ':', body)
    return { success: true, messageId: 'test-mode' }
  }

  try {
    const message = await client.messages.create({
      body,
      from: twilioPhone,
      to: formatPhoneNumber(to)
    })
    return { success: true, messageId: message.sid }
  } catch (error: any) {
    console.error('Twilio SMS error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Make a phone call with text-to-speech
 */
export async function makeCall(
  to: string,
  message: string,
  webhookUrl: string
): Promise<{ success: boolean; callId?: string; error?: string }> {
  if (!client || !twilioPhone) {
    console.log('[TEST MODE] Would call', to, 'with message:', message)
    return { success: true, callId: 'test-mode' }
  }

  try {
    const call = await client.calls.create({
      twiml: `
        <Response>
          <Say voice="alice">${message}</Say>
          <Gather numDigits="4" action="${webhookUrl}" method="POST">
            <Say voice="alice">Enter your 4 digit code now.</Say>
          </Gather>
          <Say voice="alice">We didn't receive any input. Goodbye.</Say>
        </Response>
      `,
      from: twilioPhone,
      to: formatPhoneNumber(to)
    })
    return { success: true, callId: call.sid }
  } catch (error: any) {
    console.error('Twilio call error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send verification code via SMS
 */
export async function sendVerificationCode(to: string, code: string): Promise<{ success: boolean; error?: string }> {
  const body = `Your Snooze You Lose verification code is: ${code}\n\nThis code expires in 10 minutes.`
  return sendSMS(to, body)
}

/**
 * Send alarm wake-up SMS with code
 */
export async function sendAlarmSMS(to: string, code: string, stakeAmount: number): Promise<{ success: boolean; error?: string }> {
  const body = `⏰ WAKE UP! Your alarm is ringing!\n\n$${stakeAmount} is at stake!\n\nReply with code: ${code}\n\nYou have 5 minutes to respond or you lose your money!`
  return sendSMS(to, body)
}

/**
 * Make alarm wake-up call
 */
export async function makeAlarmCall(
  to: string,
  code: string,
  stakeAmount: number,
  webhookUrl: string
): Promise<{ success: boolean; error?: string }> {
  const message = `
    Wake up! This is your Snooze You Lose alarm.
    You have ${stakeAmount} dollars at stake.
    Your verification code is ${code.split('').join(' ')}.
    I repeat, your code is ${code.split('').join(' ')}.
  `
  return makeCall(to, message, webhookUrl)
}

/**
 * Format phone number to E.164 format
 */
function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) {
    return `+1${digits}`
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  }
  return `+${digits}`
}
