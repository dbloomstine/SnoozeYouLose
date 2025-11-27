import { useStore } from '../store/useStore'
import { format } from 'date-fns'

export default function Dashboard() {
  const {
    user,
    activeAlarm,
    setScreen,
    cancelAlarm,
    testTriggerAlarm,
    alarmHistory,
    addFunds,
    isTestMode,
    isLoading,
    logout
  } = useStore()

  if (!user) {
    setScreen('welcome')
    return null
  }

  const recentHistory = alarmHistory.slice(0, 3)
  const successCount = alarmHistory.filter(h => h.status === 'acknowledged').length
  const failCount = alarmHistory.filter(h => h.status === 'failed').length
  const totalSaved = alarmHistory
    .filter(h => h.status === 'acknowledged')
    .reduce((sum, h) => sum + h.stakeAmount, 0)
  const winRate = alarmHistory.length > 0
    ? Math.round((successCount / alarmHistory.length) * 100)
    : 0

  // Format time from ISO string
  const formatAlarmTime = (isoString: string) => {
    const date = new Date(isoString)
    return format(date, 'h:mm a')
  }

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: '20px' }}>
        {/* Header with logout */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Welcome back
            </div>
            <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
              {user.phoneNumber}
            </div>
          </div>
          <button
            onClick={logout}
            style={{
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              padding: '8px 14px',
              transition: 'all 0.2s'
            }}
          >
            Log out
          </button>
        </div>

        {/* Wallet */}
        <div className="wallet">
          <div className="wallet-label">💰 Your Balance</div>
          <div className={`wallet-balance ${user.walletBalance < 10 ? 'danger' : ''}`}>
            ${user.walletBalance.toFixed(2)}
          </div>
          {totalSaved > 0 && (
            <div style={{ fontSize: '0.85rem', color: 'var(--success)', marginTop: '8px', fontWeight: '500' }}>
              🏆 ${totalSaved.toFixed(0)} saved by waking up!
            </div>
          )}
          {isTestMode && (
            <button
              className="btn btn-secondary"
              style={{ marginTop: '16px', padding: '10px 20px', width: 'auto', display: 'inline-block', fontSize: '0.9rem' }}
              onClick={() => addFunds(50)}
              disabled={isLoading}
            >
              + Add $50 (Test Mode)
            </button>
          )}
        </div>

        {/* Active Alarm */}
        {activeAlarm ? (
          <div className="card card-highlight glow" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>⏰</span> Active Alarm
              </h3>
              <span className="badge badge-pending pulse">
                {activeAlarm.status === 'pending' ? '● Armed' : activeAlarm.status}
              </span>
            </div>
            <div className="alarm-time">{formatAlarmTime(activeAlarm.scheduledFor)}</div>
            <div className="alarm-stake">💸 ${activeAlarm.stakeAmount} on the line</div>
            <p style={{ textAlign: 'center', marginTop: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              {format(new Date(activeAlarm.scheduledFor), 'EEEE, MMM d')}
            </p>

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={cancelAlarm}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={testTriggerAlarm}
                disabled={isLoading}
              >
                🔔 Test Ring
              </button>
            </div>
          </div>
        ) : (
          <button
            className="btn btn-primary btn-large glow"
            style={{ marginBottom: '24px' }}
            onClick={() => setScreen('set-alarm')}
            disabled={user.walletBalance < 1}
          >
            ⏰ Set New Alarm
          </button>
        )}

        {user.walletBalance < 1 && !activeAlarm && (
          <div className="info-box" style={{ textAlign: 'center' }}>
            <strong>💡 Low Balance</strong>
            <p>Add funds to set your next alarm</p>
          </div>
        )}

        {/* Stats */}
        {alarmHistory.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📊</span> Your Stats
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div className="card stat-card">
                <div className="stat-number success">{successCount}</div>
                <div className="stat-label">Won</div>
              </div>
              <div className="card stat-card">
                <div className="stat-number danger">{failCount}</div>
                <div className="stat-label">Lost</div>
              </div>
              <div className="card stat-card">
                <div className="stat-number" style={{
                  background: winRate >= 50 ? 'var(--gradient-success)' : 'var(--gradient-danger)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  {winRate}%
                </div>
                <div className="stat-label">Win Rate</div>
              </div>
            </div>
          </div>
        )}

        {/* Recent History */}
        {recentHistory.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📜</span> Recent
              </h3>
              <button
                onClick={() => setScreen('history')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.9rem'
                }}
              >
                View All →
              </button>
            </div>
            {recentHistory.map(item => (
              <div key={item.id} className="history-item">
                <div>
                  <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{item.status === 'acknowledged' ? '✅' : '😴'}</span>
                    {format(new Date(item.scheduledFor), 'h:mm a')}
                  </div>
                  <div className="date">
                    {format(new Date(item.scheduledFor), 'MMM d, yyyy')}
                  </div>
                </div>
                <div>
                  <div className={`result ${item.status === 'acknowledged' ? 'success' : 'failed'}`}>
                    {item.status === 'acknowledged' ? '+' : '-'}${item.stakeAmount}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {alarmHistory.length === 0 && !activeAlarm && (
          <div className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🌅</div>
            <p style={{ marginBottom: '8px', fontWeight: '600', color: 'var(--text-primary)' }}>
              Ready to wake up?
            </p>
            <p style={{ marginBottom: '0', fontSize: '0.9rem' }}>
              Set your first alarm and put some money on the line!
            </p>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <nav className="nav">
        <button className="nav-item active" onClick={() => setScreen('dashboard')}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
          </svg>
          Home
        </button>
        <button className="nav-item" onClick={() => setScreen('history')}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
          </svg>
          History
        </button>
      </nav>
    </div>
  )
}
