import { useState } from 'react'
import { useStore } from '../store/useStore'

const STAKE_OPTIONS = [1, 5, 10, 20, 50, 100]

export default function SetAlarm() {
  const { user, setScreen, setAlarm } = useStore()
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

  const handleSetAlarm = () => {
    if (!canAfford || !isValidStake) return
    const time = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`
    setAlarm(time, currentStake)
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
        <button
          onClick={() => setScreen('dashboard')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            marginBottom: '1rem'
          }}
        >
          ← Back
        </button>

        <h1 style={{ marginBottom: '0.5rem' }}>Set Alarm</h1>
        <p style={{ marginBottom: '2rem' }}>Pick a time and stake your cash</p>

        {/* Time Picker */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '12px', color: 'var(--text-secondary)' }}>
            Alarm Time
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
          <p style={{ textAlign: 'center', fontSize: '0.875rem', marginTop: '8px' }}>
            24-hour format
          </p>
        </div>

        {/* Stake Selector */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '12px', color: 'var(--text-secondary)' }}>
            Amount at Stake
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
                style={user.walletBalance < amount ? { opacity: 0.5 } : {}}
              >
                <div className="amount">${amount}</div>
              </button>
            ))}
          </div>

          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <input
                type="checkbox"
                checked={useCustom}
                onChange={(e) => setUseCustom(e.target.checked)}
              />
              Custom amount
            </label>
            {useCustom && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.5rem' }}>$</span>
                <input
                  type="number"
                  className="input"
                  placeholder="Enter amount"
                  value={customStake}
                  onChange={(e) => setCustomStake(e.target.value)}
                  min="1"
                  max={user.walletBalance}
                />
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="card" style={{ marginBottom: '24px', background: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>Your balance</span>
            <span>${user.walletBalance.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>Stake amount</span>
            <span style={{ color: 'var(--accent)' }}>-${currentStake.toFixed(2)}</span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingTop: '8px',
            borderTop: '1px solid var(--bg-card)',
            fontWeight: '600'
          }}>
            <span>After alarm</span>
            <span>${(user.walletBalance - currentStake).toFixed(2)}</span>
          </div>
        </div>

        {!canAfford && (
          <p style={{ color: 'var(--accent)', marginBottom: '1rem', textAlign: 'center' }}>
            Insufficient balance for this stake
          </p>
        )}

        <button
          className="btn btn-primary btn-large"
          onClick={handleSetAlarm}
          disabled={!canAfford || !isValidStake}
        >
          Set Alarm - ${currentStake} at risk
        </button>

        <p style={{
          marginTop: '1rem',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          textAlign: 'center'
        }}>
          You'll receive a call and text at alarm time.
          Respond within 5 minutes to keep your money.
        </p>
      </div>
    </div>
  )
}
