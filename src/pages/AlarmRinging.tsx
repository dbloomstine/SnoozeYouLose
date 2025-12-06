import { useState, useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import { format } from 'date-fns'

const RESPONSE_TIME_SECONDS = 300 // 5 minutes

// Create alarm sound using Web Audio API
const createAlarmSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

    const playBeep = () => {
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 880 // A5 note
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
    }

    return { playBeep, audioContext }
  } catch (e) {
    console.log('Web Audio API not supported')
    return null
  }
}

// Vibration helper
const vibrate = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate([200, 100, 200, 100, 200])
  }
}

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
  const [soundEnabled, setSoundEnabled] = useState(true)
  const alarmSoundRef = useRef<ReturnType<typeof createAlarmSound>>(null)

  // Initialize sound on mount
  useEffect(() => {
    alarmSoundRef.current = createAlarmSound()
    return () => {
      if (alarmSoundRef.current?.audioContext) {
        alarmSoundRef.current.audioContext.close()
      }
    }
  }, [])

  // Play alarm sound and vibrate periodically
  useEffect(() => {
    if (!soundEnabled) return

    const playAlarm = () => {
      if (alarmSoundRef.current) {
        alarmSoundRef.current.playBeep()
      }
      vibrate()
    }

    // Play immediately
    playAlarm()

    // Then every 2 seconds
    const interval = setInterval(playAlarm, 2000)

    return () => clearInterval(interval)
  }, [soundEnabled])

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

    setLocalError('')
    clearError()
    const success = await acknowledgeAlarm(enteredCode)

    if (!success) {
      // Error will be set in the store, check it
      const storeError = useStore.getState().error
      if (storeError?.includes('not ringing')) {
        setLocalError('Alarm expired. Refreshing...')
        // Fetch fresh alarm state
        setTimeout(() => {
          useStore.getState().fetchAlarms()
        }, 1000)
      } else {
        setLocalError(storeError || 'Wrong code! Check your phone.')
      }
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
      <div className="container" style={{ paddingTop: '40px', textAlign: 'center', position: 'relative' }}>
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

        {/* Sound toggle */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '50%',
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '1.2rem',
            color: soundEnabled ? 'var(--text-primary)' : 'var(--text-muted)'
          }}
          title={soundEnabled ? 'Mute alarm' : 'Unmute alarm'}
        >
          {soundEnabled ? '🔊' : '🔇'}
        </button>

        {/* Countdown */}
        <div className="countdown-display">
          <div style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Time remaining
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
