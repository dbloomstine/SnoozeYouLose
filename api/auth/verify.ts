import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import {
  generateSecureId,
  signToken,
  validatePhoneNumber,
  checkRateLimit
} from '../lib/security'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { phoneNumber, code } = req.body

    // Validate inputs
    const validatedPhone = validatePhoneNumber(phoneNumber)
    if (!validatedPhone) {
      return res.status(400).json({ error: 'Invalid phone number' })
    }

    if (!code || typeof code !== 'string' || !/^\d{4}$/.test(code)) {
      return res.status(400).json({ error: 'Please enter a valid 4-digit code' })
    }

    // Rate limiting: max 10 verification attempts per phone per 15 minutes
    // Prevents brute force attacks on the 4-digit code
    const rateLimit = checkRateLimit(`verify:${validatedPhone}`, 10, 900)
    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: 'Too many attempts. Please request a new code.'
      })
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ error: 'Server not configured' })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Verify the code
    const { data: verification, error: verifyError } = await supabase
      .from('verifications')
      .select()
      .eq('phone_number', validatedPhone)
      .eq('code', code)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (verifyError || !verification) {
      return res.status(400).json({ error: 'Invalid or expired code' })
    }

    // Mark as verified
    await supabase
      .from('verifications')
      .update({ verified: true })
      .eq('id', verification.id)

    // Get or create user
    let { data: user } = await supabase
      .from('users')
      .select()
      .eq('phone_number', validatedPhone)
      .single()

    if (!user) {
      const newUser = {
        id: generateSecureId(),
        phone_number: validatedPhone,
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
        return res.status(500).json({ error: 'Failed to create account' })
      }
      user = createdUser
    }

    // Generate JWT token
    let token: string
    try {
      token = await signToken({ userId: user.id })
    } catch (tokenError) {
      console.error('Token generation error:', tokenError)
      return res.status(500).json({ error: 'Authentication failed. Please contact support.' })
    }

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
    return res.status(500).json({ error: 'An error occurred. Please try again.' })
  }
}
