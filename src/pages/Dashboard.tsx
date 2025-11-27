import { useStore } from '../store/useStore'
import { format } from 'date-fns'

export default function Dashboard() {
  const {
    user,
    activeAlarm,
    setScreen,
    cancelAlarm,
    simulateAlarmRinging,
    alarmHistory,
    addFunds,
    isTestMode
  } = useStore()

  if (!user) {
    setScreen('welcome')
    return null
  }

  const recentHistory = alarmHistory.slice(0, 3)
  const successCount = alarmHistory.filter(h => h.result === 'success').length
  const failCount = alarmHistory.filter(h => h.result === 'failed').length

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: '20px' }}>
        {/* Wallet */}
        <div className="wallet">
          <div className="wallet-label">Your Balance</div>
          <div className={`wallet-balance ${user.walletBalance < 10 ? 'danger' : ''}`}>
            ${user.walletBalance.toFixed(2)}
          </div>
          {isTestMode && (
            <button
              className="btn btn-secondary"
              style={{ marginTop: '12px', padding: '8px 16px', width: 'auto', display: 'inline-block' }}
              onClick={() => addFunds(50)}
            >
              + Add $50 (Test)
            </button>
          )}
        </div>

        {/* Active Alarm */}
        {activeAlarm ? (
          <div className="card card-highlight" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3>Active Alarm</h3>
              <span className="badge badge-pending">
                {activeAlarm.status === 'pending' ? 'Set' : activeAlarm.status}
              </span>
            </div>
            <div className="alarm-time">{activeAlarm.time}</div>
            <div className="alarm-stake">${activeAlarm.stakeAmount} at stake</div>
            <p style={{ textAlign: 'center', marginTop: '8px', fontSize: '0.875rem' }}>
              {format(new Date(activeAlarm.scheduledFor), 'EEEE, MMM d')}
            </p>

            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={cancelAlarm}
              >
                Cancel
              </button>
              {isTestMode && (
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={simulateAlarmRinging}
                >
                  Test Ring
                </button>
              )}
            </div>
          </div>
        ) : (
          <button
            className="btn btn-primary btn-large"
            style={{ marginBottom: '24px' }}
            onClick={() => setScreen('set-alarm')}
            disabled={user.walletBalance < 1}
          >
            Set New Alarm
          </button>
        )}

        {user.walletBalance < 1 && !activeAlarm && (
          <div style={{
            background: 'rgba(233, 69, 96, 0.1)',
            border: '1px solid var(--accent)',
            borderRadius: '12px',
            padding: '12px',
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            <p style={{ color: 'var(--accent)', margin: 0 }}>
              Add funds to set an alarm
            </p>
          </div>
        )}

        {/* Stats */}
        {alarmHistory.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--success)' }}>
                {successCount}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Woke Up
              </div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--accent)' }}>
                {failCount}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Snoozed
              </div>
            </div>
          </div>
        )}

        {/* Recent History */}
        {recentHistory.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3>Recent</h3>
              <button
                onClick={() => setScreen('history')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  cursor: 'pointer'
                }}
              >
                View All →
              </button>
            </div>
            {recentHistory.map(item => (
              <div key={item.id} className="history-item">
                <div>
                  <div style={{ fontWeight: '600' }}>
                    {format(new Date(item.scheduledFor), 'h:mm a')}
                  </div>
                  <div className="date">
                    {format(new Date(item.scheduledFor), 'MMM d, yyyy')}
                  </div>
                </div>
                <div>
                  <div className={`result ${item.result}`}>
                    {item.result === 'success' ? '+' : '-'}${item.stakeAmount}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {alarmHistory.length === 0 && !activeAlarm && (
          <div className="card" style={{ textAlign: 'center' }}>
            <p style={{ marginBottom: '0' }}>
              No alarms yet. Set your first alarm and put some money on the line!
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
