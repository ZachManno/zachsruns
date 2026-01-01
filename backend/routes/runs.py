from flask import Blueprint, request, jsonify
from datetime import datetime, date, time
from database import db
from models import Run, RunParticipant, Location
from middleware import require_auth, require_admin, verify_token

runs_bp = Blueprint('runs', __name__)

@runs_bp.route('/locations', methods=['GET'])
def get_locations():
    """Get all locations"""
    locations = Location.query.order_by(Location.name).all()
    return jsonify([location.to_dict() for location in locations]), 200

@runs_bp.route('', methods=['GET'])
def get_runs():
    """Get all runs, separated into upcoming and past"""
    today = date.today()
    runs = Run.query.all()
    
    # Optionally get current user if authenticated
    current_user = None
    auth_header = request.headers.get('Authorization')
    if auth_header:
        try:
            token = auth_header.split(' ')[1]  # Bearer <token>
            current_user = verify_token(token)
        except (IndexError, Exception):
            pass  # Not authenticated, continue without user
    
    upcoming = []
    past = []
    
    for run in runs:
        run_dict = run.to_dict()
        
        # Add user_status if user is authenticated
        if current_user:
            participation = RunParticipant.query.filter_by(
                run_id=run.id,
                user_id=current_user.id
            ).first()
            run_dict['user_status'] = participation.status if participation else None
        else:
            run_dict['user_status'] = None
        
        if run.is_completed or run.date < today:
            past.append(run_dict)
        else:
            upcoming.append(run_dict)
    
    # Sort upcoming runs by ascending date (soonest first), then by start_time ascending
    upcoming.sort(key=lambda x: (x['date'], x['start_time']), reverse=False)
    # Sort past runs by descending date (most recent first), then by start_time descending
    past.sort(key=lambda x: (x['date'], x['start_time']), reverse=True)
    
    return jsonify({
        'upcoming': upcoming,
        'past': past
    }), 200

@runs_bp.route('/<run_id>', methods=['GET'])
def get_run(run_id):
    """Get single run by ID"""
    run = Run.query.get(run_id)
    if not run:
        return jsonify({'error': 'Run not found'}), 404
    
    return jsonify({
        'run': run.to_dict()
    }), 200

