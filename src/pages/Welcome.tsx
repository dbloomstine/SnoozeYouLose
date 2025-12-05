import { useStore } from '../store/useStore'
import type { Screen } from '../store/useStore'

export default function Welcome() {
  const { setScreen, isAuthenticated } = useStore()

  // If already logged in, go to dashboard
  if (isAuthenticated) {
    setScreen('dashboard')
    return null
  }

  return (
    <div className="page">
      <div className="container" style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minHeight: '100vh',
        textAlign: 'center'
      }}>
        <span className="hero-emoji float">⏰</span>
        <h1 className="hero-title">Snooze You Lose</h1>
        <p className="hero-subtitle">Wake up or pay up</p>

        <div className="card" style={{ marginBottom: '2rem' }}>
          <ul className="feature-list">
            <li>
              <span className="feature-number">1</span>
              <span>Deposit money into your wallet</span>
            </li>
            <li>
              <span className="feature-number">2</span>
              <span>Set an alarm and stake your cash</span>
            </li>
            <li>
              <span className="feature-number">3</span>
              <span>We call & text you at alarm time</span>
            </li>
            <li>
              <span className="feature-number">4</span>
              <span>Respond in time = keep your money</span>
            </li>
            <li>
              <span className="feature-number">5</span>
              <span>Miss it = lose your stake forever</span>
            </li>
          </ul>
        </div>

        <button
          className="btn btn-primary btn-large glow"
          onClick={() => setScreen('signup')}
        >
          Start Waking Up
        </button>

        <p style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Put your money where your snooze is
        </p>

        <div style={{
          marginTop: '3rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--border-color)',
          fontSize: '0.8rem',
          color: 'var(--text-muted)'
        }}>
          <p style={{ marginBottom: '0.5rem' }}>
            By signing up, you consent to receive SMS messages and phone calls for alarm notifications.
            Message frequency depends on alarms set. Msg & data rates may apply.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
            <button
              onClick={() => setScreen('privacy' as Screen)}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              Privacy Policy
            </button>
            <button
              onClick={() => setScreen('terms' as Screen)}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              Terms of Service
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
