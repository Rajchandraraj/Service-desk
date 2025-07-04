from flask import Blueprint
from controllers.auth_controller import login, logout

auth_bp = Blueprint('auth', __name__)

def safe_route(func):
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            from flask import jsonify
            return jsonify({"error": str(e)}), 500
    wrapper.__name__ = func.__name__
    return wrapper

auth_bp.route('/login', methods=['POST'])(safe_route(login))
auth_bp.route('/logout', methods=['POST'])(safe_route(logout))