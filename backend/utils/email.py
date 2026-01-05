"""
Email utility functions using Resend
"""
import os
import logging
import resend
import threading
import time
from datetime import datetime
from queue import Queue

# Initialize Resend client
resend_api_key = os.getenv('RESEND_API_KEY')
if not resend_api_key:
    logging.warning("RESEND_API_KEY not set - email functionality will be disabled")
else:
    resend.api_key = resend_api_key

# Email configuration
EMAIL_FROM_ADDRESS = os.getenv('EMAIL_FROM_ADDRESS', 'notifications@send.zachsruns.com')
EMAIL_FROM_NAME = os.getenv('EMAIL_FROM_NAME', "Zach's Organized Runs")

# FRONTEND_URL is for email links (where users click to go)
# In local dev, this should be localhost:3000; in production, the real site
FRONTEND_URL = os.getenv('FRONTEND_URL', 'https://zachsruns.vercel.app')

# Set up logging
logger = logging.getLogger(__name__)

# Email queue for local development (threading)
_email_queue = Queue()
_email_worker_thread = None
_email_worker_lock = threading.Lock()

# QStash configuration for production
QSTASH_TOKEN = os.getenv('QSTASH_TOKEN')
QSTASH_CURRENT_SIGNING_KEY = os.getenv('QSTASH_CURRENT_SIGNING_KEY')
QSTASH_NEXT_SIGNING_KEY = os.getenv('QSTASH_NEXT_SIGNING_KEY')

# APP_URL is for QStash callbacks (must be publicly accessible)
# Use QSTASH_CALLBACK_URL if set (for local ngrok testing), otherwise derive from VERCEL_URL/FRONTEND_URL
_qstash_callback_url = os.getenv('QSTASH_CALLBACK_URL')
_vercel_url = os.getenv('VERCEL_URL')
if _qstash_callback_url:
    # Explicit callback URL (e.g., ngrok URL for local testing)
    APP_URL = _qstash_callback_url
elif _vercel_url:
    # Production on Vercel - VERCEL_URL doesn't include protocol
    APP_URL = f"https://{_vercel_url}"
else:
    # Fallback to FRONTEND_URL (works when they're the same, e.g., production)
    APP_URL = os.getenv('FRONTEND_URL', 'https://zachsruns.vercel.app')

# Log if LOCAL_USE_QSTASH is enabled (helps with debugging)
if os.getenv('LOCAL_USE_QSTASH', '').lower() == 'true':
    logging.info("LOCAL_USE_QSTASH is enabled - using QStash for local email delivery")


def _get_location_info(run):
    """Helper function to extract location info from run"""
    location_name = run.location_entity.name if run.location_entity else 'Unknown Location'
    location_address = run.location_entity.address if run.location_entity else None
    return location_name, location_address


def _format_datetime_for_email(dt, format_str='%B %d, %Y'):
    """Helper function to format datetime objects for email"""
    if hasattr(dt, 'strftime'):
        return dt.strftime(format_str)
    return str(dt)


def _filter_recipients_for_local(recipients):
    """
    Filter recipients for local development - only send to real email addresses.
    In production (Vercel), returns all recipients unchanged.
    
    Args:
        recipients: List of User objects
        
    Returns:
        Filtered list of User objects (local) or original list (production)
    """
    is_local = not os.getenv('VERCEL') and not os.getenv('VERCEL_ENV')
    if is_local:
        # Only send to real email addresses in local testing
        real_email_users = ['zmann', 'rantesting22', 'zmyahoo', 'reno1atrcndotcom', 'chris1atrcndotcom', 'marisamanno7atgmail']
        filtered = [user for user in recipients if user.username in real_email_users]
        if len(filtered) < len(recipients):
            logger.info(f"Local testing mode: Filtered {len(recipients)} recipients to {len(filtered)} real email addresses")
        return filtered
    return recipients


