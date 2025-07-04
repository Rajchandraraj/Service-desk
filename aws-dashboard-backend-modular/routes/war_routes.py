from flask import Blueprint, request, jsonify
from controllers.war_controller import create_stack
import boto3
import os

war_bp = Blueprint('war', __name__)

@war_bp.route('/create-stack', methods=['POST'])
def create_stack_route():
    return create_stack()

@war_bp.route('/list-templates', methods=['GET'])
def list_templates():
    aws_access_key_id = os.environ.get('AWS_ACCESS_KEY_ID')
    aws_secret_access_key = os.environ.get('AWS_SECRET_ACCESS_KEY')
    aws_region = os.environ.get('AWS_DEFAULT_REGION', 'ap-south-1')
    bucket = os.environ.get('AWS_S3_BUCKET_NAME')

    if not all([aws_access_key_id, aws_secret_access_key, bucket]):
        return jsonify({'error': 'AWS credentials or bucket not set in environment'}), 500

    s3 = boto3.client(
        's3',
        aws_access_key_id=aws_access_key_id,
        aws_secret_access_key=aws_secret_access_key,
        region_name=aws_region
    )
    try:
        response = s3.list_objects_v2(Bucket=bucket, Prefix='templates/')
        templates = []
        for obj in response.get('Contents', []):
            key = obj['Key']
            if key.endswith('.yaml') or key.endswith('.json'):
                templates.append({
                    'name': key.replace('templates/', ''),
                    'url': f'https://{bucket}.s3.{aws_region}.amazonaws.com/{key}'
                })
        return jsonify({'templates': templates})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@war_bp.route('/get-upload-url', methods=['POST'])
def get_upload_url():
    data = request.get_json()
    file_name = data.get('fileName')
    aws_region = os.environ.get('AWS_DEFAULT_REGION', 'ap-south-1')
    bucket = os.environ.get('AWS_S3_BUCKET_NAME')
    aws_access_key_id = os.environ.get('AWS_ACCESS_KEY_ID')
    aws_secret_access_key = os.environ.get('AWS_SECRET_ACCESS_KEY')

    if not file_name:
        return jsonify({'error': 'Missing fileName'}), 400
    if not all([aws_access_key_id, aws_secret_access_key, bucket]):
        return jsonify({'error': 'AWS credentials or bucket not set in environment'}), 500

    s3 = boto3.client(
        's3',
        aws_access_key_id=aws_access_key_id,
        aws_secret_access_key=aws_secret_access_key,
        region_name=aws_region
    )
    key = f'templates/{file_name}'
    try:
        upload_url = s3.generate_presigned_url(
            ClientMethod='put_object',
            Params={'Bucket': bucket, 'Key': key, 'ContentType': 'application/octet-stream'},
            ExpiresIn=60
        )
        file_url = f'https://{bucket}.s3.{aws_region}.amazonaws.com/{key}'
        return jsonify({'uploadURL': upload_url, 'fileUrl': file_url})
    except Exception as e:
        return jsonify({'error': str(e)}), 500