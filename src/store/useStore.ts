import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Alarm, AlarmHistory, Screen } from '../types'

interface AppState {
  // UI State
  currentScreen: Screen
  setScreen: (screen: Screen) => void

  // User State
  user: User | null
  isAuthenticated: boolean
  login: (phoneNumber: string) => void
  logout: () => void

  // Wallet
  addFunds: (amount: number) => void
  deductFunds: (amount: number) => void

  // Alarms
  activeAlarm: Alarm | null
  setAlarm: (time: string, stakeAmount: number) => void
  acknowledgeAlarm: () => void
  failAlarm: () => void
  cancelAlarm: () => void

  // Alarm simulation (test mode)
  simulateAlarmRinging: () => void

  // History
  alarmHistory: AlarmHistory[]

  // Test mode
  isTestMode: boolean
  setTestMode: (enabled: boolean) => void
}

const generateId = () => Math.random().toString(36).substring(2, 15)

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial UI State
      currentScreen: 'welcome',
      setScreen: (screen) => set({ currentScreen: screen }),

      // User State
      user: null,
      isAuthenticated: false,

      login: (phoneNumber) => {
        const user: User = {
          id: generateId(),
          phoneNumber,
          walletBalance: 50, // Start with $50 simulated money
          createdAt: new Date()
        }
        set({
          user,
          isAuthenticated: true,
          currentScreen: 'dashboard'
        })
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          activeAlarm: null,
          currentScreen: 'welcome'
        })
      },

      // Wallet
      addFunds: (amount) => {
        const { user } = get()
        if (user) {
          set({
            user: {
              ...user,
              walletBalance: user.walletBalance + amount
            }
          })
        }
      },

      deductFunds: (amount) => {
        const { user } = get()
        if (user) {
          set({
            user: {
              ...user,
              walletBalance: Math.max(0, user.walletBalance - amount)
            }
          })
        }
      },

      // Alarms
      activeAlarm: null,

      setAlarm: (time, stakeAmount) => {
        const { user, deductFunds } = get()
        if (!user || user.walletBalance < stakeAmount) return

        // Parse time and create scheduled date
        const [hours, minutes] = time.split(':').map(Number)
        const scheduledFor = new Date()
        scheduledFor.setHours(hours, minutes, 0, 0)

        // If time has passed today, schedule for tomorrow
        if (scheduledFor <= new Date()) {
          scheduledFor.setDate(scheduledFor.getDate() + 1)
        }

        const alarm: Alarm = {
          id: generateId(),
          userId: user.id,
          time,
          stakeAmount,
          status: 'pending',
          scheduledFor,
          createdAt: new Date()
        }

        // Deduct stake from wallet (held in escrow)
        deductFunds(stakeAmount)

        set({ activeAlarm: alarm, currentScreen: 'dashboard' })
      },

      acknowledgeAlarm: () => {
        const { activeAlarm, user, addFunds, alarmHistory } = get()
        if (!activeAlarm || !user) return

        // Return stake to wallet
        addFunds(activeAlarm.stakeAmount)

        // Add to history
        const historyEntry: AlarmHistory = {
          id: generateId(),
          alarmId: activeAlarm.id,
          userId: user.id,
          scheduledFor: activeAlarm.scheduledFor,
          stakeAmount: activeAlarm.stakeAmount,
          result: 'success',
          acknowledgedAt: new Date(),
          penaltyCharged: 0,
          createdAt: new Date()
        }

        set({
          activeAlarm: null,
          alarmHistory: [historyEntry, ...alarmHistory],
          currentScreen: 'dashboard'
        })
      },

      failAlarm: () => {
        const { activeAlarm, user, alarmHistory } = get()
        if (!activeAlarm || !user) return

        // Stake is already deducted, so it's lost
        const historyEntry: AlarmHistory = {
          id: generateId(),
          alarmId: activeAlarm.id,
          userId: user.id,
          scheduledFor: activeAlarm.scheduledFor,
          stakeAmount: activeAlarm.stakeAmount,
          result: 'failed',
          penaltyCharged: activeAlarm.stakeAmount,
          createdAt: new Date()
        }

        set({
          activeAlarm: null,
          alarmHistory: [historyEntry, ...alarmHistory],
          currentScreen: 'dashboard'
        })
      },

      cancelAlarm: () => {
        const { activeAlarm, addFunds } = get()
        if (!activeAlarm) return

        // Return stake to wallet
        addFunds(activeAlarm.stakeAmount)

        set({ activeAlarm: null })
      },

      simulateAlarmRinging: () => {
        const { activeAlarm } = get()
        if (!activeAlarm) return

        set({
          activeAlarm: { ...activeAlarm, status: 'ringing' },
          currentScreen: 'alarm-ringing'
        })
      },

      // History
      alarmHistory: [],

      // Test mode
      isTestMode: true,
      setTestMode: (enabled) => set({ isTestMode: enabled })
    }),
    {
      name: 'snooze-you-lose-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        activeAlarm: state.activeAlarm,
        alarmHistory: state.alarmHistory,
        isTestMode: state.isTestMode
      })
    }
  )
)
