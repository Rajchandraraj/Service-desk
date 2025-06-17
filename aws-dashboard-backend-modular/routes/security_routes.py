from flask import Blueprint
from controllers.security_controller import (
    ec2_security_checks,
    s3_security_checks
)
from controllers.foundation_controller import foundation_security_checks

security_bp = Blueprint('security', __name__)

security_bp.route('/ec2', methods=['GET'])(ec2_security_checks)
security_bp.route('/s3', methods=['GET'])(s3_security_checks)
security_bp.route('/foundation', methods=['GET'])(foundation_security_checks)