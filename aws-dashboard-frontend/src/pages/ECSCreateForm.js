// pages/ECSCreateForm.js
import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

function ECSCreateForm({ region }) {
  const [clusterName, setClusterName] = useState('');
  const [launchType, setLaunchType] = useState('FARGATE');
  const [vpcId, setVpcId] = useState('');
  const [subnetId, setSubnetId] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [taskDefName, setTaskDefName] = useState('');
  const [taskDefVersion, setTaskDefVersion] = useState('');
  const [containerName, setContainerName] = useState('');
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      region,
      clusterName,
      launchType,
      vpcId,
      subnetId,
      serviceName,
      taskDefName,
      taskDefVersion,
      containerName,
    };

    try {
      const res = await axios.post(`${API_BASE_URL}/ecs/create`, payload);
      setMessage({ type: 'success', text: res.data.message || 'ECS resources created successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to create ECS resources.' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded shadow">
      <h2 className="text-xl font-bold">Create ECS Cluster, Service & Task</h2>

      {message && (
        <div className={`p-2 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div>
        <label className="block font-medium">Cluster Name</label>
        <input
          value={clusterName}
          onChange={e => setClusterName(e.target.value)}
          className="border p-2 rounded w-full"
          required
        />
      </div>

      <div>
        <label className="block font-medium">Launch Type</label>
        <select
          value={launchType}
          onChange={e => setLaunchType(e.target.value)}
          className="border p-2 rounded w-full"
        >
          <option value="FARGATE">FARGATE</option>
          <option value="EC2">EC2</option>
        </select>
      </div>

      <div>
        <label className="block font-medium">VPC ID</label>
        <input
          value={vpcId}
          onChange={e => setVpcId(e.target.value)}
          className="border p-2 rounded w-full"
          required
        />
      </div>

      <div>
        <label className="block font-medium">Subnet ID</label>
        <input
          value={subnetId}
          onChange={e => setSubnetId(e.target.value)}
          className="border p-2 rounded w-full"
          required
        />
      </div>

      <div>
        <label className="block font-medium">Service Name</label>
        <input
          value={serviceName}
          onChange={e => setServiceName(e.target.value)}
          className="border p-2 rounded w-full"
          required
        />
      </div>

      <div>
        <label className="block font-medium">Task Definition Name</label>
        <input
          value={taskDefName}
          onChange={e => setTaskDefName(e.target.value)}
          className="border p-2 rounded w-full"
          required
        />
      </div>

      <div>
        <label className="block font-medium">Task Definition Version</label>
        <input
          value={taskDefVersion}
          onChange={e => setTaskDefVersion(e.target.value)}
          className="border p-2 rounded w-full"
        />
      </div>

      <div>
        <label className="block font-medium">Container Name</label>
        <input
          value={containerName}
          onChange={e => setContainerName(e.target.value)}
          className="border p-2 rounded w-full"
          required
        />
      </div>

      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Submit
      </button>
    </form>
  );
}

export default ECSCreateForm;
