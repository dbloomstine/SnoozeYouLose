// API client for Snooze You Lose backend

const API_BASE = '/api'
const DEFAULT_TIMEOUT = 15000 // 15 seconds
const MAX_RETRIES = 2
const RETRY_DELAY = 1000 // 1 second

// Get token from localStorage
function getToken(): string | null {
  return localStorage.getItem('auth_token')
}

// Set token in localStorage
export function setToken(token: string): void {
  localStorage.setItem('auth_token', token)
}

// Clear token from localStorage
export function clearToken(): void {
  localStorage.removeItem('auth_token')
}

// Check if error is retryable (network errors, 5xx)
function isRetryable(error: unknown): boolean {
  if (error instanceof TypeError) return true // Network error
  if (error instanceof Error && error.message.includes('timeout')) return true
  return false
}

// Sleep helper for retry delay
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Generic fetch wrapper with auth, timeout, and retry
async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {},
  retryCount = 0
): Promise<T> {
  const token = getToken()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT)

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers
  }

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    const data = await response.json()

    if (!response.ok) {
      // Handle auth errors - don't retry
      if (response.status === 401) {
        clearToken()
        throw new Error(data.error || 'Session expired. Please log in again.')
      }

      // Handle rate limiting
      if (response.status === 429) {
        throw new Error(data.error || 'Too many requests. Please wait a moment.')
      }

      throw new Error(data.error || 'Something went wrong')
    }

    return data
  } catch (error) {
    clearTimeout(timeoutId)

    // Handle abort (timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutError = new Error('Request timed out. Please check your connection.')

      if (retryCount < MAX_RETRIES) {
        await sleep(RETRY_DELAY * (retryCount + 1))
        return fetchAPI<T>(endpoint, options, retryCount + 1)
      }

      throw timeoutError
    }

    // Retry on network errors
    if (isRetryable(error) && retryCount < MAX_RETRIES) {
      await sleep(RETRY_DELAY * (retryCount + 1))
      return fetchAPI<T>(endpoint, options, retryCount + 1)
    }

    throw error
  }
}

// ============ Auth ============

export interface SendCodeResponse {
  success: boolean
  message: string
  testMode?: boolean
  code?: string // Only in test mode
}

export async function sendVerificationCode(phoneNumber: string): Promise<SendCodeResponse> {
  return fetchAPI<SendCodeResponse>('/auth/send-code', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber })
  })
}

export interface VerifyResponse {
  success: boolean
  token: string
  user: {
    id: string
    phoneNumber: string
    walletBalance: number
  }
}

export async function verifyCode(phoneNumber: string, code: string): Promise<VerifyResponse> {
  const response = await fetchAPI<VerifyResponse>('/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber, code })
  })

  // Store the token
  if (response.token) {
    setToken(response.token)
  }

  return response
}

// ============ User ============

export interface User {
  id: string
  phoneNumber: string
  walletBalance: number
}

export async function getCurrentUser(): Promise<User> {
  return fetchAPI<User>('/user')
}

// Stripe checkout for adding real funds
export async function createCheckoutSession(amount: number): Promise<{ url: string; sessionId: string }> {
  return fetchAPI<{ url: string; sessionId: string }>('/stripe/create-checkout', {
    method: 'POST',
    body: JSON.stringify({ amount })
  })
}

// ============ Alarms ============

export interface Alarm {
  id: string
  scheduledFor: string
  stakeAmount: number
  status: 'pending' | 'ringing' | 'acknowledged' | 'failed' | 'cancelled'
  createdAt: string
  acknowledgedAt?: string
  verificationCode?: string
}

export interface AlarmsResponse {
  alarms: Alarm[]
  activeAlarm: Alarm | null
}

export async function getAlarms(): Promise<AlarmsResponse> {
  return fetchAPI<AlarmsResponse>('/alarms')
}

export async function createAlarm(scheduledFor: Date, stakeAmount: number): Promise<{ alarm: Alarm }> {
  return fetchAPI<{ alarm: Alarm }>('/alarms', {
    method: 'POST',
    body: JSON.stringify({ scheduledFor: scheduledFor.toISOString(), stakeAmount })
  })
}

export async function cancelAlarm(alarmId: string): Promise<{ success: boolean }> {
  return fetchAPI<{ success: boolean }>(`/alarms/${alarmId}/cancel`, {
    method: 'POST'
  })
}

export async function acknowledgeAlarm(alarmId: string, code: string): Promise<{ success: boolean }> {
  return fetchAPI<{ success: boolean }>(`/alarms/${alarmId}/acknowledge`, {
    method: 'POST',
    body: JSON.stringify({ code })
  })
}

export async function triggerAlarm(alarmId: string): Promise<{ success: boolean; code?: string }> {
  return fetchAPI<{ success: boolean; code?: string }>(`/alarms/${alarmId}/test-trigger`, {
    method: 'POST'
  })
}
