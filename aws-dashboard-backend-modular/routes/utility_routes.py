from flask import Blueprint
from controllers.utility_controller import (
    get_data,
    get_billing_data,
    anomaly_summary,
    get_presigned_url
)

utility_bp = Blueprint('utility', __name__)

utility_bp.route('/api/data', methods=['GET'])(get_data)
utility_bp.route('/api/billing', methods=['GET'])(get_billing_data)
utility_bp.route('/api/anomaly-summary', methods=['GET'])(anomaly_summary)
utility_bp.route('/api/download-url', methods=['GET'])(get_presigned_url)