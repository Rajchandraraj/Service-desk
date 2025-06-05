from flask import Flask, jsonify, request
from flask_cors import CORS
import boto3
import datetime
import logging

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_ec2_client(account_region='us-east-1'):
    return boto3.client('ec2', region_name=account_region)

def get_cloudwatch_client(account_region='us-east-1'):
    return boto3.client('cloudwatch', region_name=account_region)

@app.route('/instances/<region>', methods=['GET'])
def list_instances(region):
    try:
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
        
        logger.info(f"Successfully retrieved {len(output)} instances from region {region}")
        return jsonify(output)
        
    except Exception as e:
        error_str = str(e)
        logger.error(f"Error in list_instances: {error_str}")
        
        # Handle specific AWS errors
        if 'RequestExpired' in error_str:
            return jsonify({
                'error': 'AWS session has expired',
                'message': 'Please refresh your AWS credentials and try again',
                'error_code': 'SESSION_EXPIRED',
                'suggestion': 'Your temporary AWS session tokens have expired. Please get new credentials.'
            }), 401
        elif 'NoCredentialsError' in error_str:
            return jsonify({
                'error': 'No AWS credentials found',
                'message': 'Please configure your AWS credentials',
                'error_code': 'NO_CREDENTIALS'
            }), 401
        elif 'UnauthorizedOperation' in error_str:
            return jsonify({
                'error': 'Insufficient permissions',
                'message': 'You do not have permission to describe instances',
                'error_code': 'UNAUTHORIZED'
            }), 403
        else:
            return jsonify({
                'error': 'Failed to retrieve instances',
                'message': error_str,
                'error_code': 'UNKNOWN_ERROR'
            }), 500

@app.route('/instance/<region>/<instance_id>', methods=['GET'])
def get_instance_details(region, instance_id):
    """Get detailed information about a specific instance"""
    try:
        ec2 = get_ec2_client(region)
        response = ec2.describe_instances(InstanceIds=[instance_id])
        
        if not response['Reservations']:
            return jsonify({'error': 'Instance not found'}), 404
            
        inst = response['Reservations'][0]['Instances'][0]
        name = next((tag['Value'] for tag in inst.get('Tags', []) if tag['Key'] == 'Name'), None)
        
        # Get IP addresses
        public_ip = inst.get('PublicIpAddress', None)
        private_ip = inst.get('PrivateIpAddress', None)
        
        instance_details = {
            'id': inst['InstanceId'],
            'name': name,
            'type': inst['InstanceType'],
            'state': inst['State']['Name'],
            'az': inst['Placement']['AvailabilityZone'],
            'volumes': [v['Ebs']['VolumeId'] for v in inst.get('BlockDeviceMappings', [])],
            'tags': inst.get('Tags', []),
            'role': inst.get('IamInstanceProfile', {}).get('Arn', 'None'),
            'public_ip': public_ip,
            'private_ip': private_ip,
            'launch_time': inst.get('LaunchTime').isoformat() if inst.get('LaunchTime') else None,
            'vpc_id': inst.get('VpcId', None),
            'subnet_id': inst.get('SubnetId', None),
            'security_groups': [sg['GroupName'] for sg in inst.get('SecurityGroups', [])],
            'key_name': inst.get('KeyName', None),
            'architecture': inst.get('Architecture', None),
            'platform': inst.get('Platform', 'linux'),
            'monitoring': inst.get('Monitoring', {}).get('State', 'disabled')
        }
        
        return jsonify(instance_details)
        
    except Exception as e:
        error_str = str(e)
        logger.error(f"Error fetching instance details: {error_str}")
        
        if 'InvalidInstanceID.NotFound' in error_str:
            return jsonify({'error': 'Instance not found'}), 404
        elif 'RequestExpired' in error_str:
            return jsonify({
                'error': 'AWS session has expired',
                'message': 'Please refresh your AWS credentials and try again'
            }), 401
        else:
            return jsonify({'error': error_str}), 500

