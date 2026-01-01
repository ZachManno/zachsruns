from flask_sqlalchemy import SQLAlchemy
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
        db.create_all()
        
        # Add is_variable_cost and total_cost columns if they don't exist (migration)
        try:
            from sqlalchemy import inspect, text
            inspector = inspect(db.engine)
            
            if 'runs' in inspector.get_table_names():
                columns = [col['name'] for col in inspector.get_columns('runs')]
                
                if 'is_variable_cost' not in columns:
                    db.session.execute(text('ALTER TABLE runs ADD COLUMN is_variable_cost BOOLEAN DEFAULT 0'))
                    db.session.commit()
                
                if 'total_cost' not in columns:
                    db.session.execute(text('ALTER TABLE runs ADD COLUMN total_cost NUMERIC(10, 2)'))
                    db.session.commit()
        except Exception as e:
            # Columns might already exist, ignore error
            db.session.rollback()
            pass
        
        # Add badge and referred_by columns if they don't exist (migration)
        try:
            from sqlalchemy import inspect, text
            inspector = inspect(db.engine)
            
            if 'users' in inspector.get_table_names():
                columns = [col['name'] for col in inspector.get_columns('users')]
                
                if 'badge' not in columns:
                    db.session.execute(text('ALTER TABLE users ADD COLUMN badge VARCHAR(20)'))
                    db.session.commit()
                    # Set all existing users to 'regular' by default
                    db.session.execute(text("UPDATE users SET badge = 'regular' WHERE badge IS NULL"))
                    db.session.commit()
                
                if 'referred_by' not in columns:
                    db.session.execute(text('ALTER TABLE users ADD COLUMN referred_by VARCHAR(36)'))
                    db.session.commit()
                
                # Add stats columns
                if 'runs_attended_count' not in columns:
                    db.session.execute(text('ALTER TABLE users ADD COLUMN runs_attended_count INTEGER DEFAULT 0 NOT NULL'))
                    db.session.commit()
                
                if 'no_shows_count' not in columns:
                    db.session.execute(text('ALTER TABLE users ADD COLUMN no_shows_count INTEGER DEFAULT 0 NOT NULL'))
                    db.session.commit()
                
                # Check runs table columns
                runs_columns = [col[1] for col in db.session.execute(text("PRAGMA table_info(runs)")).fetchall()]
                
                if 'is_completed' not in runs_columns:
                    db.session.execute(text('ALTER TABLE runs ADD COLUMN is_completed BOOLEAN DEFAULT 0 NOT NULL'))
                    db.session.commit()
                
                if 'completed_at' not in runs_columns:
                    db.session.execute(text('ALTER TABLE runs ADD COLUMN completed_at DATETIME'))
                    db.session.commit()
                
                if 'completed_by' not in runs_columns:
                    db.session.execute(text('ALTER TABLE runs ADD COLUMN completed_by VARCHAR(36)'))
                    db.session.commit()
                
                # Check run_participants table columns
                participants_columns = [col[1] for col in db.session.execute(text("PRAGMA table_info(run_participants)")).fetchall()]
                
                if 'attended' not in participants_columns:
                    db.session.execute(text('ALTER TABLE run_participants ADD COLUMN attended BOOLEAN DEFAULT 0 NOT NULL'))
                    db.session.commit()
                
                if 'no_show' not in participants_columns:
                    db.session.execute(text('ALTER TABLE run_participants ADD COLUMN no_show BOOLEAN DEFAULT 0 NOT NULL'))
                    db.session.commit()
                
                # Add location_id column to runs table if it doesn't exist
                if 'location_id' not in runs_columns:
                    db.session.execute(text('ALTER TABLE runs ADD COLUMN location_id VARCHAR(36)'))
                    db.session.commit()
        except Exception as e:
            # Columns might already exist, ignore error
            db.session.rollback()
            pass
        
        # Create or update default admin user
        from models import User
        from werkzeug.security import generate_password_hash
        
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
                badge='vip',  # Admin gets VIP badge
                is_admin=True,
                is_verified=True
            )
            db.session.add(admin)
            db.session.commit()
        else:
            # Update existing admin with name if not set
            if not admin.first_name or not admin.last_name:
                admin.first_name = 'Zach'
                admin.last_name = 'Manno'
                db.session.commit()
            # Set badge to regular if not set
            if not admin.badge:
                admin.badge = 'regular'
                db.session.commit()
        
        # Seed hardcoded locations
        from models import Location
        
        locations_data = [
            {
                'name': 'Phield House',
                'address': '814 Spring Garden St',
                'description': '8th and Spring Garden publically available court rentals. $125 per hour.'
            },
            {
                'name': "St Gab's Gym",
                'address': '3000 Dickinson St',
                'description': "South Philly Catholic School Gym, original hoop home of the Sheeran Bros and Leem. $10 per person."
            },
            {
                'name': 'Lloyd Hall Recreation Center',
                'address': '1 Boathouse Row',
                'description': 'Philly Public Court on Boathouse Row, where Championships are won. $free.99'
            }
        ]
        
        for loc_data in locations_data:
            location = Location.query.filter_by(name=loc_data['name']).first()
            if not location:
                location = Location(
                    name=loc_data['name'],
                    address=loc_data['address'],
                    description=loc_data['description']
                )
                db.session.add(location)
        
        db.session.commit()

