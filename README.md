# Snooze You Lose

**Wake up or pay up** - The alarm clock that costs you money if you don't wake up.

## How It Works

1. **Deposit money** into your wallet
2. **Set an alarm** and stake your cash
3. **We call & text you** at alarm time
4. **Respond in time** = keep your money
5. **Miss it** = lose your stake

## Tech Stack

- **Frontend**: React + TypeScript + Vite (PWA)
- **Backend**: Vercel Serverless Functions
- **Database**: Supabase (PostgreSQL)
- **SMS/Calls**: Twilio
- **Payments**: Stripe (coming soon)

## Setup

### 1. Clone and Install

```bash
git clone https://github.com/dbloomstine/SnoozeYouLose.git
cd SnoozeYouLose
npm install
```

### 2. Set Up Supabase

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to SQL Editor and run the contents of `supabase-schema.sql`
4. Get your project URL and service key from Settings > API

### 3. Set Up Twilio

1. Create a free account at [twilio.com](https://twilio.com) (includes ~$15 trial credit)
2. Get a phone number
3. Get your Account SID and Auth Token from the Console
4. Configure webhooks (see below)

### 4. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_KEY` - Your Supabase service role key
- `TWILIO_ACCOUNT_SID` - Your Twilio Account SID
- `TWILIO_AUTH_TOKEN` - Your Twilio Auth Token
- `TWILIO_PHONE_NUMBER` - Your Twilio phone number
- `JWT_SECRET` - A random secret string for JWT tokens
- `CRON_SECRET` - A secret to protect cron endpoints

### 5. Configure Twilio Webhooks

In your Twilio Console, set up these webhooks:

**For SMS:**
- Go to Phone Numbers > Your Number > Messaging
- Set "A Message Comes In" to: `https://your-app.vercel.app/api/webhooks/twilio-sms`

**For Voice (optional):**
- Voice calls use dynamic TwiML, so no webhook needed for incoming

### 6. Deploy to Vercel

```bash
npx vercel --prod
```

Or connect your GitHub repo to Vercel for automatic deployments.

### 7. Set Up Cron Jobs

The `vercel.json` file configures cron jobs to:
- Trigger alarms every minute
- Check for failed alarms every minute

Note: Cron jobs require a Vercel Pro plan. For the free plan, you can use an external cron service like [cron-job.org](https://cron-job.org).

## Development

Run locally:

```bash
npm run dev
```

The app will run in **test mode** without Twilio/Supabase credentials:
- Uses localStorage for data
- Shows verification codes on screen
- Simulates SMS/calls

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/send-code` | POST | Send verification SMS |
| `/api/auth/verify` | POST | Verify code & login |
| `/api/user` | GET | Get current user |
| `/api/user/add-funds` | POST | Add funds to wallet |
| `/api/alarms` | GET | List user's alarms |
| `/api/alarms` | POST | Create new alarm |
| `/api/alarms/[id]/cancel` | POST | Cancel alarm |
| `/api/alarms/[id]/acknowledge` | POST | Acknowledge ringing alarm |
| `/api/cron/trigger-alarms` | GET | Trigger pending alarms (cron) |
| `/api/cron/check-failed-alarms` | GET | Mark expired alarms failed (cron) |
| `/api/webhooks/twilio-sms` | POST | Handle SMS replies |
| `/api/webhooks/twilio-call` | POST | Handle call responses |

## Cost Breakdown

| Component | Cost |
|-----------|------|
| Twilio SMS | ~$0.0079/message |
| Twilio Calls | ~$0.013/min + $0.0085/call |
| Supabase | Free tier (500MB) |
| Vercel | Free tier (hobby) |

Estimated cost per alarm: **~$0.05** (1 SMS + 1 short call)

## License

MIT
