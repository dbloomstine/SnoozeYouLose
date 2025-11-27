import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVerification } from '../lib/database'
import { sendVerificationCode, isTwilioConfigured } from '../lib/twilio'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { phoneNumber } = req.body

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' })
    }

    // Create verification record
    const verification = await createVerification(phoneNumber)

    // Send SMS with code
    const smsResult = await sendVerificationCode(phoneNumber, verification.code)

    if (!smsResult.success) {
      return res.status(500).json({ error: 'Failed to send verification code' })
    }

    // In test mode, include the code in response (remove in production!)
    const response: any = {
      success: true,
      message: 'Verification code sent'
    }

    if (!isTwilioConfigured()) {
      response.testMode = true
      response.code = verification.code // Only for testing!
    }

    return res.status(200).json(response)
  } catch (error: any) {
    console.error('Send code error:', error)
    return res.status(500).json({ error: error.message })
  }
}
