from flask import Blueprint, request, jsonify
from datetime import datetime
from database import db
from models import User, Run, RunParticipant
from middleware import require_auth

users_bp = Blueprint('users', __name__)

@users_bp.route('/me', methods=['GET'])
@require_auth
def get_current_user_profile():
    """Get current user profile"""
    return jsonify({
        'user': request.current_user.to_dict()
    }), 200

@users_bp.route('/me', methods=['PUT'])
@require_auth
def update_user_profile():
    """Update current user profile"""
    data = request.get_json()
    user = request.current_user
    
    try:
        if 'email' in data:
            # Check if email is already taken by another user
            existing_user = User.query.filter(
                User.email == data['email'].strip().lower(),
                User.id != user.id
            ).first()
            if existing_user:
                return jsonify({'error': 'Email already in use'}), 400
            user.email = data['email'].strip().lower()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Profile updated successfully',
            'user': user.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update profile'}), 500

@users_bp.route('/me/runs', methods=['GET'])
@require_auth
def get_user_runs():
    """Get user's runs (signed up + history)"""
    user = request.current_user
    
    # Get all runs where user is a participant
    participations = RunParticipant.query.filter_by(user_id=user.id).all()
    run_ids = [p.run_id for p in participations]
    
    runs = Run.query.filter(Run.id.in_(run_ids)).all()
    
    # Separate into upcoming and history (completed runs go to history)
    today = datetime.now().date()
    upcoming = []
    history = []
    
    for run in runs:
        participation = next((p for p in participations if p.run_id == run.id), None)
        run_dict = run.to_dict()
        run_dict['user_status'] = participation.status if participation else None
        
        # Completed runs always go to history
        if run.is_completed:
            history.append(run_dict)
        elif run.date >= today:
            upcoming.append(run_dict)
        else:
            # Past runs (not completed) go to history
            history.append(run_dict)
    
    # Sort upcoming runs by ascending date (nearest first), then by start_time
    upcoming.sort(key=lambda x: (x['date'], x['start_time']), reverse=False)
    # Sort history by descending date (most recent first), then by start_time
    history.sort(key=lambda x: (x['date'], x['start_time']), reverse=True)
    
    return jsonify({
        'upcoming': upcoming,
        'history': history
    }), 200

@users_bp.route('/community', methods=['GET'])
@require_auth
def get_community():
    """Get all users for community page, grouped by badge"""
    # Get all users - stats are already in to_dict()
    users = User.query.all()
    
    # Convert to dict with run_count (using runs_attended_count)
    user_data = []
    for user in users:
        user_dict = user.to_dict()
        user_dict['run_count'] = user.runs_attended_count  # Use attended count instead of confirmed
        user_data.append(user_dict)
    
    # Group by badge
    grouped = {
        'vip': [],
        'regular': [],
        'rookie': [],
        'plus_one': [],
        'none': [],
        'unverified': []
    }
    
    for user in user_data:
        if not user['is_verified']:
            grouped['unverified'].append(user)
        elif user['badge']:
            if user['badge'] in grouped:
                grouped[user['badge']].append(user)
            else:
                grouped['none'].append(user)
        else:
            grouped['none'].append(user)
    
    # Sort each group by name
    for key in grouped:
        grouped[key].sort(key=lambda x: (x.get('first_name') or x.get('username', '')).lower())
    
    return jsonify({
        'users': grouped
    }), 200

