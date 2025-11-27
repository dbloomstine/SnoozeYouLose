import { useStore } from '../store/useStore'
import { format } from 'date-fns'

export default function History() {
  const { alarmHistory, setScreen } = useStore()

  const totalLost = alarmHistory
    .filter(h => h.status === 'failed')
    .reduce((sum, h) => sum + h.stakeAmount, 0)

  const totalSaved = alarmHistory
    .filter(h => h.status === 'acknowledged')
    .reduce((sum, h) => sum + h.stakeAmount, 0)

  const successCount = alarmHistory.filter(h => h.status === 'acknowledged').length
  const failCount = alarmHistory.filter(h => h.status === 'failed').length

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: '20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '2.5rem', marginBottom: '0.5rem', display: 'block' }}>📊</span>
          <h1 style={{ marginBottom: '0.5rem' }}>History</h1>
          <p>Your alarm track record</p>
        </div>

        {/* Summary Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          <div className="card stat-card">
            <div className="stat-number success">${totalSaved.toFixed(0)}</div>
            <div className="stat-label">Total Saved</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {successCount} alarm{successCount !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="card stat-card">
            <div className="stat-number danger">${totalLost.toFixed(0)}</div>
            <div className="stat-label">Total Lost</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {failCount} alarm{failCount !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* History List */}
        {alarmHistory.length > 0 ? (
          <div>
            <h3 style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📜</span> All Alarms
            </h3>
            {alarmHistory.map(item => (
              <div key={item.id} className="history-item">
                <div>
                  <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{item.status === 'acknowledged' ? '✅' : '😴'}</span>
                    {format(new Date(item.scheduledFor), 'h:mm a')}
                  </div>
                  <div className="date">
                    {format(new Date(item.scheduledFor), 'EEEE, MMM d, yyyy')}
                  </div>
                  {item.acknowledgedAt && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: '6px' }}>
                      Responded at {format(new Date(item.acknowledgedAt), 'h:mm:ss a')}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`badge ${item.status === 'acknowledged' ? 'badge-success' : 'badge-danger'}`}>
                    {item.status === 'acknowledged' ? 'Won' : 'Lost'}
                  </span>
                  <div className={`result ${item.status === 'acknowledged' ? 'success' : 'failed'}`} style={{ marginTop: '8px' }}>
                    {item.status === 'acknowledged' ? '+' : '-'}${item.stakeAmount}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🌅</div>
            <p style={{ marginBottom: '8px', fontWeight: '600', color: 'var(--text-primary)' }}>
              No history yet
            </p>
            <p style={{ marginBottom: '0', fontSize: '0.9rem' }}>
              Set your first alarm to get started!
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