def _send_email_direct(to: str, subject: str, html_content: str, text_content: str = None, retry_on_429: bool = True):
    """
    Send an email directly using Resend (with retry logic for 429 errors)
    
    Args:
        to: Recipient email address
        subject: Email subject
        html_content: HTML email content
        text_content: Plain text email content (optional)
        retry_on_429: Whether to retry on 429 rate limit errors
    
    Returns:
        True if sent successfully, False otherwise
    """
    if not resend_api_key:
        logger.warning(f"Email not sent to {to}: RESEND_API_KEY not configured")
        return False
    
    try:
        params = {
            "from": f"{EMAIL_FROM_NAME} <{EMAIL_FROM_ADDRESS}>",
            "to": [to],
            "subject": subject,
            "html": html_content,
        }
        
        if text_content:
            params["text"] = text_content
        
        response = resend.Emails.send(params)
        logger.info(f"Email sent successfully to {to}: {response.get('id', 'unknown')}")
        return True
    except Exception as e:
        error_str = str(e)
        # Check for 429 rate limit error
        if retry_on_429 and ('429' in error_str or 'rate limit' in error_str.lower() or 'too many requests' in error_str.lower()):
            logger.warning(f"Rate limit (429) for {to}, retrying after 1 second...")
            time.sleep(1)
            # Retry once
            try:
                response = resend.Emails.send(params)
                logger.info(f"Email sent successfully to {to} on retry: {response.get('id', 'unknown')}")
                return True
            except Exception as retry_error:
                logger.error(f"Failed to send email to {to} on retry: {str(retry_error)}")
                return False
        else:
            logger.error(f"Failed to send email to {to}: {error_str}")
            return False


def _email_worker_thread_func():
    """Background worker thread that processes email queue (local development only)"""
    from queue import Empty
    
    while True:
        try:
            email_data = _email_queue.get(timeout=1)
            if email_data is None:  # Shutdown signal
                break
            
            _send_email_direct(
                to=email_data['to'],
                subject=email_data['subject'],
                html_content=email_data['html_content'],
                text_content=email_data.get('text_content')
            )
            
            # Rate limit: 1 email per second
            time.sleep(1)
            
            _email_queue.task_done()
        except Empty:
            # Queue timeout, continue waiting for emails
            continue
        except Exception as e:
            # Log unexpected errors but keep worker alive
            logger.error(f"Email worker error: {str(e)}")
            continue


def _start_email_worker_thread():
    """Start the email worker thread lazily (local development only)"""
    global _email_worker_thread
    
    with _email_worker_lock:
        if _email_worker_thread is None or not _email_worker_thread.is_alive():
            _email_worker_thread = threading.Thread(target=_email_worker_thread_func, daemon=True)
            _email_worker_thread.start()
            logger.info("Email worker thread started")


def _enqueue_email_local(to: str, subject: str, html_content: str, text_content: str = None):
    """Enqueue email for local development (threading)"""
    _start_email_worker_thread()
    _email_queue.put({
        'to': to,
        'subject': subject,
        'html_content': html_content,
        'text_content': text_content
    })


def _enqueue_email_production(to: str, subject: str, html_content: str, text_content: str = None, delay_seconds: int = 0):
    """Enqueue email for production (QStash)"""
    if not QSTASH_TOKEN:
        logger.error("QSTASH_TOKEN not configured - cannot enqueue email")
        return False
    
    try:
        from qstash import QStash
        
        qstash_client = QStash(QSTASH_TOKEN)
        
        email_data = {
            'to': to,
            'subject': subject,
            'html_content': html_content,
            'text_content': text_content
        }
        
        worker_url = f"{APP_URL}/api/email-worker"
        
        # QStash delay parameter is in seconds (not milliseconds)
        publish_kwargs = {
            'url': worker_url,
            'body': email_data,
        }
        
        # Only add delay if > 0 (QStash may not accept 0 delay)
        if delay_seconds > 0:
            publish_kwargs['delay'] = delay_seconds
        
        # Add Vercel deployment protection bypass header if configured
        bypass_secret = os.getenv('VERCEL_AUTOMATION_BYPASS_SECRET')
        if bypass_secret:
            publish_kwargs['headers'] = {
                'x-vercel-protection-bypass': bypass_secret
            }
        
        qstash_client.message.publish_json(**publish_kwargs)
        
        logger.info(f"Email enqueued to QStash for {to} (delay: {delay_seconds}s)")
        return True
    except Exception as e:
        logger.error(f"Failed to enqueue email to QStash: {str(e)}")
        return False


