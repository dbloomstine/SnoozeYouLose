import { useState } from 'react'
import { useStore } from '../store/useStore'

const STAKE_OPTIONS = [1, 5, 10, 20, 50, 100]

export default function SetAlarm() {
  const { user, setScreen, createAlarm, isLoading, error } = useStore()
  const [hours, setHours] = useState('07')
  const [minutes, setMinutes] = useState('00')
  const [selectedStake, setSelectedStake] = useState(5)
  const [customStake, setCustomStake] = useState('')
  const [useCustom, setUseCustom] = useState(false)

  if (!user) {
    setScreen('welcome')
    return null
  }

  const currentStake = useCustom ? (parseInt(customStake) || 0) : selectedStake
  const canAfford = user.walletBalance >= currentStake
  const isValidStake = currentStake >= 1

  const handleSetAlarm = async () => {
    if (!canAfford || !isValidStake) return
    const time = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`
    await createAlarm(time, currentStake)
  }

  const handleHoursChange = (value: string) => {
    const num = parseInt(value) || 0
    if (num >= 0 && num <= 23) {
      setHours(num.toString().padStart(2, '0'))
    }
  }

  const handleMinutesChange = (value: string) => {
    const num = parseInt(value) || 0
    if (num >= 0 && num <= 59) {
      setMinutes(num.toString().padStart(2, '0'))
    }
  }

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: '20px' }}>
        <button className="back-btn" onClick={() => setScreen('dashboard')}>
          ← Back
        </button>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '2.5rem', marginBottom: '0.5rem', display: 'block' }}>⏰</span>
          <h1 style={{ marginBottom: '0.5rem' }}>Set Alarm</h1>
          <p>Pick a time and stake your cash</p>
        </div>

        {/* Time Picker */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            🕐 Alarm Time
          </label>
          <div className="time-picker">
            <input
              type="number"
              min="0"
              max="23"
              value={hours}
              onChange={(e) => handleHoursChange(e.target.value)}
              onFocus={(e) => e.target.select()}
            />
            <span className="separator">:</span>
            <input
              type="number"
              min="0"
              max="59"
              value={minutes}
              onChange={(e) => handleMinutesChange(e.target.value)}
              onFocus={(e) => e.target.select()}
            />
          </div>
          <p style={{ textAlign: 'center', fontSize: '0.8rem', marginTop: '8px', color: 'var(--text-muted)' }}>
            24-hour format
          </p>
        </div>

        {/* Stake Selector */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '14px', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            💸 Amount at Stake
          </label>
          <div className="stake-selector">
            {STAKE_OPTIONS.map(amount => (
              <button
                key={amount}
                className={`stake-option ${!useCustom && selectedStake === amount ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedStake(amount)
                  setUseCustom(false)
                }}
                disabled={user.walletBalance < amount}
              >
                <div className="amount">${amount}</div>
              </button>
            ))}
          </div>

          <div style={{ marginTop: '18px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={useCustom}
                onChange={(e) => setUseCustom(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
              />
              <span style={{ color: 'var(--text-secondary)' }}>Custom amount</span>
            </label>
            {useCustom && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>$</span>
                <input
                  type="number"
                  className="input"
                  placeholder="Enter amount"
                  value={customStake}
                  onChange={(e) => setCustomStake(e.target.value)}
                  min="1"
                  max={user.walletBalance}
                  style={{ flex: 1 }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="card" style={{ marginBottom: '20px', background: 'rgba(0, 0, 0, 0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.95rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Your balance</span>
            <span style={{ fontWeight: '600' }}>${user.walletBalance.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.95rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Stake amount</span>
            <span style={{ color: 'var(--accent)', fontWeight: '600' }}>-${currentStake.toFixed(2)}</span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingTop: '12px',
            borderTop: '1px solid var(--border-subtle)',
            fontWeight: '700',
            fontSize: '1.05rem'
          }}>
            <span>After alarm</span>
            <span style={{ color: 'var(--success)' }}>${Math.max(0, user.walletBalance - currentStake).toFixed(2)}</span>
          </div>
        </div>

        {!canAfford && (
          <div className="info-box" style={{ marginBottom: '16px' }}>
            <strong>⚠️ Insufficient Balance</strong>
            <p>Add more funds or select a lower stake amount</p>
          </div>
        )}

        {error && (
          <p style={{ color: 'var(--accent)', marginBottom: '1rem', textAlign: 'center' }}>
            {error}
          </p>
        )}

        <button
          className="btn btn-primary btn-large glow"
          onClick={handleSetAlarm}
          disabled={!canAfford || !isValidStake || isLoading}
        >
          {isLoading ? 'Setting Alarm...' : `🔔 Set Alarm - $${currentStake} at risk`}
        </button>

        <div className="info-box success" style={{ marginTop: '20px' }}>
          <strong>📱 How it works</strong>
          <p>You'll receive a call and text at alarm time. Respond within 5 minutes to keep your money!</p>
        </div>
      </div>
    </div>
  )
}
