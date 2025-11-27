import { useStore } from './store/useStore'
import Welcome from './pages/Welcome'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import SetAlarm from './pages/SetAlarm'
import AlarmRinging from './pages/AlarmRinging'
import History from './pages/History'

function App() {
  const { currentScreen, isTestMode } = useStore()

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
