import type { VercelRequest, VercelResponse } from '@vercel/node'
import { isConfigured } from './lib/security'

/**
 * Health check endpoint for monitoring
 * Returns service status and configuration state
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const twilioConfigured = !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  )

  const stripeConfigured = !!process.env.STRIPE_SECRET_KEY

  const status = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: isConfigured(),
      twilio: twilioConfigured,
      stripe: stripeConfigured
    }
  }

  // Return 503 if critical services are down
  if (!isConfigured()) {
    return res.status(503).json({
      ...status,
      status: 'degraded',
      message: 'Database not configured'
    })
  }

  return res.status(200).json(status)
}
