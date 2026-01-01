"""
One-time script to convert 'rookie' and 'vip' badges to 'regular'
Run manually: python3 backend/scripts/convert_badges.py
"""
import sys
import os

# Add parent directory to path to import app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app
from models import User
from database import db

with app.app_context():
    # Convert rookie and VIP to regular
    users_updated = User.query.filter(
        User.badge.in_(['rookie', 'vip'])
    ).update({User.badge: 'regular'}, synchronize_session=False)
    
    db.session.commit()
    print(f"Converted {users_updated} users from 'rookie'/'VIP' to 'regular'")
    print("Badge conversion complete!")

