import os
from flask import request, jsonify
import boto3

def create_stack():
    data = request.get_json()
    stack_name = data.get('stackName')
    template_url = data.get('templateURL')
    tags = data.get('tags', [])
    permissions = data.get('permissions')

    if not stack_name or not template_url or not permissions:
        return jsonify({'error': 'Missing required fields'}), 400

    cf = boto3.client('cloudformation', region_name=os.environ.get('AWS_REGION', 'us-east-1'))

    try:
        response = cf.create_stack(
            StackName=stack_name,
            TemplateURL=template_url,
            Capabilities=[permissions],
            Tags=[{'Key': t['key'], 'Value': t['value']} for t in tags if t['key'] and t['value']]
        )
        return jsonify({'stackId': response['StackId']})
    except Exception as e:
        return jsonify({'error': str(e)}), 500