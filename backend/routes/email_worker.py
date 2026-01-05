"""
Email worker endpoint for QStash (production) - processes individual email jobs
"""
from flask import Blueprint, request, jsonify
import os
import logging
from utils.email import _send_email_direct

logger = logging.getLogger(__name__)

email_worker_bp = Blueprint('email_worker', __name__)

# QStash signing keys for signature verification
QSTASH_CURRENT_SIGNING_KEY = os.getenv('QSTASH_CURRENT_SIGNING_KEY')
QSTASH_NEXT_SIGNING_KEY = os.getenv('QSTASH_NEXT_SIGNING_KEY')


def _verify_qstash_signature():
    """
    Verify QStash request signature using the Receiver class from qstash SDK
    """
    is_production = os.getenv('VERCEL') or os.getenv('VERCEL_ENV')
    
    # In local development, skip verification
    if not is_production:
        logger.debug("Skipping QStash signature verification (local development)")
        return True
    
    # In production, verify signature
    if not QSTASH_CURRENT_SIGNING_KEY:
        logger.warning("QStash signing key not configured - allowing request (should be configured in production)")
        return True
    
    try:
        from qstash import Receiver
        
        signature = request.headers.get('Upstash-Signature')
        if not signature:
            logger.error("Missing QStash signature header")
            return False
        
        body = request.get_data(as_text=True)
        
        # Create receiver with current signing key
        receiver = Receiver(
            current_signing_key=QSTASH_CURRENT_SIGNING_KEY,
            next_signing_key=QSTASH_NEXT_SIGNING_KEY
        )
        
        # Verify the signature - this raises an exception if invalid
        try:
            receiver.verify(
                body=body,
                signature=signature,
                url=request.url
            )
            return True
        except Exception as verify_error:
            logger.error(f"QStash signature verification failed: {str(verify_error)}")
            return False
            
    except ImportError:
        logger.error("qstash package not installed - cannot verify signature")
        return False
    except Exception as e:
        logger.error(f"Error during QStash signature verification: {str(e)}")
        return False


@email_worker_bp.route('/email-worker', methods=['POST'])
def email_worker():
    """
    QStash worker endpoint - processes a single email job
    This endpoint is called by QStash with signed requests
    """
    try:
        # Verify QStash signature (basic check)
        if not _verify_qstash_signature():
            return jsonify({'error': 'Invalid signature'}), 401
        
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Extract email data from QStash payload
        to = data.get('to')
        subject = data.get('subject')
        html_content = data.get('html_content')
        text_content = data.get('text_content')
        
        if not to or not subject or not html_content:
            return jsonify({'error': 'Missing required fields: to, subject, html_content'}), 400
        
        # Send email directly (rate limiting handled by QStash scheduling)
        success = _send_email_direct(
            to=to,
            subject=subject,
            html_content=html_content,
            text_content=text_content,
            retry_on_429=True
        )
        
        if success:
            return jsonify({'ok': True, 'message': 'Email sent successfully'}), 200
        else:
            return jsonify({'ok': False, 'error': 'Failed to send email'}), 500
            
    except Exception as e:
        logger.error(f"Email worker error: {str(e)}")
        return jsonify({'error': str(e)}), 500