def _should_use_qstash():
    """
    Determine whether to use QStash for email delivery.
    
    Returns True if:
    - Running in production (Vercel), OR
    - LOCAL_USE_QSTASH env var is set to 'true' (for local QStash testing)
    """
    is_production = os.getenv('VERCEL') or os.getenv('VERCEL_ENV')
    local_use_qstash = os.getenv('LOCAL_USE_QSTASH', '').lower() == 'true'
    
    return is_production or local_use_qstash


def send_email(to: str, subject: str, html_content: str, text_content: str = None, delay_seconds: int = 0):
    """
    Send an email using Resend (queued for rate limiting)
    
    Args:
        to: Recipient email address
        subject: Email subject
        html_content: HTML email content
        text_content: Plain text email content (optional)
        delay_seconds: Delay in seconds before sending (for QStash scheduling)
    
    Returns:
        True if queued successfully, False otherwise
    """
    if _should_use_qstash():
        return _enqueue_email_production(to, subject, html_content, text_content, delay_seconds)
    else:
        _enqueue_email_local(to, subject, html_content, text_content)
        return True


def render_email_template(template_name: str, **kwargs):
    """
    Render an email template using Flask's render_template
    
    Args:
        template_name: Name of the template file (e.g., 'welcome.html')
        **kwargs: Variables to pass to the template
    
    Returns:
        Rendered HTML string
    """
    from flask import render_template, has_app_context
    template_path = f'emails/{template_name}'
    try:
        # Use current app context if available, otherwise create a new app context
        if has_app_context():
            return render_template(template_path, **kwargs)
        else:
            # Fallback: create app context
            from app import app
            with app.app_context():
                return render_template(template_path, **kwargs)
    except Exception as e:
        logger.error(f"Failed to render template {template_name}: {str(e)}")
        raise


def send_welcome_email(user):
    """Send welcome email to new user"""
    # Welcome email is exception - always sent even if not verified, but still filter for local
    recipients = _filter_recipients_for_local([user])
    if not recipients:
        return False
    
    user = recipients[0]
    html_content = render_email_template('welcome.html', user=user, frontend_url=FRONTEND_URL)
    text_content = f"Welcome to Zach's Organized Runs!\n\nYour account has been created. The admin will need to verify your account before you can RSVP for runs.\n\nVisit {FRONTEND_URL} to get started."
    return send_email(
        to=user.email,
        subject="Welcome to Zach's Organized Runs!",
        html_content=html_content,
        text_content=text_content
    )


def send_account_verified_email(user):
    """Send email when admin verifies user account"""
    recipients = _filter_recipients_for_local([user])
    if not recipients:
        return False
    
    user = recipients[0]
    html_content = render_email_template('account_verified.html', user=user, frontend_url=FRONTEND_URL)
    text_content = f"Your account has been verified!\n\nYou can now RSVP for runs. Visit {FRONTEND_URL} to get started."
    return send_email(
        to=user.email,
        subject="Your Account Has Been Verified",
        html_content=html_content,
        text_content=text_content
    )


def send_admin_new_user_notification(user, admin_users):
    """Send notification to all admin users when a new user signs up"""
    # Filter admin users for local testing
    admin_users = _filter_recipients_for_local(admin_users)
    
    if not admin_users:
        logger.info("No admin users for new user notification after filtering")
        return 0
    
    success_count = 0
    for index, admin in enumerate(admin_users):
        html_content = render_email_template(
            'admin_new_user.html',
            new_user=user,
            admin=admin,
            frontend_url=FRONTEND_URL
        )
        text_content = f"New user signed up:\n\nUsername: {user.username}\nEmail: {user.email}\nName: {user.first_name} {user.last_name}\nSignup Date: {user.created_at.strftime('%B %d, %Y')}\n\nVisit {FRONTEND_URL}/admin/verify-users to verify this user."
        
        if send_email(
            to=admin.email,
            subject=f"New User Signup: {user.username}",
            html_content=html_content,
            text_content=text_content,
            delay_seconds=index  # 1 email per second
        ):
            success_count += 1
    
    return success_count


