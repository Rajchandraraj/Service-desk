import React, { useEffect, useState } from 'react';
import axios from 'axios';

// Separate Install component - uses inline expansion like VM details
function InstallSection({ instanceId, region, onInstallComplete }) {
  const [showInstallOptions, setShowInstallOptions] = useState(false);
  const [selectedService, setSelectedService] = useState('');
  const [showVersions, setShowVersions] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Use environment variable for backend host
  const BACKEND_HOST = process.env.REACT_APP_BACKEND_HOST || 'http://localhost:5000';

  const services = [
    'apache', 'keys', 'mongo', 'node', 'elasticsearch', 
    'mariadb', 'nginx', 'npm', 'solr'
  ];

  // Service versions (you can customize these)
  const serviceVersions = {
    apache: ['2.4.57', '2.4.56', '2.4.55'],
    keys: ['1.0.0', '1.1.0', '1.2.0'],
    mongo: ['7.0', '6.0', '5.0'],
    node: ['20.9.0', '18.18.2', '16.20.2'],
    elasticsearch: ['8.11.0', '8.10.4', '7.17.15'],
    mariadb: ['10.11.6', '10.10.7', '10.6.16'],
    nginx: ['1.25.3', '1.24.0', '1.22.1'],
    npm: ['10.2.3', '9.8.1', '8.19.4'],
    solr: ['9.4.0', '9.3.0', '8.11.2']
  };

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    setShowVersions(true);
  };

  const handleVersionSelect = (version) => {
    setSelectedVersion(version);
    setShowVersions(false);
    setShowConfirmation(true);
  };

  const handleConfirmInstall = () => {
    // Make the actual API call to install the service
    console.log(`Installing ${selectedService} version ${selectedVersion} on instance ${instanceId}`);
    
    axios.post(`${BACKEND_HOST}/instance/${region}/${instanceId}/install`, {
      service: selectedService,
      version: selectedVersion
    })
    .then(() => {
      alert(`${selectedService} ${selectedVersion} installation started successfully!`);
      onInstallComplete();
      resetInstall();
    })
    .catch(err => {
      console.error('Installation error:', err);
      alert(`Installation failed: ${err.response?.data?.message || err.message}`);
    });
  };

  const resetInstall = () => {
    setShowInstallOptions(false);
    setShowVersions(false);
    setShowConfirmation(false);
    setSelectedService('');
    setSelectedVersion('');
  };

  const goBackToServices = () => {
    setShowVersions(false);
    setSelectedService('');
  };

  // Auto-show install options when component mounts
  useEffect(() => {
    setShowInstallOptions(true);
  }, []);

  return (
    <div>
      {/* Install Options - Always visible when component is rendered */}
      {showInstallOptions && (
        <div className="p-3 bg-white border border-gray-200 rounded">
          {!selectedService && !showVersions && (
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Select Service to Install:</h4>
              <div className="grid grid-cols-3 gap-2">
                {services.map(service => (
                  <button
                    key={service}
                    onClick={() => handleServiceSelect(service)}
                    className="bg-gray-100 hover:bg-blue-100 text-gray-700 px-3 py-2 rounded text-sm capitalize border hover:border-blue-300"
                  >
                    {service}
                  </button>
                ))}
              </div>
              <button
                onClick={resetInstall}
                className="mt-2 text-gray-500 text-sm hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          )}

          {selectedService && showVersions && (
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">
                Select {selectedService} Version:
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {serviceVersions[selectedService]?.map(version => (
                  <button
                    key={version}
                    onClick={() => handleVersionSelect(version)}
                    className="bg-gray-100 hover:bg-green-100 text-gray-700 px-3 py-2 rounded text-sm border hover:border-green-300"
                  >
                    {version}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={goBackToServices}
                  className="text-blue-500 text-sm hover:text-blue-700"
                >
                  ← Back to Services
                </button>
                <button
                  onClick={resetInstall}
                  className="text-gray-500 text-sm hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Installation</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to install <strong>{selectedService}</strong> version <strong>{selectedVersion}</strong> on this instance?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={resetInstall}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmInstall}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                Install
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EC2Dashboard({ region = 'us-east-1' }) {
  const [instances, setInstances] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [installExpandedId, setInstallExpandedId] = useState(null);
  const [filter, setFilter] = useState('all');

  // Use environment variable for backend host
  const BACKEND_HOST = process.env.REACT_APP_BACKEND_HOST || 'http://localhost:5000';

  useEffect(() => {
    // Load instances from your API
    axios.get(`${BACKEND_HOST}/instances/${region}`)
      .then(res => {
        if (Array.isArray(res.data)) setInstances(res.data);
      })
      .catch(err => {
        console.error('Error fetching instances:', err);
        alert('Failed to fetch instances. Please check if the backend is running.');
      });
  }, [region, BACKEND_HOST]);

  const handleAction = (id, action) => {
    axios.post(`${BACKEND_HOST}/instance/${region}/${id}/${action}`)
      .then(() => {
        alert(`Instance ${action} request sent.`);
        setInstances(prev => prev.map(inst => 
          inst.id === id ? { ...inst, state: action === 'start' ? 'running' : 'stopped' } : inst
        ));
      })
      .catch(err => {
        console.error(`Error ${action}ing instance:`, err);
        alert(`Failed to ${action} instance. Please try again.`);
      });
  };

  const handleResize = (id, type) => {
    const newType = prompt("Enter new instance type:", type);
    if (newType) {
      axios.post(`${BACKEND_HOST}/instance/${region}/${id}/resize`, {
        instance_type: newType
      })
      .then(() => alert('Resize requested.'))
      .catch(err => {
        console.error('Error resizing instance:', err);
        alert('Failed to resize instance. Please try again.');
      });
    }
  };

  const handleTerminate = id => {
    if (window.confirm("Are you sure to terminate this instance?")) {
      axios.post(`${BACKEND_HOST}/instance/${region}/${id}/terminate`)
        .then(() => {
          alert('Instance terminated.');
          // Remove terminated instance from state
          setInstances(prev => prev.filter(inst => inst.id !== id));
        })
        .catch(err => {
          console.error('Error terminating instance:', err);
          alert('Failed to terminate instance. Please try again.');
        });
    }
  };

  const handleStopAll = () => {
    if (window.confirm("Are you sure to stop all running instances?")) {
      axios.post(`${BACKEND_HOST}/instances/${region}/stop_all`)
        .then(res => {
          alert(res.data.message);
          // Refresh instances list
          axios.get(`${BACKEND_HOST}/instances/${region}`)
            .then(res => {
              if (Array.isArray(res.data)) setInstances(res.data);
            });
        })
        .catch(err => {
          console.error('Error stopping all instances:', err);
          alert('Failed to stop all instances. Please try again.');
        });
    }
  };

  const handleInstallComplete = () => {
    // Refresh instances or handle post-install actions
    console.log('Installation completed');
    // Optionally refresh the instances list
    axios.get(`${BACKEND_HOST}/instances/${region}`)
      .then(res => {
        if (Array.isArray(res.data)) setInstances(res.data);
      })
      .catch(err => {
        console.error('Error refreshing instances:', err);
      });
  };

  const filteredInstances = filter === 'all' ? instances : instances.filter(inst => inst.state === filter);

  return (
    <div className="mt-4 p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">EC2 Instances in {region}</h2>
        <div className="flex gap-2">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)} 
            className="border px-2 py-1 rounded"
          >
            <option value="all">All</option>
            <option value="running">Running</option>
            <option value="stopped">Stopped</option>
          </select>
          <button 
            onClick={handleStopAll} 
            className="bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700"
          >
            Stop All Running
          </button>
        </div>
      </div>

      {filteredInstances.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No instances found in {region}
        </div>
      ) : (
        <table className="min-w-full bg-white shadow rounded">
          <thead>
            <tr className="bg-gray-100 text-left text-sm font-semibold">
              <th className="p-2">Name</th>
              <th className="p-2">Instance ID</th>
              <th className="p-2">Type</th>
              <th className="p-2">AZ</th>
              <th className="p-2">Public IP</th>
              <th className="p-2">Private IP</th>
              <th className="p-2">State</th>
            </tr>
          </thead>
          <tbody>
            {filteredInstances.map(inst => {
              const name = inst.name || (inst.tags || []).find(tag => tag.Key === 'Name')?.Value || 'Unnamed';
              const isExpanded = expandedId === inst.id;
              return (
                <React.Fragment key={inst.id}>
                  <tr 
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === inst.id ? null : inst.id)}
                  >
                    <td className="p-2">{name}</td>
                    <td className="p-2">{inst.id}</td>
                    <td className="p-2">{inst.type}</td>
                    <td className="p-2">{inst.az}</td>
                    <td className="p-2">
                      <span className="text-sm">
                        {inst.public_ip || inst.publicIp || 'N/A'}
                      </span>
                    </td>
                    <td className="p-2">
                      <span className="text-sm">
                        {inst.private_ip || inst.privateIp || 'N/A'}
                      </span>
                    </td>
                    <td className="p-2 capitalize">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        inst.state === 'running' ? 'bg-green-100 text-green-800' : 
                        inst.state === 'stopped' ? 'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {inst.state}
                      </span>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-gray-50 border-b">
                      <td colSpan="7" className="p-4">
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p><strong>CPU Usage:</strong> {inst.cpu}%</p>
                              <p><strong>Role:</strong> {inst.role || 'None'}</p>
                            </div>
                            <div>
                              <p><strong>Public IP:</strong> {inst.public_ip || inst.publicIp || 'N/A'}</p>
                              <p><strong>Private IP:</strong> {inst.private_ip || inst.privateIp || 'N/A'}</p>
                            </div>
                          </div>
                          <p><strong>Volumes:</strong> {inst.volumes?.join(', ') || 'N/A'}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {inst.state === 'stopped' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAction(inst.id, 'start');
                                }}
                                className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                              >
                                Start
                              </button>
                            )}
                            {inst.state === 'running' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAction(inst.id, 'stop');
                                }}
                                className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                              >
                                Stop
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResize(inst.id, inst.type);
                              }}
                              className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                            >
                              Resize
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setInstallExpandedId(installExpandedId === inst.id ? null : inst.id);
                              }}
                              className="bg-purple-500 text-white px-3 py-1 rounded hover:bg-purple-600"
                            >
                              Install
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTerminate(inst.id);
                              }}
                              className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                            >
                              Terminate
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  {/* Install Row */}
                  {installExpandedId === inst.id && (
                    <tr className="bg-blue-50 border-b">
                      <td colSpan="7" className="p-4">
                        <div className="mb-2">
                          <button
                            onClick={() => setInstallExpandedId(null)}
                            className="text-gray-500 text-sm hover:text-gray-700 mb-2"
                          >
                            ✕ Close Install Options
                          </button>
                        </div>
                        <InstallSection 
                          instanceId={inst.id}
                          region={region}
                          onInstallComplete={handleInstallComplete}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default EC2Dashboard;