@app.route('/instance/<region>/<instance_id>/private-ip', methods=['GET'])
def get_instance_private_ip(region, instance_id):
    """Get the private IP address of a specific instance for installation purposes"""
    try:
        ec2 = get_ec2_client(region)
        response = ec2.describe_instances(InstanceIds=[instance_id])
        
        if not response['Reservations']:
            return jsonify({'error': 'Instance not found'}), 404
            
        inst = response['Reservations'][0]['Instances'][0]
        private_ip = inst.get('PrivateIpAddress', None)
        public_ip = inst.get('PublicIpAddress', None)
        state = inst['State']['Name']
        
        if not private_ip:
            return jsonify({
                'error': 'Private IP not available for this instance',
                'instance_id': instance_id,
                'state': state
            }), 400
            
        return jsonify({
            'instance_id': instance_id,
            'private_ip': private_ip,
            'public_ip': public_ip,
            'state': state,
            'ready_for_installation': state == 'running' and private_ip is not None
        })
        
    except Exception as e:
        error_str = str(e)
        logger.error(f"Error fetching private IP for instance {instance_id}: {error_str}")
        
        if 'InvalidInstanceID.NotFound' in error_str:
            return jsonify({'error': 'Instance not found'}), 404
        else:
            return jsonify({'error': error_str}), 500

@app.route('/instance/<region>/<instance_id>/installation-info', methods=['GET'])
def get_installation_info(region, instance_id):
    """Get comprehensive installation information for an instance"""
    try:
        ec2 = get_ec2_client(region)
        response = ec2.describe_instances(InstanceIds=[instance_id])
        
        if not response['Reservations']:
            return jsonify({'error': 'Instance not found'}), 404
            
        inst = response['Reservations'][0]['Instances'][0]
        name = next((tag['Value'] for tag in inst.get('Tags', []) if tag['Key'] == 'Name'), None)
        private_ip = inst.get('PrivateIpAddress', None)
        public_ip = inst.get('PublicIpAddress', None)
        state = inst['State']['Name']
        key_name = inst.get('KeyName', None)
        platform = inst.get('Platform', 'linux')
        
        # Determine if instance is ready for installation
        ready_for_installation = (
            state == 'running' and 
            private_ip is not None
        )
        
        # Installation readiness checks
        checks = {
            'instance_running': state == 'running',
            'private_ip_available': private_ip is not None,
            'ssh_key_assigned': key_name is not None,
            'linux_platform': platform != 'windows'
        }
        
        return jsonify({
            'instance_id': instance_id,
            'name': name,
            'private_ip': private_ip,
            'public_ip': public_ip,
            'state': state,
            'key_name': key_name,
            'platform': platform,
            'ready_for_installation': ready_for_installation,
            'installation_checks': checks,
            'recommended_target_ip': private_ip,  # Prefer private IP for installation
            'notes': {
                'ssh_access': 'Ensure SSH access is configured for the target IP',
                'security_groups': 'Verify security groups allow SSH (port 22)',
                'ansible_requirements': 'Target must have Python installed'
            }
        })
        
    except Exception as e:
        error_str = str(e)
        logger.error(f"Error fetching installation info for instance {instance_id}: {error_str}")
        
        if 'InvalidInstanceID.NotFound' in error_str:
            return jsonify({'error': 'Instance not found'}), 404
        else:
            return jsonify({'error': error_str}), 500

