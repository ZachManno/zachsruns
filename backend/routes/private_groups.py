from flask import Blueprint, request, jsonify
from datetime import datetime, date
import logging
from database import db
from models import PrivateGroup, PrivateGroupMember, Run, RunParticipant, User
from middleware import require_auth, require_admin

logger = logging.getLogger(__name__)

private_groups_bp = Blueprint('private_groups', __name__)


def _is_group_member(user_id, group_id):
    """Check if a user is a member of a private group"""
    return PrivateGroupMember.query.filter_by(
        group_id=group_id, user_id=user_id
    ).first() is not None


def _require_membership_or_admin(user, group_id):
    """Return error response if user is not a member or admin, None if OK"""
    if user.is_admin:
        return None
    if not _is_group_member(user.id, group_id):
        return jsonify({'error': 'Not found'}), 404
    return None


@private_groups_bp.route('', methods=['GET'])
@require_auth
def get_my_groups():
    """List groups the current user is a member of"""
    user = request.current_user
    if user.is_admin:
        groups = PrivateGroup.query.order_by(PrivateGroup.name).all()
    else:
        memberships = PrivateGroupMember.query.filter_by(user_id=user.id).all()
        group_ids = [m.group_id for m in memberships]
        groups = PrivateGroup.query.filter(PrivateGroup.id.in_(group_ids)).order_by(PrivateGroup.name).all()
    
    return jsonify({
        'groups': [g.to_dict() for g in groups]
    }), 200


@private_groups_bp.route('/<group_id>', methods=['GET'])
@require_auth
def get_group(group_id):
    """Get group details + member list"""
    group = PrivateGroup.query.get(group_id)
    if not group:
        return jsonify({'error': 'Not found'}), 404
    
    err = _require_membership_or_admin(request.current_user, group_id)
    if err:
        return err
    
    return jsonify({
        'group': group.to_dict(include_members=True)
    }), 200


@private_groups_bp.route('/<group_id>/runs', methods=['GET'])
@require_auth
def get_group_runs(group_id):
    """Get upcoming + past runs for a private group"""
    group = PrivateGroup.query.get(group_id)
    if not group:
        return jsonify({'error': 'Not found'}), 404
    
    err = _require_membership_or_admin(request.current_user, group_id)
    if err:
        return err
    
    today = date.today()
    runs = Run.query.filter_by(private_group_id=group_id).all()
    
    upcoming = []
    past = []
    
    for run in runs:
        run_dict = run.to_dict()
        participation = RunParticipant.query.filter_by(
            run_id=run.id,
            user_id=request.current_user.id
        ).first()
        run_dict['user_status'] = participation.status if participation else None
        
        if run.is_completed or run.date < today:
            past.append(run_dict)
        else:
            upcoming.append(run_dict)
    
    upcoming.sort(key=lambda x: (x['date'], x['start_time']), reverse=False)
    past.sort(key=lambda x: (x['date'], x['start_time']), reverse=True)
    
    return jsonify({
        'group': group.to_dict(),
        'upcoming': upcoming,
        'past': past
    }), 200


@private_groups_bp.route('/<group_id>/community', methods=['GET'])
@require_auth
def get_group_community(group_id):
    """Get group-scoped community stats"""
    group = PrivateGroup.query.get(group_id)
    if not group:
        return jsonify({'error': 'Not found'}), 404
    
    err = _require_membership_or_admin(request.current_user, group_id)
    if err:
        return err
    
    members = PrivateGroupMember.query.filter_by(group_id=group_id).all()
    
    # Count completed runs in this group
    total_group_completed = Run.query.filter(
        Run.private_group_id == group_id,
        Run.is_completed == True
    ).count()
    
    member_stats = []
    for member in members:
        user = member.user
        if not user:
            continue
        
        # Count attendance in this group's completed runs
        group_attended = db.session.query(RunParticipant).join(Run).filter(
            Run.private_group_id == group_id,
            Run.is_completed == True,
            RunParticipant.user_id == user.id,
            RunParticipant.attended == True
        ).count()
        
        attendance_rate = (group_attended / total_group_completed * 100) if total_group_completed > 0 else None
        
        member_stats.append({
            'id': user.id,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'badge': user.badge,
            'runs_attended_count': group_attended,
            'attendance_rate': round(attendance_rate, 1) if attendance_rate is not None else None,
            'added_at': member.added_at.isoformat() if member.added_at else None
        })
    
    member_stats.sort(key=lambda x: (x.get('first_name') or x.get('username', '')).lower())
    
    return jsonify({
        'group': group.to_dict(),
        'members': member_stats,
        'total_completed_runs': total_group_completed
    }), 200