def send_run_created_email(run, recipients):
    """Send email to verified users when a new run is created"""
    # Filter recipients for local testing
    recipients = _filter_recipients_for_local(recipients)
    
    if not recipients:
        logger.info("No recipients for run created email after filtering")
        return 0
    
    success_count = 0
    location_name, location_address = _get_location_info(run)
    
    verified_recipients = [user for user in recipients if user.is_verified]
    
    if not verified_recipients:
        logger.info("No verified recipients for run created email")
        return 0
    
    for index, user in enumerate(verified_recipients):
        html_content = render_email_template(
            'run_created.html',
            run=run,
            user=user,
            location_name=location_name,
            location_address=location_address,
            frontend_url=FRONTEND_URL
        )
        text_content = f"New Run Created: {run.title}\n\nDate: {run.date.strftime('%B %d, %Y')}\nTime: {run.start_time.strftime('%I:%M %p')} - {run.end_time.strftime('%I:%M %p')}\nLocation: {location_name}\n\nVisit {FRONTEND_URL} to RSVP."
        
        if send_email(
            to=user.email,
            subject=f"New Run: {run.title}",
            html_content=html_content,
            text_content=text_content,
            delay_seconds=index  # 1 email per second
        ):
            success_count += 1
    
    return success_count


def send_run_reminder_email(run, recipients, reminder_message):
    """Send reminder email to confirmed and interested users"""
    # Filter recipients for local testing
    recipients = _filter_recipients_for_local(recipients)
    
    if not recipients:
        logger.info("No recipients for run reminder email after filtering")
        return 0
    
    success_count = 0
    location_name, _ = _get_location_info(run)
    
    for index, user in enumerate(recipients):
        html_content = render_email_template(
            'run_reminder.html',
            run=run,
            user=user,
            reminder_message=reminder_message,
            location_name=location_name,
            frontend_url=FRONTEND_URL
        )
        text_content = f"{reminder_message}\n\nRun: {run.title}\nTime: {run.start_time.strftime('%I:%M %p')} - {run.end_time.strftime('%I:%M %p')}\nLocation: {location_name}\n\nVisit {FRONTEND_URL} for details."
        
        if send_email(
            to=user.email,
            subject=f"Reminder: {run.title}",
            html_content=html_content,
            text_content=text_content,
            delay_seconds=index  # 1 email per second
        ):
            success_count += 1
    
    return success_count


def send_run_completed_email(run, attendees):
    """Send completion summary email to all attendees"""
    # Filter recipients for local testing
    attendees = _filter_recipients_for_local(attendees)
    
    if not attendees:
        logger.info("No attendees for run completed email after filtering")
        return 0
    
    success_count = 0
    location_name, _ = _get_location_info(run)
    attended_count = len(attendees)
    
    for index, user in enumerate(attendees):
        html_content = render_email_template(
            'run_completed.html',
            run=run,
            user=user,
            location_name=location_name,
            attended_count=attended_count,
            frontend_url=FRONTEND_URL
        )
        text_content = f"Run Completed: {run.title}\n\nDate: {run.date.strftime('%B %d, %Y')}\nLocation: {location_name}\n\nVisit {FRONTEND_URL} to see the summary."
        
        if send_email(
            to=user.email,
            subject=f"Run Completed: {run.title}",
            html_content=html_content,
            text_content=text_content,
            delay_seconds=index  # 1 email per second
        ):
            success_count += 1
    
    return success_count


def send_run_cancelled_email(run, recipients):
    """Send cancellation email to confirmed and interested users"""
    # Filter recipients for local testing
    recipients = _filter_recipients_for_local(recipients)
    
    if not recipients:
        logger.info("No recipients for run cancelled email after filtering")
        return 0
    
    success_count = 0
    location_name, _ = _get_location_info(run)
    
    for index, user in enumerate(recipients):
        html_content = render_email_template(
            'run_cancelled.html',
            run=run,
            user=user,
            location_name=location_name,
            frontend_url=FRONTEND_URL
        )
        text_content = f"Run Cancelled: {run.title}\n\nThe run scheduled for {run.date.strftime('%B %d, %Y')} has been cancelled.\n\nVisit {FRONTEND_URL} to see other upcoming runs."
        
        if send_email(
            to=user.email,
            subject=f"Run Cancelled: {run.title}",
            html_content=html_content,
            text_content=text_content,
            delay_seconds=index  # 1 email per second
        ):
            success_count += 1
    
    return success_count


