# Email System Documentation

## Overview

Email system uses Resend for sending and implements rate limiting (1 email/second) to comply with Resend's API limits. Automatically switches between local development (threading) and production (QStash) based on environment.

## How It Works

### Local Development (Threading - Default)

- **Email Queue**: In-memory queue with background daemon thread
- **Rate Limiting**: Processes 1 email per second
- **Lazy Startup**: Worker thread starts automatically when first email is queued
- **Fire-and-Forget**: API returns immediately after queuing
- **Error Handling**: 429 errors trigger automatic retry (1 retry after 1 second)
- **Local Filtering**: Only sends to real emails (`zmann`, `rantesting22`) to avoid spamming test users

**Flow:** `API Request → Queue Email → Return Success → Background Thread Processes (1/sec)`

### Local Development with QStash (Optional)

To test QStash integration locally, set the environment variable:
```bash
LOCAL_USE_QSTASH=true
```

**⚠️ Important:** QStash makes HTTP requests to your worker URL, so it **cannot reach `localhost`** directly. To test QStash locally, you need to expose your local server using a tunnel service:

1. **Start a tunnel** (e.g., ngrok):
   ```bash
   ngrok http 5001
   ```

2. **Set your tunnel URL** in `.env`:
   ```bash
   FRONTEND_URL=https://your-tunnel-url.ngrok.io
   LOCAL_USE_QSTASH=true
   ```

3. **Restart your backend** to pick up the new environment variables

When enabled, local development will use QStash instead of the background thread, allowing you to test the full production email flow. This is useful for:
- Testing QStash signature verification
- Verifying email scheduling/delay behavior
- Debugging production-like scenarios

**Note:** For most local development, the default threading approach is simpler and works without any tunnel setup. Only use `LOCAL_USE_QSTASH=true` when you specifically need to test QStash integration.

### Production (QStash)

- **QStash Integration**: Emails enqueued to QStash with scheduled delays
- **Scheduling**: Each email scheduled 1 second apart (delay in seconds: 0, 1, 2, ...)
- **Worker Endpoint**: QStash calls `/api/email-worker` for each email
- **Signature Verification**: Worker verifies QStash request signatures using the `Receiver` class
- **Rate Limiting**: QStash handles scheduling automatically
- **Fire-and-Forget**: API returns immediately after enqueuing

**Flow:** `API Request → Enqueue to QStash → Return Success → QStash Schedules → Worker Processes`

## Production Setup

### Prerequisites

1. **QStash Account**: Sign up at [Upstash](https://upstash.com/) and enable QStash
2. **Get Credentials**: Copy from QStash dashboard:
   - `QSTASH_TOKEN`
   - `QSTASH_CURRENT_SIGNING_KEY`
   - `QSTASH_NEXT_SIGNING_KEY`

### Environment Variables (Vercel)

Add to **Settings → Environment Variables**:

**Required:**
- `QSTASH_TOKEN` - QStash API token
- `QSTASH_CURRENT_SIGNING_KEY` - Current signing key
- `QSTASH_NEXT_SIGNING_KEY` - Next signing key (for rotation)
- `RESEND_API_KEY` - Resend API key
- `EMAIL_FROM_ADDRESS` - Sender email (e.g., `notifications@send.zachsruns.com`)
- `EMAIL_FROM_NAME` - Sender name (e.g., `Zach's Organized Runs`)
- `FRONTEND_URL` - App URL (e.g., `https://zachsruns.vercel.app`)

**Optional:**
- `VERCEL_URL` - Auto-set by Vercel (fallback for `FRONTEND_URL`)
- `LOCAL_USE_QSTASH` - Set to `true` to use QStash locally instead of background threading (for testing)

### Worker Endpoint

- **URL**: `/api/email-worker`
- **Method**: `POST`
- **Auth**: QStash signature verification
- **Purpose**: Processes individual email jobs from QStash

## Email Types

All emails support both local (threading) and production (QStash):

1. Welcome Email (on signup)
2. Account Verified Email (when admin verifies user)
3. Admin New User Notification (to all admins on signup)
4. Run Created Email (to verified users)
5. Run Reminder Email (manual admin trigger, to confirmed/interested)
6. Run Completed Email (to attendees)
7. Run Cancelled Email (to confirmed/interested when deleted)
8. Run Modified Email (to confirmed/interested when updated)
9. Announcement Email (to verified users on create/update)

## Next Steps

### 1. Install QStash SDK
```bash
pip install qstash
```

### 2. Set Up QStash Account
1. Go to [Upstash](https://upstash.com/)
2. Create account and enable QStash
3. Copy credentials: `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`

### 3. Configure Vercel Environment Variables
Add all required variables in **Project → Settings → Environment Variables** for Production/Preview/Development.

### 4. Redeploy
Push to GitHub or redeploy in Vercel dashboard.

### 5. Verify Worker Endpoint
```bash
# Should return 400 (expected - needs QStash signature)
curl -X POST https://your-app.vercel.app/api/email-worker
```

### 6. Test
- **Local**: Create announcement/run - emails queue via threading
- **Production**: Create announcement/run - emails enqueue to QStash
- Monitor QStash dashboard for queued/sent emails

## Architecture

**Local (Threading)**:
- Module-level `Queue` with single daemon worker thread
- Thread-safe with `threading.Lock`
- Processes sequentially

**Production (QStash)**:
- External queue service (QStash)
- QStash handles scheduling and delivery
- Worker endpoint processes individual jobs

**Error Handling**:
- 429 Rate Limit: Auto-retry after 1 second (one retry only)
- Other Errors: Logged, email skipped (fire-and-forget)
- QStash Failures: Logged, API still returns success
- Worker Failures: Logged, QStash retries automatically

**Security**:
- QStash signature verification on worker endpoint
- Environment detection (auto local/production switch)
- Local filtering (prevents sending to test users)

## Troubleshooting

**Emails Not Sending Locally:**
- Check `RESEND_API_KEY` is set
- Check logs for errors
- Verify worker thread started (check logs)
- Check if emails filtered (local only sends to `zmann`, `rantesting22`)

**Emails Not Sending in Production:**
- Verify QStash env vars set in Vercel
- Check QStash dashboard for queued jobs
- Verify worker endpoint accessible (`/api/email-worker`)
- Check Vercel function logs
- Verify `FRONTEND_URL`/`VERCEL_URL` set correctly

**Rate Limit Errors:**
- System auto-retries 429 errors once
- Check Resend dashboard for rate limit status

**QStash Signature Verification Failing:**
- Verify `QSTASH_CURRENT_SIGNING_KEY` is correct
- Check if keys rotated (try `QSTASH_NEXT_SIGNING_KEY`)
- Verify worker endpoint receives proper headers

## Code Structure

```
backend/
├── utils/email.py              # Email utilities and queue system
├── routes/email_worker.py      # QStash worker endpoint
├── templates/emails/           # Email HTML templates
└── app.py                      # Registers email_worker_bp
```

## Notes

- Emails are fire-and-forget (API returns success even if email fails)
- All errors logged for debugging
- Local dev automatically filters to real email addresses
- Production uses QStash for reliable delivery within Vercel limits
- Worker endpoint verifies QStash signatures for security
