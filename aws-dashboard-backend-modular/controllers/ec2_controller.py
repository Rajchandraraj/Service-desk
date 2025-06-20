from flask import jsonify, request
import boto3
import datetime
from botocore.exceptions import ClientError
import logging
from utils.aws_clients import get_ec2_client, get_cloudwatch_client

logger = logging.getLogger(__name__)

def health_check():
    try:
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

def check_ansible_api():
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

def list_instances(region):
    ec2 = get_ec2_client(region)
    instances = ec2.describe_instances()
    output = []
    for res in instances['Reservations']:
        for inst in res['Instances']:
            cpu = None
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

def terminate_instance(region, instance_id):
    ec2 = get_ec2_client(region)
    ec2.terminate_instances(InstanceIds=[instance_id])
    return jsonify({'status': 'success', 'message': f'Terminated {instance_id}'})

def start_instance(region, instance_id):
    ec2 = get_ec2_client(region)
    ec2.start_instances(InstanceIds=[instance_id])
    return jsonify({'status': 'success', 'message': f'Started {instance_id}'})

def stop_instance(region, instance_id):
    ec2 = get_ec2_client(region)
    ec2.stop_instances(InstanceIds=[instance_id])
    return jsonify({'status': 'success', 'message': f'Stopped {instance_id}'})

def get_alarms(region):
    cw = boto3.client('cloudwatch', region_name=region)
    alarms = cw.describe_alarms(StateValue='ALARM')['MetricAlarms']
    alarm_list = [
        {
            "name": alarm.get("AlarmName", ""),
            "metric": alarm.get("MetricName", ""),
            "dimensions": alarm.get("Dimensions", []),
            "region": region,
            "state": alarm.get("StateValue", ""),
            "reason": alarm.get("StateReason", ""),
            "lastUpdated": str(alarm.get("StateUpdatedTimestamp", "")),
        }
        for alarm in alarms
    ]
    return jsonify(alarm_list)

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
        vpc_response = ec2.create_vpc(CidrBlock=cidr_block)
        vpc_id = vpc_response['Vpc']['VpcId']
        ec2.create_tags(Resources=[vpc_id], Tags=[{'Key': 'Name', 'Value': name}])
        subnet_id = None
        if subnet_cidr:
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
            ec2.create_tags(Resources=[subnet_id], Tags=[{'Key': 'Name', 'Value': f"{name}-subnet"}])
        return jsonify({
            'status': 'success',
            'vpc_id': vpc_id,
            'subnet_id': subnet_id
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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

def get_key_pairs(region):
    ec2 = get_ec2_client(region)
    try:
        keys = ec2.describe_key_pairs()
        return jsonify([{'name': kp['KeyName']} for kp in keys['KeyPairs']])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_iam_instance_profiles(region):
    iam = boto3.client('iam')
    try:
        profiles = iam.list_instance_profiles()
        return jsonify([{'name': p['InstanceProfileName']} for p in profiles['InstanceProfiles']])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_instance_details(region, instance_id):
    try:
        ec2 = get_ec2_client(region)
        response = ec2.describe_instances(InstanceIds=[instance_id])
        if not response['Reservations']:
            return jsonify({'error': 'Instance not found'}), 404
        inst = response['Reservations'][0]['Instances'][0]
        name = next((tag['Value'] for tag in inst.get('Tags', []) if tag['Key'] == 'Name'), None)
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

def get_instance_private_ip(region, instance_id):
    ec2 = get_ec2_client(region)
    response = ec2.describe_instances(InstanceIds=[instance_id])
    print("DEBUG INSTANCE:", response['Reservations'][0]['Instances'][0])
    inst = response['Reservations'][0]['Instances'][0]
    return inst.get('PrivateIpAddress')

def get_installation_info(region, instance_id):
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
        ready_for_installation = (
            state == 'running' and 
            private_ip is not None
        )
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
            'recommended_target_ip': private_ip,
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

def get_installation_ready_instances(region):
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
                if private_ip and platform != 'windows':
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

def list_regions():
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

def create_ecs():
    data = request.json
    region = data.get('region')
    cluster_name = data.get('clusterName')
    launch_type = data.get('launchType')
    vpc_id = data.get('vpcId')
    subnet_id = data.get('subnetId')
    service_name = data.get('serviceName')
    task_def_name = data.get('taskDefName')
    task_def_version = data.get('taskDefVersion')
    container_name = data.get('containerName')
    ecs = boto3.client('ecs', region_name=region)
    ec2 = boto3.client('ec2', region_name=region)
    try:
        existing_clusters = ecs.list_clusters()['clusterArns']
        if not any(cluster_name in arn for arn in existing_clusters):
            ecs.create_cluster(clusterName=cluster_name)
        task_def_response = ecs.register_task_definition(
            family=task_def_name,
            requiresCompatibilities=[launch_type],
            cpu='256',
            memory='512',
            networkMode='awsvpc',
            containerDefinitions=[
                {
                    'name': container_name,
                    'image': 'amazon/amazon-ecs-sample',
                    'portMappings': [
                        {'containerPort': 80, 'hostPort': 80, 'protocol': 'tcp'}
                    ],
                    'essential': True,
                }
            ],
            executionRoleArn='arn:aws:iam::YOUR_ACCOUNT_ID:role/ecsTaskExecutionRole'
        )
        task_definition = f"{task_def_name}:{task_def_response['taskDefinition']['revision']}"
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
                    'securityGroups': []
                }
            },
        )
        return jsonify({'status': 'success', 'message': f'ECS service {service_name} created'})
    except ClientError as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

def get_ecs_vpcs(region):
    return get_vpcs(region)

def get_ecs_subnets(region, vpc_id):
    return get_subnets(region, vpc_id)