import React, { useState } from 'react';
import axios from 'axios';
import { AWS_BACKEND_HOST } from '../config';


function VPCCreateForm({ region }) {
  const [form, setForm] = useState({
    name: '',
    cidr_block: '',
    subnet_cidr: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await axios.post(`${AWS_BACKEND_HOST}/create-vpc`, {
        ...form,
        region
      });
      setMessage(`✅ VPC created: ${res.data.vpc_id}${res.data.subnet_id ? ` | Subnet: ${res.data.subnet_id}` : ''}`);
    } catch (err) {
      setMessage(`❌ Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 border-t pt-4">
      <h3 className="text-lg font-semibold mb-2">Add VPC</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          name="name"
          placeholder="VPC Name"
          value={form.name}
          onChange={handleChange}
          className="border p-2 rounded w-full"
          required
        />
        <input
          type="text"
          name="cidr_block"
          placeholder="CIDR Block (e.g. 10.0.0.0/16)"
          value={form.cidr_block}
          onChange={handleChange}
          className="border p-2 rounded w-full"
          required
        />
        <input
          type="text"
          name="subnet_cidr"
          placeholder="Optional Subnet CIDR (e.g. 10.0.1.0/24)"
          value={form.subnet_cidr}
          onChange={handleChange}
          className="border p-2 rounded w-full"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading}>
          {loading ? 'Creating...' : 'Create VPC'}
        </button>
        {message && <p className="text-sm mt-2">{message}</p>}
      </form>
    </div>
  );
}

export default VPCCreateForm;
