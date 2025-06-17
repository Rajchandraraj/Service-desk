import boto3

def get_ec2_client(region):
    return boto3.client('ec2', region_name=region)

def get_cloudwatch_client(region):
    return boto3.client('cloudwatch', region_name=region)