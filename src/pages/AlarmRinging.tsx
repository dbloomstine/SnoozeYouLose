import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { format } from 'date-fns'

const RESPONSE_TIME_SECONDS = 300 // 5 minutes

export default function AlarmRinging() {
  const {
    activeAlarm,
    acknowledgeAlarm,
    failAlarm,
    setScreen,
    isTestMode,
    isLoading,
    error,
    clearError
  } = useStore()

  const [timeLeft, setTimeLeft] = useState(RESPONSE_TIME_SECONDS)
  const [enteredCode, setEnteredCode] = useState('')
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (timeLeft <= 0) {
      failAlarm()
      return
    }

    const timer = setInterval(() => {
      setTimeLeft(t => t - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, failAlarm])

  if (!activeAlarm) {
    setScreen('dashboard')
    return null
  }

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const isUrgent = timeLeft < 60

  // Get verification code from alarm (available in test mode)
  const verificationCode = activeAlarm.verificationCode

  const handleAcknowledge = async () => {
    if (enteredCode.length !== 4) {
      setLocalError('Please enter a 4-digit code')
      return
    }

    clearError()
    const success = await acknowledgeAlarm(enteredCode)

    if (!success) {
      setLocalError('Wrong code! Check your phone.')
      setEnteredCode('')
    }
  }

  const handleGiveUp = () => {
    if (confirm(`Are you sure? You'll lose $${activeAlarm.stakeAmount}!`)) {
      failAlarm()
    }
  }

  const displayError = localError || error

  // Format time from ISO string
  const formatAlarmTime = (isoString: string) => {
    try {
      const date = new Date(isoString)
      return format(date, 'h:mm a')
    } catch {
      return '--:--'
    }
  }

  return (
    <div className="page" style={{
      background: `linear-gradient(180deg, ${isUrgent ? 'rgba(239, 68, 68, 0.8)' : 'rgba(255, 107, 107, 0.6)'} 0%, var(--bg-dark) 100%)`,
      minHeight: '100vh'
    }}>
      <div className="container" style={{ paddingTop: '40px', textAlign: 'center' }}>
        {/* Ringing Animation */}
        <div className="ringing emoji-large" style={{ marginBottom: '1rem' }}>
          ⏰
        </div>

        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', letterSpacing: '2px' }}>
          WAKE UP!
        </h1>

        <div className="alarm-time ringing" style={{ fontSize: '3.5rem' }}>
          {formatAlarmTime(activeAlarm.scheduledFor)}
        </div>

        <div style={{
          fontSize: '1.75rem',
          fontWeight: '800',
          margin: '1rem 0',
          background: 'var(--gradient-gold)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          💰 ${activeAlarm.stakeAmount} at stake!
        </div>

        {/* Countdown */}
        <div className="countdown-display">
          <div style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
            ⏱️ Time remaining
          </div>
          <div className={`countdown-time ${isUrgent ? 'urgent' : ''}`}>
            {minutes}:{seconds.toString().padStart(2, '0')}
          </div>
          {isUrgent && (
            <div style={{ color: 'var(--danger)', fontSize: '0.9rem', marginTop: '8px', fontWeight: '600' }}>
              HURRY! Less than a minute left!
            </div>
          )}
        </div>

        {/* Verification */}
        <div className="card" style={{ textAlign: 'left', marginBottom: '24px' }}>
          {verificationCode ? (
            <div className="info-box" style={{ marginBottom: '16px' }}>
              <strong>🧪 Test Mode</strong>
              <p>
                Your code is: <strong style={{ color: 'var(--warning)', fontSize: '1.5rem' }}>{verificationCode}</strong>
              </p>
            </div>
          ) : isTestMode ? (
            <div className="info-box" style={{ marginBottom: '16px' }}>
              <strong>🧪 Test Mode</strong>
              <p>Check the server logs or your SMS if Twilio is configured.</p>
            </div>
          ) : (
            <div className="info-box success" style={{ marginBottom: '16px' }}>
              <strong>📱 Check Your Phone</strong>
              <p>Enter the code sent via SMS and call.</p>
            </div>
          )}

          <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Enter verification code
          </label>
          <input
            type="text"
            inputMode="numeric"
            className="input input-large"
            placeholder="0000"
            maxLength={4}
            value={enteredCode}
            onChange={(e) => {
              setEnteredCode(e.target.value.replace(/\D/g, '').slice(0, 4))
              setLocalError('')
              clearError()
            }}
            autoFocus
          />
          {displayError && (
            <p style={{ color: 'var(--accent)', marginTop: '12px', fontWeight: '600' }}>{displayError}</p>
          )}
        </div>

        <button
          className="btn btn-success btn-large glow"
          onClick={handleAcknowledge}
          disabled={enteredCode.length !== 4 || isLoading}
        >
          {isLoading ? 'Verifying...' : "✓ I'M AWAKE!"}
        </button>

        <button
          className="btn btn-secondary"
          style={{ marginTop: '14px' }}
          onClick={handleGiveUp}
          disabled={isLoading}
        >
          😴 Give Up (Lose ${activeAlarm.stakeAmount})
        </button>
      </div>
    </div>
  )
}
