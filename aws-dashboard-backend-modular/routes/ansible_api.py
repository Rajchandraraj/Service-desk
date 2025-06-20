from flask import Blueprint

ansible_api_bp = Blueprint('ansible_api', __name__)

# Example route
@ansible_api_bp.route('/health', methods=['GET'])
def ansible_health():
    return {"status": "ok"}