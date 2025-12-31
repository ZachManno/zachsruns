from flask import Blueprint, request, jsonify
from datetime import datetime, date, time
from database import db
from models import User, Run, RunParticipant, Announcement
from middleware import require_admin

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/users', methods=['GET'])
@require_admin
def get_all_users():
    """Get all users (for admin verification)"""
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify({
        'users': [user.to_dict() for user in users]
    }), 200

@admin_bp.route('/users/<user_id>/verify', methods=['PUT'])
@require_admin
def verify_user(user_id):
    """Verify or unverify a user"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    is_verified = data.get('is_verified', True)
    
    try:
        user.is_verified = is_verified
        db.session.commit()
        
        return jsonify({
            'message': f'User {"verified" if is_verified else "unverified"} successfully',
            'user': user.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update user verification'}), 500

@admin_bp.route('/announcements', methods=['GET'])
def get_announcement():
    """Get current active announcement"""
    announcement = Announcement.query.filter_by(is_active=True).order_by(Announcement.created_at.desc()).first()
    
    if not announcement:
        return jsonify({'announcement': None}), 200
    
    return jsonify({
        'announcement': announcement.to_dict()
    }), 200

@admin_bp.route('/announcements', methods=['POST'])
@require_admin
def create_announcement():
    """Create or update announcement (replaces previous active one)"""
    data = request.get_json()
    
    if not data or not data.get('message'):
        return jsonify({'error': 'Message is required'}), 400
    
    try:
        # Deactivate all previous announcements
        Announcement.query.update({'is_active': False})
        
        # Create new announcement
        new_announcement = Announcement(
            message=data['message'],
            created_by=request.current_user.id,
            is_active=True
        )
        
        db.session.add(new_announcement)
        db.session.commit()
        
        return jsonify({
            'message': 'Announcement created successfully',
            'announcement': new_announcement.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to create announcement'}), 500

@admin_bp.route('/runs/import', methods=['POST'])
@require_admin
def import_runs():
    """Import historical runs from JSON"""
    data = request.get_json()
    
    if not data or not data.get('runs'):
        return jsonify({'error': 'Runs data is required'}), 400
    
    imported_count = 0
    errors = []
    
    try:
        for run_data in data['runs']:
            try:
                # Parse date and times
                run_date = datetime.strptime(run_data['date'], '%Y-%m-%d').date()
                start_time = datetime.strptime(run_data['start_time'], '%H:%M').time()
                end_time = datetime.strptime(run_data['end_time'], '%H:%M').time()
                
                # Create run
                new_run = Run(
                    title=run_data['title'],
                    date=run_date,
                    start_time=start_time,
                    end_time=end_time,
                    location=run_data['location'],
                    address=run_data.get('address', ''),
                    description=run_data.get('description'),
                    capacity=run_data.get('capacity'),
                    cost=run_data.get('cost'),
                    created_by=request.current_user.id,
                    is_historical=True
                )
                
                db.session.add(new_run)
                db.session.flush()  # Get the run ID
                
                # Add participants if provided
                if 'participants' in run_data:
                    participants_data = run_data['participants']
                    
                    # Process confirmed participants
                    for username in participants_data.get('confirmed', []):
                        user = User.query.filter_by(username=username).first()
                        if user:
                            participant = RunParticipant(
                                run_id=new_run.id,
                                user_id=user.id,
                                status='confirmed'
                            )
                            db.session.add(participant)
                    
                    # Process interested participants
                    for username in participants_data.get('interested', []):
                        user = User.query.filter_by(username=username).first()
                        if user:
                            participant = RunParticipant(
                                run_id=new_run.id,
                                user_id=user.id,
                                status='interested'
                            )
                            db.session.add(participant)
                    
                    # Process out participants
                    for username in participants_data.get('out', []):
                        user = User.query.filter_by(username=username).first()
                        if user:
                            participant = RunParticipant(
                                run_id=new_run.id,
                                user_id=user.id,
                                status='out'
                            )
                            db.session.add(participant)
                
                imported_count += 1
            except Exception as e:
                errors.append(f"Error importing run '{run_data.get('title', 'Unknown')}': {str(e)}")
                continue
        
        db.session.commit()
        
        return jsonify({
            'message': f'Successfully imported {imported_count} runs',
            'imported_count': imported_count,
            'errors': errors
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to import runs: {str(e)}'}), 500

