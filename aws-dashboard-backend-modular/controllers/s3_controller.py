from flask import jsonify, request
import boto3
from utils.validators import is_valid_bucket_name

def list_s3_buckets(region):
    s3 = boto3.client('s3', region_name=region)
    try:
        buckets = s3.list_buckets()['Buckets']
        return jsonify([b['Name'] for b in buckets])
    except Exception as e:
        return jsonify([]), 500

def create_s3_bucket():
    if request.method == 'OPTIONS':
        return '', 200
    data = request.get_json(force=True)
    bucket_name = data.get('bucket_name')
    region = data.get('region')
    block_public_access = data.get('block_public_access', True)
    versioning = data.get('versioning', False)
    tags = data.get('tags', [])
    if not bucket_name or not region:
        return jsonify({'status': 'error', 'message': 'bucket_name and region are required'}), 400
    if not is_valid_bucket_name(bucket_name):
        return jsonify({'status': 'error', 'message': 'Invalid bucket name'}), 400
    s3 = boto3.client('s3', region_name=region)
    try:
        if region == 'us-east-1':
            s3.create_bucket(Bucket=bucket_name)
        else:
            s3.create_bucket(
                Bucket=bucket_name,
                CreateBucketConfiguration={'LocationConstraint': region}
            )
        if block_public_access:
            s3.put_public_access_block(
                Bucket=bucket_name,
                PublicAccessBlockConfiguration={
                    'BlockPublicAcls': True,
                    'IgnorePublicAcls': True,
                    'BlockPublicPolicy': True,
                    'RestrictPublicBuckets': True
                }
            )
        if versioning:
            s3.put_bucket_versioning(
                Bucket=bucket_name,
                VersioningConfiguration={'Status': 'Enabled'}
            )
        if tags:
            s3.put_bucket_tagging(
                Bucket=bucket_name,
                Tagging={'TagSet': tags}
            )
        return jsonify({'status': 'success', 'message': f'S3 bucket {bucket_name} created successfully'}),201
    except Exception as e:
        print("S3 Create Error:", e) 
        return jsonify({'status': 'error', 'message': str(e)}), 400

def list_instances(region):
    ec2 = boto3.client('ec2', region_name=region)
    try:
        instances = ec2.describe_instances()
        # ...process instances as needed...
        return jsonify(instances)
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500