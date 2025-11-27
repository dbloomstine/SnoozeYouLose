// API client for Snooze You Lose backend

const API_BASE = '/api'

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

// Generic fetch wrapper with auth
async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers
  }

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong')
  }

  return data
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

export async function addFunds(amount: number): Promise<{ walletBalance: number }> {
  return fetchAPI<{ walletBalance: number }>('/user/add-funds', {
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
