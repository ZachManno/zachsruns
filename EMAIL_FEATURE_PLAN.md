# Email Feature Implementation Plan

## Overview
Add email notification functionality to "Zach's Organized Runs" to keep users informed about runs, RSVPs, and important updates.

## Clarifying Questions

### 1. Email Service Provider
**Which email service should we use?**
- **Resend** - Use Resend, I created an account, and the domain is verified:
I bought the domain zachsruns.com and registered send.zachsruns.com in Resend dashboard

I have my resend api key, please use an environment variable for it RESEND_API_KEY for both local development and vercel deployments. 


### 2. Email Types to Implement
**Which emails should we send? (Select all that apply)**

To preface, in any scenario, only verified users should get emails. **Exception:** Welcome email is sent to all new users on signup (before verification). 


**Run-Related:**
- [x] New run created - only send to verified users
- [x] Run reminder - Manual "Remind" button in admin manage-runs page (sends to confirmed and interested users)
  - Admin can set custom `reminderMessage` (text field)
  - Email displays: reminderMessage, then Run Name, Run Time, Run Location
- [x] Run completed (notify attendees with summary)
- [x] Run cancelled/modified - notify only confirmed and interested users
  - **Cancelled:** When run is deleted via DELETE `/api/runs/<run_id>`
  - **Modified:** When run is updated via PUT `/api/runs/<run_id>` (detect ANY field changes)
  - Show what changed (e.g., "Date changed from Jan 5 to Jan 6") with link to main page

