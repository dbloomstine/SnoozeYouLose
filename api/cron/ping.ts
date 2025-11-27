import type { VercelRequest, VercelResponse } from '@vercel/node'

// Simple ping endpoint that can be called by external cron services
// like cron-job.org, easycron.com, or UptimeRobot
//
// This endpoint triggers both the alarm trigger and failed alarm check
//
// Setup instructions:
// 1. Go to https://cron-job.org (free)
// 2. Create a new cron job
// 3. Set URL to: https://your-app.vercel.app/api/cron/ping?secret=YOUR_CRON_SECRET
// 4. Set schedule to every 1 minute
// 5. Save and enable

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify secret from query param (for external cron services)
  const { secret } = req.query
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && secret !== cronSecret) {
    return res.status(401).json({ error: 'Invalid secret' })
  }

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'

  const results = {
    triggerAlarms: null as any,
    checkFailed: null as any
  }

  try {
    // Trigger pending alarms
    const triggerResponse = await fetch(`${baseUrl}/api/cron/trigger-alarms`, {
      method: 'GET',
      headers: {
        'x-cron-secret': cronSecret || ''
      }
    })
    results.triggerAlarms = await triggerResponse.json()
  } catch (error: any) {
    results.triggerAlarms = { error: error.message }
  }

  try {
    // Check for failed alarms
    const checkResponse = await fetch(`${baseUrl}/api/cron/check-failed-alarms`, {
      method: 'GET',
      headers: {
        'x-cron-secret': cronSecret || ''
      }
    })
    results.checkFailed = await checkResponse.json()
  } catch (error: any) {
    results.checkFailed = { error: error.message }
  }

  return res.status(200).json({
    success: true,
    timestamp: new Date().toISOString(),
    results
  })
}
