from flask import Flask
from flask_cors import CORS
from database import init_db
from routes.auth import auth_bp
from routes.runs import runs_bp
from routes.users import users_bp
from routes.admin import admin_bp

app = Flask(__name__)

# Enable CORS for Next.js frontend
CORS(app, origins=['http://localhost:3000', 'http://127.0.0.1:3000'], supports_credentials=True)

# Initialize database
init_db(app)

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(runs_bp, url_prefix='/api/runs')
app.register_blueprint(users_bp, url_prefix='/api/users')
app.register_blueprint(admin_bp, url_prefix='/api/admin')

@app.route('/api/health', methods=['GET'])
def health_check():
    return {'status': 'ok'}, 200

if __name__ == '__main__':
    app.run(debug=True, port=5001)

