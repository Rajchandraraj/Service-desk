import React, { useState, useEffect } from 'react';
import axios from 'axios';

function EC2CreateForm({ region }) {
  const [vpcs, setVpcs] = useState([]);
  const [subnets, setSubnets] = useState([]);
  const [securityGroups, setSecurityGroups] = useState([]);
  const [keyPairs, setKeyPairs] = useState([]);
  const [iamProfiles, setIamProfiles] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    ami: '',
    instance_type: '',
    vpc_id: '',
    subnet_id: '',
    security_group_id: '',
    key_name: '',
    iam_instance_profile: ''
  });

  const [message, setMessage] = useState(null);
  const [createdInstance, setCreatedInstance] = useState(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [vpcRes, keyPairRes, iamRes] = await Promise.all([
          axios.get(`/ec2/vpcs/${region}`),
          axios.get(`/ec2/key-pairs/${region}`),
          axios.get(`/ec2/iam-profiles/${region}`),
        ]);
        setVpcs(vpcRes.data);
        setKeyPairs(keyPairRes.data);
        setIamProfiles(iamRes.data);
      } catch (err) {
        console.error('Failed to load initial EC2 options', err);
      }
    };
    fetchInitialData();
  }, [region]);

  const handleVpcChange = async (e) => {
    const vpc_id = e.target.value;
    setFormData({ ...formData, vpc_id, subnet_id: '', security_group_id: '' });

    if (!vpc_id) return;

    try {
      const [subnetRes, sgRes] = await Promise.all([
        axios.get(`/ec2/subnets/${region}/${vpc_id}`),
        axios.get(`/ec2/security-groups/${region}/${vpc_id}`),
      ]);
      setSubnets(subnetRes.data);
      setSecurityGroups(sgRes.data);
    } catch (err) {
      console.error('Failed to load subnets or SGs for selected VPC', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setCreatedInstance(null);

    try {
      const res = await axios.post('/create-ec2', { ...formData, region });
      setMessage({ type: 'success', text: res.data.message });
      setCreatedInstance({
        id: res.data.instance_id,
        public_ip: res.data.public_ip,
      });
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'EC2 creation failed';
      setMessage({ type: 'error', text: errorMsg });
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4 bg-white border rounded shadow mt-6">
      <h2 className="text-xl font-bold mb-4">Create EC2 Instance</h2>

      {message && (
        <div className={`p-2 rounded mb-4 ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <input name="name" type="text" placeholder="Instance Name" value={formData.name} onChange={handleChange} required className="w-full border px-3 py-2 rounded" />
        <input name="ami" type="text" placeholder="AMI ID (e.g. ami-0abcdef...)" value={formData.ami} onChange={handleChange} required className="w-full border px-3 py-2 rounded" />
        <input name="instance_type" type="text" placeholder="Instance Type (e.g. t2.micro)" value={formData.instance_type} onChange={handleChange} required className="w-full border px-3 py-2 rounded" />

        <select name="vpc_id" value={formData.vpc_id} onChange={handleVpcChange} required className="w-full border px-3 py-2 rounded">
          <option value="">Select VPC</option>
          {vpcs.map(vpc => (
            <option key={vpc.id} value={vpc.id}>{vpc.id} ({vpc.cidr})</option>
          ))}
        </select>

        <select name="subnet_id" value={formData.subnet_id} onChange={handleChange} required className="w-full border px-3 py-2 rounded">
          <option value="">Select Subnet</option>
          {subnets.map(subnet => (
            <option key={subnet.id} value={subnet.id}>{subnet.id} ({subnet.az}, {subnet.cidr})</option>
          ))}
        </select>

        <select name="security_group_id" value={formData.security_group_id} onChange={handleChange} required className="w-full border px-3 py-2 rounded">
          <option value="">Select Security Group</option>
          {securityGroups.map(sg => (
            <option key={sg.id} value={sg.id}>{sg.name} ({sg.id})</option>
          ))}
        </select>

        <select name="key_name" value={formData.key_name} onChange={handleChange} required className="w-full border px-3 py-2 rounded">
          <option value="">Select Key Pair</option>
          {keyPairs.map(kp => (
            <option key={kp.name} value={kp.name}>{kp.name}</option>
          ))}
        </select>

        <select name="iam_instance_profile" value={formData.iam_instance_profile} onChange={handleChange} className="w-full border px-3 py-2 rounded">
          <option value="">Select IAM Profile (optional)</option>
          {iamProfiles.map(profile => (
            <option key={profile.name} value={profile.name}>{profile.name}</option>
          ))}
        </select>

        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Create Instance</button>
      </form>

      {createdInstance && (
        <div className="mt-6 bg-gray-100 p-4 rounded">
          <h3 className="font-semibold mb-2">Instance Created:</h3>
          <p><strong>ID:</strong> {createdInstance.id}</p>
          <p><strong>Public IP:</strong> {createdInstance.public_ip || 'Pending'}</p>
        </div>
      )}
    </div>
  );
}

export default EC2CreateForm;
