from database import db
from datetime import datetime
import uuid

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
    
    def to_dict(self):
        # Calculate attendance rate
        total = self.runs_attended_count + self.no_shows_count
        attendance_rate = (self.runs_attended_count / total * 100) if total > 0 else None
        
        # Get referrer info if exists
        referrer_info = None
        if self.referred_by and self.referrer:
            referrer_info = {
                'id': self.referrer.id,
                'username': self.referrer.username,
                'first_name': self.referrer.first_name,
                'last_name': self.referrer.last_name,
            }
        
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'badge': self.badge,
            'referred_by': self.referred_by,
            'referrer': referrer_info,
            'runs_attended_count': self.runs_attended_count,
            'no_shows_count': self.no_shows_count,
            'attendance_rate': round(attendance_rate, 1) if attendance_rate is not None else None,
            'is_admin': self.is_admin,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Run(db.Model):
    __tablename__ = 'runs'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(200), nullable=False)
    date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    location = db.Column(db.String(200), nullable=False)
    address = db.Column(db.String(500), nullable=False)
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
    
    # Relationships
    creator = db.relationship('User', foreign_keys=[created_by], backref='created_runs')
    completer = db.relationship('User', foreign_keys=[completed_by], backref='completed_runs')
    participants = db.relationship('RunParticipant', back_populates='run', cascade='all, delete-orphan')
    
    def to_dict(self, include_participants=True):
        result = {
            'id': self.id,
            'title': self.title,
            'date': self.date.isoformat() if self.date else None,
            'start_time': self.start_time.strftime('%H:%M') if self.start_time else None,
            'end_time': self.end_time.strftime('%H:%M') if self.end_time else None,
            'location': self.location,
            'address': self.address,
            'description': self.description,
            'capacity': int(self.capacity) if self.capacity else None,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_historical': self.is_historical,
            'is_variable_cost': self.is_variable_cost,
            'total_cost': float(self.total_cost) if self.total_cost else None,
            'is_completed': self.is_completed,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'completed_by': self.completed_by
        }
        
        if include_participants:
            # Get participant user objects with names
            confirmed_users = [p.user for p in self.participants if p.status == 'confirmed']
            interested_users = [p.user for p in self.participants if p.status == 'interested']
            out_users = [p.user for p in self.participants if p.status == 'out']
            no_show_users = [p.user for p in self.participants if p.no_show]
            
            confirmed_count = len(confirmed_users)
            
            # Calculate cost: if variable, divide total by confirmed participants; otherwise use fixed cost
            if self.is_variable_cost and self.total_cost:
                if confirmed_count > 0:
                    result['cost'] = round(float(self.total_cost) / confirmed_count, 2)
                else:
                    result['cost'] = round(float(self.total_cost), 2)  # Show total if no participants yet
            else:
                result['cost'] = round(float(self.cost), 2) if self.cost else None
            
            # Format participant names with badge info and attendance
            confirmed_participants_list = [p for p in self.participants if p.status == 'confirmed']
            interested_participants_list = [p for p in self.participants if p.status == 'interested']
            out_participants_list = [p for p in self.participants if p.status == 'out']
            no_show_participants_list = [p for p in self.participants if p.no_show]
            
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

