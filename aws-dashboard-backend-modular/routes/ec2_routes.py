from flask import Blueprint, jsonify
from controllers.ec2_controller import (
    list_instances, get_alarms, get_instance_metrics,
    get_instance_details, get_instance_private_ip,
    resize_instance, terminate_instance, start_instance, stop_instance,
    get_vpcs, create_ec2, create_vpc, get_subnets, get_security_groups,
    get_key_pairs, get_iam_instance_profiles, get_installation_ready_instances,
    list_regions, create_ecs, get_ecs_vpcs, get_ecs_subnets
)
import boto3

ec2_bp = Blueprint('ec2', __name__)

@ec2_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok"})

@ec2_bp.route('/ansible-api/health', methods=['GET'])
def check_ansible_api():
    return jsonify({"status": "ok"})

@ec2_bp.route('/instances/<region>', methods=['GET'])
def instances(region):
    return list_instances(region)

@ec2_bp.route('/instance/<region>/<instance_id>/resize', methods=['POST'])
def resize(region, instance_id):
    return resize_instance(region, instance_id)

@ec2_bp.route('/instance/<region>/<instance_id>/terminate', methods=['POST'])
def terminate(region, instance_id):
    return terminate_instance(region, instance_id)

@ec2_bp.route('/instance/<region>/<instance_id>/start', methods=['POST'])
def start(region, instance_id):
    return start_instance(region, instance_id)

@ec2_bp.route('/instance/<region>/<instance_id>/stop', methods=['POST'])
def stop(region, instance_id):
    return stop_instance(region, instance_id)

@ec2_bp.route('/alarms/<region>', methods=['GET'])
def alarms(region):
    return get_alarms(region)

@ec2_bp.route('/ec2/vpcs/<region>', methods=['GET'])
def vpcs(region):
    return get_vpcs(region)

@ec2_bp.route('/create-ec2', methods=['POST'])
def create_ec2_route():
    return create_ec2()

@ec2_bp.route('/create-vpc', methods=['POST'])
def create_vpc_route():
    return create_vpc()

@ec2_bp.route('/ec2/subnets/<region>/<vpc_id>', methods=['GET'])
def subnets(region, vpc_id):
    return get_subnets(region, vpc_id)

@ec2_bp.route('/ec2/security-groups/<region>/<vpc_id>', methods=['GET'])
def security_groups(region, vpc_id):
    return get_security_groups(region, vpc_id)

@ec2_bp.route('/ec2/key-pairs/<region>', methods=['GET'])
def key_pairs(region):
    return get_key_pairs(region)

@ec2_bp.route('/ec2/iam-profiles/<region>', methods=['GET'])
def iam_profiles(region):
    return get_iam_instance_profiles(region)

@ec2_bp.route('/instance/<region>/<instance_id>', methods=['GET'])
def instance_details(region, instance_id):
    return get_instance_details(region, instance_id)

@ec2_bp.route('/instance/<region>/<instance_id>/private-ip', methods=['GET'])
def instance_private_ip(region, instance_id):
    return get_instance_private_ip(region, instance_id)

@ec2_bp.route('/instance/<region>/<instance_id>/installation-info', methods=['GET'])
def get_instance_installation_info(region, instance_id):
    try:
        print(f"Getting private IP for region={region}, instance_id={instance_id}")
        # Agar function Flask Response deta hai, toh uska data nikaalo
        resp = get_instance_private_ip(region, instance_id)
        if hasattr(resp, 'get_json'):
            data = resp.get_json()
            private_ip = data.get("private_ip")
        else:
            private_ip = resp
        print(f"Private IP found: {private_ip}")
        if not private_ip:
            return jsonify({"error": "Private IP not found"}), 404
        return jsonify({"private_ip": private_ip})
    except Exception as e:
        print("Error in get_instance_installation_info:", str(e))
        return jsonify({"error": str(e)}), 500

@ec2_bp.route('/instances/<region>/installation-ready', methods=['GET'])
def installation_ready(region):
    return get_installation_ready_instances(region)

@ec2_bp.route('/regions', methods=['GET'])
def regions():
    return list_regions()

@ec2_bp.route('/metrics/<region>/<instance_id>', methods=['GET'])
def instance_metrics(region, instance_id):
    return get_instance_metrics(region, instance_id)

@ec2_bp.route('/create-ecs', methods=['POST'])
def create_ecs_route():
    return create_ecs()

@ec2_bp.route('/ecs/vpcs/<region>', methods=['GET'])
def ecs_vpcs(region):
    return get_ecs_vpcs(region)

@ec2_bp.route('/ecs/subnets/<region>/<vpc_id>', methods=['GET'])
def ecs_subnets(region, vpc_id):
    return get_ecs_subnets(region, vpc_id)

@ec2_bp.route('/ec2/alarms/<region>', methods=['GET'])
def get_ec2_alarms(region):
    return get_alarms(region)

def serialize_instance(instance):
    # instance is boto3 resource or dict
    return {
        "id": instance["InstanceId"],
        "name": next((tag["Value"] for tag in instance.get("Tags", []) if tag["Key"] == "Name"), ""),
        "type": instance.get("InstanceType"),
        "az": instance.get("Placement", {}).get("AvailabilityZone"),
        "state": instance.get("State", {}).get("Name"),
        "private_ip": instance.get("PrivateIpAddress", "N/A"),
        "public_ip": instance.get("PublicIpAddress", "N/A"),
        "cpu": instance.get("CpuOptions", {}).get("CoreCount", 0),
        "role": instance.get("IamInstanceProfile", {}).get("Arn", ""),
        "volumes": [vol["Ebs"]["VolumeId"] for vol in instance.get("BlockDeviceMappings", []) if "Ebs" in vol],
        "tags": instance.get("Tags", [])
    }

@ec2_bp.route('/instances/<region>', methods=['GET'])
def list_instances(region):
    try:
        ec2 = boto3.client('ec2', region_name=region)
        reservations = ec2.describe_instances()["Reservations"]
        instances = []
        for reservation in reservations:
            for instance in reservation["Instances"]:
                instances.append(instance)
        # For each instance in reservations, call serialize_instance
        result = [serialize_instance(i) for i in instances]
        return jsonify(result)
    except Exception as e:
        print("Error in list_instances:", str(e))
        return jsonify({"error": str(e)}), 500