from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash, generate_password_hash
from database import db
from models import User
from middleware import generate_token, require_auth

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
    
    # Check if user already exists
    if User.query.filter_by(username=username).first():
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
    
    # Find user
    user = User.query.filter_by(username=username).first()
    
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

