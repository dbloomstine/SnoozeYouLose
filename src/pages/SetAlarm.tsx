import { useState, useMemo } from 'react'
import { useStore } from '../store/useStore'
import { format, addDays } from 'date-fns'

const STAKE_OPTIONS = [1, 5, 10, 20, 50, 100]

// Get user's timezone abbreviation
const getTimezoneAbbr = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

export default function SetAlarm() {
  const { user, setScreen, createAlarm, isLoading, error } = useStore()
  const [hours, setHours] = useState('07')
  const [minutes, setMinutes] = useState('00')
  const [isPM, setIsPM] = useState(false)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedStake, setSelectedStake] = useState(5)
  const [customStake, setCustomStake] = useState('')
  const [useCustom, setUseCustom] = useState(false)

  // Generate date options: today and next 6 days
  const dateOptions = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(new Date(), i)
    return {
      value: format(date, 'yyyy-MM-dd'),
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : format(date, 'EEE, MMM d')
    }
  })

  if (!user) {
    setScreen('welcome')
    return null
  }

  const currentStake = useCustom ? (parseInt(customStake) || 0) : selectedStake
  const canAfford = user.walletBalance >= currentStake
  const isValidStake = currentStake >= 1

  // Calculate the actual 24-hour time for the alarm
  const get24HourTime = () => {
    let h = parseInt(hours) || 12
    if (isPM && h !== 12) h += 12
    if (!isPM && h === 12) h = 0
    return `${h.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}`
  }

  // Preview when the alarm will go off (using selected date)
  const alarmPreview = useMemo(() => {
    const [h, m] = get24HourTime().split(':').map(Number)
    const [year, month, day] = selectedDate.split('-').map(Number)
    const alarm = new Date(year, month - 1, day, h, m, 0, 0)
    return alarm
  }, [hours, minutes, isPM, selectedDate])

  const handleSetAlarm = async () => {
    if (!canAfford || !isValidStake || timePassedWarning) return
    const time = get24HourTime()
    await createAlarm(time, currentStake, selectedDate)
  }

  // Check if selected time has already passed on selected date
  const isTimePassedToday = () => {
    if (selectedDate !== format(new Date(), 'yyyy-MM-dd')) return false
    const now = new Date()
    const [h, m] = get24HourTime().split(':').map(Number)
    const selectedTime = new Date()
    selectedTime.setHours(h, m, 0, 0)
    return selectedTime <= now
  }

  const timePassedWarning = isTimePassedToday()

  const handleHoursChange = (value: string) => {
    const num = parseInt(value) || 0
    if (num >= 1 && num <= 12) {
      setHours(num.toString().padStart(2, '0'))
    } else if (num === 0) {
      setHours('12')
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
          <div id="alarm-time-label" style={{ display: 'block', marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Alarm Time
          </div>
          <div className="time-picker" role="group" aria-labelledby="alarm-time-label">
            <input
              type="text"
              inputMode="numeric"
              value={hours}
              onChange={(e) => handleHoursChange(e.target.value)}
              onFocus={(e) => e.target.select()}
              aria-label="Hours"
            />
            <span className="separator" aria-hidden="true">:</span>
            <input
              type="text"
              inputMode="numeric"
              value={minutes}
              onChange={(e) => handleMinutesChange(e.target.value)}
              onFocus={(e) => e.target.select()}
              aria-label="Minutes"
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginLeft: '8px' }} role="group" aria-label="AM or PM">
              <button
                type="button"
                onClick={() => setIsPM(false)}
                aria-pressed={!isPM}
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  background: !isPM ? 'var(--gradient-primary)' : 'var(--bg-glass)',
                  color: !isPM ? 'white' : 'var(--text-secondary)',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  transition: 'all 0.2s'
                }}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => setIsPM(true)}
                aria-pressed={isPM}
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  background: isPM ? 'var(--gradient-primary)' : 'var(--bg-glass)',
                  color: isPM ? 'white' : 'var(--text-secondary)',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  transition: 'all 0.2s'
                }}
              >
                PM
              </button>
            </div>
          </div>
          <p style={{ textAlign: 'center', fontSize: '0.85rem', marginTop: '12px', color: 'var(--text-secondary)' }}>
            {format(alarmPreview, 'EEEE, MMM d')} at {format(alarmPreview, 'h:mm a')}
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {getTimezoneAbbr()}
            </span>
          </p>
        </div>

        {/* Date Selector */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            📅 Date
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            {dateOptions.slice(0, 4).map(option => (
              <button
                key={option.value}
                onClick={() => setSelectedDate(option.value)}
                className={`stake-option ${selectedDate === option.value ? 'selected' : ''}`}
                style={{ padding: '14px 12px' }}
              >
                <div className="amount" style={{ fontSize: '0.95rem' }}>{option.label}</div>
              </button>
            ))}
          </div>
          {timePassedWarning && (
            <div className="info-box" style={{ marginTop: '12px' }}>
              <strong>⚠️ Time has passed</strong>
              <p>This time has already passed today. Select a later time or choose tomorrow.</p>
            </div>
          )}
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
                id="use-custom-stake"
                type="checkbox"
                checked={useCustom}
                onChange={(e) => setUseCustom(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
              />
              <span style={{ color: 'var(--text-secondary)' }}>Custom amount</span>
            </label>
            {useCustom && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span aria-hidden="true" style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="input"
                  placeholder="Enter amount"
                  value={customStake}
                  onChange={(e) => setCustomStake(e.target.value.replace(/\D/g, ''))}
                  style={{ flex: 1 }}
                  aria-label="Custom stake amount in dollars"
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
          disabled={!canAfford || !isValidStake || isLoading || timePassedWarning}
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
