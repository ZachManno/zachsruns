from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash
from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

db = SQLAlchemy()

def get_database_url():
    """Get database URL from environment or use local SQLite for development"""
    if os.getenv('POSTGRES_URL'):
        return os.getenv('POSTGRES_URL')
    # For local development, use SQLite
    return 'sqlite:///zachs_runs.db'

def init_db(app):
    """Initialize database connection"""
    database_url = get_database_url()
    
    # Configure SQLAlchemy
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # For Vercel Postgres, use NullPool to avoid connection issues
    if 'postgres' in database_url.lower():
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
            'poolclass': NullPool
        }
    
    db.init_app(app)
    
    with app.app_context():
        from models import User, Run, RunParticipant, Announcement
        # Drop all tables and recreate them (clean slate for first release)
        # COMMENTED OUT - Database persistence enabled
        # db.drop_all()
        db.create_all()
        
        # Clear all data for first release (remove this section after initial deployment)
        # This ensures a clean database state for the first release
        # COMMENTED OUT - Database clearing disabled
        # from models import User, Run, RunParticipant, Announcement
        # from werkzeug.security import generate_password_hash
        # 
        # # Delete all runs and their participants
        # RunParticipant.query.delete()
        # Run.query.delete()
        # 
        # # Delete all announcements
        # Announcement.query.delete()
        # 
        # # Delete all users except admin
        # User.query.filter(User.username != 'zmann').delete()
        # 
        # db.session.commit()
        
        # Create or update default admin user
        
        admin_password = os.getenv('ADMIN_PASSWORD')
        if not admin_password:
            raise ValueError(
                "ADMIN_PASSWORD environment variable is required. "
                "Please set it in your .env file in the backend directory."
            )
        
        admin = User.query.filter_by(username='zmann').first()
        if not admin:
            admin = User(
                username='zmann',
                email='zmann@zachsruns.com',
                password_hash=generate_password_hash(admin_password),
                first_name='Zach',
                last_name='Manno',
                badge='regular',
                is_admin=True,
                is_verified=True
            )
            db.session.add(admin)
        else:
            # Ensure admin has correct properties
            admin.first_name = 'Zach'
            admin.last_name = 'Manno'
            admin.badge = 'regular'
            admin.is_admin = True
            admin.is_verified = True
            # Update password if needed (in case ADMIN_PASSWORD changed)
            admin.password_hash = generate_password_hash(admin_password)
        
        db.session.commit()
        
        # Seed hardcoded locations
        from models import Location
        
        locations_data = [
            {
                'name': 'Phield House',
                'address': '814 Spring Garden St',
                'description': '8th and Spring Garden publically available court rentals. $125 per hour.',
                'image_url': '/locations/phield-house.jpg'
            },
            {
                'name': "St Gab's Gym",
                'address': '3000 Dickinson St',
                'description': "South Philly Catholic School Gym, original hoop home of the Sheeran Bros and Leem. $10 per person.",
                'image_url': '/locations/st-gabs-gym.jpg'
            },
            {
                'name': 'Lloyd Hall Recreation Center',
                'address': '1 Boathouse Row',
                'description': 'Philly Public Court on Boathouse Row, where Championships are won. $free.99',
                'image_url': '/locations/lloyd-hall.jpg'
            }
        ]
        
        # Clear and reseed locations (ensures clean state)
        Location.query.delete()
        db.session.commit()
        
        for loc_data in locations_data:
            location = Location(
                name=loc_data['name'],
                address=loc_data['address'],
                description=loc_data['description'],
                image_url=loc_data['image_url']
            )
            db.session.add(location)
        
        db.session.commit()