def send_run_modified_email(run, recipients, changes):
    """Send modification email to confirmed and interested users"""
    # Filter recipients for local testing
    recipients = _filter_recipients_for_local(recipients)
    
    if not recipients:
        logger.info("No recipients for run modified email after filtering")
        return 0
    
    success_count = 0
    
    # Format changes text
    changes_text = []
    if 'title' in changes:
        changes_text.append(f"Title changed from \"{changes['title']['old']}\" to \"{changes['title']['new']}\"")
    
    if 'date' in changes:
        old_date = _format_datetime_for_email(changes['date']['old'])
        new_date = _format_datetime_for_email(changes['date']['new'])
        changes_text.append(f"Date changed from {old_date} to {new_date}")
    
    if 'start_time' in changes or 'end_time' in changes:
        if 'start_time' in changes and 'end_time' in changes:
            old_start = _format_datetime_for_email(changes['start_time']['old'], '%I:%M %p')
            new_start = _format_datetime_for_email(changes['start_time']['new'], '%I:%M %p')
            old_end = _format_datetime_for_email(changes['end_time']['old'], '%I:%M %p')
            new_end = _format_datetime_for_email(changes['end_time']['new'], '%I:%M %p')
            changes_text.append(f"Time changed from {old_start}-{old_end} to {new_start}-{new_end}")
        elif 'start_time' in changes:
            old_start = _format_datetime_for_email(changes['start_time']['old'], '%I:%M %p')
            new_start = _format_datetime_for_email(changes['start_time']['new'], '%I:%M %p')
            changes_text.append(f"Start time changed from {old_start} to {new_start}")
        elif 'end_time' in changes:
            old_end = _format_datetime_for_email(changes['end_time']['old'], '%I:%M %p')
            new_end = _format_datetime_for_email(changes['end_time']['new'], '%I:%M %p')
            changes_text.append(f"End time changed from {old_end} to {new_end}")
    
    if 'location' in changes:
        changes_text.append(f"Location changed from {changes['location']['old']} to {changes['location']['new']}")
    
    if 'capacity' in changes:
        changes_text.append(f"Capacity changed from {changes['capacity']['old']} to {changes['capacity']['new']}")
    
    if 'description' in changes:
        changes_text.append("Description updated")
    
    # Format changes for text email
    if changes_text:
        changes_summary_text = "\n".join([f"- {change}." for change in changes_text])
    else:
        changes_summary_text = "Run details updated."
    
    location_name, location_address = _get_location_info(run)
    
    for index, user in enumerate(recipients):
        html_content = render_email_template(
            'run_modified.html',
            run=run,
            user=user,
            changes_list=changes_text,  # Pass the list to template for proper HTML formatting
            location_name=location_name,
            location_address=location_address,
            frontend_url=FRONTEND_URL
        )
        text_content = f"Run Modified: {run.title}\n\nChanges:\n{changes_summary_text}\n\nVisit {FRONTEND_URL} to see updated details."
        
        if send_email(
            to=user.email,
            subject=f"Run Modified: {run.title}",
            html_content=html_content,
            text_content=text_content,
            delay_seconds=index  # 1 email per second
        ):
            success_count += 1
    
    return success_count


def send_announcement_email(announcement_message, recipients):
    """Send announcement email to verified users"""
    # Filter recipients for local testing
    recipients = _filter_recipients_for_local(recipients)
    
    if not recipients:
        logger.info("No recipients for announcement email after filtering")
        return 0
    
    success_count = 0
    
    verified_recipients = [user for user in recipients if user.is_verified]
    
    if not verified_recipients:
        logger.info("No verified recipients for announcement email")
        return 0
    
    for index, user in enumerate(verified_recipients):
        html_content = render_email_template(
            'announcement.html',
            user=user,
            announcement_message=announcement_message,
            frontend_url=FRONTEND_URL
        )
        text_content = f"New Announcement\n\n{announcement_message}\n\nVisit {FRONTEND_URL} to view runs."
        
        if send_email(
            to=user.email,
            subject="New Announcement",
            html_content=html_content,
            text_content=text_content,
            delay_seconds=index  # 1 email per second
        ):
            success_count += 1
    
    return success_count

