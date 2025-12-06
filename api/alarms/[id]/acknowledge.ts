import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  getAuthenticatedUser,
  getSupabaseClient,
  isConfigured,
  checkRateLimit
} from '../../lib/security'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!isConfigured()) {
    return res.status(500).json({ error: 'Server not configured' })
  }

  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { id } = req.query
    const { code } = req.body

    // Validate alarm ID
    if (typeof id !== 'string' || !id || !/^[a-zA-Z0-9-]+$/.test(id)) {
      return res.status(400).json({ error: 'Invalid alarm ID' })
    }

    // Validate code format
    if (!code || typeof code !== 'string' || !/^\d{4}$/.test(code)) {
      return res.status(400).json({ error: 'Please enter a valid 4-digit code' })
    }

    // Rate limiting: max 10 acknowledgment attempts per alarm per 5 minutes
    const rateLimit = checkRateLimit(`ack:${id}`, 10, 300)
    if (!rateLimit.allowed) {
      return res.status(429).json({ error: 'Too many attempts. Please wait and try again.' })
    }

    const supabase = getSupabaseClient()

    // Get the alarm
    const { data: alarm, error: alarmError } = await supabase
      .from('alarms')
      .select()
      .eq('id', id)
      .single()

    if (alarmError || !alarm) {
      return res.status(404).json({ error: 'Alarm not found' })
    }

    if (alarm.user_id !== user.id) {
      return res.status(403).json({ error: 'Not your alarm' })
    }

    if (alarm.status !== 'ringing') {
      return res.status(400).json({ error: 'Alarm is not ringing' })
    }

    // Verify the code (constant-time comparison to prevent timing attacks)
    const codeMatch = alarm.verification_code.length === code.length &&
      alarm.verification_code.split('').reduce((acc, char, i) => acc && char === code[i], true)

    if (!codeMatch) {
      return res.status(400).json({ error: 'Invalid verification code' })
    }

    // Get fresh user balance to prevent race conditions
    const { data: freshUser } = await supabase
      .from('users')
      .select('wallet_balance')
      .eq('id', user.id)
      .single()

    if (!freshUser) {
      return res.status(500).json({ error: 'Failed to process refund' })
    }

    // Refund the stake (they woke up!)
    await supabase
      .from('users')
      .update({
        wallet_balance: freshUser.wallet_balance + alarm.stake_amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    // Update alarm status
    await supabase
      .from('alarms')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    return res.status(200).json({
      success: true,
      message: 'Alarm acknowledged! Your stake has been refunded.'
    })
  } catch (error: any) {
    console.error('Acknowledge alarm error:', error)
    return res.status(500).json({ error: 'An error occurred' })
  }
}
