import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import * as api from '../lib/api'

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
  verificationCode?: string // Only available in test mode
}

export type Screen = 'welcome' | 'signup' | 'verify' | 'dashboard' | 'set-alarm' | 'alarm-ringing' | 'history'

interface AppState {
  // UI State
  currentScreen: Screen
  setScreen: (screen: Screen) => void
  isLoading: boolean
  error: string | null
  clearError: () => void

  // Auth State
  user: User | null
  token: string | null
  isAuthenticated: boolean

  // Auth Actions
  sendCode: (phoneNumber: string) => Promise<{ success: boolean; testCode?: string }>
  verifyCode: (phoneNumber: string, code: string) => Promise<boolean>
  logout: () => void
  refreshUser: () => Promise<void>

  // Wallet
  addFunds: (amount: number) => Promise<void>

  // Alarms
  activeAlarm: Alarm | null
  alarmHistory: Alarm[]
  fetchAlarms: () => Promise<void>
  createAlarm: (time: string, stakeAmount: number) => Promise<boolean>
  cancelAlarm: () => Promise<void>
  acknowledgeAlarm: (code: string) => Promise<boolean>
  failAlarm: () => void

  // Test mode
  isTestMode: boolean
  testTriggerAlarm: () => Promise<void>

  // Verification state (for signup flow)
  pendingPhone: string | null
  setPendingPhone: (phone: string | null) => void
  testVerificationCode: string | null
}

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
      activeAlarm: null,
      alarmHistory: [],
      isTestMode: false,
      pendingPhone: null,
      testVerificationCode: null,

      // UI Actions
      setScreen: (screen) => set({ currentScreen: screen }),
      clearError: () => set({ error: null }),
      setPendingPhone: (phone) => set({ pendingPhone: phone }),

      // Auth Actions
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
          setTimeout(() => get().fetchAlarms(), 100)
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
          currentScreen: 'welcome'
        })
      },

      refreshUser: async () => {
        const { token } = get()
        if (!token) return

        try {
          const user = await api.getCurrentUser()
          set({ user })
        } catch (err) {
          // Token might be invalid, log out
          get().logout()
        }
      },

      // Wallet
      addFunds: async (amount) => {
        set({ isLoading: true, error: null })
        try {
          const response = await api.addFunds(amount)
          const { user } = get()
          if (user) {
            set({
              user: { ...user, walletBalance: response.walletBalance },
              isLoading: false
            })
          }
        } catch (err: any) {
          set({ error: err.message, isLoading: false })
        }
      },

      // Alarms
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
          console.error('Failed to fetch alarms:', err)
        }
      },

      createAlarm: async (time, stakeAmount) => {
        set({ isLoading: true, error: null })
        try {
          // Parse time and create scheduled date
          const [hours, minutes] = time.split(':').map(Number)
          const scheduledFor = new Date()
          scheduledFor.setHours(hours, minutes, 0, 0)

          // If time has passed today, schedule for tomorrow
          if (scheduledFor <= new Date()) {
            scheduledFor.setDate(scheduledFor.getDate() + 1)
          }

          const response = await api.createAlarm(scheduledFor, stakeAmount)

          // Update local state
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
        if (!activeAlarm) return

        set({ isLoading: true, error: null })
        try {
          await api.cancelAlarm(activeAlarm.id)

          // Refund stake to local state
          if (user) {
            set({
              user: { ...user, walletBalance: user.walletBalance + activeAlarm.stakeAmount },
              activeAlarm: null,
              isLoading: false
            })
          }
        } catch (err: any) {
          set({ error: err.message, isLoading: false })
        }
      },

      acknowledgeAlarm: async (code) => {
        const { activeAlarm, user } = get()
        if (!activeAlarm) return false

        set({ isLoading: true, error: null })
        try {
          await api.acknowledgeAlarm(activeAlarm.id, code)

          // Refund stake and move to history
          if (user) {
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
          }
          return true
        } catch (err: any) {
          set({ error: err.message, isLoading: false })
          return false
        }
      },

      failAlarm: () => {
        const { activeAlarm, alarmHistory } = get()
        if (!activeAlarm) return

        set({
          activeAlarm: null,
          alarmHistory: [
            { ...activeAlarm, status: 'failed' },
            ...alarmHistory
          ],
          currentScreen: 'dashboard'
        })
      },

      // Test mode - trigger alarm manually
      testTriggerAlarm: async () => {
        const { activeAlarm, token } = get()
        if (!activeAlarm) return

        try {
          // Call the test trigger endpoint
          const response = await fetch(`/api/alarms/${activeAlarm.id}/test-trigger`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })

          const data = await response.json()

          if (data.success || data.code) {
            set({
              activeAlarm: {
                ...activeAlarm,
                status: 'ringing',
                verificationCode: data.code
              },
              currentScreen: 'alarm-ringing'
            })
          } else {
            // Fallback - just trigger locally
            set({
              activeAlarm: { ...activeAlarm, status: 'ringing' },
              currentScreen: 'alarm-ringing'
            })
          }
        } catch (err: any) {
          // Fallback for test mode - just set to ringing locally
          set({
            activeAlarm: { ...activeAlarm, status: 'ringing' },
            currentScreen: 'alarm-ringing'
          })
        }
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
