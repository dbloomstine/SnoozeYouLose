import { useStore } from '../store/useStore'

export default function Privacy() {
  const { setScreen } = useStore()

  return (
    <div className="page">
      <div className="container" style={{ padding: '2rem 1rem', maxWidth: '800px' }}>
        <h1>Privacy Policy</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Last updated: December 4, 2024
        </p>

        <section style={{ marginBottom: '2rem' }}>
          <h2>Overview</h2>
          <p>
            SnoozeYouLose Inc. ("we", "us", or "our") operates the Snooze You Lose
            mobile application and website (the "Service"). This Privacy Policy
            explains how we collect, use, and protect your personal information.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>Information We Collect</h2>
          <h3>Personal Information</h3>
          <ul>
            <li><strong>Phone Number:</strong> Required for account creation and to send alarm notifications via SMS and voice calls.</li>
            <li><strong>Payment Information:</strong> Processed securely through Stripe for wallet deposits.</li>
            <li><strong>Alarm Data:</strong> Times, stakes, and acknowledgment history.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>How We Use Your Information</h2>
          <h3>SMS and Voice Calls</h3>
          <p>
            We use your phone number exclusively to deliver alarm notifications. When you set an alarm:
          </p>
          <ul>
            <li>You will receive an <strong>automated phone call</strong> at your scheduled alarm time</li>
            <li>You will receive an <strong>SMS text message</strong> as a backup notification</li>
            <li>You must respond to acknowledge the alarm within 5 minutes</li>
          </ul>
          <p>
            <strong>Message frequency:</strong> You will only receive messages when alarms you have set are triggered.
            Typically 1-2 messages per alarm (call + SMS).
          </p>
          <p>
            <strong>We will never:</strong>
          </p>
          <ul>
            <li>Send marketing or promotional messages</li>
            <li>Share your phone number with third parties for marketing</li>
            <li>Contact you outside of alarm notifications</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your data:
          </p>
          <ul>
            <li>All data is encrypted in transit using TLS/SSL</li>
            <li>Phone numbers are stored securely in our database</li>
            <li>Payment processing is handled by Stripe (PCI-DSS compliant)</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>Third-Party Services</h2>
          <p>We use the following third-party services:</p>
          <ul>
            <li><strong>Twilio:</strong> For sending SMS messages and making voice calls</li>
            <li><strong>Stripe:</strong> For processing payments</li>
            <li><strong>Supabase:</strong> For secure data storage</li>
            <li><strong>Vercel:</strong> For hosting</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>Opting Out</h2>
          <p>
            You can stop receiving messages at any time by:
          </p>
          <ul>
            <li>Canceling all active alarms in the app</li>
            <li>Deleting your account</li>
            <li>Replying STOP to any SMS message</li>
          </ul>
          <p>
            Standard message and data rates may apply.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>Data Retention</h2>
          <p>
            We retain your data for as long as your account is active. You may request
            deletion of your account and associated data by contacting us.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us at:
          </p>
          <p>
            <strong>Email:</strong> dbloomstine@gmail.com<br />
            <strong>Company:</strong> SnoozeYouLose Inc.
          </p>
        </section>

        <button
          onClick={() => setScreen('welcome')}
          style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0, fontSize: '1rem' }}
        >
          ← Back to Home
        </button>
      </div>
    </div>
  )
}
