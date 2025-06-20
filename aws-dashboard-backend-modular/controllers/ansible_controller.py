import datetime
import requests
from flask import jsonify

@ansible_api_bp.route('/ansible-api/health', methods=['GET'])
def check_ansible_api():
    """Proxy health check to Ansible API"""
    try:
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
        }), 500