import { randomUUID, randomInt } from 'crypto'
import type { VercelRequest } from '@vercel/node'
import { jwtVerify, SignJWT } from 'jose'
import { createClient } from '@supabase/supabase-js'

// ============ Environment Validation ============

const JWT_SECRET = process.env.JWT_SECRET
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

// Validate critical environment variables
export function validateEnv(): { valid: boolean; missing: string[] } {
  const missing: string[] = []

  if (!JWT_SECRET) missing.push('JWT_SECRET')
  if (!SUPABASE_URL) missing.push('SUPABASE_URL')
  if (!SUPABASE_SERVICE_KEY) missing.push('SUPABASE_SERVICE_KEY')

  return { valid: missing.length === 0, missing }
}

export function isConfigured(): boolean {
  return !!(JWT_SECRET && SUPABASE_URL && SUPABASE_SERVICE_KEY)
}

// Warn at module load if missing critical env vars
if (!JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET is not set. Authentication will fail.')
}

// ============ Secure Token Generation ============

const jwtSecretKey = JWT_SECRET
  ? new TextEncoder().encode(JWT_SECRET)
  : null

export async function signToken(payload: { userId: string }): Promise<string> {
  if (!jwtSecretKey) {
    throw new Error('JWT_SECRET is not configured')
  }

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(jwtSecretKey)
}

export async function verifyToken(token: string): Promise<{ userId: string } | null> {
  if (!jwtSecretKey) {
    console.error('JWT_SECRET is not configured')
    return null
  }

  try {
    const { payload } = await jwtVerify(token, jwtSecretKey)
    const userId = payload.userId as string
    if (!userId) return null
    return { userId }
  } catch {
    return null
  }
}

// ============ Secure ID Generation ============

/**
 * Generate a cryptographically secure random ID
 * Uses crypto.randomUUID() which is CSPRNG-backed
 */
export function generateSecureId(): string {
  return randomUUID().replace(/-/g, '')
}

/**
 * Generate a secure 4-digit verification code
 * Uses crypto.randomInt() which is CSPRNG-backed
 */
export function generateVerificationCode(): string {
  return randomInt(1000, 9999).toString()
}

/**
 * Generate a secure 6-digit verification code (more secure option)
 */
export function generateSecureCode(): string {
  return randomInt(100000, 999999).toString()
}

// ============ User Types ============

export interface DbUser {
  id: string
  phone_number: string
  wallet_balance: number
  created_at: string
  updated_at: string
}

// ============ Authentication ============

/**
 * Get authenticated user from request
 * Returns null if not authenticated or on error
 */
export async function getAuthenticatedUser(req: VercelRequest): Promise<DbUser | null> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  const payload = await verifyToken(token)
  if (!payload) return null

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Database not configured')
    return null
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { data: user, error } = await supabase
      .from('users')
      .select()
      .eq('id', payload.userId)
      .single()

    if (error) {
      console.error('User lookup error:', error.message)
      return null
    }

    return user
  } catch (err) {
    console.error('Authentication error:', err)
    return null
  }
}

/**
 * Get Supabase client (throws if not configured)
 */
export function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('Database not configured')
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}

// ============ Phone Number Validation ============

/**
 * Validate and normalize a US phone number
 * Returns null if invalid, otherwise returns 10-digit number
 */
export function validatePhoneNumber(phone: string): string | null {
  if (!phone) return null

  // Remove all non-digits
  const digits = phone.replace(/\D/g, '')

  // Handle +1 prefix
  const normalized = digits.startsWith('1') && digits.length === 11
    ? digits.slice(1)
    : digits

  // Must be exactly 10 digits
  if (normalized.length !== 10) return null

  // Basic validation: can't start with 0 or 1
  if (normalized[0] === '0' || normalized[0] === '1') return null

  return normalized
}

/**
 * Format phone number to E.164 format for Twilio
 */
export function formatE164(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) {
    return `+1${digits}`
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  }
  return `+${digits}`
}

// ============ Input Validation ============

/**
 * Validate stake amount
 */
export function validateStakeAmount(amount: unknown): { valid: boolean; error?: string; value?: number } {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return { valid: false, error: 'Stake amount must be a number' }
  }

  if (amount < 1) {
    return { valid: false, error: 'Minimum stake is $1' }
  }

  if (amount > 500) {
    return { valid: false, error: 'Maximum stake is $500' }
  }

  // Round to 2 decimal places
  const rounded = Math.round(amount * 100) / 100

  return { valid: true, value: rounded }
}

/**
 * Validate scheduled time is in the future
 */
export function validateScheduledTime(scheduledFor: string): { valid: boolean; error?: string; date?: Date } {
  try {
    const date = new Date(scheduledFor)

    if (isNaN(date.getTime())) {
      return { valid: false, error: 'Invalid date format' }
    }

    const now = new Date()

    // Must be at least 1 minute in the future
    if (date.getTime() < now.getTime() + 60000) {
      return { valid: false, error: 'Alarm must be at least 1 minute in the future' }
    }

    // Can't be more than 7 days in the future
    const maxDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    if (date.getTime() > maxDate.getTime()) {
      return { valid: false, error: 'Alarm cannot be more than 7 days in the future' }
    }

    return { valid: true, date }
  } catch {
    return { valid: false, error: 'Invalid date format' }
  }
}

// ============ Rate Limiting (Simple In-Memory) ============

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Simple in-memory rate limiter
 * Note: This resets on server restart and doesn't work across serverless instances
 * For production, use Redis or a proper rate limiting service
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt < now) rateLimitStore.delete(k)
    }
  }

  if (!entry || entry.resetAt < now) {
    // Start new window
    rateLimitStore.set(key, { count: 1, resetAt: now + windowSeconds * 1000 })
    return { allowed: true, remaining: maxRequests - 1, resetIn: windowSeconds }
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: Math.ceil((entry.resetAt - now) / 1000)
    }
  }

  entry.count++
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetIn: Math.ceil((entry.resetAt - now) / 1000)
  }
}

// ============ Twilio Signature Validation ============

import { createHmac } from 'crypto'

/**
 * Validate Twilio webhook signature
 * https://www.twilio.com/docs/usage/security#validating-requests
 */
export function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  if (!authToken || !signature || !url) return false

  // Sort params and create validation string
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], '')

  const data = url + sortedParams

  const computed = createHmac('sha1', authToken)
    .update(Buffer.from(data, 'utf-8'))
    .digest('base64')

  // Constant-time comparison to prevent timing attacks
  if (computed.length !== signature.length) return false

  let result = 0
  for (let i = 0; i < computed.length; i++) {
    result |= computed.charCodeAt(i) ^ signature.charCodeAt(i)
  }

  return result === 0
}
