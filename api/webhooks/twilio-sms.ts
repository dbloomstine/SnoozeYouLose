import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  getUserByPhone,
  getActiveAlarmForUser,
  updateAlarmStatus,
  updateUserBalance
} from '../lib/database'

// This webhook is called by Twilio when the user replies to an SMS

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { From, Body } = req.body // Twilio sends these fields

    if (!From || !Body) {
      return res.status(400).send(smsResponse('Invalid request'))
    }

    // Clean up phone number and message
    const phoneNumber = From.replace('+1', '').replace('+', '')
    const code = Body.trim()

    // Find user by phone number
    const user = await getUserByPhone(phoneNumber) || await getUserByPhone(From)
    if (!user) {
      return res.status(200).send(smsResponse(
        "We don't recognize this number. Please sign up at our website first."
      ))
    }

    // Get active alarm
    const alarm = await getActiveAlarmForUser(user.id)
    if (!alarm || alarm.status !== 'ringing') {
      return res.status(200).send(smsResponse(
        "You don't have an active alarm ringing right now."
      ))
    }

    // Check code
    if (code === alarm.verification_code) {
      // Success! Refund the stake
      await updateUserBalance(user.id, user.wallet_balance + alarm.stake_amount)
      await updateAlarmStatus(alarm.id, 'acknowledged', {
        acknowledged_at: new Date().toISOString()
      })

      return res.status(200).send(smsResponse(
        `✅ You're awake! Your $${alarm.stake_amount} has been refunded. Have a great day!`
      ))
    } else {
      return res.status(200).send(smsResponse(
        `❌ Wrong code. Your code is: ${alarm.verification_code}\n\nReply with the correct code to keep your $${alarm.stake_amount}!`
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