@private_groups_bp.route('', methods=['POST'])
@require_admin
def create_group():
    """Create a new private group (admin only)"""
    data = request.get_json()
    
    if not data or not data.get('name'):
        return jsonify({'error': 'Group name is required'}), 400
    
    try:
        group = PrivateGroup(
            name=data['name'].strip(),
            description=data.get('description', '').strip() or None,
            created_by=request.current_user.id
        )
        db.session.add(group)
        db.session.flush()
        
        # Auto-add the creator as a member
        creator_member = PrivateGroupMember(
            group_id=group.id,
            user_id=request.current_user.id,
            added_by=request.current_user.id
        )
        db.session.add(creator_member)
        db.session.commit()
        
        return jsonify({
            'message': 'Group created successfully',
            'group': group.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to create group: {str(e)}")
        return jsonify({'error': 'Failed to create group'}), 500


@private_groups_bp.route('/<group_id>', methods=['PUT'])
@require_admin
def update_group(group_id):
    """Update group name/description (admin only)"""
    group = PrivateGroup.query.get(group_id)
    if not group:
        return jsonify({'error': 'Group not found'}), 404
    
    data = request.get_json()
    
    try:
        if 'name' in data:
            group.name = data['name'].strip()
        if 'description' in data:
            group.description = data['description'].strip() or None
        
        db.session.commit()
        
        return jsonify({
            'message': 'Group updated successfully',
            'group': group.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to update group: {str(e)}")
        return jsonify({'error': 'Failed to update group'}), 500


@private_groups_bp.route('/<group_id>', methods=['DELETE'])
@require_admin
def delete_group(group_id):
    """Delete group and cascade to all its runs + participants (admin only)"""
    group = PrivateGroup.query.get(group_id)
    if not group:
        return jsonify({'error': 'Group not found'}), 404
    
    try:
        group_name = group.name
        run_count = len(group.runs)
        db.session.delete(group)
        db.session.commit()
        
        return jsonify({
            'message': f'Group "{group_name}" deleted successfully ({run_count} runs removed)'
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to delete group: {str(e)}")
        return jsonify({'error': 'Failed to delete group'}), 500


@private_groups_bp.route('/<group_id>/members', methods=['POST'])
@require_admin
def add_member(group_id):
    """Add user(s) to group (admin only)"""
    group = PrivateGroup.query.get(group_id)
    if not group:
        return jsonify({'error': 'Group not found'}), 404
    
    data = request.get_json()
    user_id = data.get('user_id')
    user_ids = data.get('user_ids', [])
    
    if user_id:
        user_ids = [user_id]
    
    if not user_ids:
        return jsonify({'error': 'user_id or user_ids is required'}), 400
    
    try:
        added = 0
        for uid in user_ids:
            user = User.query.get(uid)
            if not user:
                continue
            existing = PrivateGroupMember.query.filter_by(group_id=group_id, user_id=uid).first()
            if existing:
                continue
            member = PrivateGroupMember(
                group_id=group_id,
                user_id=uid,
                added_by=request.current_user.id
            )
            db.session.add(member)
            added += 1
        
        db.session.commit()
        
        return jsonify({
            'message': f'{added} member(s) added',
            'group': group.to_dict(include_members=True)
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to add member: {str(e)}")
        return jsonify({'error': 'Failed to add member'}), 500


@private_groups_bp.route('/<group_id>/members/<user_id>', methods=['DELETE'])
@require_admin
def remove_member(group_id, user_id):
    """Remove user from group (admin only)"""
    group = PrivateGroup.query.get(group_id)
    if not group:
        return jsonify({'error': 'Group not found'}), 404
    
    member = PrivateGroupMember.query.filter_by(group_id=group_id, user_id=user_id).first()
    if not member:
        return jsonify({'error': 'User is not a member of this group'}), 404
    
    try:
        db.session.delete(member)
        db.session.commit()
        
        return jsonify({
            'message': 'Member removed',
            'group': group.to_dict(include_members=True)
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to remove member: {str(e)}")
        return jsonify({'error': 'Failed to remove member'}), 500


@private_groups_bp.route('/all', methods=['GET'])
@require_admin
def get_all_groups():
    """Get all private groups (admin only, for dropdowns)"""
    groups = PrivateGroup.query.order_by(PrivateGroup.name).all()
    return jsonify({
        'groups': [g.to_dict() for g in groups]
    }), 200
