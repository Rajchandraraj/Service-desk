import boto3
import os
import uuid
from datetime import datetime
from flask import jsonify
FRONTEND_ORIGIN = os.environ.get('FRONTEND_ORIGIN', 'http://localhost:3000')

DYNAMODB_TABLE = os.environ.get('DYNAMODB_APPROVAL_TABLE', 'approval_requests')
dynamodb = boto3.resource('dynamodb', region_name=os.environ.get('AWS_DEFAULT_REGION', 'ap-south-1'))
table = dynamodb.Table(DYNAMODB_TABLE)

SES_CLIENT = boto3.client('ses', region_name=os.environ.get('AWS_DEFAULT_REGION', 'ap-south-1'))
FROM_EMAIL = os.environ.get('SES_FROM_EMAIL', 'nitesh.kumar@rapyder.com')

def send_approval_email(to_email, request_id, details):
    approval_url = f"{FRONTEND_ORIGIN}/approval/approve/{request_id}"
    reject_url = f"{FRONTEND_ORIGIN}/approval/reject/{request_id}"
    subject = f"Approval Request Submitted: {request_id}"
    body = f"""Ticket ID: {details.get('ticketId')}

Request ID: {request_id}
Priority: {details.get('priority')}
Reason: {details.get('reason')}

To approve this request, click the link below:
{approval_url}

To reject this request, click the link below:
{reject_url}
"""
    SES_CLIENT.send_email(
        Source=FROM_EMAIL,
        Destination={'ToAddresses': [to_email]},
        Message={
            'Subject': {'Data': subject},
            'Body': {'Text': {'Data': body}}
        }
    )

def create_request(data):
    # Only block if a pending request exists for this instance_id
    existing_pending = table.scan(
         FilterExpression="instance_id = :iid AND #r = :region AND #s = :pending",
         ExpressionAttributeNames={'#s': 'status','#r': 'region'},
         ExpressionAttributeValues={
         ':iid': data['instance_id'],
         ':region': data['region'],
         ':pending': 'pending'
    }
    )
    if existing_pending.get('Items'):
        return jsonify({
            'error': True,
            'message': "🚦 Approval already requested! Please wait for L2 engineer to approve or reject your previous request before submitting again."
        }), 400

    request_id = str(uuid.uuid4())
    item = {
        'request_id': request_id,
        'action': data['action'],
        'instance_id': data['instance_id'],
        'requested_by': data['requested_by'],
        'region': data['region'],
        'status': 'pending',
        'details': data.get('details', {}),
        'timestamp': datetime.utcnow().isoformat()
    }
    table.put_item(Item=item)
    l2_email = data.get('l2_email', 'nitesh.kumar@rapyder.com')
    send_approval_email(l2_email, request_id, item['details'])
    return jsonify({'message': 'Request submitted', 'request_id': request_id})
def list_pending():
    resp = table.scan(
        FilterExpression="#s = :s",
        ExpressionAttributeNames={'#s': 'status'},
        ExpressionAttributeValues={":s": "pending"}
    )
    return jsonify({'requests': resp.get('Items', [])})

def approve_request(request_id):
    try:
        # Get the item from approval_requests
        resp = table.get_item(Key={'request_id': request_id})
        item = resp.get('Item')
        if not item:
            return jsonify({"message": "Request not found or already processed."}), 404

        # --- Place any downstream approval logic here ---
        # For example, call AWS APIs, send notifications, etc.
        # If any of these fail, the DB will not be updated.

        # If everything above succeeds, update status and move to approved table
        item['status'] = 'approved'
        approved_table = dynamodb.Table('requests_approved')
        approved_table.put_item(Item=item)

        table.delete_item(Key={'request_id': request_id})

        return jsonify({"message": "Request approved!"}), 200
    except Exception as e:
        return jsonify({'error': f'Failed to approve request: {str(e)}'}), 500

def reject_request(request_id):
    table.update_item(
        Key={'request_id': request_id},
        UpdateExpression="SET #s = :a",
        ExpressionAttributeNames={'#s': 'status'},
        ExpressionAttributeValues={':a': 'rejected'}
    )
    return jsonify({'message': 'Request rejected'})

def list_approved():
    approved_table = dynamodb.Table('requests_approved')
    resp = approved_table.scan()
    return jsonify({'requests': resp.get('Items', [])})

def pop_approved(request_id):
    approved_table = dynamodb.Table('requests_approved')
    approved_table.delete_item(Key={'request_id': request_id})
    return jsonify({'message': 'Approved request removed'})