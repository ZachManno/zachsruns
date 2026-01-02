# Email Feature Implementation Plan

## Overview
Add email notification functionality to "Zach's Organized Runs" to keep users informed about runs, RSVPs, and important updates.

## Clarifying Questions

### 1. Email Service Provider
**Which email service should we use?**
- **Resend** - Use Resend, I created an account

**Recommendation:** Resend for simplicity and good free tier


### 2. Email Types to Implement
**Which emails should we send? (Select all that apply)**



**Run-Related:**
- [x] New run created - only send to verified users
- [x] Run reminder - Manual "Remind" button in admin manage-runs page (sends to confirmed and interested users)
- [x] Run completed (notify attendees with summary)
- [x] Run cancelled/modified - notify only confirmed and interested users
  - **Cancelled:** When run is deleted via DELETE `/api/runs/<run_id>`
  - **Modified:** When run is updated via PUT `/api/runs/<run_id>` (detect changes to date/time/location/capacity)

**User Actions:**
- [x] Welcome email (when user signs up)
- [x] Account verified (when admin verifies user) - "Your account has been verified, you can now RSVP for runs"

**Admin Actions:**
- [x] Notify the admin when a new user has joined (on signup with username, email, name, signup date, link to verify users page) 


### 3. Email Preferences
**Should users be able to control email preferences?**
- [ ] Yes - add email preferences page/settings
- [ x ] No - all users receive all emails
- [ ] Partial - some emails are required (e.g., run reminders), others optional


### 4. Email Content & Design
**Email template style:**
- [  ] Simple text emails (plain HTML)
- [ x ] Branded HTML templates (with logo, colors matching basketball theme). No logo just branded with the same theme, can be simple
- [ x ] Responsive design (mobile-friendly)

