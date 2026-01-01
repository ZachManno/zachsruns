from database import db
from datetime import datetime
import uuid
import json

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(100), nullable=True)
    last_name = db.Column(db.String(100), nullable=True)
    badge = db.Column(db.String(20), nullable=True)  # 'vip', 'regular', 'rookie', 'plus_one', or None
    referred_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    runs_attended_count = db.Column(db.Integer, default=0, nullable=False)
    no_shows_count = db.Column(db.Integer, default=0, nullable=False)
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    referrer = db.relationship('User', remote_side=[id], backref='referred_users')
    
    def to_dict(self, include_no_shows=False):
        # Calculate attendance rate as percentage of runs attended vs total completed runs
        # Query total completed runs - import Run here to avoid circular import
        # Since Run is defined later in this file, we'll use a lazy import
        from models import Run
        total_completed_runs = Run.query.filter_by(is_completed=True).count()
        attendance_rate = (self.runs_attended_count / total_completed_runs * 100) if total_completed_runs > 0 else None
        
        # Get referrer info if exists
        referrer_info = None
        if self.referred_by and self.referrer:
            referrer_info = {
                'id': self.referrer.id,
                'username': self.referrer.username,
                'first_name': self.referrer.first_name,
                'last_name': self.referrer.last_name,
            }
        
        result = {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'badge': self.badge,
            'referred_by': self.referred_by,
            'referrer': referrer_info,
            'runs_attended_count': self.runs_attended_count,
            'attendance_rate': round(attendance_rate, 1) if attendance_rate is not None else None,
            'is_admin': self.is_admin,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        
        # Only include no_shows_count if explicitly requested (for admin/internal use)
        if include_no_shows:
            result['no_shows_count'] = self.no_shows_count
        
        return result

class Location(db.Model):
    __tablename__ = 'locations'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(200), nullable=False, unique=True)
    address = db.Column(db.String(500), nullable=False)
    description = db.Column(db.Text, nullable=True)
    image_url = db.Column(db.String(500), nullable=True)  # Path to image in public folder
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'address': self.address,
            'description': self.description,
            'image_url': self.image_url
        }

