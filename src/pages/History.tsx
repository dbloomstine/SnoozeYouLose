import { useStore } from '../store/useStore'
import { format } from 'date-fns'

export default function History() {
  const { alarmHistory, setScreen } = useStore()

  const totalLost = alarmHistory
    .filter(h => h.result === 'failed')
    .reduce((sum, h) => sum + h.penaltyCharged, 0)

  const totalSaved = alarmHistory
    .filter(h => h.result === 'success')
    .reduce((sum, h) => sum + h.stakeAmount, 0)

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: '20px' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>History</h1>
        <p style={{ marginBottom: '2rem' }}>Your alarm track record</p>

        {/* Summary Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--success)' }}>
              ${totalSaved.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Total Saved
            </div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent)' }}>
              ${totalLost.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Total Lost
            </div>
          </div>
        </div>

        {/* History List */}
        {alarmHistory.length > 0 ? (
          <div>
            {alarmHistory.map(item => (
              <div key={item.id} className="history-item">
                <div>
                  <div style={{ fontWeight: '600' }}>
                    {format(new Date(item.scheduledFor), 'h:mm a')}
                  </div>
                  <div className="date">
                    {format(new Date(item.scheduledFor), 'EEEE, MMM d, yyyy')}
                  </div>
                  {item.acknowledgedAt && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: '4px' }}>
                      Responded at {format(new Date(item.acknowledgedAt), 'h:mm:ss a')}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`badge ${item.result === 'success' ? 'badge-success' : 'badge-danger'}`}>
                    {item.result === 'success' ? 'Woke Up' : 'Snoozed'}
                  </span>
                  <div className={`result ${item.result}`} style={{ marginTop: '8px' }}>
                    {item.result === 'success' ? '+' : '-'}${item.stakeAmount}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center' }}>
            <p style={{ marginBottom: '0' }}>
              No alarm history yet. Set your first alarm to get started!
            </p>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <nav className="nav">
        <button className="nav-item" onClick={() => setScreen('dashboard')}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
          </svg>
          Home
        </button>
        <button className="nav-item active" onClick={() => setScreen('history')}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
          </svg>
          History
        </button>
      </nav>
    </div>
  )
}
