from flask import Blueprint, jsonify
from controllers.ec2_controller import list_instances, get_alarms, get_instance_metrics

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
def installation_info(region, instance_id):
    return get_installation_info(region, instance_id)

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