@app.route('/instances/<region>/installation-ready', methods=['GET'])
def get_installation_ready_instances(region):
    """Get all instances that are ready for software installation"""
    try:
        ec2 = get_ec2_client(region)
        instances = ec2.describe_instances(
            Filters=[
                {'Name': 'instance-state-name', 'Values': ['running']}
            ]
        )
        
        ready_instances = []
        
        for res in instances['Reservations']:
            for inst in res['Instances']:
                private_ip = inst.get('PrivateIpAddress', None)
                public_ip = inst.get('PublicIpAddress', None)
                key_name = inst.get('KeyName', None)
                platform = inst.get('Platform', 'linux')
                name = next((tag['Value'] for tag in inst.get('Tags', []) if tag['Key'] == 'Name'), None)
                
                if private_ip and platform != 'windows':  # Only Linux instances with private IP
                    ready_instances.append({
                        'id': inst['InstanceId'],
                        'name': name,
                        'private_ip': private_ip,
                        'public_ip': public_ip,
                        'key_name': key_name,
                        'type': inst['InstanceType'],
                        'az': inst['Placement']['AvailabilityZone']
                    })
        
        return jsonify({
            'ready_instances': ready_instances,
            'count': len(ready_instances),
            'region': region
        })
        
    except Exception as e:
        error_str = str(e)
        logger.error(f"Error fetching installation-ready instances: {error_str}")
        return jsonify({'error': error_str}), 500

@app.route('/instance/<region>/<instance_id>/cpu', methods=['GET'])
def get_cpu_utilization(region, instance_id):
    """Get CPU utilization for a specific instance"""
    try:
        cloudwatch = get_cloudwatch_client(region)
        
        # Get CPU utilization for the last hour
        end_time = datetime.datetime.utcnow()
        start_time = end_time - datetime.timedelta(hours=1)
        
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
    try:
        data = request.json
        new_type = data['instance_type']

        ec2 = get_ec2_client(region)
        
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
    try:
        ec2 = get_ec2_client(region)
        ec2.terminate_instances(InstanceIds=[instance_id])
        return jsonify({'status': 'success', 'message': f'Terminated {instance_id}'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/instance/<region>/<instance_id>/start', methods=['POST'])
def start_instance(region, instance_id):
    try:
        ec2 = get_ec2_client(region)
        ec2.start_instances(InstanceIds=[instance_id])
        return jsonify({'status': 'success', 'message': f'Started {instance_id}'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/instance/<region>/<instance_id>/stop', methods=['POST'])
def stop_instance(region, instance_id):
    try:
        ec2 = get_ec2_client(region)
        ec2.stop_instances(InstanceIds=[instance_id])
        return jsonify({'status': 'success', 'message': f'Stopped {instance_id}'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/instances/<region>/stop_all', methods=['POST'])
def stop_all_instances(region):
    """Stop all running instances in the region"""
    try:
        ec2 = get_ec2_client(region)
        
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
    try:
        # Test AWS connectivity
        ec2 = get_ec2_client('us-east-1')
        regions = ec2.describe_regions()
        aws_connected = True
        aws_message = f"Connected - {len(regions['Regions'])} regions available"
    except Exception as e:
        aws_connected = False
        aws_message = f"AWS connection failed: {str(e)}"
        
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.datetime.utcnow().isoformat(),
        'service': 'EC2 Management API',
        'version': '1.2.0',
        'aws_connectivity': {
            'connected': aws_connected,
            'message': aws_message
        }
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

@app.route('/ansible-api/health', methods=['GET'])
def check_ansible_api():
    """Proxy health check to Ansible API"""
    try:
        import requests
        response = requests.get('http://43.204.109.213:8000/health', timeout=5)
        return jsonify({
            'ansible_api_status': 'healthy' if response.status_code == 200 else 'unhealthy',
            'ansible_api_response': response.json() if response.status_code == 200 else None,
            'timestamp': datetime.datetime.utcnow().isoformat()
        })
    except Exception as e:
        return jsonify({
            'ansible_api_status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.datetime.utcnow().isoformat()
        }), 500

if __name__ == '__main__':
    print("🚀 Starting EC2 Management API...")
    print("📊 Health check: http://localhost:5000/health")
    print("🔧 Installation endpoints ready")
    
    app.run(host='0.0.0.0', port=5000, debug=True)