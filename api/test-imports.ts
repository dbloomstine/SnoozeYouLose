import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const results: Record<string, string> = {}

  // Test database import
  try {
    const db = await import('./lib/database')
    results.database = 'ok - isDatabaseConfigured: ' + db.isDatabaseConfigured()
  } catch (e: any) {
    results.database = 'FAILED: ' + e.message
  }

  // Test twilio import
  try {
    const twilio = await import('./lib/twilio')
    results.twilio = 'ok - isTwilioConfigured: ' + twilio.isTwilioConfigured()
  } catch (e: any) {
    results.twilio = 'FAILED: ' + e.message
  }

  return res.status(200).json(results)
}
