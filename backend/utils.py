"""Utility functions for stats calculation and other helpers"""

from database import db
from models import User, RunParticipant

def recalculate_user_stats(user_id):
    """Recalculate and update user stats based on run participations"""
    user = User.query.get(user_id)
    if not user:
        return
    
    # Count runs where user attended
    runs_attended = RunParticipant.query.filter_by(
        user_id=user_id,
        attended=True
    ).count()
    
    # Count runs where user was a no-show
    no_shows = RunParticipant.query.filter_by(
        user_id=user_id,
        no_show=True
    ).count()
    
    user.runs_attended_count = runs_attended
    user.no_shows_count = no_shows
    
    db.session.commit()

def recalculate_all_user_stats():
    """Recalculate stats for all users"""
    users = User.query.all()
    for user in users:
        recalculate_user_stats(user.id)

