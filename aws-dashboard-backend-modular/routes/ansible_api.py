from flask import Blueprint, jsonify

ansible_api_bp = Blueprint('ansible_api', __name__)

# Example route
@ansible_api_bp.route('/health', methods=['GET'])
def check_ansible_health():
    return jsonify({"status": "ok"})