@runs_bp.route('', methods=['POST'])
@require_admin
def create_run():
    """Create new run (admin only)"""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['title', 'date', 'start_time', 'end_time', 'location_id']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400
    
    # Validate location_id exists
    location = Location.query.get(data['location_id'])
    if not location:
        return jsonify({'error': 'Invalid location_id'}), 400
    
    try:
        # Parse date and times
        run_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        start_time = datetime.strptime(data['start_time'], '%H:%M').time()
        end_time = datetime.strptime(data['end_time'], '%H:%M').time()
        
        new_run = Run(
            title=data['title'],
            date=run_date,
            start_time=start_time,
            end_time=end_time,
            location_id=data['location_id'],
            description=data.get('description'),
            capacity=data.get('capacity'),
            cost=data.get('cost') if not data.get('is_variable_cost') else None,
            is_variable_cost=data.get('is_variable_cost', False),
            total_cost=data.get('total_cost') if data.get('is_variable_cost') else None,
            created_by=request.current_user.id,
            is_historical=False
        )
        
        db.session.add(new_run)
        db.session.commit()
        
        # Refresh the object to ensure relationships are loaded
        db.session.refresh(new_run)
        
        return jsonify({
            'message': 'Run created successfully',
            'run': new_run.to_dict()
        }), 201
    except ValueError as e:
        return jsonify({'error': f'Invalid date or time format: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        # Log the actual error for debugging
        import traceback
        print(f"Error creating run: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': f'Failed to create run: {str(e)}'}), 500

@runs_bp.route('/<run_id>', methods=['PUT'])
@require_admin
def update_run(run_id):
    """Update run (admin only)"""
    run = Run.query.get(run_id)
    if not run:
        return jsonify({'error': 'Run not found'}), 404
    
    if run.is_completed:
        return jsonify({'error': 'Cannot edit completed run'}), 400
    
    data = request.get_json()
    
    try:
        if 'title' in data:
            run.title = data['title']
        if 'date' in data:
            run.date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        if 'start_time' in data:
            run.start_time = datetime.strptime(data['start_time'], '%H:%M').time()
        if 'end_time' in data:
            run.end_time = datetime.strptime(data['end_time'], '%H:%M').time()
        if 'location_id' in data:
            # Validate location_id exists
            location = Location.query.get(data['location_id'])
            if not location:
                return jsonify({'error': 'Invalid location_id'}), 400
            run.location_id = data['location_id']
        if 'description' in data:
            run.description = data['description']
        if 'capacity' in data:
            run.capacity = data['capacity']
        if 'is_variable_cost' in data:
            run.is_variable_cost = data['is_variable_cost']
        if 'total_cost' in data:
            run.total_cost = data['total_cost']
        if 'cost' in data:
            # Only set fixed cost if not variable cost
            if not run.is_variable_cost:
                run.cost = data['cost']
            else:
                run.cost = None
        
        db.session.commit()
        
        return jsonify({
            'message': 'Run updated successfully',
            'run': run.to_dict()
        }), 200
    except ValueError as e:
        return jsonify({'error': f'Invalid date or time format: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update run'}), 500

@runs_bp.route('/<run_id>', methods=['DELETE'])
@require_admin
def delete_run(run_id):
    """Delete run (admin only)"""
    run = Run.query.get(run_id)
    if not run:
        return jsonify({'error': 'Run not found'}), 404
    
    if run.is_completed:
        return jsonify({'error': 'Cannot delete completed run'}), 400
    
    try:
        db.session.delete(run)
        db.session.commit()
        return jsonify({'message': 'Run deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete run'}), 500

@runs_bp.route('/<run_id>/rsvp', methods=['POST'])
@require_auth
def update_rsvp(run_id):
    """Update user's RSVP status for a run"""
    run = Run.query.get(run_id)
    if not run:
        return jsonify({'error': 'Run not found'}), 404
    
    if run.is_completed:
        return jsonify({'error': 'Cannot change RSVP for completed run'}), 400
    
    # Check if user is verified
    if not request.current_user.is_verified:
        return jsonify({'error': 'Account must be verified to RSVP for runs'}), 403
    
    data = request.get_json()
    status = data.get('status')
    
    if status not in ['confirmed', 'interested', 'out']:
        return jsonify({'error': 'Status must be confirmed, interested, or out'}), 400
    
    # Check capacity if trying to confirm
    if status == 'confirmed' and run.capacity:
        # Count current confirmed participants
        current_confirmed_count = RunParticipant.query.filter_by(
            run_id=run_id,
            status='confirmed'
        ).count()
        
        # Check if user is already confirmed (they should be able to stay confirmed)
        existing_participant = RunParticipant.query.filter_by(
            run_id=run_id,
            user_id=request.current_user.id
        ).first()
        
        # If user is not already confirmed, check if there's space
        if not existing_participant or existing_participant.status != 'confirmed':
            if current_confirmed_count >= run.capacity:
                return jsonify({'error': 'Run is at capacity'}), 400
    
    try:
        # Find or create participant record
        participant = RunParticipant.query.filter_by(
            run_id=run_id,
            user_id=request.current_user.id
        ).first()
        
        if participant:
            participant.status = status
            participant.updated_at = datetime.utcnow()
        else:
            participant = RunParticipant(
                run_id=run_id,
                user_id=request.current_user.id,
                status=status
            )
            db.session.add(participant)
        
        db.session.commit()
        
        return jsonify({
            'message': 'RSVP updated successfully',
            'run': run.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update RSVP'}), 500

