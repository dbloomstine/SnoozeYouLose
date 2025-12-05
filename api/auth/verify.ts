import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { SignJWT } from 'jose'

// Environment config
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY
const jwtSecret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-in-production')

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

async function signToken(payload: { userId: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(jwtSecret)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { phoneNumber, code } = req.body

    if (!phoneNumber || !code) {
      return res.status(400).json({ error: 'Phone number and code are required' })
    }

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Database not configured' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verify the code
    const { data: verification, error: verifyError } = await supabase
      .from('verifications')
      .select()
      .eq('phone_number', phoneNumber)
      .eq('code', code)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (verifyError || !verification) {
      return res.status(400).json({ error: 'Invalid or expired code' })
    }

    // Mark as verified
    await supabase.from('verifications').update({ verified: true }).eq('id', verification.id)

    // Get or create user
    let { data: user } = await supabase
      .from('users')
      .select()
      .eq('phone_number', phoneNumber)
      .single()

    if (!user) {
      const newUser = {
        id: generateId(),
        phone_number: phoneNumber,
        wallet_balance: 0, // Users must add real funds via Stripe
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      const { data: createdUser, error: createError } = await supabase
        .from('users')
        .insert(newUser)
        .select()
        .single()

      if (createError) {
        console.error('Create user error:', createError)
        return res.status(500).json({ error: 'Failed to create user' })
      }
      user = createdUser
    }

    // Generate JWT token
    const token = await signToken({ userId: user.id })

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        phoneNumber: user.phone_number,
        walletBalance: user.wallet_balance
      }
    })
  } catch (error: any) {
    console.error('Verify error:', error)
    return res.status(500).json({ error: error.message })
  }
}
