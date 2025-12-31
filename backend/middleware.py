from functools import wraps
from flask import request, jsonify
import jwt
import os
from models import User

JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key-change-in-production')

def generate_token(user):
    """Generate JWT token for user"""
    payload = {
        'user_id': user.id,
        'username': user.username,
        'is_admin': user.is_admin
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

def verify_token(token):
    """Verify JWT token and return user"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        user = User.query.get(payload['user_id'])
        return user
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
    except Exception:
        return None

def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        if auth_header:
            try:
                token = auth_header.split(' ')[1]  # Bearer <token>
            except IndexError:
                return jsonify({'error': 'Invalid token format'}), 401
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        user = verify_token(token)
        if not user:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Add user to request context
        request.current_user = user
        return f(*args, **kwargs)
    
    return decorated_function

def require_admin(f):
    """Decorator to require admin authentication"""
    @wraps(f)
    @require_auth
    def decorated_function(*args, **kwargs):
        if not request.current_user.is_admin:
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    
    return decorated_function

