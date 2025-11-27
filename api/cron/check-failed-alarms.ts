import type { VercelRequest, VercelResponse } from '@vercel/node'
import { updateAlarmStatus } from '../lib/database'
import { createClient } from '@supabase/supabase-js'

// Check for alarms that have been ringing for more than 5 minutes and mark them as failed

const ALARM_TIMEOUT_MINUTES = 5

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret
  const cronSecret = req.headers['x-cron-secret']
  if (cronSecret !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return res.status(200).json({ message: 'Database not configured, skipping' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Find alarms that have been ringing for too long
    const cutoffTime = new Date(Date.now() - ALARM_TIMEOUT_MINUTES * 60 * 1000).toISOString()

    const { data: expiredAlarms, error } = await supabase
      .from('alarms')
      .select('*')
      .eq('status', 'ringing')
      .lt('updated_at', cutoffTime)

    if (error) {
      throw error
    }

    console.log(`Found ${expiredAlarms?.length || 0} expired alarms`)

    const results = []

    for (const alarm of expiredAlarms || []) {
      try {
        // Mark alarm as failed - stake is already deducted, so it's lost
        await updateAlarmStatus(alarm.id, 'failed', {
          failed_at: new Date().toISOString()
        })

        results.push({
          alarmId: alarm.id,
          stakeAmount: alarm.stake_amount,
          status: 'marked_failed'
        })

        console.log(`Alarm ${alarm.id} marked as failed - user lost $${alarm.stake_amount}`)
      } catch (err: any) {
        console.error(`Error marking alarm ${alarm.id} as failed:`, err)
        results.push({
          alarmId: alarm.id,
          error: err.message
        })
      }
    }

    return res.status(200).json({
      checked: expiredAlarms?.length || 0,
      failed: results.length,
      results
    })
  } catch (error: any) {
    console.error('Check failed alarms error:', error)
    return res.status(500).json({ error: error.message })
  }
}
