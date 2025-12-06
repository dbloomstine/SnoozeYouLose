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

  // Initialize on mount - restore session if token exists
  useEffect(() => {
    if (token) {
      api.setToken(token)
      refreshUser()
      fetchAlarms()

      // If authenticated, make sure we're on a valid screen
      if (isAuthenticated && currentScreen === 'welcome') {
        setScreen('dashboard')
      }
    }
  }, []) // Only run on mount

  // Check if alarm should trigger
  const checkAlarmTrigger = useCallback(() => {
    if (!activeAlarm) return
    if (activeAlarm.status !== 'pending') return
    if (triggeredAlarmId.current === activeAlarm.id) return

    const scheduledTime = new Date(activeAlarm.scheduledFor).getTime()
    const now = Date.now()

    // If scheduled time has passed, trigger the alarm
    if (now >= scheduledTime) {
      console.log('Alarm time reached, triggering...')
      triggeredAlarmId.current = activeAlarm.id
      testTriggerAlarm()
    }
  }, [activeAlarm, testTriggerAlarm])

  // Poll for alarm trigger every 5 seconds
  useEffect(() => {
    if (!isAuthenticated || !activeAlarm) return

    // Check immediately
    checkAlarmTrigger()

    // Then poll every 5 seconds
    const interval = setInterval(() => {
      checkAlarmTrigger()
      // Also refresh alarms from server to sync state
      fetchAlarms()
    }, 5000)

    return () => clearInterval(interval)
  }, [isAuthenticated, activeAlarm, checkAlarmTrigger, fetchAlarms])

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