**User Actions:**
- [x] Welcome email (when user signs up, inform the user they will be able to use the site once the admin verifies them)
  - Include link to main site (https://zachsruns.vercel.app/)
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
- [ x ] Branded HTML templates (with logo, colors matching basketball theme). No logo just designed with the same theme, can be simple, make a nice "Zach's Runs" header
  - Header: Basketball theme colors (orange/black), medium size (not too large, not too small)
  - HTML/CSS only, no image files
- [ x ] Responsive design (mobile-friendly, as a lot of the time the user will be on their mobile)

**Information to include in emails:**
- Run details (date, time, location, cost, capacity)
- User's current RSVP status
- Location address and description
- "View Runs →" link to main site page (https://zachsruns.vercel.app)

### 5. Implementation Priority
**Phase 1 (MVP - Most Important):**
- [ ] Email service setup (Resend) - I registered send.zachsruns.com in Resend dashboard
- [ ] Welcome email (on signup)
- [ ] Account verified email (when admin verifies user)
- [ ] New run created notification (to verified users)
- [ ] Admin notification for new user signup
- [ ] Run reminder button in admin manage-runs page
- [ ] Run completed email (to attendees)
- [ ] Run cancelled/modified emails (to confirmed and interested users)


## Technical Implementation Plan

### Phase 1: Email Service Setup

#### 1.1 Backend Email Utility (`backend/utils/email.py`)
```python
# Email sending utility using Resend
# All emails sent synchronously (blocking, wait for response)
- send_email(to, subject, html_content, text_content)
- send_welcome_email(user)  # Exception: sent even if not verified
- send_run_created_email(run, recipients)  # To verified users only
- send_run_reminder_email(run, recipients, reminder_message)  # To confirmed and interested users
  # reminder_message: Custom text from admin, then shows Run Name, Run Time, Run Location
- send_run_completed_email(run, attendees)  # To all attendees
- send_run_cancelled_email(run, recipients)  # To confirmed and interested users
- send_run_modified_email(run, recipients, changes)  # To confirmed and interested users
  # changes: Dict showing what changed (e.g., {"date": {"old": "Jan 5", "new": "Jan 6"}})
  # Email shows what changed in format: "Date changed from X to Y. Time changed from A to B."
  # Include link to main page
- send_account_verified_email(user)  # When admin verifies user
- send_admin_new_user_notification(user)  # To all admin users when new user signs up
```

#### 1.2 Environment Variables
- `RESEND_API_KEY` - Resend API key
- `EMAIL_FROM_ADDRESS` - Sender email: `notifications@send.zachsruns.com`
- `EMAIL_FROM_NAME` - Sender name: "Zach's Organized Runs"
- `FRONTEND_URL` - Base URL for email links (https://zachsruns.vercel.app)

#### 1.3 Email Templates (`backend/templates/emails/`)
- `base.html` - Common base template with header, footer, and styling
  - **Header:** "Zach's Runs" (HTML/CSS only, basketball theme, medium size)
  - **Footer:** "Zach's Organized Runs, est. 2026, Zach Manno"
  - **Background:** Very light and subtle orange
  - **Colors:** Minimal and light design (not bright/orange)
  - **Mobile-responsive:** Optimized for mobile viewing
  - **Template Engine:** Jinja2 (Flask default)
- `welcome.html` - Welcome email template (extends base)
- `run_created.html` - New run notification template (extends base)
- `run_reminder.html` - Run reminder template (extends base)
- `run_completed.html` - Run completion summary template (extends base)
- `run_cancelled.html` - Run cancelled notification template (extends base)
- `run_modified.html` - Run modified notification template (extends base, shows what changed)
- `account_verified.html` - Account verification confirmation template (extends base)
- `admin_new_user.html` - Admin notification for new user signup template (extends base)

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
  - Send welcome email to new user (exception: sent even if not verified)
  - Send admin notification email to ALL admin users (`User.query.filter_by(is_admin=True)`) with user details and link to verify users page
- **Login endpoint:** (No email needed)

#### 3.2 Runs Routes (`backend/routes/runs.py`)
- **Create run endpoint:** Send "new run created" email to all verified users
- **Update run endpoint:** Detect ANY field changes and send "run modified" email to confirmed and interested users
- **Delete run endpoint:** Send "run cancelled" email to confirmed and interested users

#### 3.3 Admin Routes (`backend/routes/admin.py`)
- **Complete run endpoint:** Send run completion summary to all attendees
- **Verify user endpoint:** Send verification email to user
- **New endpoint:** `POST /api/admin/runs/<run_id>/remind` - Send reminder email to confirmed and interested users
  - Request body: `{ "reminder_message": "Required custom message text (max 100 chars)" }`
  - Email displays: reminder_message, then Run Name, Run Time, Run Location
  - Frontend: Single-line text input with 100 character limit, required field

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
RESEND_API_KEY=your_resend_api_key_here
EMAIL_FROM_ADDRESS=notifications@send.zachsruns.com
EMAIL_FROM_NAME="Zach's Organized Runs"
FRONTEND_URL=https://zachsruns.vercel.app
```

**Note:** Admin notifications are sent to all users with `is_admin=True` (queried from database)

## Implementation Steps

### Step 1: Choose Email Provider & Setup
1. ✅ Resend account created
2. ✅ Domain `send.zachsruns.com` verified in Resend
3. Get API key from Resend dashboard
4. Add environment variables to Vercel:
   - `RESEND_API_KEY` - Resend API key
   - `EMAIL_FROM_ADDRESS` - `notifications@send.zachsruns.com`
   - `EMAIL_FROM_NAME` - "Zach's Organized Runs"
   - `FRONTEND_URL` - `https://zachsruns.vercel.app`

### Step 2: Create Email Utility
1. Create `backend/utils/email.py`
2. Implement base `send_email()` function
3. Test sending a simple email

### Step 3: Create Email Templates
1. Create `backend/templates/emails/` directory
2. Create `base.html` template with:
   - Header: "Zach's Runs" (HTML/CSS, basketball theme, medium size)
   - Footer: "Zach's Organized Runs, est. 2026, Zach Manno"
   - Background: Very light and subtle orange
   - Colors: Minimal and light design (not bright oranges)
   - Mobile-responsive layout
   - Content wrapper with max-width and padding
3. Create individual email templates (welcome, run_created, etc.) that extend base.html
4. Create template rendering function using Jinja2

### Step 4: Integrate into Existing Endpoints
1. Add welcome email + admin notification to signup endpoint
2. Add run created email to create_run endpoint (to verified users)
3. Add run modified email to update_run endpoint (detect changes, notify confirmed/interested)
4. Add run cancelled email to delete_run endpoint (notify confirmed/interested)
5. Add run completed email to complete_run endpoint (notify attendees)
6. Add account verified email to verify_user endpoint

### Step 5: Add Manual Reminder Feature
1. Create new backend endpoint `POST /api/admin/runs/<run_id>/remind`
   - Accepts `reminder_message` (required, max 100 chars) in request body
   - Fire-and-forget email sending (API returns success even if email fails)
   - Log email failures for debugging
2. Add "Remind" button to admin manage-runs page (next to Complete/Edit/Delete)
   - Button opens modal/form with single-line text input (100 char limit, required)
   - Button sends reminder email to confirmed and interested users
   - Button should be disabled for completed runs
3. Email displays: reminder_message, then Run Name, Run Time, Run Location

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
3. **Unsubscribe:** **TODO:** Add unsubscribe links and email preferences page (deferred for later)
4. **API Key Security:** Store API keys in environment variables only (`RESEND_API_KEY`)
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

- Emails sent **synchronously** (blocking, wait for response) - simpler implementation
- **Error Handling:** Fire-and-forget approach - API returns success even if email sending fails, log failures for debugging
- Email templates use common base template (`base.html`) with header, footer, and styling
- Email templates should be mobile-responsive and branded with basketball theme colors
- Include "View Runs →" link to main site page (https://zachsruns.vercel.app/) in all run-related emails
- Log email sends and failures for debugging and analytics
- ✅ Domain `send.zachsruns.com` verified in Resend
- Run modified emails send for ANY field change and show what changed in format: "Date changed from X to Y. Time changed from A to B."
- Run modified emails include link to main page
- Admin new user notification sent to ALL admin users (queried from database with `is_admin=True`)
- Admin new user notification should include direct link to `/admin/verify-users` page
- Welcome email is exception: sent to all users on signup (even if not verified)
- Welcome email includes link to main site
- "Zach's Runs" header: HTML/CSS only (no image/logo file), basketball theme colors, medium size (not too large, not too small)
- Base template: Header "Zach's Runs", Footer "Zach's Organized Runs, est. 2026, Zach Manno"
- Base template: Very light and subtle orange background, minimal and light color scheme (not bright oranges)
- Base template: Mobile-responsive with content wrapper, max-width, and padding
- Template engine: Jinja2 (Flask default)
- Run reminder: Admin sets required `reminder_message` (single-line text input, 100 char limit), email displays message then Run Name, Run Time, Run Location
- **TODO:** Add unsubscribe links and email preferences page (deferred for later implementation)

