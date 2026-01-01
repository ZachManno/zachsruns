"""
Vercel serverless function entry point for Flask backend
Vercel's Python runtime automatically handles WSGI apps
"""
import sys
import os

# Add backend directory to Python path
backend_path = os.path.join(os.path.dirname(__file__), '..', 'backend')
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

# Import Flask app - Vercel will handle WSGI conversion
from app import app

# Export app for Vercel Python runtime
# Vercel automatically converts Flask WSGI app to serverless function
__all__ = ['app']