class Run(db.Model):
    __tablename__ = 'runs'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(200), nullable=False)
    date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    location_id = db.Column(db.String(36), db.ForeignKey('locations.id'), nullable=False)
    description = db.Column(db.Text, nullable=True)
    capacity = db.Column(db.Integer, nullable=True)
    cost = db.Column(db.Numeric(10, 2), nullable=True)  # Fixed cost per person
    is_variable_cost = db.Column(db.Boolean, default=False, nullable=False)
    total_cost = db.Column(db.Numeric(10, 2), nullable=True)  # Total cost for variable pricing
    created_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    is_historical = db.Column(db.Boolean, default=False, nullable=False)
    is_completed = db.Column(db.Boolean, default=False, nullable=False)
    completed_at = db.Column(db.DateTime, nullable=True)
    completed_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    guest_attendees = db.Column(db.Text, nullable=True)  # JSON array of guest names
    
    # Relationships
    location_entity = db.relationship('Location', backref='runs')
    creator = db.relationship('User', foreign_keys=[created_by], backref='created_runs')
    completer = db.relationship('User', foreign_keys=[completed_by], backref='completed_runs')
    participants = db.relationship('RunParticipant', back_populates='run', cascade='all, delete-orphan')
    
    def to_dict(self, include_participants=True):
        # Load location entity
        location_data = None
        location_name = None
        location_address = None
        
        if self.location_id:
            try:
                # Access the relationship - SQLAlchemy will load it if needed
                if self.location_entity:
                    location_data = self.location_entity.to_dict()
                    location_name = self.location_entity.name
                    location_address = self.location_entity.address
                else:
                    # Location might not be loaded yet, try to query it
                    from models import Location
                    location = Location.query.get(self.location_id)
                    if location:
                        location_data = location.to_dict()
                        location_name = location.name
                        location_address = location.address
            except Exception:
                # If location can't be loaded, set to None
                pass
        
        result = {
            'id': self.id,
            'title': self.title,
            'date': self.date.isoformat() if self.date else None,
            'start_time': self.start_time.strftime('%H:%M') if self.start_time else None,
            'end_time': self.end_time.strftime('%H:%M') if self.end_time else None,
            'location_id': self.location_id,
            'location_name': location_name,
            'location_address': location_address,
            'location_data': location_data,  # Full location object
            'description': self.description,
            'capacity': int(self.capacity) if self.capacity else None,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_historical': self.is_historical,
            'is_variable_cost': self.is_variable_cost,
            'total_cost': float(self.total_cost) if self.total_cost else None,
            'is_completed': self.is_completed,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'completed_by': self.completed_by,
            'guest_attendees': json.loads(self.guest_attendees) if self.guest_attendees else None
        }
        
        if include_participants:
            # Format participant names with badge info and attendance
            # Sort confirmed participants by updated_at (earliest confirmed first)
            confirmed_participants_list = sorted(
                [p for p in self.participants if p.status == 'confirmed'],
                key=lambda p: p.updated_at or datetime.utcnow()
            )
            interested_participants_list = [p for p in self.participants if p.status == 'interested']
            out_participants_list = [p for p in self.participants if p.status == 'out']
            no_show_participants_list = [p for p in self.participants if p.no_show]
            
            # Get participant user objects with names (confirmed in sorted order)
            confirmed_users = [p.user for p in confirmed_participants_list]
            interested_users = [p.user for p in interested_participants_list]
            out_users = [p.user for p in out_participants_list]
            no_show_users = [p.user for p in no_show_participants_list]
            
            confirmed_count = len(confirmed_users)
            
            # Calculate cost: if variable, divide total by confirmed participants; otherwise use fixed cost
            if self.is_variable_cost and self.total_cost:
                if confirmed_count > 0:
                    result['cost'] = round(float(self.total_cost) / confirmed_count, 2)
                else:
                    result['cost'] = round(float(self.total_cost), 2)  # Show total if no participants yet
            else:
                result['cost'] = round(float(self.cost), 2) if self.cost else None
            
            confirmed = [{'username': u.username, 'first_name': u.first_name, 'last_name': u.last_name, 'badge': u.badge, 'attended': p.attended, 'no_show': p.no_show} for u, p in zip(confirmed_users, confirmed_participants_list)]
            interested = [{'username': u.username, 'first_name': u.first_name, 'last_name': u.last_name, 'badge': u.badge, 'attended': p.attended, 'no_show': p.no_show} for u, p in zip(interested_users, interested_participants_list)]
            out = [{'username': u.username, 'first_name': u.first_name, 'last_name': u.last_name, 'badge': u.badge, 'attended': p.attended, 'no_show': p.no_show} for u, p in zip(out_users, out_participants_list)]
            no_show = [{'username': p.user.username, 'first_name': p.user.first_name, 'last_name': p.user.last_name, 'badge': p.user.badge, 'attended': False, 'no_show': True} for p in no_show_participants_list]
            
            result['participants'] = {
                'confirmed': confirmed,
                'interested': interested,
                'out': out,
                'no_show': no_show
            }
            
            result['participant_counts'] = {
                'confirmed': len(confirmed),
                'interested': len(interested),
                'out': len(out),
                'no_show': len(no_show)
            }
        
        return result

class RunParticipant(db.Model):
    __tablename__ = 'run_participants'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    run_id = db.Column(db.String(36), db.ForeignKey('runs.id'), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.String(20), nullable=False)  # 'confirmed', 'interested', 'out'
    attended = db.Column(db.Boolean, default=False, nullable=False)
    no_show = db.Column(db.Boolean, default=False, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    run = db.relationship('Run', back_populates='participants')
    user = db.relationship('User', backref='run_participations')
    
    __table_args__ = (db.UniqueConstraint('run_id', 'user_id', name='unique_run_user'),)
    
    def to_dict(self):
        return {
            'id': self.id,
            'run_id': self.run_id,
            'user_id': self.user_id,
            'status': self.status,
            'attended': self.attended,
            'no_show': self.no_show,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Announcement(db.Model):
    __tablename__ = 'announcements'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    message = db.Column(db.Text, nullable=False)
    created_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    
    # Relationships
    creator = db.relationship('User', backref='announcements')
    
    def to_dict(self):
        return {
            'id': self.id,
            'message': self.message,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_active': self.is_active
        }

