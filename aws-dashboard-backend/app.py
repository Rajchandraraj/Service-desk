from flask import Flask, jsonify, request
from flask_cors import CORS
import boto3
import datetime
import json
from botocore.exceptions import ClientError
import re
import logging
from dotenv import load_dotenv
import os

load_dotenv()


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def is_valid_bucket_name(name):
    if len(name) < 3 or len(name) > 63:
        return False
    if not re.match(r'^[a-z0-9][a-z0-9.-]+[a-z0-9]$', name):
        return False
    if '..' in name or '.-' in name or '-.' in name:
        return False
    if re.match(r'^\d{1,3}(\.\d{1,3}){3}$', name):  # Looks like an IP address
        return False
    return True

app = Flask(__name__)
CORS(app)

# Assumes default AWS creds or IAM role
def get_ec2_client(account_region='us-east-1'):
    return boto3.client('ec2', region_name=account_region)

def get_cloudwatch_client(account_region='us-east-1'):
    return boto3.client('cloudwatch', region_name=account_region)

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
    
@app.route('/ec2/vpcs/<region>', methods=['GET'])
def get_vpcs(region):
    ec2 = get_ec2_client(region)
    try:
        vpcs = ec2.describe_vpcs()
        return jsonify([
            {'id': vpc['VpcId'], 'cidr': vpc['CidrBlock']}
            for vpc in vpcs['Vpcs']
        ])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/create-ec2', methods=['POST'])
def create_ec2():
    data = request.json
    region = data.get('region')
    ami = data.get('ami')
    instance_type = data.get('instance_type')
    subnet_id = data.get('subnet_id')
    security_group_id = data.get('security_group_id')
    key_name = data.get('key_name')
    iam_instance_profile = data.get('iam_instance_profile')
    instance_name = data.get('name')

    ec2 = get_ec2_client(region)
    try:
        instances = ec2.run_instances(
            ImageId=ami,
            InstanceType=instance_type,
            SubnetId=subnet_id,
            SecurityGroupIds=[security_group_id],
            KeyName=key_name,
            IamInstanceProfile={'Name': iam_instance_profile} if iam_instance_profile else None,
            MinCount=1,
            MaxCount=1,
            TagSpecifications=[{
                'ResourceType': 'instance',
                'Tags': [{'Key': 'Name', 'Value': instance_name}]
            }]
        )
        instance = instances['Instances'][0]
        return jsonify({
            'status': 'success',
            'instance_id': instance['InstanceId'],
            'public_ip': instance.get('PublicIpAddress', 'N/A')
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/create-vpc', methods=['POST'])
def create_vpc():
    data = request.json
    name = data.get('name')
    cidr_block = data.get('cidr_block')
    subnet_cidr = data.get('subnet_cidr')
    region = data.get('region', 'us-east-1')

    if not name or not cidr_block:
        return jsonify({'error': 'VPC name and CIDR block are required'}), 400

    ec2 = get_ec2_client(region)

    try:
        # Create the VPC
        vpc_response = ec2.create_vpc(CidrBlock=cidr_block)
        vpc_id = vpc_response['Vpc']['VpcId']

        # Tag the VPC with a Name
        ec2.create_tags(Resources=[vpc_id], Tags=[{'Key': 'Name', 'Value': name}])

        subnet_id = None
        if subnet_cidr:
            # Get availability zones to pick one for the subnet
            zones = ec2.describe_availability_zones()['AvailabilityZones']
            if not zones:
                raise Exception("No availability zones found for region.")
            az = zones[0]['ZoneName']

            subnet_response = ec2.create_subnet(
                VpcId=vpc_id,
                CidrBlock=subnet_cidr,
                AvailabilityZone=az
            )
            subnet_id = subnet_response['Subnet']['SubnetId']

            # Tag the subnet
            ec2.create_tags(Resources=[subnet_id], Tags=[{'Key': 'Name', 'Value': f"{name}-subnet"}])

        return jsonify({
            'status': 'success',
            'vpc_id': vpc_id,
            'subnet_id': subnet_id
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/ec2/subnets/<region>/<vpc_id>', methods=['GET'])
def get_subnets(region, vpc_id):
    ec2 = get_ec2_client(region)
    try:
        subnets = ec2.describe_subnets(Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}])
        return jsonify([
            {'id': subnet['SubnetId'], 'az': subnet['AvailabilityZone'], 'cidr': subnet['CidrBlock']}
            for subnet in subnets['Subnets']
        ])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/ec2/security-groups/<region>/<vpc_id>', methods=['GET'])
def get_security_groups(region, vpc_id):
    ec2 = get_ec2_client(region)
    try:
        security_groups = ec2.describe_security_groups(Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}])
        return jsonify([
            {'id': sg['GroupId'], 'name': sg['GroupName']}
            for sg in security_groups['SecurityGroups']
        ])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/ec2/key-pairs/<region>', methods=['GET'])
