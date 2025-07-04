from flask import jsonify, request
import json
import boto3
from botocore.exceptions import ClientError
from datetime import datetime
from dateutil.relativedelta import relativedelta

with open("./db/data.json", "r") as f:
    DATA = json.load(f)

s3_client = boto3.client('s3')

def get_data():
    return jsonify(DATA)

def get_billing_data():
    try:
        region = request.args.get("region")
        start = request.args.get("start", "2025-06-08")
        end = request.args.get("end", "2025-06-10")
        ce_client = boto3.client('ce', region_name=region)
        response = ce_client.get_cost_and_usage(
            TimePeriod={"Start": start, "End": end},
            Granularity="DAILY",
            Metrics=["UnblendedCost"],
            GroupBy=[{"Type": "DIMENSION", "Key": "SERVICE"}]
        )
        return jsonify(response)
    except ClientError as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def anomaly_summary():
    ce = boto3.client('ce')
    cad = boto3.client('ce', region_name='us-east-1')
    today = datetime.today()
    start_mtd = today.replace(day=1).strftime('%Y-%m-%d')
    end_today = today.strftime('%Y-%m-%d')
    spend_mtd = ce.get_cost_and_usage(
        TimePeriod={'Start': start_mtd, 'End': end_today},
        Granularity='MONTHLY',
        Metrics=['UnblendedCost']
    )
    mtd_total = float(spend_mtd['ResultsByTime'][0]['Total']['UnblendedCost']['Amount'])
    last_month_start = (today.replace(day=1) - relativedelta(months=1)).strftime('%Y-%m-%d')
    last_month_end = (today.replace(day=1) - relativedelta(days=1)).strftime('%Y-%m-%d')
    spend_last_month = ce.get_cost_and_usage(
        TimePeriod={'Start': last_month_start, 'End': last_month_end},
        Granularity='MONTHLY',
        Metrics=['UnblendedCost']
    )
    last_total = float(spend_last_month['ResultsByTime'][0]['Total']['UnblendedCost']['Amount'])
    change = ((mtd_total - last_total) / last_total * 100) if last_total > 0 else 0
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

def get_presigned_url():
    bucket_name = 'rapyder-automation-document'
    object_key = request.args.get('key')
    print("Requested S3 key:", repr(object_key))
    if not object_key:
        return jsonify({'error': 'Missing S3 object key'}), 400
    try:
        s3_client.head_object(Bucket=bucket_name, Key=object_key)
    except ClientError as e:
        print("S3 head_object error:", e)
        return jsonify({'error': f'File not found: {object_key}'}), 404
    try:
        url = s3_client.generate_presigned_url('get_object',
            Params={'Bucket': bucket_name, 'Key': object_key},
            ExpiresIn=30
        )
        return jsonify({'url': url})
    except ClientError as e:
        print("S3 ClientError:", e)
        return jsonify({'error': str(e)}), 500

def list_s3_files():
    bucket_name = 'rapyder-automation-document'
    try:
        response = s3_client.list_objects_v2(Bucket=bucket_name)
        print("S3 list_objects_v2 response:", response)
        files = []
        for obj in response.get('Contents', []):
            files.append(obj['Key'])
        return jsonify({'files': files})
    except ClientError as e:
        print("S3 ClientError:", e)
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        print("General Exception:", e)
        return jsonify({'error': str(e)}), 500

