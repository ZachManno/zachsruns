from flask import Blueprint, request, jsonify
from datetime import datetime, date, time
from sqlalchemy import func
import logging
from database import db
from models import User, Run, RunParticipant, Announcement
from middleware import require_admin
from utils.email import send_account_verified_email, send_run_completed_email, send_run_reminder_email, send_announcement_email

logger = logging.getLogger(__name__)

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
        
        # Send verification email if user was just verified
        if is_verified:
            try:
                send_account_verified_email(user)
            except Exception as e:
                # Log error but don't fail verification
                logger.error(f"Failed to send verification email: {str(e)}")
        
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
        
        # Send announcement email to all verified users (fire-and-forget)
        try:
            verified_users = User.query.filter_by(is_verified=True).all()
            send_announcement_email(data['message'], verified_users)
        except Exception as e:
            # Log error but don't fail announcement creation
            logger.error(f"Failed to send announcement emails: {str(e)}")
        
        return jsonify({
            'message': 'Announcement created successfully',
            'announcement': new_announcement.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to create announcement'}), 500

@admin_bp.route('/announcements', methods=['DELETE'])
@require_admin
def clear_announcement():
    """Clear/deactivate current active announcement"""
    try:
        # Deactivate all active announcements
        active_announcements = Announcement.query.filter_by(is_active=True).all()
        for announcement in active_announcements:
            announcement.is_active = False
        db.session.commit()
        
        return jsonify({
            'message': 'Announcement cleared successfully'
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to clear announcement'}), 500

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
    guest_attendees = data.get('guest_attendees', [])  # List of guest names (non-users)
    
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
        
        # Store guest attendees (non-users) as JSON
        import json
        if guest_attendees:
            run.guest_attendees = json.dumps(guest_attendees)
        else:
            run.guest_attendees = None
        
        # Calculate total attendees (attended users + extra attendees + guests)
        total_attended = len(attended_user_ids) + len(extra_attendees) + len(guest_attendees)
        
        # Don't overwrite capacity - keep the original capacity for display
        # The attended count will be shown separately in the frontend
        
        # Calculate and update final cost per person if variable cost
        if run.is_variable_cost and run.total_cost:
            # Calculate cost per person based on actual attendees
            final_cost_per_person = float(run.total_cost) / total_attended if total_attended > 0 else 0
            run.cost = final_cost_per_person
        elif not run.is_variable_cost and run.cost:
            # For fixed cost, cost per person stays the same
            pass
        
        # Mark run as completed
        run.is_completed = True
        run.completed_at = datetime.utcnow()
        run.completed_by = request.current_user.id
        
        db.session.commit()
        
        # Recalculate stats for all affected users
        # Import utils.py directly (not utils package) by using importlib
        import importlib.util
        import os
        # Get backend directory - works in both local and Vercel
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        utils_file_path = os.path.join(backend_dir, 'utils.py')
        if os.path.exists(utils_file_path):
            spec = importlib.util.spec_from_file_location("utils_stats", utils_file_path)
            utils_stats = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(utils_stats)
            all_affected_users = set(attended_user_ids + no_show_user_ids + extra_attendees)
            for user_id in all_affected_users:
                utils_stats.recalculate_user_stats(user_id)
        
        # Send completion email to all attendees
        try:
            # Ensure location relationship is loaded
            db.session.refresh(run)
            attended_users = User.query.filter(User.id.in_(attended_user_ids + extra_attendees)).all()
            send_run_completed_email(run, attended_users)
        except Exception as e:
            # Log error but don't fail completion
            logger.error(f"Failed to send completion emails: {str(e)}")
        
        return jsonify({
            'message': 'Run completed successfully',
            'run': run.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to complete run: {str(e)}'}), 500

@admin_bp.route('/runs/<run_id>/remind', methods=['POST'])
@require_admin
def remind_run(run_id):
    """Send reminder email to confirmed and interested users"""
    run = Run.query.get(run_id)
    if not run:
        return jsonify({'error': 'Run not found'}), 404
    
    if run.is_completed:
        return jsonify({'error': 'Cannot send reminders for completed runs'}), 400
    
    data = request.get_json()
    reminder_message = data.get('reminder_message', '').strip()
    
    # Validate reminder message
    if not reminder_message:
        return jsonify({'error': 'reminder_message is required'}), 400
    
    if len(reminder_message) > 100:
        return jsonify({'error': 'reminder_message must be 100 characters or less'}), 400
    
    try:
        # Get confirmed and interested participants
        participants = RunParticipant.query.filter(
            RunParticipant.run_id == run_id,
            RunParticipant.status.in_(['confirmed', 'interested'])
        ).all()
        
        recipients = [p.user for p in participants if p.user]
        
        # Send reminder emails (fire-and-forget)
        try:
            # Ensure location relationship is loaded
            db.session.refresh(run)
            send_run_reminder_email(run, recipients, reminder_message)
        except Exception as e:
            # Log error but don't fail the API call
            logger.error(f"Failed to send reminder emails: {str(e)}")
        
        return jsonify({
            'message': f'Reminder sent to {len(recipients)} users',
            'recipient_count': len(recipients)
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to send reminders: {str(e)}'}), 500

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
                
                # Get location_id - either provided directly or match by name/address
                location_id = run_data.get('location_id')
                if not location_id:
                    # Try to match by location name or address
                    from models import Location
                    location_name = run_data.get('location', '')
                    location_address = run_data.get('address', '')
                    
                    # Try to find matching location
                    location = None
                    if location_name:
                        location = Location.query.filter_by(name=location_name).first()
                    if not location and location_address:
                        location = Location.query.filter_by(address=location_address).first()
                    
                    if location:
                        location_id = location.id
                    else:
                        # Default to first location if no match found
                        first_location = Location.query.first()
                        if first_location:
                            location_id = first_location.id
                        else:
                            errors.append(f"Run '{run_data['title']}': No locations available")
                            continue
                
                # Create run - historical runs are automatically completed
                new_run = Run(
                    title=run_data['title'],
                    date=run_date,
                    start_time=start_time,
                    end_time=end_time,
                    location_id=location_id,
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
                        user = User.query.filter(func.lower(User.username) == func.lower(username)).first()
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
                        user = User.query.filter(func.lower(User.username) == func.lower(username)).first()
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
                        user = User.query.filter(func.lower(User.username) == func.lower(username)).first()
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
        # Import utils.py directly (not utils package) by using importlib
        import importlib.util
        import os
        # Get backend directory - works in both local and Vercel
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        utils_file_path = os.path.join(backend_dir, 'utils.py')
        if os.path.exists(utils_file_path):
            spec = importlib.util.spec_from_file_location("utils_stats", utils_file_path)
            utils_stats = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(utils_stats)
            utils_stats.recalculate_all_user_stats()
        
        return jsonify({
            'message': f'Successfully imported {imported_count} runs',
            'imported_count': imported_count,
            'errors': errors
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to import runs: {str(e)}'}), 500

