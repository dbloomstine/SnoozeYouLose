import { useStore } from '../store/useStore'

export default function Terms() {
  const { setScreen } = useStore()

  return (
    <div className="page">
      <div className="container" style={{ padding: '2rem 1rem', maxWidth: '800px' }}>
        <h1>Terms of Service</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Last updated: December 4, 2024
        </p>

        <section style={{ marginBottom: '2rem' }}>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using Snooze You Lose ("the Service"), you agree to be bound
            by these Terms of Service. If you do not agree to these terms, do not use the Service.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>2. Description of Service</h2>
          <p>
            Snooze You Lose is an alarm clock application with financial accountability.
            Users deposit money into a wallet, set alarms with a stake amount, and must
            acknowledge alarms within a specified time window to retain their stake.
          </p>
          <h3>How It Works:</h3>
          <ul>
            <li>You deposit funds into your in-app wallet</li>
            <li>You set an alarm time and choose a stake amount</li>
            <li>At the alarm time, you receive a phone call and SMS</li>
            <li>You must acknowledge the alarm within 5 minutes</li>
            <li>If you acknowledge in time, you keep your stake</li>
            <li>If you fail to acknowledge, you forfeit your stake</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>3. SMS and Voice Call Consent</h2>
          <p>
            By creating an account and setting alarms, you expressly consent to receive:
          </p>
          <ul>
            <li>Automated voice calls at your scheduled alarm times</li>
            <li>SMS text messages as alarm notifications</li>
            <li>SMS verification codes for account authentication</li>
          </ul>
          <p>
            <strong>Message frequency</strong> depends on how many alarms you set.
            Typically 1-2 messages per alarm event.
          </p>
          <p>
            <strong>Standard message and data rates may apply.</strong> Contact your
            carrier for details about your messaging plan.
          </p>
          <p>
            You can opt out at any time by replying STOP to any message, canceling
            your alarms, or deleting your account.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>4. User Accounts</h2>
          <p>
            You must provide a valid phone number to create an account. You are responsible
            for maintaining the security of your account and for all activities that occur
            under your account.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>5. Payments and Refunds</h2>
          <ul>
            <li>All deposits are processed securely through Stripe</li>
            <li>Wallet funds are used to stake on alarms</li>
            <li>Forfeited stakes are non-refundable by design - this is the core mechanic of the Service</li>
            <li>Unused wallet balance may be withdrawn upon request</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>6. Service Reliability</h2>
          <p>
            While we strive for 100% uptime, we cannot guarantee that alarm notifications
            will always be delivered successfully due to factors outside our control
            (carrier issues, phone settings, network outages). We recommend:
          </p>
          <ul>
            <li>Keeping your phone charged and connected</li>
            <li>Ensuring Do Not Disturb is configured to allow our calls</li>
            <li>Having a backup alarm for critical wake-up times</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>7. Limitation of Liability</h2>
          <p>
            The Service is provided "as is" without warranties of any kind. We are not
            liable for any damages arising from your use of the Service, including but
            not limited to missed alarms, forfeited stakes, or consequential damages
            from oversleeping.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>8. Modifications</h2>
          <p>
            We reserve the right to modify these terms at any time. Continued use of the
            Service after changes constitutes acceptance of the new terms.
          </p>
        </section>

        <section style={{ marginBottom: '2rem' }}>
          <h2>9. Contact</h2>
          <p>
            For questions about these Terms, contact us at:
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
