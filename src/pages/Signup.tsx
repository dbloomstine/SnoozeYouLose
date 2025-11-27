import { useState } from 'react'
import { useStore } from '../store/useStore'

export default function Signup() {
  const { setScreen, login, currentScreen } = useStore()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState('')

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setPhoneNumber(formatted)
    setError('')
  }

  const handleSendCode = () => {
    const numbers = phoneNumber.replace(/\D/g, '')
    if (numbers.length !== 10) {
      setError('Please enter a valid 10-digit phone number')
      return
    }
    // In test mode, we simulate sending a code
    setIsVerifying(true)
    setScreen('verify')
  }

  const handleVerify = () => {
    // In test mode, accept any 4-digit code
    if (verificationCode.length !== 4) {
      setError('Please enter the 4-digit code')
      return
    }
    // Log the user in
    login(phoneNumber)
  }

  if (isVerifying || currentScreen === 'verify') {
    return (
      <div className="page">
        <div className="container" style={{ paddingTop: '60px' }}>
          <button
            onClick={() => {
              setIsVerifying(false)
              setScreen('signup')
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              marginBottom: '2rem'
            }}
          >
            ← Back
          </button>

          <h1>Verify your number</h1>
          <p style={{ marginBottom: '2rem' }}>
            Enter the 4-digit code sent to {phoneNumber}
          </p>

          <div style={{
            background: 'rgba(255, 193, 7, 0.1)',
            border: '1px solid var(--warning)',
            borderRadius: '12px',
            padding: '12px',
            marginBottom: '2rem',
            fontSize: '0.875rem'
          }}>
            <strong>Test Mode:</strong> Enter any 4-digit code (e.g., 1234)
          </div>

          <div className="input-group">
            <input
              type="text"
              inputMode="numeric"
              className="input input-large"
              placeholder="0000"
              maxLength={4}
              value={verificationCode}
              onChange={(e) => {
                setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 4))
                setError('')
              }}
            />
          </div>

          {error && (
            <p style={{ color: 'var(--accent)', marginBottom: '1rem' }}>{error}</p>
          )}

          <button
            className="btn btn-primary"
            onClick={handleVerify}
            disabled={verificationCode.length !== 4}
          >
            Verify & Continue
          </button>

          <button
            className="btn btn-secondary"
            style={{ marginTop: '1rem' }}
            onClick={handleSendCode}
          >
            Resend Code
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: '60px' }}>
        <button
          onClick={() => setScreen('welcome')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            marginBottom: '2rem'
          }}
        >
          ← Back
        </button>

        <h1>Enter your phone number</h1>
        <p style={{ marginBottom: '2rem' }}>
          We'll call and text you when your alarm goes off
        </p>

        <div className="input-group">
          <label>Phone Number</label>
          <input
            type="tel"
            className="input"
            placeholder="(555) 555-5555"
            value={phoneNumber}
            onChange={handlePhoneChange}
          />
        </div>

        {error && (
          <p style={{ color: 'var(--accent)', marginBottom: '1rem' }}>{error}</p>
        )}

        <button
          className="btn btn-primary"
          onClick={handleSendCode}
          disabled={phoneNumber.replace(/\D/g, '').length !== 10}
        >
          Send Verification Code
        </button>

        <p style={{ marginTop: '2rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          By continuing, you agree to receive calls and texts from Snooze You Lose
          at the number provided. Message and data rates may apply.
        </p>
      </div>
    </div>
  )
}
