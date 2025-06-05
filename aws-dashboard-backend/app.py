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
            
            # Get IP addresses
            public_ip = inst.get('PublicIpAddress', None)
            private_ip = inst.get('PrivateIpAddress', None)
            
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
                'public_ip': public_ip,
                'private_ip': private_ip,
            })
    return jsonify(output)

@app.route('/instance/<region>/<instance_id>/cpu', methods=['GET'])
def get_cpu_utilization(region, instance_id):
    """Get CPU utilization for a specific instance"""
    cloudwatch = get_cloudwatch_client(region)
    
    # Get CPU utilization for the last hour
    end_time = datetime.datetime.utcnow()
    start_time = end_time - datetime.timedelta(hours=1)
    
    try:
        response = cloudwatch.get_metric_statistics(
            Namespace='AWS/EC2',
            MetricName='CPUUtilization',
            Dimensions=[
                {
                    'Name': 'InstanceId',
                    'Value': instance_id
                }
            ],
            StartTime=start_time,
            EndTime=end_time,
            Period=300,  # 5 minutes
            Statistics=['Average']
        )
        
        if response['Datapoints']:
            # Get the most recent datapoint
            latest = max(response['Datapoints'], key=lambda x: x['Timestamp'])
            cpu_usage = round(latest['Average'], 2)
        else:
            cpu_usage = 0
            
        return jsonify({'cpu': cpu_usage})
    except Exception as e:
        return jsonify({'error': str(e), 'cpu': 0}), 500

@app.route('/instance/<region>/<instance_id>/resize', methods=['POST'])
def resize_instance(region, instance_id):
    data = request.json
    new_type = data['instance_type']

    ec2 = get_ec2_client(region)
    
    try:
        # Check current state
        response = ec2.describe_instances(InstanceIds=[instance_id])
        current_state = response['Reservations'][0]['Instances'][0]['State']['Name']
        
        if current_state != 'stopped':
            ec2.stop_instances(InstanceIds=[instance_id])
            waiter = ec2.get_waiter('instance_stopped')
            waiter.wait(InstanceIds=[instance_id])

        ec2.modify_instance_attribute(InstanceId=instance_id, InstanceType={'Value': new_type})
        ec2.start_instances(InstanceIds=[instance_id])

        return jsonify({'status': 'success', 'message': f'Resized {instance_id} to {new_type}'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/instance/<region>/<instance_id>/terminate', methods=['POST'])
def terminate_instance(region, instance_id):
    ec2 = get_ec2_client(region)
    try:
        ec2.terminate_instances(InstanceIds=[instance_id])
        return jsonify({'status': 'success', 'message': f'Terminated {instance_id}'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/instance/<region>/<instance_id>/start', methods=['POST'])
def start_instance(region, instance_id):
    ec2 = get_ec2_client(region)
    try:
        ec2.start_instances(InstanceIds=[instance_id])
        return jsonify({'status': 'success', 'message': f'Started {instance_id}'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/instance/<region>/<instance_id>/stop', methods=['POST'])
def stop_instance(region, instance_id):
    ec2 = get_ec2_client(region)
    try:
        ec2.stop_instances(InstanceIds=[instance_id])
        return jsonify({'status': 'success', 'message': f'Stopped {instance_id}'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/instances/<region>/stop_all', methods=['POST'])
def stop_all_instances(region):
    """Stop all running instances in the region"""
    ec2 = get_ec2_client(region)
    
    try:
        # Get all running instances
        instances = ec2.describe_instances(
            Filters=[
                {'Name': 'instance-state-name', 'Values': ['running']}
            ]
        )
        
        instance_ids = []
        for res in instances['Reservations']:
            for inst in res['Instances']:
                instance_ids.append(inst['InstanceId'])
        
        if instance_ids:
            ec2.stop_instances(InstanceIds=instance_ids)
            return jsonify({
                'status': 'success', 
                'message': f'Stopped {len(instance_ids)} running instances',
                'instance_ids': instance_ids
            })
        else:
            return jsonify({
                'status': 'success', 
                'message': 'No running instances found'
            })
            
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.datetime.utcnow().isoformat(),
        'service': 'EC2 Management API'
    })

@app.route('/regions', methods=['GET'])
def list_regions():
    """List all available AWS regions"""
    try:
        ec2 = boto3.client('ec2', region_name='us-east-1')
        regions = ec2.describe_regions()
        
        region_list = [region['RegionName'] for region in regions['Regions']]
        region_list.sort()
        
        return jsonify({
            'regions': region_list,
            'count': len(region_list)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)