def get_key_pairs(region):
    ec2 = get_ec2_client(region)
    try:
        keys = ec2.describe_key_pairs()
        return jsonify([{'name': kp['KeyName']} for kp in keys['KeyPairs']])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/ec2/iam-profiles/<region>', methods=['GET'])
def get_iam_instance_profiles(region):
    iam = boto3.client('iam')
    try:
        profiles = iam.list_instance_profiles()
        return jsonify([{'name': p['InstanceProfileName']} for p in profiles['InstanceProfiles']])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/create-s3', methods=['POST'])
def create_s3_bucket():
    data = request.json
    bucket_name = data.get('bucket_name')
    region = data.get('region')
    block_public_access = data.get('block_public_access', True)
    versioning = data.get('versioning', False)
    tags = data.get('tags', [])  # [{"Key": "env", "Value": "dev"}]

    if not bucket_name or not region:
        return jsonify({'status': 'error', 'message': 'bucket_name and region are required'}), 400

    if not is_valid_bucket_name(bucket_name):
        return jsonify({'status': 'error', 'message': 'Invalid bucket name'}), 400

    s3 = boto3.client('s3', region_name=region)

    try:
        # Handle us-east-1 differently
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

        return jsonify({'status': 'success', 'message': f'S3 bucket {bucket_name} created successfully'})
    
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


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

with open("./db/data.json", "r") as f:
    DATA = json.load(f)

# AWS S3 setup (use IAM role or env vars in production)
s3_client = boto3.client('s3')

@app.route("/api/data", methods=["GET"])
def get_data():
    return jsonify(DATA)

@app.route('/create-ecs', methods=['POST'])
def create_ecs():
    data = request.json

    region = data.get('region')
    cluster_name = data.get('clusterName')
    launch_type = data.get('launchType')  # 'FARGATE' or 'EC2'
    vpc_id = data.get('vpcId')
    subnet_id = data.get('subnetId')
    service_name = data.get('serviceName')
    task_def_name = data.get('taskDefName')
    task_def_version = data.get('taskDefVersion')
    container_name = data.get('containerName')

    ecs = boto3.client('ecs', region_name=region)
    ec2 = boto3.client('ec2', region_name=region)

    try:
        # 1. Create ECS cluster if not exists
        existing_clusters = ecs.list_clusters()['clusterArns']
        if not any(cluster_name in arn for arn in existing_clusters):
            ecs.create_cluster(clusterName=cluster_name)

        # 2. Register a task definition (simple placeholder)
        task_def_response = ecs.register_task_definition(
            family=task_def_name,
            requiresCompatibilities=[launch_type],
            cpu='256',
            memory='512',
            networkMode='awsvpc',
            containerDefinitions=[
                {
                    'name': container_name,
                    'image': 'amazon/amazon-ecs-sample',  # Replace with actual image
                    'portMappings': [
                        {'containerPort': 80, 'hostPort': 80, 'protocol': 'tcp'}
                    ],
                    'essential': True,
                }
            ],
            executionRoleArn='arn:aws:iam::YOUR_ACCOUNT_ID:role/ecsTaskExecutionRole'
        )

        task_definition = f"{task_def_name}:{task_def_response['taskDefinition']['revision']}"

        # 3. Create ECS service
        ecs.create_service(
            cluster=cluster_name,
            serviceName=service_name,
            taskDefinition=task_definition,
            desiredCount=1,
            launchType=launch_type,
            networkConfiguration={
                'awsvpcConfiguration': {
                    'subnets': [subnet_id],
                    'assignPublicIp': 'ENABLED',
                    'securityGroups': []  # Optionally provide
                }
            },
        )

        return jsonify({'status': 'success', 'message': f'ECS service {service_name} created'})

    except ClientError as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/ecs/vpcs/<region>', methods=['GET'])
def get_ecs_vpcs(region):
    return get_vpcs(region)

