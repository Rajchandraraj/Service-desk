from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import boto3
from botocore.exceptions import ClientError

app = Flask(__name__)
CORS(app)  # Allow CORS so React can access the backend

# Load mock data
with open("./db/data.json", "r") as f:
    DATA = json.load(f)

# AWS S3 setup (use IAM role or env vars in production)
s3_client = boto3.client('s3')

@app.route("/api/data", methods=["GET"])
def get_data():
    return jsonify(DATA)

@app.route("/api/download-url", methods=["GET"])
def get_presigned_url():
    bucket_name = 's3-event-test-neel'  # <-- Replace with your actual bucket name
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

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5003)

