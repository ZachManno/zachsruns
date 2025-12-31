from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool
import os

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
        
        # Create or update default admin user
        from models import User
        from werkzeug.security import generate_password_hash
        
        admin = User.query.filter_by(username='zmann').first()
        if not admin:
            admin = User(
                username='zmann',
                email='zmann@zachsruns.com',
                password_hash=generate_password_hash('***'),
                first_name='Zach',
                last_name='Manno',
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

