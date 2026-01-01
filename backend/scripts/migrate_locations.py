"""
Migration script to match existing runs to location entities
Run manually: python3 backend/scripts/migrate_locations.py
"""
import sys
import os

# Add parent directory to path to import app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app
from models import Run, Location
from database import db

def match_location(run):
    """Match a run's location/address to a location entity"""
    # Try to match by address (exact or partial)
    if run.address:
        # Try exact address match
        location = Location.query.filter_by(address=run.address).first()
        if location:
            return location
        
        # Try partial address match (contains)
        locations = Location.query.all()
        for loc in locations:
            if loc.address.lower() in run.address.lower() or run.address.lower() in loc.address.lower():
                return loc
    
    # Try to match by location name
    if run.location:
        location = Location.query.filter_by(name=run.location).first()
        if location:
            return location
        
        # Try partial name match
        locations = Location.query.all()
        for loc in locations:
            if loc.name.lower() in run.location.lower() or run.location.lower() in loc.name.lower():
                return loc
    
    # Default to first location if no match found
    return Location.query.first()

with app.app_context():
    runs = Run.query.filter(Run.location_id.is_(None)).all()
    print(f"Found {len(runs)} runs without location_id")
    
    updated_count = 0
    for run in runs:
        location = match_location(run)
        if location:
            run.location_id = location.id
            updated_count += 1
            print(f"Matched run '{run.title}' to location '{location.name}'")
    
    db.session.commit()
    print(f"\nMigration complete! Updated {updated_count} runs with location_id")

