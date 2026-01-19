# AI Agent Context for Zach's Runs

This document provides context for AI coding assistants working on this project.

## Quick Context

**What is this app?** A basketball pickup game organizer for a small community (~40 people). Users can view scheduled "runs" (basketball games), RSVP, and track their attendance history. Admins create runs and manage users.

**Who is Zach?** The app creator and main admin. Username: `zmann`

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel Hosting                        │
├─────────────────────┬───────────────────────────────────┤
│   Next.js Frontend  │   Flask Backend (Serverless)      │
│   (Static + SSR)    │   /api/* routes                   │
├─────────────────────┴───────────────────────────────────┤
│              Neon Postgres (Production)                  │
│              SQLite (Local Development)                  │
└─────────────────────────────────────────────────────────┘
```

## Key Files to Understand

| File | Purpose |
|------|---------|
| `frontend/lib/api.ts` | All API client functions - this is how frontend talks to backend |
| `frontend/types/index.ts` | TypeScript interfaces for all data models |
| `frontend/context/AuthContext.tsx` | Auth state management, `useAuth()` hook |
| `backend/models.py` | SQLAlchemy database models |
| `backend/middleware.py` | JWT auth decorators |
| `backend/routes/*.py` | API endpoint implementations |

## User Roles & Permissions

| Role | Can Do |
|------|--------|
| **Unauthenticated** | View runs, view community page |
| **Unverified User** | Above + view profile, but cannot RSVP |
| **Verified User** | Above + RSVP for runs |
| **Admin** | Everything: create runs, verify users, assign badges, complete runs, send announcements |

## Run Lifecycle

```
1. Admin creates run (upcoming)
     ↓
2. Users RSVP: confirmed / interested / out
     ↓
3. Run date passes
     ↓
4. Admin completes run:
   - Marks who attended
   - Marks no-shows (confirmed but didn't show)
   - Adds guest attendees
     ↓
5. Run becomes "completed" (locked, shows attendance only)
```

## Database Relationships

```
User ──────┬── RunParticipant ──── Run
           │        ↑
           │   status: confirmed/interested/out
           │   attended: bool
           │   no_show: bool
           │
           └── referred_by (self-reference for +1 badge)

Run ─────── Location (many-to-one)
```

## Common Development Tasks

### Adding a new API endpoint

1. Add route in `backend/routes/<blueprint>.py`
2. Add TypeScript function in `frontend/lib/api.ts`
3. Update types in `frontend/types/index.ts` if new data shapes

### Adding a new page

1. Create `frontend/app/<route>/page.tsx`
2. Use `'use client'` if needs hooks/interactivity
3. Use `useAuth()` for user state, redirect if needed
4. Call API via `frontend/lib/api.ts` functions

### Modifying database schema

1. Update `backend/models.py`
2. Update `to_dict()` method if new fields should be exposed
3. Update `frontend/types/index.ts` to match
4. Test with both SQLite (local) and Postgres (production)

## Environment Variables

### Backend (.env)
```bash
# Required
ADMIN_PASSWORD=xxx          # Admin login password
JWT_SECRET=xxx              # JWT signing key

# Database (optional locally - defaults to SQLite)
DATABASE_URL=xxx            # Postgres URL for production

# Email (Resend)
RESEND_API_KEY=xxx
EMAIL_FROM_ADDRESS=notifications@send.zachsruns.com
EMAIL_FROM_NAME="Zach's Organized Runs"
FRONTEND_URL=https://zachsruns.vercel.app

# QStash (production email queue)
QSTASH_TOKEN=xxx
QSTASH_CURRENT_SIGNING_KEY=xxx
QSTASH_NEXT_SIGNING_KEY=xxx

# Local QStash testing (optional - requires ngrok)
LOCAL_USE_QSTASH=true
QSTASH_CALLBACK_URL=https://your-ngrok-url.ngrok-free.dev
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:5001  # Backend URL
```

## Email System

### Architecture
```
Local Dev:   API → In-memory Queue → Background Thread (1 email/sec)
Production:  API → QStash (Upstash) → /api/email-worker → Resend
```

### Key Points
- **Fire-and-forget**: API returns immediately, emails sent async
- **Rate limiting**: 1 email/second (Resend limit)
- **QStash**: Production uses Upstash QStash for reliable delivery in serverless
- **Worker endpoint**: `/api/email-worker` processes queued emails
- **Signature verification**: Worker verifies QStash signatures for security

### Email Types
| Email | Trigger | Recipients |
|-------|---------|------------|
| Welcome | User signup | New user (even if unverified) |
| Account Verified | Admin verifies user | Verified user |
| Admin New User | User signup | All admins |
| Run Created | New run created | All verified users |
| Run Reminder | Admin clicks "Remind" | Confirmed + interested |
| Run Completed | Admin completes run | Attendees |
| Run Cancelled | Run deleted | Confirmed + interested |
| Run Modified | Run updated | Confirmed + interested |
| Announcement | New announcement | All verified users |

### Key Files
- `backend/utils/email.py` - Queue system, send functions
- `backend/routes/email_worker.py` - QStash worker endpoint
- `backend/templates/emails/*.html` - Jinja2 templates (extend base.html)

### Testing QStash Locally (ngrok)

The local threading system may miss edge cases in the QStash implementation. To test the full production flow locally:

**Setup (3 terminals):**

```bash
# Terminal 1: Start ngrok tunnel
ngrok http 5001
# Copy HTTPS URL → e.g., https://abc123.ngrok-free.app
# ⚠️ FREE NGROK: URL changes every restart!

# Terminal 2: Backend with QStash enabled
cd backend
source venv/bin/activate
# Update .env with NEW ngrok URL each time:
#   LOCAL_USE_QSTASH=true
#   QSTASH_CALLBACK_URL=https://abc123.ngrok-free.app  ← update this!
python app.py
# ⚠️ Restart backend after changing QSTASH_CALLBACK_URL

# Terminal 3: Frontend
cd frontend
npm run dev
```

**Flow:**
```
Your action → Backend → QStash (cloud) → ngrok → /api/email-worker → Resend
```

**What this tests:**
- QStash signature verification
- Scheduled delay behavior (emails 1 second apart)
- Worker endpoint error handling
- Production-like async flow

**Note:** Default threading is fine for most development. Use ngrok only when specifically testing QStash integration.

## Testing Locally

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
python app.py
# Runs on http://localhost:5001
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

## Gotchas & Tips

1. **Date handling**: Run dates are stored as date-only (no time). Parse carefully to avoid timezone issues. See `formatDate()` in RunCard.tsx.

2. **Badge types**: Only `'regular'` and `'plus_one'` are currently active. VIP/Rookie mentioned in requirements but not implemented.

3. **Verified vs badges**: Verification (`is_verified`) is for RSVP permission. Badges (`badge` field) are for community recognition. They're independent.

4. **Historical runs**: Imported legacy data. They have `is_historical=true` and users were matched by name during import.

5. **Cost calculation**: Runs can have fixed cost (`cost`) or variable cost (`is_variable_cost=true` with `total_cost` divided by attendees).

6. **No-shows**: Only counted for users who were "confirmed" but didn't attend. "Interested" or "Out" users don't count as no-shows.

## Style Guide Reminders

- Basketball theme: orange/black/wood colors
- Mobile-responsive: test on small screens
- Simple UI: this is a small community app, not enterprise software
- Error messages should be user-friendly
- Loading states for all async operations

