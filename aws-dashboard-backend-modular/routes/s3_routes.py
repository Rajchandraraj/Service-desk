from flask import Blueprint
from controllers.s3_controller import list_s3_buckets, create_s3_bucket

s3_bp = Blueprint('s3', __name__)

@s3_bp.route('/buckets/<region>', methods=['GET'])
def buckets(region):
    return list_s3_buckets(region)
@s3_bp.route('/create-s3', methods=['POST', 'OPTIONS'])
def create_s3():
    return create_s3_bucket()