@app.route('/ecs/subnets/<region>/<vpc_id>', methods=['GET'])
def get_ecs_subnets(region, vpc_id):
    return get_subnets(region, vpc_id)

@app.route("/api/billing", methods=["GET"])
def get_billing_data():
    try:
        region = request.args.get("region")
        start = request.args.get("start", "2025-06-08")
        end = request.args.get("end", "2025-06-10")

        print(f"Region: {region}, Start: {start}, End: {end}")

        ce_client = boto3.client('ce', region_name=region)

        response = ce_client.get_cost_and_usage(
            TimePeriod={"Start": start, "End": end},
            Granularity="DAILY",
            Metrics=["UnblendedCost"],
            GroupBy=[{"Type": "DIMENSION", "Key": "SERVICE"}]
        )

        return jsonify(response)

    except ClientError as e:
        print("AWS ClientError:", str(e))
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        print("General Exception:", str(e))
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/anomaly-summary')
def anomaly_summary():
    ce = boto3.client('ce')
    cad = boto3.client('ce', region_name='us-east-1')

    today = datetime.today()
    start_mtd = today.replace(day=1).strftime('%Y-%m-%d')
    end_today = today.strftime('%Y-%m-%d')

    # Spend MTD
    spend_mtd = ce.get_cost_and_usage(
        TimePeriod={'Start': start_mtd, 'End': end_today},
        Granularity='MONTHLY',
        Metrics=['UnblendedCost']
    )
    mtd_total = float(spend_mtd['ResultsByTime'][0]['Total']['UnblendedCost']['Amount'])

    # Spend Last Month
    last_month_start = (today.replace(day=1) - relativedelta(months=1)).strftime('%Y-%m-%d')
    last_month_end = (today.replace(day=1) - relativedelta(days=1)).strftime('%Y-%m-%d')

    spend_last_month = ce.get_cost_and_usage(
        TimePeriod={'Start': last_month_start, 'End': last_month_end},
        Granularity='MONTHLY',
        Metrics=['UnblendedCost']
    )
    last_total = float(spend_last_month['ResultsByTime'][0]['Total']['UnblendedCost']['Amount'])

    # Change %
    change = ((mtd_total - last_total) / last_total * 100) if last_total > 0 else 0

    # Anomalies
    anomalies = cad.get_anomalies(
        DateInterval={'StartDate': start_mtd, 'EndDate': end_today},
        MaxResults=100
    )
    count = len(anomalies.get('Anomalies', []))
    impact = sum(float(a['Impact']['TotalImpactAmount']) for a in anomalies.get('Anomalies', []))

    return jsonify({
        "anomaly_count": count,
        "impact": impact,
        "total_spend": mtd_total,
        "change_percentage": change
    })


@app.route("/api/download-url", methods=["GET"])
def get_presigned_url():
    bucket_name = 'rapyder-automation-document'  # <-- Replace with your actual bucket name
    object_key = request.args.get('key')

    if not object_key:
        return jsonify({'error': 'Missing S3 object key'}), 400

    try:
        url = s3_client.generate_presigned_url('get_object',
            Params={'Bucket': bucket_name, 'Key': object_key},
            ExpiresIn=30  # Link valid for 1 hour
        )
        return jsonify({'url': url})
    except ClientError as e:
        return jsonify({'error': str(e)}), 500

