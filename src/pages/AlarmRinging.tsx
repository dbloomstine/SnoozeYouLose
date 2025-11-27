import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'

const RESPONSE_TIME_SECONDS = 300 // 5 minutes

export default function AlarmRinging() {
  const { activeAlarm, acknowledgeAlarm, failAlarm, setScreen, isTestMode } = useStore()
  const [timeLeft, setTimeLeft] = useState(RESPONSE_TIME_SECONDS)
  const [verificationCode] = useState(() => Math.floor(1000 + Math.random() * 9000).toString())
  const [enteredCode, setEnteredCode] = useState('')
  const [error, setError] = useState('')

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

  const handleAcknowledge = () => {
    if (enteredCode === verificationCode) {
      acknowledgeAlarm()
    } else {
      setError('Wrong code! Check your phone.')
      setEnteredCode('')
    }
  }

  const handleGiveUp = () => {
    if (confirm(`Are you sure? You'll lose $${activeAlarm.stakeAmount}!`)) {
      failAlarm()
    }
  }

  return (
    <div className="page" style={{
      background: 'linear-gradient(180deg, var(--accent) 0%, var(--bg-primary) 100%)',
      minHeight: '100vh'
    }}>
      <div className="container" style={{ paddingTop: '40px', textAlign: 'center' }}>
        {/* Ringing Animation */}
        <div className="ringing" style={{ fontSize: '5rem', marginBottom: '1rem' }}>
          ⏰
        </div>

        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
          WAKE UP!
        </h1>

        <div className="alarm-time ringing" style={{ color: 'white' }}>
          {activeAlarm.time}
        </div>

        <div style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          color: 'var(--warning)',
          margin: '1rem 0'
        }}>
          ${activeAlarm.stakeAmount} at stake!
        </div>

        {/* Countdown */}
        <div style={{
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <div style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Time remaining
          </div>
          <div className={`pulse ${timeLeft < 60 ? 'danger' : ''}`} style={{
            fontSize: '3rem',
            fontWeight: '700',
            fontVariantNumeric: 'tabular-nums',
            color: timeLeft < 60 ? 'var(--accent)' : 'white'
          }}>
            {minutes}:{seconds.toString().padStart(2, '0')}
          </div>
        </div>

        {/* Verification */}
        <div className="card" style={{ textAlign: 'left', marginBottom: '24px' }}>
          {isTestMode ? (
            <>
              <div style={{
                background: 'rgba(255, 193, 7, 0.1)',
                border: '1px solid var(--warning)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px'
              }}>
                <strong>Test Mode</strong>
                <p style={{ margin: '8px 0 0', fontSize: '0.875rem' }}>
                  Your verification code is: <strong style={{ color: 'var(--warning)' }}>{verificationCode}</strong>
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem' }}>
                  (In production, this would be sent via SMS/call)
                </p>
              </div>
            </>
          ) : (
            <p style={{ marginBottom: '16px' }}>
              Check your phone for the verification code sent via SMS and call.
            </p>
          )}

          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
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
              setError('')
            }}
            autoFocus
          />
          {error && (
            <p style={{ color: 'var(--accent)', marginTop: '8px' }}>{error}</p>
          )}
        </div>

        <button
          className="btn btn-success btn-large"
          onClick={handleAcknowledge}
          disabled={enteredCode.length !== 4}
        >
          I'M AWAKE!
        </button>

        <button
          className="btn btn-secondary"
          style={{ marginTop: '12px' }}
          onClick={handleGiveUp}
        >
          Give Up (Lose ${activeAlarm.stakeAmount})
        </button>
      </div>
    </div>
  )
}
