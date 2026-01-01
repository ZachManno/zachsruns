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

@admin_bp.route('/users/<user_id>/badge', methods=['PUT'])
@require_admin
def assign_badge(user_id):
    """Assign badge to user"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    badge = data.get('badge')
    referred_by_id = data.get('referred_by')
    
    # Validate badge value (only regular and plus_one allowed)
    valid_badges = ['regular', 'plus_one', None]
    if badge not in valid_badges:
        return jsonify({'error': f'Invalid badge. Must be one of: {valid_badges}'}), 400
    
    # If assigning plus_one badge, validate referrer
    if badge == 'plus_one':
        if not referred_by_id:
            return jsonify({'error': 'referred_by is required for plus_one badge'}), 400
        
        referrer = User.query.get(referred_by_id)
        if not referrer:
            return jsonify({'error': 'Referrer user not found'}), 404
        
        if referrer.badge != 'regular':
            return jsonify({'error': 'Referrer must be Regular'}), 400
    else:
        # Clear referred_by if not plus_one
        referred_by_id = None
    
    try:
        user.badge = badge
        user.referred_by = referred_by_id
        db.session.commit()
        
        return jsonify({
            'message': f'Badge assigned successfully',
            'user': user.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to assign badge'}), 500

@admin_bp.route('/users/bulk-badge', methods=['POST'])
@require_admin
def bulk_assign_badge():
    """Bulk assign badge to multiple users"""
    data = request.get_json()
    
    if not data or not data.get('badge') or not data.get('user_ids'):
        return jsonify({'error': 'badge and user_ids are required'}), 400
    
    badge = data.get('badge')
    user_ids = data.get('user_ids', [])
    
    # Validate badge value (only regular allowed for bulk assignment)
    valid_badges = ['regular']
    if badge not in valid_badges:
        return jsonify({'error': f'Invalid badge. Must be one of: {valid_badges}. Note: plus_one requires individual assignment with referrer.'}), 400
    
    try:
        updated_count = 0
        for user_id in user_ids:
            user = User.query.get(user_id)
            if user:
                user.badge = badge
                # Clear referred_by for bulk assignment (except plus_one which needs manual assignment)
                if badge != 'plus_one':
                    user.referred_by = None
                updated_count += 1
        
        db.session.commit()
        
        return jsonify({
            'message': f'Badge assigned to {updated_count} users',
            'updated_count': updated_count
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to assign badges'}), 500

@admin_bp.route('/runs', methods=['GET'])
@require_admin
def get_all_runs():
    """Get all runs for management (upcoming + past)"""
    runs = Run.query.order_by(Run.date.desc(), Run.start_time.desc()).all()
    return jsonify({
        'runs': [run.to_dict() for run in runs]
    }), 200

@admin_bp.route('/runs/<run_id>/complete', methods=['POST'])
@require_admin
def complete_run(run_id):
    """Complete a run - mark attendance and finalize"""
    run = Run.query.get(run_id)
    if not run:
        return jsonify({'error': 'Run not found'}), 404
    
    if run.is_completed:
        return jsonify({'error': 'Run is already completed'}), 400
    
    data = request.get_json()
    attended_user_ids = data.get('attended_user_ids', [])
    no_show_user_ids = data.get('no_show_user_ids', [])
    extra_attendees = data.get('extra_attendees', [])  # List of user_ids
    
    try:
        # Update confirmed participants
        confirmed_participants = RunParticipant.query.filter_by(
            run_id=run_id,
            status='confirmed'
        ).all()
        
        for participant in confirmed_participants:
            if participant.user_id in attended_user_ids:
                participant.attended = True
                participant.no_show = False
            elif participant.user_id in no_show_user_ids:
                participant.attended = False
                participant.no_show = True
            else:
                # Default: mark as attended if not specified
                participant.attended = True
                participant.no_show = False
        
        # Add extra attendees who didn't RSVP
        for user_id in extra_attendees:
            # Check if user already has a participation record
            existing = RunParticipant.query.filter_by(
                run_id=run_id,
                user_id=user_id
            ).first()
            
            if not existing:
                # Create new participant record for extra attendee
                extra_participant = RunParticipant(
                    run_id=run_id,
                    user_id=user_id,
                    status='confirmed',  # Treat as confirmed for stats
                    attended=True,
                    no_show=False
                )
                db.session.add(extra_participant)
        
        # Mark run as completed
        run.is_completed = True
        run.completed_at = datetime.utcnow()
        run.completed_by = request.current_user.id
        
        db.session.commit()
        
        # Recalculate stats for all affected users
        from utils import recalculate_user_stats
        all_affected_users = set(attended_user_ids + no_show_user_ids + extra_attendees)
        for user_id in all_affected_users:
            recalculate_user_stats(user_id)
        
        return jsonify({
            'message': 'Run completed successfully',
            'run': run.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to complete run: {str(e)}'}), 500

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
                
                # Create run - historical runs are automatically completed
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
                    is_historical=True,
                    is_completed=True,
                    completed_at=datetime.combine(run_date, datetime.min.time()),
                    completed_by=request.current_user.id
                )
                
                db.session.add(new_run)
                db.session.flush()  # Get the run ID
                
                # Add participants if provided
                if 'participants' in run_data:
                    participants_data = run_data['participants']
                    
                    # Process confirmed participants - mark as attended for historical runs
                    for username in participants_data.get('confirmed', []):
                        user = User.query.filter_by(username=username).first()
                        if user:
                            participant = RunParticipant(
                                run_id=new_run.id,
                                user_id=user.id,
                                status='confirmed',
                                attended=True,
                                no_show=False
                            )
                            db.session.add(participant)
                    
                    # Process interested participants - not attended for historical runs
                    for username in participants_data.get('interested', []):
                        user = User.query.filter_by(username=username).first()
                        if user:
                            participant = RunParticipant(
                                run_id=new_run.id,
                                user_id=user.id,
                                status='interested',
                                attended=False,
                                no_show=False
                            )
                            db.session.add(participant)
                    
                    # Process out participants - not attended for historical runs
                    for username in participants_data.get('out', []):
                        user = User.query.filter_by(username=username).first()
                        if user:
                            participant = RunParticipant(
                                run_id=new_run.id,
                                user_id=user.id,
                                status='out',
                                attended=False,
                                no_show=False
                            )
                            db.session.add(participant)
                
                imported_count += 1
            except Exception as e:
                errors.append(f"Error importing run '{run_data.get('title', 'Unknown')}': {str(e)}")
                continue
        
        db.session.commit()
        
        # Recalculate stats for all users who participated in imported runs
        from utils import recalculate_all_user_stats
        recalculate_all_user_stats()
        
        return jsonify({
            'message': f'Successfully imported {imported_count} runs',
            'imported_count': imported_count,
            'errors': errors
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to import runs: {str(e)}'}), 500

