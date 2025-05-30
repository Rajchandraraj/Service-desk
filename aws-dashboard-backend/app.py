from flask import Flask, jsonify, request
from flask_cors import CORS
import boto3

app = Flask(__name__)
CORS(app)

# Assumes default AWS creds or IAM role
def get_ec2_client(account_region='us-east-1'):
    return boto3.client('ec2', region_name=account_region)

@app.route('/instances/<region>', methods=['GET'])
def list_instances(region):
    ec2 = get_ec2_client(region)
    instances = ec2.describe_instances()
    output = []

    for res in instances['Reservations']:
        for inst in res['Instances']:
            output.append({
                'id': inst['InstanceId'],
                'type': inst['InstanceType'],
                'state': inst['State']['Name'],
                'az': inst['Placement']['AvailabilityZone'],
                'volumes': [v['Ebs']['VolumeId'] for v in inst.get('BlockDeviceMappings', [])],
                'tags': inst.get('Tags', []),
                'role': inst.get('IamInstanceProfile', {}).get('Arn', 'None'),
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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
