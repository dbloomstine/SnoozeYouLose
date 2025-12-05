import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { jwtVerify } from 'jose'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY
const jwtSecret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-in-production')

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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Database not configured' })
  }

  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { id } = req.query
    if (typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid alarm ID' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: alarm } = await supabase
      .from('alarms')
      .select()
      .eq('id', id)
      .single()

    if (!alarm) {
      return res.status(404).json({ error: 'Alarm not found' })
    }

    if (alarm.user_id !== user.id) {
      return res.status(403).json({ error: 'Not your alarm' })
    }

    if (alarm.status !== 'pending') {
      return res.status(400).json({ error: 'Can only cancel pending alarms' })
    }

    // Refund the stake
    await supabase
      .from('users')
      .update({
        wallet_balance: user.wallet_balance + alarm.stake_amount,
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
    return res.status(500).json({ error: error.message })
  }
}
