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

const POLL_INTERVAL = 5000 // 5 seconds

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
    triggerAlarm
  } = useStore()

  const triggeredAlarmId = useRef<string | null>(null)
  const isInitialized = useRef(false)

  // Handle deep links from SMS (e.g., ?alarm=ring)
  useEffect(() => {
    if (!token) return

    const params = new URLSearchParams(window.location.search)
    if (params.get('alarm') !== 'ring') return

    // Clear URL param
    window.history.replaceState({}, '', window.location.pathname)

    // Set token and fetch alarms
    api.setToken(token)
    fetchAlarms().then(() => {
      const { activeAlarm } = useStore.getState()
      if (activeAlarm?.status === 'pending') {
        triggerAlarm()
      } else if (activeAlarm?.status === 'ringing') {
        setScreen('alarm-ringing')
      }
    })
  }, [token, fetchAlarms, triggerAlarm, setScreen])

  // Initialize session on mount
  useEffect(() => {
    if (!token || isInitialized.current) return

    isInitialized.current = true
    api.setToken(token)
    refreshUser()
    fetchAlarms()

    if (isAuthenticated && currentScreen === 'welcome') {
      setScreen('dashboard')
    }
  }, [token, isAuthenticated, currentScreen, refreshUser, fetchAlarms, setScreen])

  // Check and trigger alarm when time is reached
  const checkAlarmTrigger = useCallback(() => {
    if (!activeAlarm || activeAlarm.status !== 'pending') return
    if (triggeredAlarmId.current === activeAlarm.id) return

    const scheduledTime = new Date(activeAlarm.scheduledFor).getTime()
    if (Date.now() >= scheduledTime) {
      triggeredAlarmId.current = activeAlarm.id
      triggerAlarm()
    }
  }, [activeAlarm, triggerAlarm])

  // Poll for alarm trigger
  useEffect(() => {
    if (!token || !activeAlarm) return

    checkAlarmTrigger()

    const interval = setInterval(() => {
      checkAlarmTrigger()
      fetchAlarms()
    }, POLL_INTERVAL)

    return () => clearInterval(interval)
  }, [token, activeAlarm, checkAlarmTrigger, fetchAlarms])

  // Reset trigger tracking when alarm clears
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
    <div className="app" role="application" aria-label="Snooze You Lose">
      {isTestMode && (
        <div className="test-banner" role="alert">
          TEST MODE - Using simulated money
        </div>
      )}
      <main>
        {renderScreen()}
      </main>
    </div>
  )
}

export default App