def get_ec2_instances(region):
    try:
        ec2 = boto3.client('ec2', region_name=region)
        reservations = ec2.describe_instances()['Reservations']
        instances = []
        for res in reservations:
            for inst in res['Instances']:
                instances.append({
                    'InstanceId': inst.get('InstanceId'),
                    'State': inst.get('State', {}).get('Name'),
                    'Type': inst.get('InstanceType'),
                    'LaunchTime': str(inst.get('LaunchTime'))
                })
        return jsonify({'instances': instances})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_ec2_alarms(region):
    try:
        cw = boto3.client('cloudwatch', region_name=region)
        alarms = cw.describe_alarms()['MetricAlarms']
        return jsonify({'alarms': alarms})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_s3_buckets(region):
    try:
        s3 = boto3.client('s3', region_name=region)
        buckets = s3.list_buckets()['Buckets']
        return jsonify({'buckets': [b['Name'] for b in buckets]})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_security_ec2():
    region = request.args.get('region', 'us-east-1')
    results = {
        "vpc_default_sg": "pass",
        "vpc_default_sg_details": [],
        "ebs_encrypted": "pass",
        "ebs_encrypted_details": [],
        "vpc_flow_logs": "pass",
        "vpc_flow_logs_details": [],
        "ebs_default_encryption": "pass",
        "ebs_default_encryption_details": []
    }
    try:
        ec2 = boto3.client('ec2', region_name=region)
        vpcs = ec2.describe_vpcs()['Vpcs']

        # VPC Default SG
        vpc_sg_issues = []
        for vpc in vpcs:
            sg = ec2.describe_security_groups(
                Filters=[
                    {'Name': 'vpc-id', 'Values': [vpc['VpcId']]},
                    {'Name': 'group-name', 'Values': ['default']}
                ]
            )['SecurityGroups']
            for group in sg:
                if group['IpPermissions'] or group['IpPermissionsEgress']:
                    vpc_sg_issues.append({
                        "VpcId": vpc['VpcId'],
                        "GroupId": group['GroupId'],
                        "Reason": "Default SG has rules"
                    })
        if vpc_sg_issues:
            results["vpc_default_sg"] = "fail"
            results["vpc_default_sg_details"] = vpc_sg_issues

        # EBS Default Encryption
        try:
            encryption = ec2.get_ebs_encryption_by_default()
            if not encryption.get('EbsEncryptionByDefault', False):
                results["ebs_default_encryption"] = "fail"
                results["ebs_default_encryption_details"] = [{"reason": "EBS default encryption is not enabled"}]
        except Exception:
            results["ebs_default_encryption"] = "fail"
            results["ebs_default_encryption_details"] = [{"reason": "Could not check EBS default encryption"}]

        # Attached EBS Volumes Encryption
        instances = ec2.describe_instances()['Reservations']
        unencrypted = []
        for res in instances:
            for inst in res['Instances']:
                for mapping in inst.get('BlockDeviceMappings', []):
                    vol_id = mapping['Ebs']['VolumeId']
                    vol = ec2.describe_volumes(VolumeIds=[vol_id])['Volumes'][0]
                    if not vol.get('Encrypted', False):
                        unencrypted.append({
                            "volumeId": vol_id,
                            "instanceId": inst.get('InstanceId'),
                            "reason": "Volume not encrypted"
                        })
        if unencrypted:
            results["ebs_encrypted"] = "fail"
            results["ebs_encrypted_details"] = unencrypted

        # VPC Flow Logs
        flow_logs = ec2.describe_flow_logs()['FlowLogs']
        vpc_with_logs = set(f['ResourceId'] for f in flow_logs if f['ResourceType'] == 'VPC')
        vpc_flow_logs_issues = []
        for vpc in vpcs:
            if vpc['VpcId'] not in vpc_with_logs:
                vpc_flow_logs_issues.append({
                    "VpcId": vpc['VpcId'],
                    "reason": "Flow logs not enabled"
                })
        if vpc_flow_logs_issues:
            results["vpc_flow_logs"] = "fail"
            results["vpc_flow_logs_details"] = vpc_flow_logs_issues

        return jsonify(results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_security_s3():
    region = request.args.get('region', 'us-east-1')
    results = {
        "public_buckets": "pass",
        "public_buckets_details": [],
        "unencrypted_buckets": "pass",
        "unencrypted_buckets_details": [],
        "versioning_enabled": "pass",
        "versioning_enabled_details": [],
        "logging_enabled": "pass",
        "logging_enabled_details": []
    }
    try:
        s3 = boto3.client('s3', region_name=region)
        buckets = s3.list_buckets()['Buckets']

        # Public buckets
        public_buckets = []
        for bucket in buckets:
            bucket_name = bucket['Name']
            try:
                acl = s3.get_bucket_acl(Bucket=bucket_name)
                for grant in acl['Grants']:
                    grantee = grant.get('Grantee', {})
                    if grantee.get('URI') == 'http://acs.amazonaws.com/groups/global/AllUsers':
                        public_buckets.append({"bucket": bucket_name, "reason": "Bucket is public"})
            except Exception:
                continue
        if public_buckets:
            results["public_buckets"] = "fail"
            results["public_buckets_details"] = public_buckets

        # Unencrypted buckets
        unencrypted_buckets = []
        for bucket in buckets:
            bucket_name = bucket['Name']
            try:
                enc = s3.get_bucket_encryption(Bucket=bucket_name)
                rules = enc['ServerSideEncryptionConfiguration']['Rules']
                if not rules:
                    unencrypted_buckets.append({"bucket": bucket_name, "reason": "No encryption rule"})
            except Exception:
                unencrypted_buckets.append({"bucket": bucket_name, "reason": "No encryption or error"})
        if unencrypted_buckets:
            results["unencrypted_buckets"] = "fail"
            results["unencrypted_buckets_details"] = unencrypted_buckets

        # Versioning
        not_versioned = []
        for bucket in buckets:
            bucket_name = bucket['Name']
            try:
                ver = s3.get_bucket_versioning(Bucket=bucket_name)
                if ver.get('Status') != 'Enabled':
                    not_versioned.append({"bucket": bucket_name, "reason": "Versioning not enabled"})
            except Exception:
                not_versioned.append({"bucket": bucket_name, "reason": "Could not check versioning"})
        if not_versioned:
            results["versioning_enabled"] = "fail"
            results["versioning_enabled_details"] = not_versioned

        # Logging
        not_logged = []
        for bucket in buckets:
            bucket_name = bucket['Name']
            try:
                log = s3.get_bucket_logging(Bucket=bucket_name)
                if not log.get('LoggingEnabled'):
                    not_logged.append({"bucket": bucket_name, "reason": "Logging not enabled"})
            except Exception:
                not_logged.append({"bucket": bucket_name, "reason": "Could not check logging"})
        if not_logged:
            results["logging_enabled"] = "fail"
            results["logging_enabled_details"] = not_logged

        return jsonify(results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    


def get_foundation_checks():
    region = request.args.get('region', 'us-east-1')
    results = {
        "root_mfa_enabled": "unknown",
        "root_mfa_enabled_details": [],
        "iam_mfa_enabled": "unknown",
        "iam_mfa_enabled_details": [],
        "cloudtrail_enabled": "unknown",
        "cloudtrail_enabled_details": [],
        "password_policy_strong": "unknown",
        "password_policy_strong_details": [],
        "s3_block_public_access": "unknown",
        "s3_block_public_access_details": [],
        "billing_alerts_enabled": "unknown",
        "billing_alerts_enabled_details": []
    }
    try:
        # Root account MFA enabled
        iam = boto3.client('iam')
        try:
            mfa_devices = iam.list_mfa_devices(UserName='root')['MFADevices']
            if mfa_devices:
                results["root_mfa_enabled"] = "pass"
            else:
                results["root_mfa_enabled"] = "fail"
                results["root_mfa_enabled_details"] = [{"reason": "Root account does not have MFA enabled"}]
        except Exception as e:
            results["root_mfa_enabled"] = "fail"
            results["root_mfa_enabled_details"] = [{"reason": f"Error: {str(e)}"}]

        # IAM users MFA enabled
        try:
            users = iam.list_users()['Users']
            fail = False
            no_mfa_users = []
            for user in users:
                mfa = iam.list_mfa_devices(UserName=user['UserName'])['MFADevices']
                if not mfa:
                    fail = True
                    no_mfa_users.append({"user": user['UserName'], "reason": "No MFA device"})
            if fail:
                results["iam_mfa_enabled"] = "fail"
                results["iam_mfa_enabled_details"] = no_mfa_users
            else:
                results["iam_mfa_enabled"] = "pass"
        except Exception as e:
            results["iam_mfa_enabled"] = "fail"
            results["iam_mfa_enabled_details"] = [{"reason": f"Error: {str(e)}"}]

        # CloudTrail enabled
        try:
            ct = boto3.client('cloudtrail', region_name=region)
            trails = ct.describe_trails()['trailList']
            enabled = any(t.get('HomeRegion') == region and t.get('IsMultiRegionTrail', False) for t in trails)
            if enabled:
                results["cloudtrail_enabled"] = "pass"
            else:
                results["cloudtrail_enabled"] = "fail"
                results["cloudtrail_enabled_details"] = [{"reason": "CloudTrail is not enabled in this region"}]
        except Exception as e:
            results["cloudtrail_enabled"] = "fail"
            results["cloudtrail_enabled_details"] = [{"reason": f"Error: {str(e)}"}]

        # Password policy strong
        try:
            policy = iam.get_account_password_policy()['PasswordPolicy']
            strong = (
                policy.get('MinimumPasswordLength', 0) >= 8 and
                policy.get('RequireSymbols', False) and
                policy.get('RequireNumbers', False) and
                policy.get('RequireUppercaseCharacters', False) and
                policy.get('RequireLowercaseCharacters', False)
            )
            if strong:
                results["password_policy_strong"] = "pass"
            else:
                results["password_policy_strong"] = "fail"
                results["password_policy_strong_details"] = [{"reason": "Password policy is not strong"}]
        except Exception as e:
            results["password_policy_strong"] = "fail"
            results["password_policy_strong_details"] = [{"reason": f"Error: {str(e)}"}]

        # S3 block public access
        try:
            s3 = boto3.client('s3control')
            account_id = boto3.client('sts').get_caller_identity()['Account']
            public_access = s3.get_public_access_block(AccountId=account_id)['PublicAccessBlockConfiguration']
            if all(public_access.values()):
                results["s3_block_public_access"] = "pass"
            else:
                results["s3_block_public_access"] = "fail"
                results["s3_block_public_access_details"] = [{"reason": "S3 public access block is not fully enabled"}]
        except Exception as e:
            results["s3_block_public_access"] = "fail"
            results["s3_block_public_access_details"] = [{"reason": f"Error: {str(e)}"}]

        # Billing alerts enabled
        try:
            cw = boto3.client('cloudwatch', region_name=region)
            alarms = cw.describe_alarms()['MetricAlarms']
            billing_alarms = [a for a in alarms if 'Billing' in a.get('AlarmName', '')]
            if billing_alarms:
                results["billing_alerts_enabled"] = "pass"
            else:
                results["billing_alerts_enabled"] = "fail"
                results["billing_alerts_enabled_details"] = [{"reason": "No billing alert alarms found"}]
        except Exception as e:
            results["billing_alerts_enabled"] = "fail"
            results["billing_alerts_enabled_details"] = [{"reason": f"Error: {str(e)}"}]

        return jsonify(results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_ec2_iam_profiles(region):
    try:
        ec2 = boto3.client('ec2', region_name=region)
        profiles = ec2.describe_iam_instance_profile_associations()
        return jsonify({'iam_profiles': profiles.get('IamInstanceProfileAssociations', [])})
    except Exception as e:
        print("S3 check failed:", e)
        return jsonify({'error': str(e)}), 500
