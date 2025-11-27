import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Types
export interface DbUser {
  id: string
  phone_number: string
  wallet_balance: number
  created_at: string
  updated_at: string
}

export interface DbAlarm {
  id: string
  user_id: string
  scheduled_for: string
  stake_amount: number
  status: 'pending' | 'ringing' | 'acknowledged' | 'failed' | 'cancelled'
  verification_code: string
  created_at: string
  updated_at: string
  acknowledged_at?: string
  failed_at?: string
}

export interface DbVerification {
  id: string
  phone_number: string
  code: string
  expires_at: string
  verified: boolean
  created_at: string
}

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

let supabase: SupabaseClient | null = null

function getClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseKey) {
    console.log('[TEST MODE] Supabase not configured')
    return null
  }
  if (!supabase) {
    supabase = createClient(supabaseUrl, supabaseKey)
  }
  return supabase
}

export function isDatabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseKey)
}

// In-memory store for test mode
const testStore = {
  users: new Map<string, DbUser>(),
  alarms: new Map<string, DbAlarm>(),
  verifications: new Map<string, DbVerification>()
}

// ============ Users ============

export async function createUser(phoneNumber: string): Promise<DbUser> {
  const client = getClient()
  const user: DbUser = {
    id: generateId(),
    phone_number: phoneNumber,
    wallet_balance: 50, // Starting balance
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  if (!client) {
    testStore.users.set(user.id, user)
    return user
  }

  const { data, error } = await client.from('users').insert(user).select().single()
  if (error) throw error
  return data
}

export async function getUserByPhone(phoneNumber: string): Promise<DbUser | null> {
  const client = getClient()

  if (!client) {
    return Array.from(testStore.users.values()).find(u => u.phone_number === phoneNumber) || null
  }

  const { data, error } = await client
    .from('users')
    .select()
    .eq('phone_number', phoneNumber)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

export async function getUserById(id: string): Promise<DbUser | null> {
  const client = getClient()

  if (!client) {
    return testStore.users.get(id) || null
  }

  const { data, error } = await client.from('users').select().eq('id', id).single()
  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

export async function updateUserBalance(userId: string, newBalance: number): Promise<DbUser> {
  const client = getClient()

  if (!client) {
    const user = testStore.users.get(userId)
    if (!user) throw new Error('User not found')
    user.wallet_balance = newBalance
    user.updated_at = new Date().toISOString()
    return user
  }

  const { data, error } = await client
    .from('users')
    .update({ wallet_balance: newBalance, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ============ Verifications ============

export async function createVerification(phoneNumber: string): Promise<DbVerification> {
  const client = getClient()
  const verification: DbVerification = {
    id: generateId(),
    phone_number: phoneNumber,
    code: generateCode(),
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
    verified: false,
    created_at: new Date().toISOString()
  }

  if (!client) {
    testStore.verifications.set(verification.id, verification)
    return verification
  }

  // Delete any existing verifications for this phone
  await client.from('verifications').delete().eq('phone_number', phoneNumber)

  const { data, error } = await client.from('verifications').insert(verification).select().single()
  if (error) throw error
  return data
}

export async function verifyCode(phoneNumber: string, code: string): Promise<boolean> {
  const client = getClient()

  if (!client) {
    const verification = Array.from(testStore.verifications.values())
      .find(v => v.phone_number === phoneNumber && v.code === code && !v.verified)
    if (verification && new Date(verification.expires_at) > new Date()) {
      verification.verified = true
      return true
    }
    return false
  }

  const { data, error } = await client
    .from('verifications')
    .select()
    .eq('phone_number', phoneNumber)
    .eq('code', code)
    .eq('verified', false)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error || !data) return false

  await client.from('verifications').update({ verified: true }).eq('id', data.id)
  return true
}

// ============ Alarms ============

export async function createAlarm(userId: string, scheduledFor: Date, stakeAmount: number): Promise<DbAlarm> {
  const client = getClient()
  const alarm: DbAlarm = {
    id: generateId(),
    user_id: userId,
    scheduled_for: scheduledFor.toISOString(),
    stake_amount: stakeAmount,
    status: 'pending',
    verification_code: generateCode(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  if (!client) {
    testStore.alarms.set(alarm.id, alarm)
    return alarm
  }

  const { data, error } = await client.from('alarms').insert(alarm).select().single()
  if (error) throw error
  return data
}

export async function getAlarmById(id: string): Promise<DbAlarm | null> {
  const client = getClient()

  if (!client) {
    return testStore.alarms.get(id) || null
  }

  const { data, error } = await client.from('alarms').select().eq('id', id).single()
  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

export async function getActiveAlarmForUser(userId: string): Promise<DbAlarm | null> {
  const client = getClient()

  if (!client) {
    return Array.from(testStore.alarms.values())
      .find(a => a.user_id === userId && ['pending', 'ringing'].includes(a.status)) || null
  }

  const { data, error } = await client
    .from('alarms')
    .select()
    .eq('user_id', userId)
    .in('status', ['pending', 'ringing'])
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

export async function getAlarmsForUser(userId: string): Promise<DbAlarm[]> {
  const client = getClient()

  if (!client) {
    return Array.from(testStore.alarms.values())
      .filter(a => a.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  const { data, error } = await client
    .from('alarms')
    .select()
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getPendingAlarmsToTrigger(): Promise<DbAlarm[]> {
  const client = getClient()
  const now = new Date().toISOString()

  if (!client) {
    return Array.from(testStore.alarms.values())
      .filter(a => a.status === 'pending' && a.scheduled_for <= now)
  }

  const { data, error } = await client
    .from('alarms')
    .select()
    .eq('status', 'pending')
    .lte('scheduled_for', now)

  if (error) throw error
  return data || []
}

export async function updateAlarmStatus(
  id: string,
  status: DbAlarm['status'],
  additionalFields?: Partial<DbAlarm>
): Promise<DbAlarm> {
  const client = getClient()
  const updates = {
    status,
    updated_at: new Date().toISOString(),
    ...additionalFields
  }

  if (!client) {
    const alarm = testStore.alarms.get(id)
    if (!alarm) throw new Error('Alarm not found')
    Object.assign(alarm, updates)
    return alarm
  }

  const { data, error } = await client
    .from('alarms')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ============ Helpers ============

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

function generateCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}
