import React, { useEffect, useState } from 'react';
import axios from 'axios';

function EC2Instances({ region }) {
  const [instances, setInstances] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    axios.get(`http://localhost:5000/instances/${region}`)
      .then(res => {
        if (Array.isArray(res.data)) setInstances(res.data);
      });
  }, [region]);

  const handleResize = (id, type) => {
    const newType = prompt("Enter new instance type:", type);
    if (newType) {
      axios.post(`http://localhost:5000/instance/${region}/${id}/resize`, {
        instance_type: newType
      }).then(() => alert('Resize requested.'));
    }
  };

  const handleTerminate = id => {
    if (window.confirm("Are you sure to terminate this instance?")) {
      axios.post(`http://localhost:5000/instance/${region}/${id}/terminate`)
        .then(() => alert('Instance terminated.'));
    }
  };

  return (
    <div className="mt-4">
      <h2 className="text-xl font-bold mb-2">EC2 Instances</h2>
      <div className="mb-4">
        <label>Region:</label>
        <select value={region} onChange={e => setInstances([])} className="ml-2 border p-1">
          <option>us-east-1</option>
          <option>us-west-2</option>
          <option>ap-south-1</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Instances</h3>
          <ul>
            {instances.map(inst => (
              <li key={inst.id} className="mb-2">
                <button onClick={() => setSelected(inst)} className="text-blue-500 hover:underline">{inst.id}</button>
              </li>
            ))}
          </ul>
        </div>

        {selected && (
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold">Instance Details</h3>
            <p><b>Type:</b> {selected.type}</p>
            <p><b>AZ:</b> {selected.az}</p>
            <p><b>Volumes:</b> {selected.volumes.join(', ')}</p>
            <p><b>Role:</b> {selected.role}</p>
            <button onClick={() => handleResize(selected.id, selected.type)} className="bg-yellow-500 text-white px-4 py-1 rounded mt-2">Resize</button>
            <button onClick={() => handleTerminate(selected.id)} className="bg-red-600 text-white px-4 py-1 rounded ml-2 mt-2">Decommission</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Placeholder({ title }) {
  return (
    <div className="mt-4 text-center">
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="text-gray-500">Page is under construction</p>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('Resource management');
  const [resourceTab, setResourceTab] = useState('EC2');
  const [region, setRegion] = useState('us-east-1');

  return (
    <div className="p-4 font-sans">
      <header className="flex items-center justify-between bg-gray-800 p-4 text-white rounded-lg shadow-md">
        <h1 className="text-2xl">Welcome to Rapyder Service Desk</h1>
      </header>

      <nav className="flex space-x-4 mt-4">
        {['Monitoring', 'Resource management', 'Resource creation', 'Database'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>{tab}</button>
        ))}
      </nav>

      {activeTab === 'Monitoring' && <Placeholder title="Monitoring" />}
      {activeTab === 'Resource creation' && <Placeholder title="Resource Creation" />}
      {activeTab === 'Database' && <Placeholder title="Database" />}

      {activeTab === 'Resource management' && (
        <div className="mt-4">
          <nav className="flex space-x-4 mb-4">
            {['EC2', 'S3', 'VPC', 'RDS'].map(tab => (
              <button key={tab} onClick={() => setResourceTab(tab)} className={`px-4 py-2 rounded ${resourceTab === tab ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>{tab}</button>
            ))}
          </nav>

          {resourceTab === 'EC2' && <EC2Instances region={region} />}
          {resourceTab !== 'EC2' && <Placeholder title={resourceTab} />}
        </div>
      )}
    </div>
  );
}

export default App;
