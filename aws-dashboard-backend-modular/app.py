import os
from flask import Flask, jsonify, request
from flask_cors import CORS
import datetime
from routes.auth_routes import auth_bp
from routes.war_routes import war_bp
from routes.ec2_routes import ec2_bp
from routes.s3_routes import s3_bp
from routes.security_routes import security_bp
from routes.utility_routes import utility_bp   # <-- Add this line

from routes.ansible_api import ansible_api_bp  # <-- Add this line
from routes.approval_routes import approval_bp
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
app.secret_key = "your_secret_key"  # Needed for session
frontend_origin = os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000")
CORS(app, origins=[frontend_origin], supports_credentials=True)

app.register_blueprint(ec2_bp, url_prefix='/ec2')
app.register_blueprint(s3_bp, url_prefix='/s3')
app.register_blueprint(security_bp, url_prefix='/security')
app.register_blueprint(utility_bp, url_prefix='/utility')  # <-- Add this line
app.register_blueprint(ansible_api_bp, url_prefix='/api/ansible')  # <-- Add this line
app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(war_bp, url_prefix='/api/war')
app.register_blueprint(approval_bp, url_prefix='/approval')



@app.route('/')
def index():
    return jsonify({"message": "Service Desk API is running"})


@app.before_request
def require_login():
    # Allow public access to approval endpoints
    if request.endpoint in [
        'approval.approve_request_route',
        'approval.reject_request_route'
    ]:
        return  # Skip authentication for these endpoints

    # ...your existing authentication logic...

# --- Add this route below ---
'''@app.route('/ansible-api/health', methods=['GET'])
def check_ansible_api():
    """Proxy health check to Ansible API"""
    try:
        import requests
        response = requests.get('http://43.204.109.213:8000/health', timeout=5)
        return jsonify({
            'ansible_api_status': 'healthy' if response.status_code == 200 else 'unhealthy',
            'ansible_api_response': response.json() if response.status_code == 200 else None,
            'timestamp': datetime.datetime.utcnow().isoformat()
        })
    except Exception as e:
        return jsonify({
            'ansible_api_status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.datetime.utcnow().isoformat()
        }), 500'''

if __name__=='__main__':
    app.run(host='0.0.0.0', port=5000,debug=True)