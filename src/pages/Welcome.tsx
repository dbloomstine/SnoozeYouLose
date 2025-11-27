import { useStore } from '../store/useStore'

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
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
          ⏰
        </div>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
          Snooze You Lose
        </h1>
        <p style={{ fontSize: '1.25rem', marginBottom: '3rem' }}>
          Wake up or pay up
        </p>

        <div style={{ marginBottom: '2rem' }}>
          <div className="card" style={{ textAlign: 'left' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--accent)' }}>How it works:</h3>
            <ol style={{ paddingLeft: '1.25rem', lineHeight: '2' }}>
              <li>Deposit money into your wallet</li>
              <li>Set an alarm and stake your cash</li>
              <li>We call & text you at alarm time</li>
              <li>Respond in time = keep your money</li>
              <li>Miss it = lose your stake</li>
            </ol>
          </div>
        </div>

        <button
          className="btn btn-primary btn-large"
          onClick={() => setScreen('signup')}
        >
          Get Started
        </button>

        <p style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
          Put your money where your snooze is
        </p>
      </div>
    </div>
  )
}
