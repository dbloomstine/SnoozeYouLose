import twilio from 'twilio'

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const twilioPhone = process.env.TWILIO_PHONE_NUMBER

// Only create client if credentials are available
const client = accountSid && authToken ? twilio(accountSid, authToken) : null

// Retry configuration
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000

export function isTwilioConfigured(): boolean {
  return !!(accountSid && authToken && twilioPhone)
}

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry wrapper for Twilio operations
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await operation()
    } catch (error: any) {
      lastError = error
      console.error(`${operationName} attempt ${attempt} failed:`, error.message)

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * attempt
        console.log(`Retrying ${operationName} in ${delay}ms...`)
        await sleep(delay)
      }
    }
  }

  throw lastError
}

/**
 * Send an SMS message with retry logic
 */
export async function sendSMS(to: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!client || !twilioPhone) {
    console.log('[TEST MODE] Would send SMS to', to, ':', body)
    return { success: true, messageId: 'test-mode' }
  }

  try {
    const message = await withRetry(
      () => client.messages.create({
        body,
        from: twilioPhone,
        to: formatPhoneNumber(to)
      }),
      'SMS send'
    )
    return { success: true, messageId: message.sid }
  } catch (error: any) {
    console.error('Twilio SMS error after retries:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Make a phone call with text-to-speech and retry logic
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
    const call = await withRetry(
      () => client.calls.create({
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
      }),
      'Phone call'
    )
    return { success: true, callId: call.sid }
  } catch (error: any) {
    console.error('Twilio call error after retries:', error)
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
  const appUrl = process.env.VERCEL_URL
    ? `https://snooze-you-lose.vercel.app`
    : 'http://localhost:5173'
  const body = `WAKE UP! $${stakeAmount} at stake!\n\nYour code: ${code}\n\nOpen app: ${appUrl}\n\nOr reply with the code. 5 min to respond!`
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
