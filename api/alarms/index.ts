import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { jwtVerify } from 'jose'

// Environment config
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY
const jwtSecret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-in-production')

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

function generateCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

async function getAuthenticatedUser(req: VercelRequest) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  try {
    const { payload } = await jwtVerify(token, jwtSecret)
    const userId = payload.userId as string
    if (!userId || !supabaseUrl || !supabaseKey) return null

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: user } = await supabase.from('users').select().eq('id', userId).single()
    return user
  } catch {
    return null
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Database not configured' })
    }

    const user = await getAuthenticatedUser(req)
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

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
        alarms: (alarms || []).map(formatAlarm),
        activeAlarm: activeAlarm ? formatAlarm(activeAlarm) : null
      })
    }

    // POST - Create alarm
    if (req.method === 'POST') {
      const { scheduledFor, stakeAmount } = req.body

      if (!scheduledFor || !stakeAmount) {
        return res.status(400).json({ error: 'scheduledFor and stakeAmount are required' })
      }

      if (stakeAmount <= 0) {
        return res.status(400).json({ error: 'Stake amount must be positive' })
      }

      if (user.wallet_balance < stakeAmount) {
        return res.status(400).json({ error: 'Insufficient balance' })
      }

      // Check for existing active alarm
      const { data: existingAlarm } = await supabase
        .from('alarms')
        .select()
        .eq('user_id', user.id)
        .in('status', ['pending', 'ringing'])
        .single()

      if (existingAlarm) {
        return res.status(400).json({ error: 'You already have an active alarm' })
      }

      // Deduct stake from wallet
      await supabase
        .from('users')
        .update({ wallet_balance: user.wallet_balance - stakeAmount, updated_at: new Date().toISOString() })
        .eq('id', user.id)

      // Create alarm
      const alarm = {
        id: generateId(),
        user_id: user.id,
        scheduled_for: new Date(scheduledFor).toISOString(),
        stake_amount: stakeAmount,
        status: 'pending',
        verification_code: generateCode(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: createdAlarm, error: createError } = await supabase
        .from('alarms')
        .insert(alarm)
        .select()
        .single()

      if (createError) {
        console.error('Create alarm error:', createError)
        return res.status(500).json({ error: 'Failed to create alarm' })
      }

      return res.status(201).json({
        success: true,
        alarm: formatAlarm(createdAlarm)
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('Alarms error:', error)
    return res.status(500).json({ error: error.message })
  }
}

function formatAlarm(alarm: any) {
  return {
    id: alarm.id,
    scheduledFor: alarm.scheduled_for,
    stakeAmount: alarm.stake_amount,
    status: alarm.status,
    verificationCode: alarm.verification_code,
    createdAt: alarm.created_at,
    acknowledgedAt: alarm.acknowledged_at
  }
}
