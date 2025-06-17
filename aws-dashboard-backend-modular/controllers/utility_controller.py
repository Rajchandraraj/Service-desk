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