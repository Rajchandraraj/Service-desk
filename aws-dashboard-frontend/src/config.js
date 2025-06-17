import axios from 'axios';

export const API_BASE_URL = "http://localhost:5000";
export const ANSIBLE_API_BASE = "http://43.204.109.213:8000";

// EC2 Instances
fetch(`${API_BASE_URL}/ec2/instances/us-east-1`)
  .then(response => response.json())
  .then(data => console.log('EC2 Instances:', data))
  .catch(error => console.error('Error fetching EC2 instances:', error));

// EC2 Alarms
fetch(`${API_BASE_URL}/ec2/alarms/us-east-1`)
  .then(response => response.json())
  .then(data => console.log('EC2 Alarms:', data))
  .catch(error => console.error('Error fetching EC2 alarms:', error));

// Utility Data
fetch(`${API_BASE_URL}/utility/api/data`)
  .then(response => response.json())
  .then(data => console.log('Utility Data:', data))
  .catch(error => console.error('Error fetching utility data:', error));

// Billing Information
fetch(`${API_BASE_URL}/utility/api/billing?start=2025-06-01&end=2025-06-05&region=us-east-1`)
  .then(response => response.json())
  .then(data => console.log('Billing Data:', data))
  .catch(error => console.error('Error fetching billing data:', error));

// Anomaly Summary
fetch(`${API_BASE_URL}/utility/api/anomaly-summary`)
  .then(response => response.json())
  .then(data => console.log('Anomaly Summary:', data))
  .catch(error => console.error('Error fetching anomaly summary:', error));

// Security EC2 Check
fetch(`${API_BASE_URL}/security/ec2?region=us-east-1`)
  .then(response => response.json())
  .then(data => console.log('Security EC2:', data))
  .catch(error => console.error('Error fetching security EC2:', error));

// S3 Buckets
fetch(`${API_BASE_URL}/s3/buckets/us-east-1`)
  .then(response => response.json())
  .then(data => console.log('S3 Buckets:', data))
  .catch(error => console.error('Error fetching S3 buckets:', error));

// Example with axios for EC2 Instances
axios.get(`${API_BASE_URL}/ec2/instances/us-east-1`)
  .then(response => console.log('EC2 Instances (axios):', response.data))
  .catch(error => console.error('Error fetching EC2 instances (axios):', error));