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
        
        # Seed hardcoded locations with fixed IDs
        from models import Location
        
        # Fixed UUIDs for locations (so they persist across restarts)
        LOCATION_IDS = {
            'Phield House': '668edc53-2fb0-48bc-8b6a-fe008778c439',
            "St Gab's Gym": '54144c55-f0c2-441e-bd10-34d0a2369ca5',
            'Lloyd Hall Recreation Center': '2dd794cd-3c23-45bb-8c08-b4fe88bc034f',
            'Schuylkill River Park': 'a1b2c3d4-e5f6-4789-a0b1-c2d3e4f5a6b7'
        }
        
        locations_data = [
            {
                'id': LOCATION_IDS['Phield House'],
                'name': 'Phield House',
                'address': '814 Spring Garden St',
                'description': '8th and Spring Garden publically available court rentals. $125 per hour.',
                'image_url': '/locations/phield-house.jpg'
            },
            {
                'id': LOCATION_IDS["St Gab's Gym"],
                'name': "St Gab's Gym",
                'address': '3000 Dickinson St',
                'description': "South Philly Catholic School Gym, original hoop home of the Sheeran Bros and Leem. $10 per person.",
                'image_url': '/locations/st-gabs-gym.jpg'
            },
            {
                'id': LOCATION_IDS['Lloyd Hall Recreation Center'],
                'name': 'Lloyd Hall Recreation Center',
                'address': '1 Boathouse Row',
                'description': 'Philly Public Court on Boathouse Row, where Championships are won. $free.99',
                'image_url': '/locations/lloyd-hall.jpg'
            },
            {
                'id': LOCATION_IDS['Schuylkill River Park'],
                'name': 'Schuylkill River Park',
                'address': '300 S 25th St',
                'description': 'The birthplace of the runs, the Center City outdoor court that is welcoming to all hoopers, and home to many.',
                'image_url': '/locations/schuylkill-river-park.jpg'
            }
        ]
        
        # Upsert locations (create if doesn't exist, update if exists)
        for loc_data in locations_data:
            location = Location.query.get(loc_data['id'])
            if location:
                # Update existing location
                location.name = loc_data['name']
                location.address = loc_data['address']
                location.description = loc_data['description']
                location.image_url = loc_data['image_url']
            else:
                # Create new location with fixed ID
                location = Location(
                    id=loc_data['id'],
                    name=loc_data['name'],
                    address=loc_data['address'],
                    description=loc_data['description'],
                    image_url=loc_data['image_url']
                )
                db.session.add(location)
        
        db.session.commit()
        
        # Migrate existing runs with invalid location_ids to the first location
        # This handles runs created before fixed location IDs were implemented
        from models import Run
        valid_location_ids = [loc_data['id'] for loc_data in locations_data]
        runs_with_invalid_locations = Run.query.filter(~Run.location_id.in_(valid_location_ids)).all()
        if runs_with_invalid_locations:
            default_location_id = locations_data[0]['id']  # Use Phield House as default
            for run in runs_with_invalid_locations:
                run.location_id = default_location_id
            db.session.commit()
            print(f"Migrated {len(runs_with_invalid_locations)} runs to use valid location IDs")

