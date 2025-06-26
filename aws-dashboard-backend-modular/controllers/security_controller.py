from flask import jsonify, request
import boto3
from botocore.exceptions import ClientError
def ec2_security_checks():
    region = request.args.get('region')
    results = {
        "ebs_snapshot_public": "pass",
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

        # --- VPC Default SG ---
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

        # --- EBS Default Encryption ---
        try:
            encryption = ec2.get_ebs_encryption_by_default()
            if not encryption.get('EbsEncryptionByDefault', False):
                results["ebs_default_encryption"] = "fail"
                results["ebs_default_encryption_details"] = [{"reason": "EBS default encryption is not enabled"}]
            else:
                results["ebs_default_encryption_details"] = []
        except Exception:
            results["ebs_default_encryption"] = "fail"
            results["ebs_default_encryption_details"] = [{"reason": "Could not check EBS default encryption"}]

        # --- Attached EBS Volumes Encryption ---
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
                            "encrypted": vol.get('Encrypted', False),
                            "reason": "Volume not encrypted"
                        })
        if unencrypted:
            results["ebs_encrypted"] = "fail"
            results["ebs_encrypted_details"] = unencrypted
        else:
            results["ebs_encrypted_details"] = []

        # --- VPC Flow Logs ---
        vpcs = ec2.describe_vpcs()['Vpcs']
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
        else:
            results["vpc_flow_logs_details"] = []

        return jsonify(results)
    except ClientError as e:
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def s3_security_checks():
    region = request.args.get('region')
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

        # 1. Check for public buckets
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

        # 2. Check for unencrypted buckets
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

        # 3. Check for versioning
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

        # 4. Check for logging
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

def pci_security_checks():
    region = request.args.get('region')
    with current_app.test_request_context(f'/security/ec2?region={region}'):
        ec2_resp = ec2_security_checks()
    with current_app.test_request_context(f'/security/s3?region={region}'):
        s3_resp = s3_security_checks()
    ec2_json = ec2_resp[0] if isinstance(ec2_resp, tuple) else ec2_resp
    s3_json = s3_resp[0] if isinstance(s3_resp, tuple) else s3_resp
    return jsonify({
        "ec2": ec2_json.get_json(),
        "s3": s3_json.get_json()
    })

def aws_foundation_checks():
    region = request.args.get('region')
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
        # 1. Root account MFA enabled
        iam = boto3.client('iam')
        try:
            summary = iam.get_account_summary()['SummaryMap']
            mfa_devices = iam.list_mfa_devices(UserName='root')['MFADevices']
            if mfa_devices:
                results["root_mfa_enabled"] = "pass"
                results["root_mfa_enabled_details"] = []
            else:
                results["root_mfa_enabled"] = "fail"
                results["root_mfa_enabled_details"] = [{"reason": "Root account does not have MFA enabled"}]
        except Exception as e:
            results["root_mfa_enabled"] = "fail"
            results["root_mfa_enabled_details"] = [{"reason": f"Error: {str(e)}"}]

        # 2. IAM users MFA enabled
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
                results["iam_mfa_enabled_details"] = []
        except Exception as e:
            results["iam_mfa_enabled"] = "fail"
            results["iam_mfa_enabled_details"] = [{"reason": f"Error: {str(e)}"}]

        # 3. CloudTrail enabled
        try:
            ct = boto3.client('cloudtrail', region_name=region)
            trails = ct.describe_trails()['trailList']
            enabled = any(t.get('HomeRegion') == region and t.get('IsMultiRegionTrail', False) for t in trails)
            if enabled:
                results["cloudtrail_enabled"] = "pass"
                results["cloudtrail_enabled_details"] = []
            else:
                results["cloudtrail_enabled"] = "fail"
                results["cloudtrail_enabled_details"] = [{"reason": "CloudTrail is not enabled in this region"}]
        except Exception as e:
            results["cloudtrail_enabled"] = "fail"
            results["cloudtrail_enabled_details"] = [{"reason": f"Error: {str(e)}"}]

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
            if strong:
                results["password_policy_strong"] = "pass"
                results["password_policy_strong_details"] = []
            else:
                results["password_policy_strong"] = "fail"
                results["password_policy_strong_details"] = [{"reason": "Password policy is not strong"}]
        except Exception as e:
            results["password_policy_strong"] = "fail"
            results["password_policy_strong_details"] = [{"reason": f"Error: {str(e)}"}]

        # 5. S3 block public access
        try:
            s3 = boto3.client('s3control')
            account_id = boto3.client('sts').get_caller_identity()['Account']
            public_access = s3.get_public_access_block(AccountId=account_id)['PublicAccessBlockConfiguration']
            if all(public_access.values()):
                results["s3_block_public_access"] = "pass"
                results["s3_block_public_access_details"] = []
            else:
                results["s3_block_public_access"] = "fail"
                results["s3_block_public_access_details"] = [{"reason": "S3 public access block is not fully enabled"}]
        except Exception as e:
            results["s3_block_public_access"] = "fail"
            results["s3_block_public_access_details"] = [{"reason": f"Error: {str(e)}"}]

        # 6. Billing alerts enabled
        try:
            cw = boto3.client('cloudwatch', region_name=region)
            alarms = cw.describe_alarms()['MetricAlarms']
            billing_alarms = [a for a in alarms if 'Billing' in a.get('AlarmName', '')]
            if billing_alarms:
                results["billing_alerts_enabled"] = "pass"
                results["billing_alerts_enabled_details"] = []
            else:
                results["billing_alerts_enabled"] = "fail"
                results["billing_alerts_enabled_details"] = [{"reason": "No billing alert alarms found"}]
        except Exception as e:
            results["billing_alerts_enabled"] = "fail"
            results["billing_alerts_enabled_details"] = [{"reason": f"Error: {str(e)}"}]

        return jsonify(results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

