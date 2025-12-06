import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  getAuthenticatedUser,
  getSupabaseClient,
  generateSecureId,
  generateVerificationCode,
  validateStakeAmount,
  validateScheduledTime,
  isConfigured
} from '../lib/security'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!isConfigured()) {
      return res.status(500).json({ error: 'Server not configured' })
    }

    const user = await getAuthenticatedUser(req)
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const supabase = getSupabaseClient()

    // GET - List alarms
    if (req.method === 'GET') {
      const { data: alarms } = await supabase
        .from('alarms')
        .select()
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      const { data: activeAlarm } = await supabase
        .from('alarms')
        .select()
        .eq('user_id', user.id)
        .in('status', ['pending', 'ringing'])
        .single()

      return res.status(200).json({
        alarms: (alarms || []).map(a => formatAlarm(a, false)),
        activeAlarm: activeAlarm ? formatAlarm(activeAlarm, activeAlarm.status === 'ringing') : null
      })
    }

    // POST - Create alarm
    if (req.method === 'POST') {
      const { scheduledFor, stakeAmount } = req.body

      // Validate scheduled time
      if (!scheduledFor) {
        return res.status(400).json({ error: 'scheduledFor is required' })
      }

      const timeValidation = validateScheduledTime(scheduledFor)
      if (!timeValidation.valid) {
        return res.status(400).json({ error: timeValidation.error })
      }

      // Validate stake amount
      const stakeValidation = validateStakeAmount(stakeAmount)
      if (!stakeValidation.valid) {
        return res.status(400).json({ error: stakeValidation.error })
      }

      const validatedStake = stakeValidation.value!

      // Check balance (fetch fresh to prevent race conditions)
      const { data: freshUser, error: userError } = await supabase
        .from('users')
        .select('wallet_balance')
        .eq('id', user.id)
        .single()

      if (userError || !freshUser) {
        return res.status(500).json({ error: 'Failed to verify balance' })
      }

      if (freshUser.wallet_balance < validatedStake) {
        return res.status(400).json({ error: 'Insufficient balance' })
      }

      // Check for existing active alarm
      const { data: existingAlarm } = await supabase
        .from('alarms')
        .select('id')
        .eq('user_id', user.id)
        .in('status', ['pending', 'ringing'])
        .single()

      if (existingAlarm) {
        return res.status(400).json({ error: 'You already have an active alarm' })
      }

      // Create alarm with atomic balance update
      // First deduct balance
      const { error: updateError } = await supabase
        .from('users')
        .update({
          wallet_balance: freshUser.wallet_balance - validatedStake,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .eq('wallet_balance', freshUser.wallet_balance) // Optimistic lock

      if (updateError) {
        return res.status(500).json({ error: 'Failed to process stake' })
      }

      // Verify the update actually happened (balance might have changed)
      const { data: updatedUser } = await supabase
        .from('users')
        .select('wallet_balance')
        .eq('id', user.id)
        .single()

      if (!updatedUser || updatedUser.wallet_balance !== freshUser.wallet_balance - validatedStake) {
        // Race condition occurred, balance was changed by another request
        return res.status(409).json({ error: 'Balance changed, please try again' })
      }

      // Create the alarm
      const alarm = {
        id: generateSecureId(),
        user_id: user.id,
        scheduled_for: timeValidation.date!.toISOString(),
        stake_amount: validatedStake,
        status: 'pending',
        verification_code: generateVerificationCode(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: createdAlarm, error: createError } = await supabase
        .from('alarms')
        .insert(alarm)
        .select()
        .single()

      if (createError) {
        // Rollback: refund the stake
        await supabase
          .from('users')
          .update({
            wallet_balance: freshUser.wallet_balance,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)

        console.error('Create alarm error:', createError)
        return res.status(500).json({ error: 'Failed to create alarm' })
      }

      return res.status(201).json({
        success: true,
        alarm: formatAlarm(createdAlarm, false)
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('Alarms error:', error)
    return res.status(500).json({ error: 'An error occurred' })
  }
}

/**
 * Format alarm for API response
 * @param alarm - Raw alarm from database
 * @param includeCode - Whether to include verification code (only when ringing)
 */
function formatAlarm(alarm: any, includeCode: boolean) {
  const result: any = {
    id: alarm.id,
    scheduledFor: alarm.scheduled_for,
    stakeAmount: alarm.stake_amount,
    status: alarm.status,
    createdAt: alarm.created_at,
    acknowledgedAt: alarm.acknowledged_at
  }

  // Only include verification code when alarm is actively ringing
  // This prevents users from just looking up the code before the alarm
  if (includeCode && alarm.status === 'ringing') {
    result.verificationCode = alarm.verification_code
  }

  return result
}
