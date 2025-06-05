// pages/EC2CreateForm.js
import React, { useState } from 'react';

function EC2CreateForm({ region }) {
  const [amiId, setAmiId] = useState('');
  const [instanceType, setInstanceType] = useState('t2.micro');
  const [keyName, setKeyName] = useState('');
  const [securityGroups, setSecurityGroups] = useState('');
  const [subnetId, setSubnetId] = useState('');
  const [tags, setTags] = useState([{ Key: '', Value: '' }]);
  const [message, setMessage] = useState('');

  const addTag = () => setTags([...tags, { Key: '', Value: '' }]);

  const updateTag = (index, field, value) => {
    const newTags = [...tags];
    newTags[index][field] = value;
    setTags(newTags);
  };

  const handleSubmit = async () => {
    const payload = {
      region,
      ami_id: amiId,
      instance_type: instanceType,
      key_name: keyName,
      security_groups: securityGroups.split(',').map(s => s.trim()),
      subnet_id: subnetId,
      tags: tags.filter(tag => tag.Key && tag.Value),
    };

    try {
      const res = await fetch('http://localhost:5000/create-ec2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setMessage(data.message);
    } catch (err) {
      setMessage('Failed to create instance');
    }
  };

  return (
    <div className="bg-white p-4 rounded shadow-md">
      <h2 className="text-xl font-bold mb-4">Create EC2 Instance</h2>

      <input className="border p-2 w-full mb-2" placeholder="AMI ID" value={amiId} onChange={e => setAmiId(e.target.value)} />
      <input className="border p-2 w-full mb-2" placeholder="Instance Type" value={instanceType} onChange={e => setInstanceType(e.target.value)} />
      <input className="border p-2 w-full mb-2" placeholder="Key Name (optional)" value={keyName} onChange={e => setKeyName(e.target.value)} />
      <input className="border p-2 w-full mb-2" placeholder="Security Group IDs (comma-separated)" value={securityGroups} onChange={e => setSecurityGroups(e.target.value)} />
      <input className="border p-2 w-full mb-2" placeholder="Subnet ID" value={subnetId} onChange={e => setSubnetId(e.target.value)} />

      <div className="mb-2">
        <p className="font-semibold">Tags:</p>
        {tags.map((tag, i) => (
          <div key={i} className="flex gap-2 mb-1">
            <input className="border p-1 w-1/2" placeholder="Key" value={tag.Key} onChange={e => updateTag(i, 'Key', e.target.value)} />
            <input className="border p-1 w-1/2" placeholder="Value" value={tag.Value} onChange={e => updateTag(i, 'Value', e.target.value)} />
          </div>
        ))}
        <button className="bg-gray-300 px-2 py-1 rounded" onClick={addTag}>Add Tag</button>
      </div>

      <button className="bg-green-600 text-white px-4 py-2 mt-3 rounded" onClick={handleSubmit}>Create Instance</button>
      {message && <p className="mt-4 text-blue-700">{message}</p>}
    </div>
  );
}

export default EC2CreateForm;
