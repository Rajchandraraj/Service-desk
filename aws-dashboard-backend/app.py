from flask import Flask, jsonify, request
from flask_cors import CORS
import boto3
import datetime

app = Flask(__name__)
CORS(app)

# Assumes default AWS creds or IAM role
def get_ec2_client(account_region='us-east-1'):
    return boto3.client('ec2', region_name=account_region)

def get_cloudwatch_client(account_region='us-east-1'):
    return boto3.client('cloudwatch', region_name=account_region)

@app.route('/instances/<region>', methods=['GET'])
def list_instances(region):
    ec2 = get_ec2_client(region)
    instances = ec2.describe_instances()
    output = []

    for res in instances['Reservations']:
        for inst in res['Instances']:
            cpu = None  # removed from list_instances for performance; fetched separately
            name = next((tag['Value'] for tag in inst.get('Tags', []) if tag['Key'] == 'Name'), None)
            output.append({
                'id': inst['InstanceId'],
                'name': name,
                'type': inst['InstanceType'],
                'state': inst['State']['Name'],
                'az': inst['Placement']['AvailabilityZone'],
                'volumes': [v['Ebs']['VolumeId'] for v in inst.get('BlockDeviceMappings', [])],
                'tags': inst.get('Tags', []),
                'role': inst.get('IamInstanceProfile', {}).get('Arn', 'None'),
                'cpu': cpu,
            })
    return jsonify(output)

@app.route('/instance/<region>/<instance_id>/resize', methods=['POST'])
def resize_instance(region, instance_id):
    data = request.json
    new_type = data['instance_type']

    ec2 = get_ec2_client(region)
    ec2.stop_instances(InstanceIds=[instance_id])
    waiter = ec2.get_waiter('instance_stopped')
    waiter.wait(InstanceIds=[instance_id])

    ec2.modify_instance_attribute(InstanceId=instance_id, InstanceType={'Value': new_type})
    ec2.start_instances(InstanceIds=[instance_id])

    return jsonify({'status': 'success', 'message': f'Resized {instance_id} to {new_type}'})

@app.route('/instance/<region>/<instance_id>/terminate', methods=['POST'])
def terminate_instance(region, instance_id):
    ec2 = get_ec2_client(region)
    ec2.terminate_instances(InstanceIds=[instance_id])
    return jsonify({'status': 'success', 'message': f'Terminated {instance_id}'})

@app.route('/instance/<region>/<instance_id>/start', methods=['POST'])
def start_instance(region, instance_id):
    ec2 = get_ec2_client(region)
    ec2.start_instances(InstanceIds=[instance_id])
    return jsonify({'status': 'success', 'message': f'Started {instance_id}'})

@app.route('/instance/<region>/<instance_id>/stop', methods=['POST'])
def stop_instance(region, instance_id):
    ec2 = get_ec2_client(region)
    ec2.stop_instances(InstanceIds=[instance_id])
    return jsonify({'status': 'success', 'message': f'Stopped {instance_id}'})

@app.route('/alarms/<region>', methods=['GET'])
def get_alarms(region):
    try:
        cw = get_cloudwatch_client(region)
        alarms = cw.describe_alarms(StateValue='ALARM')
    except Exception as e:
        print(f"[ERROR] Failed to get alarms for {region}: {e}")
        return jsonify([])

    alert_list = []
    for alarm in alarms.get('MetricAlarms', []):
        alert_list.append({
            'name': alarm['AlarmName'],
            'namespace': alarm['Namespace'],
            'metric': alarm['MetricName'],
            'dimensions': alarm.get('Dimensions', []),
            'state': alarm['StateValue'],
            'region': region
        })
    return jsonify(alert_list)

@app.route('/s3-buckets/<region>', methods=['GET'])
def list_s3_buckets(region):
    s3 = boto3.client('s3', region_name=region)
    try:
        buckets = s3.list_buckets()['Buckets']
        # Optionally filter only buckets created in selected region
        return jsonify([b['Name'] for b in buckets])
    except Exception as e:
        return jsonify([]), 500

@app.route('/create-s3', methods=['POST'])
def create_s3_bucket():
    data = request.json
    bucket_name = data.get('bucket_name')
    region = data.get('region')
    block_public_access = data.get('block_public_access', True)
    versioning = data.get('versioning', False)
    tags = data.get('tags', [])  # Expecting [{"Key": "env", "Value": "dev"}]
    
    if not bucket_name or not region:
        return jsonify({'status': 'error', 'message': 'bucket_name and region are required'}), 400

    s3 = boto3.client('s3', region_name=region)

    try:
        # Create bucket
        create_bucket_config = {'LocationConstraint': region} if region != 'us-east-1' else {}
        s3.create_bucket(Bucket=bucket_name, CreateBucketConfiguration=create_bucket_config)

        # Block Public Access
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

        # Enable versioning
        if versioning:
            s3.put_bucket_versioning(
                Bucket=bucket_name,
                VersioningConfiguration={'Status': 'Enabled'}
            )

        # Add tags
        if tags:
            s3.put_bucket_tagging(
                Bucket=bucket_name,
                Tagging={'TagSet': tags}
            )

        return jsonify({'status': 'success', 'message': f'S3 bucket {bucket_name} created successfully'})
    
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/metrics/<region>/<instance_id>')
def get_instance_metrics(region, instance_id):
    cw = get_cloudwatch_client(region)
    now = datetime.datetime.utcnow()
    start = now - datetime.timedelta(hours=1)
    metrics = {}

    def fetch(metric_name):
        data = cw.get_metric_statistics(
            Namespace='AWS/EC2',
            MetricName=metric_name,
            Dimensions=[{'Name': 'InstanceId', 'Value': instance_id}],
            StartTime=start,
            EndTime=now,
            Period=300,
            Statistics=['Average']
        )
        return sorted([
            {'x': point['Timestamp'], 'y': point['Average']}
            for point in data['Datapoints']
        ], key=lambda p: p['x'])

    metrics['CPUUtilization'] = fetch('CPUUtilization')
    return jsonify(metrics)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
