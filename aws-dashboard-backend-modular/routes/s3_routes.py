from flask import Blueprint
from controllers.s3_controller import list_s3_buckets

s3_bp = Blueprint('s3', __name__)

@s3_bp.route('/buckets/<region>', methods=['GET'])
def buckets(region):
    return list_s3_buckets(region)