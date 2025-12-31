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
    
    runs = Run.query.filter(Run.id.in_(run_ids)).order_by(Run.date.desc()).all()
    
    # Separate into upcoming and history
    today = datetime.now().date()
    upcoming = []
    history = []
    
    for run in runs:
        participation = next((p for p in participations if p.run_id == run.id), None)
        run_dict = run.to_dict()
        run_dict['user_status'] = participation.status if participation else None
        
        if run.date >= today:
            upcoming.append(run_dict)
        else:
            # Only include in history if user was confirmed
            if participation and participation.status == 'confirmed':
                history.append(run_dict)
    
    return jsonify({
        'upcoming': upcoming,
        'history': history
    }), 200

