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
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
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
    
    # Relationships
    creator = db.relationship('User', backref='created_runs')
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
            'total_cost': float(self.total_cost) if self.total_cost else None
        }
        
        if include_participants:
            # Get participant user objects with names
            confirmed_users = [p.user for p in self.participants if p.status == 'confirmed']
            interested_users = [p.user for p in self.participants if p.status == 'interested']
            out_users = [p.user for p in self.participants if p.status == 'out']
            
            confirmed_count = len(confirmed_users)
            
            # Calculate cost: if variable, divide total by confirmed participants; otherwise use fixed cost
            if self.is_variable_cost and self.total_cost:
                if confirmed_count > 0:
                    result['cost'] = float(self.total_cost) / confirmed_count
                else:
                    result['cost'] = float(self.total_cost)  # Show total if no participants yet
            else:
                result['cost'] = float(self.cost) if self.cost else None
            
            # Format participant names
            confirmed = [{'username': u.username, 'first_name': u.first_name, 'last_name': u.last_name} for u in confirmed_users]
            interested = [{'username': u.username, 'first_name': u.first_name, 'last_name': u.last_name} for u in interested_users]
            out = [{'username': u.username, 'first_name': u.first_name, 'last_name': u.last_name} for u in out_users]
            
            result['participants'] = {
                'confirmed': confirmed,
                'interested': interested,
                'out': out
            }
            
            result['participant_counts'] = {
                'confirmed': len(confirmed),
                'interested': len(interested),
                'out': len(out)
            }
        
        return result

class RunParticipant(db.Model):
    __tablename__ = 'run_participants'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    run_id = db.Column(db.String(36), db.ForeignKey('runs.id'), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.String(20), nullable=False)  # 'confirmed', 'interested', 'out'
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

