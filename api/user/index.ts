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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    return res.status(200).json({
      id: user.id,
      phoneNumber: user.phone_number,
      walletBalance: user.wallet_balance
    })
  } catch (error: any) {
    console.error('Get user error:', error)
    return res.status(500).json({ error: error.message })
  }
}
