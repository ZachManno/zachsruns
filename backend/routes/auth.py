from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash, generate_password_hash
from sqlalchemy import func
from datetime import datetime, timedelta
import secrets
import logging
from database import db
from models import User
from middleware import generate_token, require_auth
from utils.email import send_welcome_email, send_admin_new_user_notification, send_password_reset_email

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/signup', methods=['POST'])
def signup():
    """Create new user account"""
    data = request.get_json()
    
    # Validate input
    if not data or not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Username, email, and password are required'}), 400
    
    if not data.get('first_name') or not data.get('last_name'):
        return jsonify({'error': 'First name and last name are required'}), 400
    
    username = data['username'].strip()
    email = data['email'].strip().lower()
    password = data['password']
    first_name = data['first_name'].strip()
    last_name = data['last_name'].strip()
    
    # Check if user already exists (case-insensitive)
    if User.query.filter(func.lower(User.username) == func.lower(username)).first():
        return jsonify({'error': 'Username already exists'}), 400
    
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already exists'}), 400
    
    # Create new user
    try:
        new_user = User(
            username=username,
            email=email,
            password_hash=generate_password_hash(password),
            first_name=first_name,
            last_name=last_name,
            is_admin=False,
            is_verified=False
        )
        db.session.add(new_user)
        db.session.commit()
        
        # Send welcome email (exception: sent even if not verified)
        try:
            send_welcome_email(new_user)
        except Exception as e:
            # Log error but don't fail signup
            logger.error(f"Failed to send welcome email: {str(e)}")
        
        # Send admin notification to all admin users
        try:
            admin_users = User.query.filter_by(is_admin=True).all()
            if admin_users:
                send_admin_new_user_notification(new_user, admin_users)
        except Exception as e:
            # Log error but don't fail signup
            logger.error(f"Failed to send admin notification: {str(e)}")
        
        # Generate token
        token = generate_token(new_user)
        
        return jsonify({
            'message': 'User created successfully',
            'token': token,
            'user': new_user.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to create user'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user and return JWT token"""
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Username and password are required'}), 400
    
    username = data['username'].strip()
    password = data['password']
    
    # Find user (case-insensitive)
    user = User.query.filter(func.lower(User.username) == func.lower(username)).first()
    
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Invalid username or password'}), 401
    
    # Generate token
    token = generate_token(user)
    
    return jsonify({
        'message': 'Login successful',
        'token': token,
        'user': user.to_dict()
    }), 200

@auth_bp.route('/me', methods=['GET'])
@require_auth
def get_current_user():
    """Get current authenticated user"""
    return jsonify({
        'user': request.current_user.to_dict()
    }), 200

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Request password reset - sends email with reset link"""
    data = request.get_json()
    
    if not data or not data.get('email'):
        return jsonify({'error': 'Email is required'}), 400
    
    email = data['email'].strip().lower()
    
    # Find user by email
    user = User.query.filter_by(email=email).first()
    
    # Always return success message (don't reveal if email exists)
    success_message = 'If an account with that email exists, a password reset link has been sent.'
    
    if user:
        try:
            # Generate secure token (32 bytes = 43 characters in base64)
            token = secrets.token_urlsafe(32)
            
            # Set token and expiry (15 minutes)
            user.reset_token = token
            user.reset_token_expires = datetime.utcnow() + timedelta(minutes=15)
            db.session.commit()
            
            # Send reset email
            try:
                send_password_reset_email(user, token)
            except Exception as e:
                logger.error(f"Failed to send password reset email: {str(e)}")
                # Don't fail the request if email fails
        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to create reset token: {str(e)}")
    
    return jsonify({'message': success_message}), 200

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Reset password using token from email"""
    data = request.get_json()
    
    if not data or not data.get('token') or not data.get('password'):
        return jsonify({'error': 'Token and new password are required'}), 400
    
    token = data['token'].strip()
    new_password = data['password']
    
    # Find user by token
    user = User.query.filter_by(reset_token=token).first()
    
    if not user:
        return jsonify({'error': 'Invalid or expired reset link'}), 400
    
    # Check if token has expired
    if not user.reset_token_expires or user.reset_token_expires < datetime.utcnow():
        # Clear expired token
        user.reset_token = None
        user.reset_token_expires = None
        db.session.commit()
        return jsonify({'error': 'Reset link has expired. Please request a new one.'}), 400
    
    try:
        # Update password and clear token (single-use)
        user.password_hash = generate_password_hash(new_password)
        user.reset_token = None
        user.reset_token_expires = None
        db.session.commit()
        
        return jsonify({'message': 'Password has been reset successfully. Please log in with your new password.'}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to reset password: {str(e)}")
        return jsonify({'error': 'Failed to reset password'}), 500

