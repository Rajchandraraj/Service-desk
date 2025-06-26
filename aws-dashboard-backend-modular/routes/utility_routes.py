from flask import Blueprint
from controllers.utility_controller import (
    get_data,
    get_billing_data,
    anomaly_summary,
    get_presigned_url,
    list_s3_files,
    get_ec2_instances,
    get_ec2_alarms,
    get_s3_buckets,
    get_security_ec2,
    get_security_s3,
    get_foundation_checks,
    get_ec2_iam_profiles,
)

utility_bp = Blueprint('utility', __name__)

utility_bp.route('/api/data', methods=['GET'])(get_data)
utility_bp.route('/api/billing', methods=['GET'])(get_billing_data)
utility_bp.route('/api/anomaly-summary', methods=['GET'])(anomaly_summary)
utility_bp.route('/api/download-url', methods=['GET'])(get_presigned_url)
utility_bp.route('/api/list-files', methods=['GET'])(list_s3_files)

utility_bp.route('/ec2/instances/<region>', methods=['GET'])(get_ec2_instances)
utility_bp.route('/ec2/alarms/<region>', methods=['GET'])(get_ec2_alarms)
utility_bp.route('/s3/buckets/<region>', methods=['GET'])(get_s3_buckets)

utility_bp.route('/security/ec2', methods=['GET'])(get_security_ec2)
utility_bp.route('/security/s3', methods=['GET'])(get_security_s3)
utility_bp.route('/security/foundation', methods=['GET'])(get_foundation_checks)
utility_bp.route('/ec2/iam-profiles/<region>', methods=['GET'])(get_ec2_iam_profiles)