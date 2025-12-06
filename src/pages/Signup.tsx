import { useState } from 'react'
import { useStore } from '../store/useStore'

export default function Signup() {
  const {
    setScreen,
    sendCode,
    verifyCode,
    currentScreen,
    isLoading,
    error,
    clearError,
    pendingPhone,
    testVerificationCode,
    isTestMode
  } = useStore()

  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [localError, setLocalError] = useState('')
  const [testCode, setTestCode] = useState<string | null>(null)

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setPhoneNumber(formatted)
    setLocalError('')
    clearError()
  }

  const handleSendCode = async () => {
    const numbers = phoneNumber.replace(/\D/g, '')
    if (numbers.length !== 10) {
      setLocalError('Please enter a valid 10-digit phone number')
      return
    }

    const result = await sendCode(numbers)
    if (result.success) {
      setIsVerifying(true)
      setTestCode(result.testCode || null)
      setScreen('verify')
    }
  }

  const handleVerify = async () => {
    if (verificationCode.length !== 4) {
      setLocalError('Please enter the 4-digit code')
      return
    }

    const phone = pendingPhone || phoneNumber.replace(/\D/g, '')
    const success = await verifyCode(phone, verificationCode)

    if (!success) {
      setLocalError('Invalid or expired code. Please try again.')
    }
  }

  const displayError = localError || error

  if (isVerifying || currentScreen === 'verify') {
    const displayPhone = pendingPhone || phoneNumber
    const displayTestCode = testCode || testVerificationCode

    return (
      <div className="page">
        <div className="container" style={{ paddingTop: '60px' }}>
          <button
            className="back-btn"
            onClick={() => {
              setIsVerifying(false)
              setVerificationCode('')
              setLocalError('')
              clearError()
              setScreen('signup')
            }}
          >
            ← Back
          </button>

          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}>🔐</span>
            <h1>Verify your number</h1>
            <p>
              Enter the 4-digit code sent to<br />
              <strong style={{ color: 'var(--text-primary)' }}>{formatPhoneNumber(displayPhone)}</strong>
            </p>
          </div>

          {displayTestCode && (
            <div className="info-box">
              <strong>🧪 Test Mode</strong>
              <p>Your code is <strong style={{ color: 'var(--warning)', fontSize: '1.25rem' }}>{displayTestCode}</strong></p>
            </div>
          )}

          {!displayTestCode && isTestMode && (
            <div className="info-box">
              <strong>🧪 Test Mode</strong>
              <p>Check your console for the verification code</p>
            </div>
          )}

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
                setLocalError('')
                clearError()
              }}
              autoFocus
            />
          </div>

          {displayError && (
            <p style={{ color: 'var(--accent)', marginBottom: '1rem', textAlign: 'center' }}>{displayError}</p>
          )}

          <button
            className="btn btn-primary btn-large"
            onClick={handleVerify}
            disabled={verificationCode.length !== 4 || isLoading}
          >
            {isLoading ? 'Verifying...' : '✓ Verify & Continue'}
          </button>

          <button
            className="btn btn-secondary"
            style={{ marginTop: '1rem' }}
            onClick={handleSendCode}
            disabled={isLoading}
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
        <button className="back-btn" onClick={() => setScreen('welcome')}>
          ← Back
        </button>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <span style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}>📱</span>
          <h1>Enter your phone number</h1>
          <p>We'll call and text you when your alarm goes off</p>
        </div>

        <div className="input-group">
          <label>Phone Number</label>
          <input
            type="tel"
            className="input"
            placeholder="(555) 555-5555"
            value={phoneNumber}
            onChange={handlePhoneChange}
            style={{ fontSize: '1.25rem', textAlign: 'center' }}
            autoComplete="tel"
          />
        </div>

        {displayError && (
          <p style={{ color: 'var(--accent)', marginBottom: '1rem', textAlign: 'center' }}>{displayError}</p>
        )}

        <button
          className="btn btn-primary btn-large"
          onClick={handleSendCode}
          disabled={phoneNumber.replace(/\D/g, '').length !== 10 || isLoading}
        >
          {isLoading ? 'Sending...' : '📩 Send Verification Code'}
        </button>

        <p style={{ marginTop: '2rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          By continuing, you agree to receive calls and texts from Snooze You Lose
          at the number provided. Message and data rates may apply.
        </p>
      </div>
    </div>
  )
}
