from flask import Blueprint, request, jsonify
from datetime import datetime, date, time
from database import db
from models import Run, RunParticipant
from middleware import require_auth, require_admin

runs_bp = Blueprint('runs', __name__)

@runs_bp.route('', methods=['GET'])
def get_runs():
    """Get all runs"""
    runs = Run.query.order_by(Run.date.desc(), Run.start_time.desc()).all()
    return jsonify({
        'runs': [run.to_dict() for run in runs]
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
    required_fields = ['title', 'date', 'start_time', 'end_time', 'location', 'address']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400
    
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
            location=data['location'],
            address=data['address'],
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
        
        return jsonify({
            'message': 'Run created successfully',
            'run': new_run.to_dict()
        }), 201
    except ValueError as e:
        return jsonify({'error': f'Invalid date or time format: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to create run'}), 500

@runs_bp.route('/<run_id>', methods=['PUT'])
@require_admin
def update_run(run_id):
    """Update run (admin only)"""
    run = Run.query.get(run_id)
    if not run:
        return jsonify({'error': 'Run not found'}), 404
    
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
        if 'location' in data:
            run.location = data['location']
        if 'address' in data:
            run.address = data['address']
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
    
    data = request.get_json()
    status = data.get('status')
    
    if status not in ['confirmed', 'interested', 'out']:
        return jsonify({'error': 'Status must be confirmed, interested, or out'}), 400
    
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