**Information to include in emails:**
- Run details (date, time, location, cost, capacity)
- User's current RSVP status
- Location address and description
- "View Runs →" link to main site page (https://zachsruns.vercel.app)

### 5. Implementation Priority
**Phase 1 (MVP - Most Important):**
- [ ] Email service setup (Resend) - **TODO: Set up custom domain in Resend**
- [ ] Welcome email (on signup)
- [ ] New run created notification (to verified users)
- [ ] Account verified email (when admin verifies user)
- [ ] Admin notification for new user signup
- [ ] Run reminder button in admin manage-runs page
- [ ] Run completed email (to attendees)
- [ ] Run cancelled/modified emails (to confirmed and interested users)


## Technical Implementation Plan

### Phase 1: Email Service Setup

#### 1.1 Backend Email Utility (`backend/utils/email.py`)
```python
# Email sending utility using Resend
- send_email(to, subject, html_content, text_content)
- send_welcome_email(user)
- send_run_created_email(run, recipients)  # To verified users only
- send_run_reminder_email(run, recipients)  # To confirmed and interested users
- send_run_completed_email(run, attendees)  # To all attendees
- send_run_cancelled_email(run, recipients)  # To confirmed and interested users
- send_run_modified_email(run, recipients, changes)  # To confirmed and interested users
- send_account_verified_email(user)  # When admin verifies user
- send_admin_new_user_notification(user)  # To admin when new user signs up
```

#### 1.2 Environment Variables
- `EMAIL_API_KEY` - API key for email service
- `EMAIL_FROM_ADDRESS` - Sender email (e.g., "noreply@zachsruns.com")
- `EMAIL_FROM_NAME` - Sender name (e.g., "Zach's Organized Runs")
- `FRONTEND_URL` - Base URL for email links

#### 1.3 Email Templates (`backend/templates/emails/`)
- `welcome.html` - Welcome email template
- `run_created.html` - New run notification template
- `run_reminder.html` - Run reminder template
- `run_completed.html` - Run completion summary template
- `run_cancelled.html` - Run cancelled notification template
- `run_modified.html` - Run modified notification template (shows what changed)
- `account_verified.html` - Account verification confirmation template
- `admin_new_user.html` - Admin notification for new user signup template

### Phase 2: Database Changes

#### 2.1 User Model Updates (`backend/models.py`)
```python
# Optional: Add email preferences
- email_notifications_enabled = db.Column(db.Boolean, default=True, nullable=False)
- email_run_created = db.Column(db.Boolean, default=True, nullable=False)
- email_run_reminders = db.Column(db.Boolean, default=True, nullable=False)
- email_weekly_summary = db.Column(db.Boolean, default=False, nullable=False)
```

#### 2.2 Email Logging (Optional)
```python
# Track sent emails for debugging
class EmailLog(db.Model):
    id = db.Column(db.String(36), primary_key=True)
    recipient_email = db.Column(db.String(120), nullable=False)
    email_type = db.Column(db.String(50), nullable=False)  # 'welcome', 'run_created', etc.
    subject = db.Column(db.String(200), nullable=False)
    sent_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    status = db.Column(db.String(20), nullable=False)  # 'sent', 'failed', 'bounced'
```

### Phase 3: Backend Integration

#### 3.1 Auth Routes (`backend/routes/auth.py`)
- **Signup endpoint:** 
  - Send welcome email to new user
  - Send admin notification email to admin user(s) with user details and link to verify users page
- **Login endpoint:** (No email needed)

#### 3.2 Runs Routes (`backend/routes/runs.py`)
- **Create run endpoint:** Send "new run created" email to all verified users
- **Update run endpoint:** Detect changes (date/time/location/capacity) and send "run modified" email to confirmed and interested users
- **Delete run endpoint:** Send "run cancelled" email to confirmed and interested users

#### 3.3 Admin Routes (`backend/routes/admin.py`)
- **Complete run endpoint:** Send run completion summary to all attendees
- **Verify user endpoint:** Send verification email to user
- **New endpoint:** `POST /api/admin/runs/<run_id>/remind` - Send reminder email to confirmed and interested users

### Phase 4: Frontend (If Email Preferences)

#### 4.1 Email Preferences Page (`frontend/app/profile/email-settings/page.tsx`)
- Toggle switches for each email type
- Save preferences to backend
- Display current email address

#### 4.2 API Integration (`frontend/lib/api.ts`)
```typescript
export const emailApi = {
  getPreferences: async () => {...},
  updatePreferences: async (preferences) => {...},
}
```

## Dependencies

### Backend (`backend/requirements.txt`)
```
resend>=2.0.0  # If using Resend
# OR
sendgrid>=6.10.0  # If using SendGrid
# OR
boto3>=1.28.0  # If using AWS SES
```

### Environment Variables (`.env`)
```bash
EMAIL_API_KEY=your_resend_api_key_here
EMAIL_FROM_ADDRESS=noreply@yourdomain.com  # TODO: Set up custom domain in Resend
EMAIL_FROM_NAME="Zach's Organized Runs"
FRONTEND_URL=https://zachsruns.vercel.app
ADMIN_EMAIL=zmann@zachsruns.com  # Admin email for new user notifications
```

**TODO:** Set up custom domain in Resend before production deployment

## Implementation Steps

### Step 1: Choose Email Provider & Setup
1. ✅ Resend account created
2. Get API key from Resend dashboard
3. **TODO:** Verify sender domain in Resend (set up custom domain)
4. Add environment variables to Vercel:
   - `EMAIL_API_KEY` - Resend API key
   - `EMAIL_FROM_ADDRESS` - Sender email (after domain setup)
   - `EMAIL_FROM_NAME` - "Zach's Organized Runs"
   - `ADMIN_EMAIL` - Admin email for notifications

### Step 2: Create Email Utility
1. Create `backend/utils/email.py`
2. Implement base `send_email()` function
3. Test sending a simple email

### Step 3: Create Email Templates
1. Create `backend/templates/emails/` directory
2. Design HTML templates (simple, branded)
3. Create template rendering function

### Step 4: Integrate into Existing Endpoints
1. Add welcome email + admin notification to signup endpoint
2. Add run created email to create_run endpoint (to verified users)
3. Add run modified email to update_run endpoint (detect changes, notify confirmed/interested)
4. Add run cancelled email to delete_run endpoint (notify confirmed/interested)
5. Add run completed email to complete_run endpoint (notify attendees)
6. Add account verified email to verify_user endpoint

### Step 5: Add Manual Reminder Feature
1. Create new backend endpoint `POST /api/admin/runs/<run_id>/remind`
2. Add "Remind" button to admin manage-runs page (next to Complete/Edit/Delete)
3. Button sends reminder email to confirmed and interested users
4. Button should be disabled for completed runs

### Step 6: Frontend Integration
1. Add "Remind" button to `frontend/app/admin/manage-runs/page.tsx`
2. Add API call to `frontend/lib/api.ts` for reminder endpoint
3. Handle loading states and success/error messages

## Testing Plan

### Unit Tests
- Email utility function tests
- Template rendering tests
- Email preference logic tests

### Integration Tests
- Send test email via API
- Verify email delivery
- Test email links work correctly

### Manual Testing
- Sign up new user → verify welcome email
- Create new run → verify notification emails
- RSVP to run → verify confirmation email
- Complete run → verify summary email

## Security Considerations

1. **Rate Limiting:** Prevent email spam/abuse
2. **Email Validation:** Verify email addresses before sending
3. **Unsubscribe:** Include unsubscribe links in emails
4. **API Key Security:** Store API keys in environment variables only
5. **Email Content:** Sanitize user-generated content in emails

## Cost Estimates

### Resend
- Free tier: 3,000 emails/month
- Paid: $20/month for 50,000 emails
- **Estimated usage:** ~100-500 emails/month (small group)

### SendGrid
- Free tier: 100 emails/day (3,000/month)
- Paid: $19.95/month for 50,000 emails

**Recommendation:** Free tier should be sufficient for initial launch

## Next Steps

1. **Answer clarifying questions above**
2. **Choose email provider** (Resend recommended)
3. **Set up email service account**
4. **Begin Phase 1 implementation**

---

## Notes

- Emails should be sent asynchronously (background jobs) to avoid slowing down API responses
- Consider using a queue system (Redis, Vercel Queue) for reliable email delivery
- Email templates should be mobile-responsive and branded with basketball theme colors
- Include "View Runs →" link to main site page in all run-related emails
- Log email sends for debugging and analytics
- **TODO:** Set up custom domain in Resend before production deployment
- Run modified emails should only send if significant changes (date, time, location, capacity) are detected
- Admin new user notification should include direct link to `/admin/verify-users` page

