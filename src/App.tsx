import { useEffect } from 'react'
import { useStore } from './store/useStore'
import * as api from './lib/api'
import Welcome from './pages/Welcome'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import SetAlarm from './pages/SetAlarm'
import AlarmRinging from './pages/AlarmRinging'
import History from './pages/History'

function App() {
  const {
    currentScreen,
    isTestMode,
    token,
    isAuthenticated,
    refreshUser,
    fetchAlarms,
    setScreen
  } = useStore()

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
