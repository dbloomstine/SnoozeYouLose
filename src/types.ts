export interface User {
  id: string
  phoneNumber: string
  walletBalance: number
  createdAt: Date
}

export interface Alarm {
  id: string
  userId: string
  time: string // HH:MM format
  stakeAmount: number
  status: 'pending' | 'ringing' | 'acknowledged' | 'failed'
  scheduledFor: Date
  acknowledgedAt?: Date
  createdAt: Date
}

export interface AlarmHistory {
  id: string
  alarmId: string
  userId: string
  scheduledFor: Date
  stakeAmount: number
  result: 'success' | 'failed'
  acknowledgedAt?: Date
  penaltyCharged: number
  createdAt: Date
}

export type Screen = 'welcome' | 'signup' | 'verify' | 'dashboard' | 'set-alarm' | 'alarm-ringing' | 'history'
