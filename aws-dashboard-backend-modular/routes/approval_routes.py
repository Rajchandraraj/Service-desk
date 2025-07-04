from flask import Blueprint, request
from controllers.approval_controller import create_request, list_pending, approve_request, reject_request, list_approved

approval_bp = Blueprint('approval', __name__)

@approval_bp.route('/request', methods=['POST'])
def create_request_route():
    return create_request(request.json)

@approval_bp.route('/pending', methods=['GET'])
def list_pending_route():
    return list_pending()

@approval_bp.route('/approve/<request_id>', methods=['GET','POST'])
def approve_request_route(request_id):
    return approve_request(request_id)

@approval_bp.route('/reject/<request_id>', methods=['POST'])
def reject_request_route(request_id):
    from controllers.approval_controller import reject_request
    return reject_request(request_id)

@approval_bp.route('/approved', methods=['GET'])
def list_approved_route():
    return list_approved()

@approval_bp.route('/approved/<request_id>', methods=['DELETE'])
def pop_approved_route(request_id):
    from controllers.approval_controller import pop_approved
    return pop_approved(request_id)