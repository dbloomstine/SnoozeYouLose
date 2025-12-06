import { useEffect, useRef, useCallback } from 'react'
import { useStore } from './store/useStore'
import * as api from './lib/api'
import Welcome from './pages/Welcome'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import SetAlarm from './pages/SetAlarm'
import AlarmRinging from './pages/AlarmRinging'
import History from './pages/History'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'

function App() {
  const {
    currentScreen,
    isTestMode,
    token,
    isAuthenticated,
    refreshUser,
    fetchAlarms,
    setScreen,
    activeAlarm,
    testTriggerAlarm
  } = useStore()

  // Track if we've already triggered for this alarm
  const triggeredAlarmId = useRef<string | null>(null)
  const isInitialized = useRef(false)

  // Check URL params for deep links (e.g., from SMS)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const alarmParam = params.get('alarm')

    if (alarmParam === 'ring' && token) {
      // Clear the URL param
      window.history.replaceState({}, '', window.location.pathname)

      // Set token for API calls
      api.setToken(token)

      // Fetch alarms and navigate to ringing screen if alarm is active
      fetchAlarms().then(() => {
        const state = useStore.getState()
        if (state.activeAlarm && ['pending', 'ringing'].includes(state.activeAlarm.status)) {
          // Trigger the alarm if pending, or just go to ringing screen
          if (state.activeAlarm.status === 'pending') {
            testTriggerAlarm()
          } else {
            setScreen('alarm-ringing')
          }
        }
      })
    }
  }, [token])

  // Initialize on mount - restore session if token exists
  useEffect(() => {
    if (token && !isInitialized.current) {
      isInitialized.current = true
      api.setToken(token)
      refreshUser()
      fetchAlarms()

      // If authenticated, make sure we're on a valid screen
      if (isAuthenticated && currentScreen === 'welcome') {
        setScreen('dashboard')
      }
    }
  }, [token]) // Run when token changes (including hydration)

  // Check if alarm should trigger
  const checkAlarmTrigger = useCallback(() => {
    if (!activeAlarm) return
    if (activeAlarm.status !== 'pending') return
    if (triggeredAlarmId.current === activeAlarm.id) return

    const scheduledTime = new Date(activeAlarm.scheduledFor).getTime()
    const now = Date.now()

    // If scheduled time has passed, trigger the alarm
    if (now >= scheduledTime) {
      console.log('Alarm time reached, triggering...', {
        scheduledFor: activeAlarm.scheduledFor,
        scheduledTime,
        now,
        diff: now - scheduledTime
      })
      triggeredAlarmId.current = activeAlarm.id
      testTriggerAlarm()
    }
  }, [activeAlarm, testTriggerAlarm])

  // Poll for alarm trigger every 5 seconds
  // Use token instead of isAuthenticated to avoid hydration race condition
  useEffect(() => {
    if (!token || !activeAlarm) return

    // Check immediately
    checkAlarmTrigger()

    // Then poll every 5 seconds
    const interval = setInterval(() => {
      checkAlarmTrigger()
      // Also refresh alarms from server to sync state
      fetchAlarms()
    }, 5000)

    return () => clearInterval(interval)
  }, [token, activeAlarm, checkAlarmTrigger, fetchAlarms])

  // Reset triggered alarm ID when alarm changes
  useEffect(() => {
    if (!activeAlarm) {
      triggeredAlarmId.current = null
    }
  }, [activeAlarm])

  const renderScreen = () => {
    switch (currentScreen) {
      case 'welcome':
        return <Welcome />
      case 'signup':
      case 'verify':
        return <Signup />
      case 'dashboard':
        return <Dashboard />
      case 'set-alarm':
        return <SetAlarm />
      case 'alarm-ringing':
        return <AlarmRinging />
      case 'history':
        return <History />
      case 'privacy':
        return <Privacy />
      case 'terms':
        return <Terms />
      default:
        return <Welcome />
    }
  }

  return (
    <div className="app">
      {isTestMode && (
        <div className="test-banner">
          TEST MODE - Using simulated money
        </div>
      )}
      {renderScreen()}
    </div>
  )
}

export default App