@app.route('/security/ec2', methods=['GET'])
def ec2_security_checks():
    region = request.args.get('region', 'us-east-1')
    results = {
        "ebs_snapshot_public": "pass",
        "vpc_default_sg": "pass",
        "vpc_default_sg_details": []
    }
    try:
        ec2 = get_ec2_client(region)
        vpcs = ec2.describe_vpcs()['Vpcs']
        vpc_sg_issues = []
        for vpc in vpcs:
            sg = ec2.describe_security_groups(
                Filters=[
                    {'Name': 'vpc-id', 'Values': [vpc['VpcId']]},
                    {'Name': 'group-name', 'Values': ['default']}
                ]
            )['SecurityGroups']
            for group in sg:
                # Check inbound and outbound rules
                if group['IpPermissions'] or group['IpPermissionsEgress']:
                    # Collect all failed rules
                    failed_inbound = []
                    for perm in group['IpPermissions']:
                        failed_inbound.append({
                            "FromPort": perm.get("FromPort"),
                            "ToPort": perm.get("ToPort"),
                            "IpProtocol": perm.get("IpProtocol"),
                            "IpRanges": perm.get("IpRanges"),
                            "Ipv6Ranges": perm.get("Ipv6Ranges"),
                            "UserIdGroupPairs": perm.get("UserIdGroupPairs")
                        })
                    failed_outbound = []
                    for perm in group['IpPermissionsEgress']:
                        failed_outbound.append({
                            "FromPort": perm.get("FromPort"),
                            "ToPort": perm.get("ToPort"),
                            "IpProtocol": perm.get("IpProtocol"),
                            "IpRanges": perm.get("IpRanges"),
                            "Ipv6Ranges": perm.get("Ipv6Ranges"),
                            "UserIdGroupPairs": perm.get("UserIdGroupPairs")
                        })
                    vpc_sg_issues.append({
                        "VpcId": vpc['VpcId'],
                        "GroupId": group['GroupId'],
                        "Region": region,
                        "FailedInboundRules": failed_inbound,
                        "FailedOutboundRules": failed_outbound,
                        "Reason": "Default SG has rules"
                    })
        if vpc_sg_issues:
            results["vpc_default_sg"] = "fail"
            results["vpc_default_sg_details"] = vpc_sg_issues

        # 3. Check EBS encryption by default
        try:
            encryption = ec2.get_ebs_encryption_by_default()
            if not encryption.get('EbsEncryptionByDefault', False):
                results["ebs_default_encryption"] = "fail"
        except Exception:
            results["ebs_default_encryption"] = "fail"

        # 4. Check attached EBS volumes encryption
        instances = ec2.describe_instances()['Reservations']
        unencrypted = False
        for res in instances:
            for inst in res['Instances']:
                for mapping in inst.get('BlockDeviceMappings', []):
                    vol_id = mapping['Ebs']['VolumeId']
                    vol = ec2.describe_volumes(VolumeIds=[vol_id])['Volumes'][0]
                    if not vol.get('Encrypted', False):
                        unencrypted = True
        if unencrypted:
            results["ebs_encrypted"] = "fail"

        # 5. Check VPC flow logs
        vpcs = ec2.describe_vpcs()['Vpcs']
        flow_logs = ec2.describe_flow_logs()['FlowLogs']
        vpc_with_logs = set(f['ResourceId'] for f in flow_logs if f['ResourceType'] == 'VPC')
        for vpc in vpcs:
            if vpc['VpcId'] not in vpc_with_logs:
                results["vpc_flow_logs"] = "fail"

        return jsonify(results)
    except ClientError as e:
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/security/s3', methods=['GET'])
def s3_security_checks():
    region = request.args.get('region', 'us-east-1')
    results = {
        "public_buckets": "pass",
        "unencrypted_buckets": "pass",
        "versioning_enabled": "pass",
        "logging_enabled": "pass"
    }
    try:
        s3 = boto3.client('s3', region_name=region)
        buckets = s3.list_buckets()['Buckets']

        # 1. Check for public buckets
        public_buckets = []
        for bucket in buckets:
            bucket_name = bucket['Name']
            try:
                acl = s3.get_bucket_acl(Bucket=bucket_name)
                for grant in acl['Grants']:
                    grantee = grant.get('Grantee', {})
                    if grantee.get('URI') == 'http://acs.amazonaws.com/groups/global/AllUsers':
                        public_buckets.append(bucket_name)
            except Exception:
                # Skip this bucket if access denied or any error
                continue
        if public_buckets:
            results["public_buckets"] = "fail"

        # 2. Check for unencrypted buckets
        unencrypted_buckets = []
        for bucket in buckets:
            bucket_name = bucket['Name']
            try:
                enc = s3.get_bucket_encryption(Bucket=bucket_name)
                rules = enc['ServerSideEncryptionConfiguration']['Rules']
                if not rules:
                    unencrypted_buckets.append(bucket_name)
            except Exception:
                # Skip this bucket if access denied or any error
                continue
        if unencrypted_buckets:
            results["unencrypted_buckets"] = "fail"

        # 3. Check for versioning
        not_versioned = []
        for bucket in buckets:
            bucket_name = bucket['Name']
            try:
                ver = s3.get_bucket_versioning(Bucket=bucket_name)
                if ver.get('Status') != 'Enabled':
                    not_versioned.append(bucket_name)
            except Exception:
                # Skip this bucket if access denied or any error
                continue
        if not_versioned:
            results["versioning_enabled"] = "fail"

        # 4. Check for logging
        not_logged = []
        for bucket in buckets:
            bucket_name = bucket['Name']
            try:
                log = s3.get_bucket_logging(Bucket=bucket_name)
                if not log.get('LoggingEnabled'):
                    not_logged.append(bucket_name)
            except Exception:
                # Skip this bucket if access denied or any error
                continue
        if not_logged:
            results["logging_enabled"] = "fail"

        return jsonify(results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
# PCI DSS Security Checks:
@app.route('/security/pci', methods=['GET'])
def pci_security_checks():
    """
    Run both EC2 and S3 security checks together for PCI DSS dashboard.
    Returns: { "ec2": {...}, "s3": {...} }
    """
    region = request.args.get('region', 'us-east-1')

    # Call the existing functions and get their JSON data
    with current_app.test_request_context(f'/security/ec2?region={region}'):
        ec2_resp = ec2_security_checks()
    with current_app.test_request_context(f'/security/s3?region={region}'):
        s3_resp = s3_security_checks()

    # If either returns a tuple (response, status), extract response
    ec2_json = ec2_resp[0] if isinstance(ec2_resp, tuple) else ec2_resp
    s3_json = s3_resp[0] if isinstance(s3_resp, tuple) else s3_resp

    return jsonify({
        "ec2": ec2_json.get_json(),
        "s3": s3_json.get_json()
    })

@app.route('/security/foundation', methods=['GET'])
def aws_foundation_checks():
    region = request.args.get('region', 'us-east-1')
    results = {
        "root_mfa_enabled": "unknown",
        "iam_mfa_enabled": "unknown",
        "cloudtrail_enabled": "unknown",
        "password_policy_strong": "unknown",
        "s3_block_public_access": "unknown",
        "billing_alerts_enabled": "unknown"
    }
    try:
        # 1. Root account MFA enabled
        iam = boto3.client('iam')
        try:
            summary = iam.get_account_summary()['SummaryMap']
            mfa_devices = iam.list_mfa_devices(UserName='root')['MFADevices']
            results["root_mfa_enabled"] = "pass" if mfa_devices else "fail"
        except Exception:
            results["root_mfa_enabled"] = "fail"

        # 2. IAM users MFA enabled
        try:
            users = iam.list_users()['Users']
            fail = False
            for user in users:
                mfa = iam.list_mfa_devices(UserName=user['UserName'])['MFADevices']
                if not mfa:
                    fail = True
            results["iam_mfa_enabled"] = "fail" if fail else "pass"
        except Exception:
            results["iam_mfa_enabled"] = "fail"

        # 3. CloudTrail enabled
        try:
            ct = boto3.client('cloudtrail', region_name=region)
            trails = ct.describe_trails()['trailList']
            enabled = any(t.get('HomeRegion') == region and t.get('IsMultiRegionTrail', False) for t in trails)
            results["cloudtrail_enabled"] = "pass" if enabled else "fail"
        except Exception:
            results["cloudtrail_enabled"] = "fail"

        # 4. Password policy strong
        try:
            policy = iam.get_account_password_policy()['PasswordPolicy']
            strong = (
                policy.get('MinimumPasswordLength', 0) >= 8 and
                policy.get('RequireSymbols', False) and
                policy.get('RequireNumbers', False) and
                policy.get('RequireUppercaseCharacters', False) and
                policy.get('RequireLowercaseCharacters', False)
            )
            results["password_policy_strong"] = "pass" if strong else "fail"
        except Exception:
            results["password_policy_strong"] = "fail"

        # 5. S3 block public access
        try:
            s3 = boto3.client('s3control')
            account_id = boto3.client('sts').get_caller_identity()['Account']
            public_access = s3.get_public_access_block(AccountId=account_id)['PublicAccessBlockConfiguration']
            if all(public_access.values()):
                results["s3_block_public_access"] = "pass"
            else:
                results["s3_block_public_access"] = "fail"
        except Exception:
            results["s3_block_public_access"] = "fail"

        # 6. Billing alerts enabled
        try:
            cw = boto3.client('cloudwatch', region_name=region)
            alarms = cw.describe_alarms()['MetricAlarms']
            billing_alarms = [a for a in alarms if 'Billing' in a.get('AlarmName', '')]
            results["billing_alerts_enabled"] = "pass" if billing_alarms else "fail"
        except Exception:
            results["billing_alerts_enabled"] = "fail"

        return jsonify(results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
