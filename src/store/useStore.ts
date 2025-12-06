import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import * as api from '../lib/api'

// ============ Types ============

export interface User {
  id: string
  phoneNumber: string
  walletBalance: number
}

export interface Alarm {
  id: string
  scheduledFor: string
  stakeAmount: number
  status: 'pending' | 'ringing' | 'acknowledged' | 'failed' | 'cancelled'
  createdAt: string
  acknowledgedAt?: string
  verificationCode?: string
}

export type Screen =
  | 'welcome'
  | 'signup'
  | 'verify'
  | 'dashboard'
  | 'set-alarm'
  | 'alarm-ringing'
  | 'history'
  | 'privacy'
  | 'terms'

interface AppState {
  // UI State
  currentScreen: Screen
  isLoading: boolean
  error: string | null

  // Auth State
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isTestMode: boolean

  // Verification flow
  pendingPhone: string | null
  testVerificationCode: string | null

  // Alarms
  activeAlarm: Alarm | null
  alarmHistory: Alarm[]

  // Actions
  setScreen: (screen: Screen) => void
  clearError: () => void
  setPendingPhone: (phone: string | null) => void
  sendCode: (phoneNumber: string) => Promise<{ success: boolean; testCode?: string }>
  verifyCode: (phoneNumber: string, code: string) => Promise<boolean>
  logout: () => void
  refreshUser: () => Promise<void>
  fetchAlarms: () => Promise<void>
  createAlarm: (time: string, stakeAmount: number, date?: string) => Promise<boolean>
  cancelAlarm: () => Promise<void>
  acknowledgeAlarm: (code: string) => Promise<boolean>
  triggerAlarm: () => Promise<void>
  failAlarm: () => void
}

// ============ Store ============

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial State
      currentScreen: 'welcome',
      isLoading: false,
      error: null,
      user: null,
      token: null,
      isAuthenticated: false,
      isTestMode: false,
      pendingPhone: null,
      testVerificationCode: null,
      activeAlarm: null,
      alarmHistory: [],

      // ============ UI Actions ============

      setScreen: (screen) => set({ currentScreen: screen }),

      clearError: () => set({ error: null }),

      setPendingPhone: (phone) => set({ pendingPhone: phone }),

      // ============ Auth Actions ============

      sendCode: async (phoneNumber) => {
        set({ isLoading: true, error: null })
        try {
          const response = await api.sendVerificationCode(phoneNumber)
          set({
            pendingPhone: phoneNumber,
            testVerificationCode: response.code || null,
            isTestMode: response.testMode || false,
            isLoading: false
          })
          return { success: true, testCode: response.code }
        } catch (err: any) {
          set({ error: err.message, isLoading: false })
          return { success: false }
        }
      },

      verifyCode: async (phoneNumber, code) => {
        set({ isLoading: true, error: null })
        try {
          const response = await api.verifyCode(phoneNumber, code)
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            currentScreen: 'dashboard',
            isLoading: false,
            pendingPhone: null,
            testVerificationCode: null
          })
          // Fetch alarms after login
          get().fetchAlarms()
          return true
        } catch (err: any) {
          set({ error: err.message, isLoading: false })
          return false
        }
      },

      logout: () => {
        api.clearToken()
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          activeAlarm: null,
          alarmHistory: [],
          currentScreen: 'welcome',
          error: null
        })
      },

      refreshUser: async () => {
        const { token } = get()
        if (!token) return

        try {
          const user = await api.getCurrentUser()
          set({ user, isAuthenticated: true })
        } catch {
          // Token invalid, log out
          get().logout()
        }
      },

      // ============ Alarm Actions ============

      fetchAlarms: async () => {
        const { token } = get()
        if (!token) return

        try {
          const response = await api.getAlarms()
          set({
            activeAlarm: response.activeAlarm,
            alarmHistory: response.alarms.filter(a =>
              ['acknowledged', 'failed', 'cancelled'].includes(a.status)
            )
          })

          // If alarm is ringing, go to ringing screen
          if (response.activeAlarm?.status === 'ringing') {
            set({ currentScreen: 'alarm-ringing' })
          }
        } catch (err: any) {
          console.error('Failed to fetch alarms:', err.message)
        }
      },

      createAlarm: async (time, stakeAmount, date) => {
        set({ isLoading: true, error: null })
        try {
          const [hours, minutes] = time.split(':').map(Number)

          let scheduledFor: Date
          if (date) {
            const [year, month, day] = date.split('-').map(Number)
            scheduledFor = new Date(year, month - 1, day, hours, minutes, 0, 0)
          } else {
            scheduledFor = new Date()
            scheduledFor.setHours(hours, minutes, 0, 0)
            if (scheduledFor <= new Date()) {
              scheduledFor.setDate(scheduledFor.getDate() + 1)
            }
          }

          const response = await api.createAlarm(scheduledFor, stakeAmount)
          const { user } = get()

          if (user) {
            set({
              user: { ...user, walletBalance: user.walletBalance - stakeAmount },
              activeAlarm: response.alarm,
              currentScreen: 'dashboard',
              isLoading: false
            })
          }
          return true
        } catch (err: any) {
          set({ error: err.message, isLoading: false })
          return false
        }
      },

      cancelAlarm: async () => {
        const { activeAlarm, user } = get()
        if (!activeAlarm || !user) return

        set({ isLoading: true, error: null })
        try {
          await api.cancelAlarm(activeAlarm.id)
          set({
            user: { ...user, walletBalance: user.walletBalance + activeAlarm.stakeAmount },
            activeAlarm: null,
            isLoading: false
          })
        } catch (err: any) {
          set({ error: err.message, isLoading: false })
        }
      },

      acknowledgeAlarm: async (code) => {
        const { activeAlarm, user } = get()
        if (!activeAlarm || !user) return false

        set({ isLoading: true, error: null })
        try {
          await api.acknowledgeAlarm(activeAlarm.id, code)
          set({
            user: { ...user, walletBalance: user.walletBalance + activeAlarm.stakeAmount },
            activeAlarm: null,
            alarmHistory: [
              { ...activeAlarm, status: 'acknowledged', acknowledgedAt: new Date().toISOString() },
              ...get().alarmHistory
            ],
            currentScreen: 'dashboard',
            isLoading: false
          })
          return true
        } catch (err: any) {
          set({ error: err.message, isLoading: false })
          return false
        }
      },

      triggerAlarm: async () => {
        const { activeAlarm } = get()
        if (!activeAlarm) return

        try {
          const response = await api.triggerAlarm(activeAlarm.id)

          if (response.success) {
            set({
              activeAlarm: {
                ...activeAlarm,
                status: 'ringing',
                verificationCode: response.code
              },
              currentScreen: 'alarm-ringing'
            })
          } else {
            // Alarm might already be ringing - fetch fresh data
            await get().fetchAlarms()
          }
        } catch (err: any) {
          // If trigger fails, still try to show ringing screen
          // The alarm might already be ringing server-side
          if (err.message.includes('pending')) {
            await get().fetchAlarms()
          } else {
            set({
              activeAlarm: { ...activeAlarm, status: 'ringing' },
              currentScreen: 'alarm-ringing'
            })
          }
        }
      },

      failAlarm: () => {
        const { activeAlarm } = get()
        if (!activeAlarm) return

        set({
          activeAlarm: null,
          alarmHistory: [
            { ...activeAlarm, status: 'failed' },
            ...get().alarmHistory
          ],
          currentScreen: 'dashboard'
        })
      }
    }),
    {
      name: 'snooze-you-lose-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)
