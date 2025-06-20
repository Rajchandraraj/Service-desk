import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

// Configuration for Ansible API
const ANSIBLE_API_BASE = 'http://43.204.109.213:8000';

// Installation Service Functions
class InstallationService {
  static async getInstancePrivateIP(instanceId, region) {
    try {
      const response = await axios.get(`${API_BASE_URL}/ec2/instance/${region}/${instanceId}/installation-info`);
      return response.data.private_ip;
    } catch (error) {
      console.error('Error fetching private IP:', error);
      throw new Error('Failed to fetch instance private IP');
    }
  }

  static async installService(privateIp, service, version) {
    try {
      const url = `${ANSIBLE_API_BASE}/install/${privateIp}/${service}/${version}`;
      console.log(`Installing ${service} v${version} on ${privateIp}`);
      console.log(`API URL: ${url}`);
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Installation error:', error);
      if (error.code === 'ECONNABORTED') {
        throw new Error('Installation request timed out');
      } else if (error.response) {
        throw new Error(error.response.data?.error || `Server error: ${error.response.status}`);
      } else if (error.request) {
        throw new Error('Cannot connect to Ansible API - please check if the service is running');
      } else {
        throw new Error('Installation failed: ' + error.message);
      }
    }
  }

  static async getDeploymentStatus(deploymentId) {
    try {
      const response = await axios.get(`${ANSIBLE_API_BASE}/status/${deploymentId}`, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error checking deployment status:', error);
      throw new Error('Failed to check deployment status');
    }
  }

  static async checkAnsibleAPIHealth() {
    try {
      const response = await axios.get(`${ANSIBLE_API_BASE}/health`, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Ansible API health check failed:', error);
      if (error.code === 'ECONNABORTED') {
        return { status: 'unhealthy', error: 'Connection timeout' };
      } else if (error.response) {
        return { status: 'unhealthy', error: `HTTP ${error.response.status}` };
      } else if (error.request) {
        return { status: 'unhealthy', error: 'Cannot connect to API' };
      } else {
        return { status: 'unhealthy', error: error.message };
      }
    }
  }
}

// Perfect Install Section Component
function InstallSection({ instanceId, region, onInstallComplete }) {
  const [showInstallOptions, setShowInstallOptions] = useState(false);
  const [selectedService, setSelectedService] = useState('');
  const [showVersions, setShowVersions] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deploymentId, setDeploymentId] = useState(null);
  const [deploymentStatus, setDeploymentStatus] = useState(null);
  const [privateIp, setPrivateIp] = useState(null);
  const [apiHealth, setApiHealth] = useState(null);
  const [error, setError] = useState(null);

  const services = [
    'apache', 'mongo', 'node', 'elasticsearch', 
    'mariadb', 'nginx', 'npm', 'solr'
  ];

  const serviceVersions = {
    apache: ['latest', '2.4'],
    mongo: ['latest',  '7.0', '6.0', '5.0'],
    node: ['latest',  '20.x', '18.x', '16.x'],
    elasticsearch: ['latest', '8.11', '7.17', '6.8'],
    mariadb: ['latest', '10.6', '10.5'],
    nginx: ['latest', '1.22', '1.20'],
    npm: ['latest', 'lastest'],
    solr: ['latest', '9.4', '9.3']
  };

  // Initialize component
  useEffect(() => {
    const initializeComponent = async () => {
      try {
        setError(null);
        
        // Check Ansible API health first
        console.log('Checking Ansible API health...');
        const health = await InstallationService.checkAnsibleAPIHealth();
        setApiHealth(health);
        console.log('API Health:', health);

        if (health.status === 'healthy') {
          // Get instance private IP
          console.log('Fetching instance private IP...');
          const ip = await InstallationService.getInstancePrivateIP(instanceId, region);
          setPrivateIp(ip);
          console.log('Private IP:', ip);
        }
        
        setShowInstallOptions(true);
      } catch (error) {
        console.error('Failed to initialize install component:', error);
        setError(error.message);
        setApiHealth({ status: 'unhealthy', error: error.message });
        setShowInstallOptions(true); // Still show options but with error state
      }
    };

    initializeComponent();
  }, [instanceId, region]);

  // Poll deployment status if we have a deployment ID
  useEffect(() => {
    if (deploymentId) {
      const pollStatus = setInterval(async () => {
        try {
          const status = await InstallationService.getDeploymentStatus(deploymentId);
          setDeploymentStatus(status);
          
          if (status.status === 'completed' || status.status === 'failed' || status.status === 'error') {
            clearInterval(pollStatus);
            setLoading(false);
            
            if (status.status === 'completed') {
              alert(`✅ ${selectedService} ${selectedVersion} installed successfully on ${privateIp}!`);
              onInstallComplete();
              resetInstall();
            } else {
              const errorMsg =
                (status.error_output && status.error_output.length > 0)
                  ? status.error_output.join('\n')
                  : status.message
                    ? status.message
                    : JSON.stringify(status);

              alert(`❌ Installation failed:\n${errorMsg}`);
              setError(`Installation failed: ${errorMsg}`);
            }
          }
        } catch (error) {
          console.error('Error polling deployment status:', error);
          clearInterval(pollStatus);
          setLoading(false);
          setError('Failed to check deployment status');
        }
      }, 3000); // Poll every 3 seconds

      return () => clearInterval(pollStatus);
    }
  }, [deploymentId, selectedService, selectedVersion, privateIp, onInstallComplete]);

  const handleServiceSelect = (service) => {
    setError(null);
    setSelectedService(service);
    setShowVersions(true);
  };

  const handleVersionSelect = (version) => {
    setSelectedVersion(version);
    setShowVersions(false);
    setShowConfirmation(true);
  };

  const handleConfirmInstall = async () => {
    if (!privateIp) {
      setError('Private IP not available. Cannot proceed with installation.');
      return;
    }

    if (apiHealth?.status !== 'healthy') {
      setError('Ansible API is not available. Cannot proceed with installation.');
      return;
    }

    setLoading(true);
    setShowConfirmation(false);
    setError(null);

    try {
      console.log(`Installing ${selectedService} version ${selectedVersion} on ${privateIp}`);
      
      const result = await InstallationService.installService(privateIp, selectedService, selectedVersion);
      
      if (result.deployment_id) {
        setDeploymentId(result.deployment_id);
        setDeploymentStatus(result);
        return;
        // Status polling will handle the rest
      } else {
        // Immediate completion
        setLoading(false);
        if (result.status === 'completed') {
          alert(`✅ ${selectedService} ${selectedVersion} installation completed successfully!`);
          onInstallComplete();
          resetInstall();
        } else {
          const errorMsg =
            (result.error_output && result.error_output.length > 0)
              ? result.error_output.join('\n')
              : result.message
                ? result.message
                : JSON.stringify(result);

          setError(`Installation failed: ${errorMsg}`);
        }
      }
    } catch (error) {
      setLoading(false);
      console.error('Installation error:', error);
      setError(error.message);
    }
  };

  const resetInstall = () => {
    setShowInstallOptions(false);
    setShowVersions(false);
    setShowConfirmation(false);
    setSelectedService('');
    setSelectedVersion('');
    setDeploymentId(null);
    setDeploymentStatus(null);
    setLoading(false);
    setError(null);
  };

  const goBackToServices = () => {
    setShowVersions(false);
    setSelectedService('');
    setError(null);
  };

  const retryConnection = async () => {
    setError(null);
    const health = await InstallationService.checkAnsibleAPIHealth();
    setApiHealth(health);
    if (health.status === 'healthy') {
      try {
        const ip = await InstallationService.getInstancePrivateIP(instanceId, region);
        setPrivateIp(ip);
      } catch (error) {
        setError(error.message);
      }
    }
  };

  // Auto-show install options when component mounts
  useEffect(() => {
    setShowInstallOptions(true);
  }, []);

  return (
    <div>
      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded mb-3">
          <div className="flex items-center justify-between">
            <div className="text-red-700 text-sm">
              <strong>⚠️ Error:</strong> {error}
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
          {(error.includes('connect') || error.includes('timeout')) && (
            <button
              onClick={retryConnection}
              className="mt-2 text-red-600 text-sm hover:text-red-800 underline"
            >
              🔄 Retry Connection
            </button>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded mb-3">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
            <span className="text-blue-700">
              🚀 Installing {selectedService} {selectedVersion} on {privateIp}...
            </span>
          </div>
          {deploymentStatus && (
            <div className="mt-2 text-sm text-blue-600">
              <div>Status: <span className="font-semibold">{deploymentStatus.status}</span></div>
              {deploymentStatus.deployment_id && (
                <div className="text-xs text-gray-500">ID: {deploymentStatus.deployment_id}</div>
              )}
              {deploymentStatus.output && deploymentStatus.output.length > 0 && (
                <div className="mt-1 text-xs bg-blue-100 p-2 rounded max-h-20 overflow-y-auto">
                  <div className="font-semibold">Latest Output:</div>
                  {deploymentStatus.output.slice(-3).map((line, idx) => (
                    <div key={idx} className="text-gray-700">{line}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* API Health Warning */}
      {apiHealth && apiHealth.status !== 'healthy' && !loading && (
        <div className="p-3 bg-red-50 border border-red-200 rounded mb-3">
          <div className="text-red-700 text-sm">
            <strong>🚨 Warning:</strong> Ansible API is not available ({apiHealth.error}). Installation may not work.
          </div>
          <button
            onClick={retryConnection}
            className="mt-2 text-red-600 text-sm hover:text-red-800 underline"
          >
            🔄 Retry Connection
          </button>
        </div>
      )}

      {/* Install Options - Always visible when component is rendered */}
      {showInstallOptions && !loading && (
        <div className="p-3 bg-white border border-gray-200 rounded">
          {!selectedService && !showVersions && (
            <div>
              {/* Show private IP info */}
              {privateIp && (
                <div className="mb-3 p-2 bg-green-50 rounded text-sm">
                  <span className="text-green-700">
                    🎯 Target: <strong>{privateIp}</strong> (SSH pre-configured)
                  </span>
                </div>
              )}
              
              <h4 className="font-semibold text-gray-700 mb-2">Select Service to Install:</h4>
              <div className="grid grid-cols-3 gap-2">
                {services.map(service => (
                  <button
                    key={service}
                    onClick={() => handleServiceSelect(service)}
                    disabled={!privateIp || apiHealth?.status !== 'healthy'}
                    className={`px-3 py-2 rounded text-sm capitalize border transition-colors ${
                      privateIp && apiHealth?.status === 'healthy'
                        ? 'bg-gray-100 hover:bg-blue-100 text-gray-700 hover:border-blue-300'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed border-gray-200'
                    }`}
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
            <h3 className="text-lg font-semibold mb-4">🚀 Confirm Installation</h3>
            <div className="space-y-2 mb-6">
              <p className="text-gray-600">
                <strong>Service:</strong> {selectedService}
              </p>
              <p className="text-gray-600">
                <strong>Version:</strong> {selectedVersion}
              </p>
              <p className="text-gray-600">
                <strong>Target IP:</strong> {privateIp}
              </p>
              <p className="text-gray-600">
                <strong>Instance:</strong> {instanceId}
              </p>
              <p className="text-gray-600">
                <strong>API Status:</strong> <span className={apiHealth?.status === 'healthy' ? 'text-green-600' : 'text-red-600'}>
                  {apiHealth?.status === 'healthy' ? '✅ Ready' : '❌ Not Ready'}
                </span>
              </p>
            </div>
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
                disabled={!privateIp || apiHealth?.status !== 'healthy'}
              >
                🚀 Install
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Perfect EC2Dashboard Component
function EC2Dashboard({ region = 'us-east-1' }) {
  const [instances, setInstances] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [installExpandedId, setInstallExpandedId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [apiHealth, setApiHealth] = useState(null);

  useEffect(() => {
    // Check Ansible API health on component mount
    const checkHealth = async () => {
      const health = await InstallationService.checkAnsibleAPIHealth();
      setApiHealth(health);
    };
    checkHealth();

    // Load instances from your API
    axios.get(`${API_BASE_URL}/ec2/instances/${region}`)
      .then(res => {
        if (Array.isArray(res.data)) setInstances(res.data);
      })
      .catch(err => {
        console.error('Error fetching instances:', err);
        alert('Failed to fetch instances. Please check if the backend is running.');
      });
  }, [region]);

  // Start/Stop Instance
  const handleAction = (id, action) => {
    axios.post(`${API_BASE_URL}/ec2/instance/${region}/${id}/${action}`)
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

  // Resize Instance
  const handleResize = (id, type) => {
    const newType = prompt("Enter new instance type:", type);
    if (newType) {
      axios.post(`${API_BASE_URL}/ec2/instance/${region}/${id}/resize`, {
        instance_type: newType
      })
      .then(() => alert('Resize requested.'))
      .catch(err => {
        console.error('Error resizing instance:', err);
        alert('Failed to resize instance. Please try again.');
      });
    }
  };

  // Terminate Instance
  const handleTerminate = id => {
    if (window.confirm("Are you sure to terminate this instance?")) {
      axios.post(`${API_BASE_URL}/ec2/instance/${region}/${id}/terminate`)
        .then(() => {
          alert('Instance terminated.');
          setInstances(prev => prev.filter(inst => inst.id !== id));
        })
        .catch(err => {
          console.error('Error terminating instance:', err);
          alert('Failed to terminate instance. Please try again.');
        });
    }
  };

  // Stop All Instances
  const handleStopAll = () => {
    if (window.confirm("Are you sure to stop all running instances?")) {
      axios.post(`${API_BASE_URL}/ec2/instances/${region}/stop_all`)
        .then(res => {
          alert(res.data.message);
          // Refresh instances list
          axios.get(`${API_BASE_URL}/ec2/instances/${region}`)
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

  // Refresh after install
  const handleInstallComplete = () => {
    axios.get(`${API_BASE_URL}/ec2/instances/${region}`)
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
        <div className="flex gap-2 items-center">
          <span className={`px-2 py-1 rounded text-xs ${
            apiHealth?.status === 'healthy' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {apiHealth?.status === 'healthy' ? '✅ Ansible API' : '❌ Ansible API'}
          </span>
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