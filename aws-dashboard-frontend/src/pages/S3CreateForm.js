// pages/S3CreateForm.js
import React, { useState } from 'react';
import { API_BASE_URL } from '../config';


function S3CreateForm({ region }) {
  const [bucketName, setBucketName] = useState('');
  const [blockPublicAccess, setBlockPublicAccess] = useState(true);
  const [versioning, setVersioning] = useState(false);
  const [tags, setTags] = useState([{ Key: '', Value: '' }]);
  const [responseMsg, setResponseMsg] = useState('');

  const handleTagChange = (index, field, value) => {
    const newTags = [...tags];
    newTags[index][field] = value;
    setTags(newTags);
  };

  const addTag = () => setTags([...tags, { Key: '', Value: '' }]);

  const handleSubmit = async () => {
    const payload = {
      bucket_name: bucketName,
      region,
      block_public_access: blockPublicAccess,
      versioning,
      tags: tags.filter(t => t.Key && t.Value),
    };

    try {
      const res = await fetch(`${API_BASE_URL}/s3/create-s3`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      console.log(result);
      setResponseMsg(result.message);
    } catch (err) {
      setResponseMsg('Failed to create bucket');
    }
  };

  return (
    <div className="bg-white p-4 rounded shadow-md">
      <h2 className="text-xl font-bold mb-4">Create S3 Bucket</h2>
      <div className="mb-2">
        <label className="font-medium">Bucket Name:</label>
        <input
          type="text"
          className="border p-1 rounded w-full"
          value={bucketName}
          onChange={e => setBucketName(e.target.value)}
        />
      </div>

      <div className="mb-2">
        <label className="font-medium">Block Public Access:</label>
        <input
          type="checkbox"
          className="ml-2"
          checked={blockPublicAccess}
          onChange={e => setBlockPublicAccess(e.target.checked)}
        />
      </div>

      <div className="mb-2">
        <label className="font-medium">Enable Versioning:</label>
        <input
          type="checkbox"
          className="ml-2"
          checked={versioning}
          onChange={e => setVersioning(e.target.checked)}
        />
      </div>

      <div className="mb-2">
        <label className="font-medium">Tags:</label>
        {tags.map((tag, idx) => (
          <div key={idx} className="flex space-x-2 mt-1">
            <input
              className="border p-1 rounded w-1/2"
              placeholder="Key"
              value={tag.Key}
              onChange={e => handleTagChange(idx, 'Key', e.target.value)}
            />
            <input
              className="border p-1 rounded w-1/2"
              placeholder="Value"
              value={tag.Value}
              onChange={e => handleTagChange(idx, 'Value', e.target.value)}
            />
          </div>
        ))}
        <button
          className="mt-2 bg-blue-500 text-white px-2 py-1 rounded"
          onClick={addTag}
        >
          Add Tag
        </button>
      </div>

      <button
        className="mt-4 bg-green-600 text-white px-4 py-2 rounded"
        onClick={handleSubmit}
      >
        Create Bucket
      </button>

      {responseMsg && (
        <div className="mt-4 text-sm text-blue-600">{responseMsg}</div>
      )}
    </div>
  );
}

export default S3CreateForm;
