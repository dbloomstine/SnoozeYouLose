import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  getAuthenticatedUser,
  getSupabaseClient,
  isConfigured
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

    // Validate alarm ID format
    if (typeof id !== 'string' || !id || !/^[a-zA-Z0-9-]+$/.test(id)) {
      return res.status(400).json({ error: 'Invalid alarm ID' })
    }

    const supabase = getSupabaseClient()

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

    if (alarm.status !== 'pending') {
      return res.status(400).json({ error: 'Can only cancel pending alarms' })
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

    // Refund the stake
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
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    return res.status(200).json({
      success: true,
      message: 'Alarm cancelled and stake refunded'
    })
  } catch (error: any) {
    console.error('Cancel alarm error:', error)
    return res.status(500).json({ error: 'An error occurred' })
  }
}
