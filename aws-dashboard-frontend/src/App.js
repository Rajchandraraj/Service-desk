import React, { useState } from 'react';
import EC2Dashboard from './pages/EC2Dashboard.js';
import MonitoringDashboard from './pages/MonitoringDashboard.js';
import S3CreateForm from './pages/S3CreateForm.js';
import EC2CreateForm from './pages/EC2CreateForm.js';
import StandaloneAutomation from './pages/standaloneautomation.js';
import VPCCreateForm from './pages/VPCCreateForm.js';
import ECSCreateForm from './pages/ECSCreateForm.js';

const BACKEND_URL = 'http://localhost:5000';

function Placeholder({ title }) {
  return (
    <div className="mt-4 text-center">
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="text-gray-500">Page is under construction</p>
    </div>
  );
}

// --- EC2 Security Checks Component ---
function EC2SecurityChecks({ region }) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState({}); // Track which details are open

  const checks = [
    { key: 'ebs_snapshot_public', label: 'Amazon EBS snapshots should not be publicly restorable' },
    { key: 'vpc_default_sg', label: 'VPC default security groups should not allow inbound or outbound traffic' },
    { key: 'ebs_encrypted', label: 'Attached Amazon EBS volumes should be encrypted at-rest' },
    { key: 'vpc_flow_logs', label: 'VPC flow logging should be enabled in all VPCs' },
    { key: 'ebs_default_encryption', label: 'EBS default encryption should be enabled' }
  ];

  const runChecks = async () => {
    setLoading(true);
    setError('');
    setResults(null);
    setShowDetails({}); // <-- Add this line to clear previous expanded details
    try {
      const res = await fetch(`${BACKEND_URL}/security/ec2?region=${region}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch EC2 security checks');
    }
    setLoading(false);
  };

  // Toggle details for a check
  const handleToggleDetails = (key) => {
    setShowDetails(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div>
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
        onClick={runChecks}
        disabled={loading}
      >
        {loading ? 'Running...' : 'Run EC2 Security Checks'}
      </button>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {results && (
        <ul>
          {checks.map(check => (
            <li
              key={check.key}
              className={`p-3 my-2 rounded border flex flex-col gap-1 border-l-4 ${
                results[check.key] === 'fail'
                  ? 'bg-red-100 border-red-400'
                  : results[check.key] === 'pass'
                  ? 'bg-green-100 border-green-400'
                  : 'border-gray-300'
              }`}
            >
              <div className="flex justify-between items-center">
                <span>{check.label}</span>
                <div className="flex items-center gap-2">
                  {results[check.key] === 'fail' && (
                    <>
                      <span className="text-red-600 font-bold">Failed</span>
                      <button
                        className="ml-2 px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 transition"
                        onClick={() => handleToggleDetails(check.key)}
                      >
                        {showDetails[check.key] ? 'Hide' : 'View'}
                      </button>
                    </>
                  )}
                  {results[check.key] === 'pass' && (
                    <span className="text-green-600 font-bold">Passed</span>
                  )}
                </div>
              </div>
              {/* Show details if failed and toggled */}
              {results[check.key] === 'fail' && showDetails[check.key] && results[`${check.key}_details`] && (
                <div className="text-sm text-red-700 mt-1 bg-red-50 rounded p-2">
                  <strong>Details:</strong>
                  {renderDetails(results[`${check.key}_details`])}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// --- S3 Security Checks Component ---
function S3SecurityChecks({ region }) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const checks = [
    { key: 'public_buckets', label: 'No S3 buckets should be public' },
    { key: 'unencrypted_buckets', label: 'All S3 buckets should be encrypted at-rest' },
    { key: 'versioning_enabled', label: 'Versioning should be enabled on all S3 buckets' },
    { key: 'logging_enabled', label: 'Logging should be enabled on all S3 buckets' }
  ];

  const runChecks = async () => {
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const res = await fetch(`${BACKEND_URL}/security/s3?region=${region}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch S3 security checks');
    }
    setLoading(false);
  };

  return (
    <div>
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
        onClick={runChecks}
        disabled={loading}
      >
        {loading ? 'Running...' : 'Run S3 Security Checks'}
      </button>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {results && (
        <ul>
          {checks.map(check => (
            <li
              key={check.key}
              className={`p-3 my-2 rounded border flex flex-col gap-1 border-l-4 ${
                results[check.key] === 'fail'
                  ? 'bg-red-100 border-red-400'
                  : results[check.key] === 'pass'
                  ? 'bg-green-100 border-green-400'
                  : 'border-gray-300'
              }`}
            >
              <div className="flex justify-between items-center">
                <span>{check.label}</span>
                {results[check.key] === 'fail' && (
                  <span className="text-red-600 font-bold">Failed</span>
                )}
                {results[check.key] === 'pass' && (
                  <span className="text-green-600 font-bold">Passed</span>
                )}
              </div>
              {/* Show details if failed and details exist */}
              {results[check.key] === 'fail' && results[`${check.key}_details`] && (
                <div className="text-sm text-red-700 mt-1 bg-red-50 rounded p-2">
                  <strong>Details:</strong>
                  {renderDetails(results[`${check.key}_details`])}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// --- SecurityTab with Expandable Sections ---
// ...existing imports...

function SecurityTab() {
  const [expanded, setExpanded] = useState(null);
  const [region, setRegion] = useState('us-east-1');
  const [pciResults, setPciResults] = useState(null);
  const [pciLoading, setPciLoading] = useState(false);
  const [pciError, setPciError] = useState('');
  const [foundationResults, setFoundationResults] = useState(null);
  const [foundationLoading, setFoundationLoading] = useState(false);
  const [foundationError, setFoundationError] = useState('');

  // Add these refs to reset child state
  const [ec2Key, setEc2Key] = useState(0);
  const [s3Key, setS3Key] = useState(0);

  // Helper to clear all results
  const clearAllResults = () => {
    setExpanded(null);
    setPciResults(null);
    setPciError('');
    setFoundationResults(null);
    setFoundationError('');
    setEc2Key(prev => prev + 1);
    setS3Key(prev => prev + 1);
  };

  // When you click EC2/S3, clear all results except the one you want
  const handleExpand = (tab) => {
    clearAllResults();
    setExpanded(tab);
  };

  // Run both EC2 and S3 checks together for PCI
  const handlePCI = async () => {
    clearAllResults();
    setPciLoading(true);
    try {
      const [ec2Res, s3Res] = await Promise.all([
        fetch(`http://localhost:5000/security/ec2?region=${region}`).then(r => r.json()),
        fetch(`http://localhost:5000/security/s3?region=${region}`).then(r => r.json())
      ]);
      if (ec2Res.error || s3Res.error) {
        setPciError(ec2Res.error || s3Res.error);
      } else {
        setPciResults({ ec2: ec2Res, s3: s3Res });
      }
    } catch (err) {
      setPciError('Failed to run PCI checks');
    }
    setPciLoading(false);
  };

  const handleAWSFoundation = async () => {
    clearAllResults();
    setFoundationLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/security/foundation?region=${region}`);
      const data = await res.json();
      if (data.error) setFoundationError(data.error);
      else setFoundationResults(data);
    } catch (err) {
      setFoundationError('Failed to fetch AWS Foundation checks');
    }
    setFoundationLoading(false);
  };

  // EC2 and S3 checks config (for PCI result rendering)
  const ec2Checks = [
    { key: 'ebs_snapshot_public', label: 'Amazon EBS snapshots should not be publicly restorable' },
    { key: 'vpc_default_sg', label: 'VPC default security groups should not allow inbound or outbound traffic' },
    { key: 'ebs_encrypted', label: 'Attached Amazon EBS volumes should be encrypted at-rest' },
    { key: 'vpc_flow_logs', label: 'VPC flow logging should be enabled in all VPCs' },
    { key: 'ebs_default_encryption', label: 'EBS default encryption should be enabled' }
  ];
  const s3Checks = [
    { key: 'public_buckets', label: 'No S3 buckets should be public' },
    { key: 'unencrypted_buckets', label: 'All S3 buckets should be encrypted at-rest' },
    { key: 'versioning_enabled', label: 'Versioning should be enabled on all S3 buckets' },
    { key: 'logging_enabled', label: 'Logging should be enabled on all S3 buckets' }
  ];

  return (
    <div className="mt-4">
      <div className="mb-6 flex items-center gap-4">
        <label className="font-bold text-lg text-gray-700">Region:</label>
        <select
          value={region}
          onChange={e => setRegion(e.target.value)}
          className="border p-2 rounded text-base font-semibold"
        >
          <option value="us-east-1">us-east-1</option>
          <option value="us-west-2">us-west-2</option>
          <option value="ap-south-1">ap-south-1</option>
        </select>
        <button
          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-xl font-bold text-base shadow hover:scale-105 transition"
          onClick={handlePCI}
          disabled={pciLoading}
        >
          {pciLoading ? 'Running PCI...' : 'PCI Checks'}
        </button>
        <button
          className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 py-2 rounded-xl font-bold text-base shadow hover:scale-105 transition"
          onClick={handleAWSFoundation}
          disabled={foundationLoading}
        >
          {foundationLoading ? 'Running Foundation...' : 'AWS Foundation Checks'}
        </button>
      </div>

      {/* EC2/S3 buttons row - Always visible below region+PCI/Foundation */}
      <div className="flex gap-3 mb-6">
        <button
          className={`min-w-[150px] px-3 py-2 rounded-lg font-semibold text-sm shadow transition 
            ${expanded === 'ec2'
              ? 'bg-gradient-to-r from-blue-600 to-blue-400 text-white scale-105'
              : 'bg-white border border-blue-300 text-blue-700 hover:bg-blue-50'}`}
          onClick={() => handleExpand('ec2')}
        >
          <span className="inline-block mr-2 align-middle">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><rect width="20" height="8" x="2" y="7" fill="none" stroke="currentColor" strokeWidth="2" rx="2"/><path fill="currentColor" d="M8 11h8v2H8z"/></svg>
          </span>
          EC2 Security Checks
        </button>
        <button
          className={`min-w-[150px] px-3 py-2 rounded-lg font-semibold text-sm shadow transition 
            ${expanded === 's3'
              ? 'bg-gradient-to-r from-green-600 to-green-400 text-white scale-105'
              : 'bg-white border border-green-300 text-green-700 hover:bg-green-50'}`}
          onClick={() => handleExpand('s3')}
        >
          <span className="inline-block mr-2 align-middle">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          </span>
          S3 Security Checks
        </button>
      </div>

      {/* Expandable content for EC2/S3 */}
      {expanded === 'ec2' && (
        <div className="p-4 border rounded mb-4 bg-white">
          <EC2SecurityChecks key={ec2Key} region={region} />
        </div>
      )}
      {expanded === 's3' && (
        <div className="p-4 border rounded mb-4 bg-white">
          <S3SecurityChecks key={s3Key} region={region} />
        </div>
      )}

      {/* PCI/Foundation Results - Always below both rows */}
      {pciLoading && <div className="text-blue-700 font-semibold mb-2">Running PCI checks...</div>}
      {pciError && <div className="text-red-600 mb-2">{pciError}</div>}
      {pciResults && (
        <div className="mb-6">
          <div className="font-bold text-lg mb-2">PCI Security Results</div>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300 rounded-lg bg-white">
              <thead>
                <tr>
                  <th className="px-4 py-2 border-b text-left font-bold text-base text-gray-700">Check Name</th>
                  <th className="px-4 py-2 border-b text-center font-bold text-base text-purple-700">EC2 Checks</th>
                  <th className="px-4 py-2 border-b text-center font-bold text-base text-blue-700">S3 Checks</th>
                </tr>
              </thead>
              <tbody>
                {/* EC2 checks */}
                {ec2Checks.map((check) => (
                  <tr key={check.key}>
                    <td className="px-4 py-2 border-b">{check.label}</td>
                    <td className="px-4 py-2 border-b text-center">
                      {pciResults.ec2[check.key] === 'pass' && (
                        <span className="text-green-600 font-bold">Passed</span>
                      )}
                      {pciResults.ec2[check.key] === 'fail' && (
                        <span className="text-red-600 font-bold">Failed</span>
                      )}
                      {!pciResults.ec2[check.key] && <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-2 border-b text-center">
                      <span className="text-gray-400">-</span>
                    </td>
                  </tr>
                ))}
                {/* S3 checks */}
                {s3Checks.map((check) => (
                  <tr key={check.key}>
                    <td className="px-4 py-2 border-b">{check.label}</td>
                    <td className="px-4 py-2 border-b text-center">
                      <span className="text-gray-400">-</span>
                    </td>
                    <td className="px-4 py-2 border-b text-center">
                      {pciResults.s3[check.key] === 'pass' && (
                        <span className="text-green-600 font-bold">Passed</span>
                      )}
                      {pciResults.s3[check.key] === 'fail' && (
                        <span className="text-red-600 font-bold">Failed</span>
                      )}
                      {!pciResults.s3[check.key] && <span className="text-gray-400">-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {foundationLoading && <div className="text-blue-700 font-semibold mb-2">Running AWS Foundation checks...</div>}
      {foundationError && <div className="text-red-600 mb-2">{foundationError}</div>}
      {foundationResults && (
        <div className="mb-6">
          <div className="font-bold text-lg mb-2">AWS Foundation Results</div>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300 rounded-lg bg-white text-base">
              <thead>
                <tr>
                  <th className="px-4 py-2 border-b text-left font-bold">Check Name</th>
                  <th className="px-4 py-2 border-b text-center font-bold">Result</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(foundationResults).map(([key, value]) => (
                  <tr key={key}>
                    <td className="px-4 py-2 border-b">{key.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-2 border-b text-center">
                      {value === 'pass' && <span className="text-green-600 font-bold">Passed</span>}
                      {value === 'fail' && <span className="text-red-600 font-bold">Failed</span>}
                      {value !== 'pass' && value !== 'fail' && <span className="text-gray-400">{value}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
// --- Rest of your unchanged App.js code below ---

function App() {
  const [activeTab, setActiveTab] = useState('Resource management');
  const [resourceTab, setResourceTab] = useState('EC2');
  const [region, setRegion] = useState('us-east-1');
  const [createService, setCreateService] = useState('S3');

  return (
    <div className="p-4 font-sans">
      <header className="flex items-center justify-between bg-orange-500 p-4 text-white rounded-lg shadow-md">
        <img
          src="/rapyder.png"
          alt="Logo"
          className="h-10 cursor-pointer"
          onClick={() => window.location.href = 'http://localhost:3002'}
        />
        <h1 className="text-2xl">Welcome to Rapyder Service Desk</h1>
      </header>

      <nav className="flex space-x-4 mt-4">
        {['Monitoring', 'Resource management', 'Resource creation', 'Standalone Automation', 'Security'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* Monitoring Tab */}
      {activeTab === 'Monitoring' && <MonitoringDashboard region={region} />}

      {/* Resource Creation Tab */}
      {activeTab === 'Resource creation' && (
        <div className="mt-4">
          <div className="mb-4">
            <label className="font-medium mr-2">Region:</label>
            <select
              value={region}
              onChange={e => setRegion(e.target.value)}
              className="border p-1 rounded"
            >
              <option value="us-east-1">us-east-1</option>
              <option value="us-west-2">us-west-2</option>
              <option value="ap-south-1">ap-south-1</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="font-medium mr-2">Select Service:</label>
            <select
              value={createService}
              onChange={e => setCreateService(e.target.value)}
              className="border p-1 rounded"
            >
              <option value="S3">S3</option>
              <option value="EC2">EC2</option>
              <option value="VPC">VPC</option>
              <option value="ECS">ECS</option>
            </select>
          </div>

          {createService === 'S3' && <S3CreateForm region={region} />}
          {createService === 'EC2' && <EC2CreateForm region={region} />}
          {createService === 'VPC' && <VPCCreateForm region={region} />}
          {createService === 'ECS' && <ECSCreateForm region={region} />}
        </div>
      )}

      {/* Standalone Automation Tab */}
      {activeTab === 'Standalone Automation' && <StandaloneAutomation />}
      {activeTab === 'Billing Information' && <BillingDashboard />}

      {/* Resource Management Tab */}
      {activeTab === 'Resource management' && (
        <div className="mt-4">
          <div className="mb-4">
            <label className="font-medium mr-2">Region:</label>
            <select
              value={region}
              onChange={e => setRegion(e.target.value)}
              className="border p-1 rounded"
            >
              <option value="us-east-1">us-east-1</option>
              <option value="us-west-2">us-west-2</option>
              <option value="ap-south-1">ap-south-1</option>
            </select>
          </div>

          <nav className="flex space-x-4 mb-4">
            {['EC2', 'S3', 'VPC', 'RDS'].map(tab => (
              <button
                key={tab}
                onClick={() => setResourceTab(tab)}
                className={`px-4 py-2 rounded ${resourceTab === tab ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
              >
                {tab}
              </button>
            ))}
          </nav>

          {resourceTab === 'EC2' ? (
            <EC2Dashboard region={region} />
          ) : (
            <Placeholder title={resourceTab} />
          )}
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'Security' && <SecurityTab />}
    </div>
  );
}

function renderDetails(item) {
  // Helper for rules
  const renderRule = (rule, idx) => (
    <div key={idx} className="mb-1 ml-2 p-1 bg-gray-100 rounded">
      <div>
        <b>Protocol:</b> {rule.IpProtocol}
        {rule.IpProtocol === "-1" && <span className="text-red-600 font-semibold"> (open for all)</span>}
      </div>
      {rule.FromPort !== undefined && rule.FromPort !== null && (
        <div><b>FromPort:</b> {rule.FromPort}</div>
      )}
      {rule.ToPort !== undefined && rule.ToPort !== null && (
        <div><b>ToPort:</b> {rule.ToPort}</div>
      )}
      {Array.isArray(rule.IpRanges) && rule.IpRanges.length > 0 && (
        <div>
          <b>CidrIp:</b>{" "}
          {rule.IpRanges.map((ip, i) => ip.CidrIp).filter(Boolean).join(', ')}
        </div>
      )}
    </div>
  );

  // Array of objects (list of failed SGs)
  if (Array.isArray(item)) {
    return (
      <div>
        {item.map((sg, idx) => (
          <div key={idx} className="mb-3 p-2 border rounded bg-gray-50">
            <div><b>VpcId:</b> {sg.VpcId}</div>
            <div><b>GroupId:</b> {sg.GroupId}</div>
            <div><b>Region:</b> {sg.Region}</div>
            <div><b>Reason:</b> {sg.Reason}</div>
            {sg.FailedInboundRules && sg.FailedInboundRules.length > 0 && (
              <div>
                <b>Failed Inbound Rules:</b>
                {sg.FailedInboundRules.map(renderRule)}
              </div>
            )}
            {sg.FailedOutboundRules && sg.FailedOutboundRules.length > 0 && (
              <div>
                <b>Failed Outbound Rules:</b>
                {sg.FailedOutboundRules.map(renderRule)}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Single object (for other details)
  if (typeof item === "object" && item !== null) {
    // Only show important keys
    const keysToShow = ["VpcId", "GroupId", "Region", "Reason", "FailedInboundRules", "FailedOutboundRules"];
    return (
      <div className="mb-2 p-2 bg-gray-50 rounded border">
        {Object.entries(item)
          .filter(([key]) => keysToShow.includes(key))
          .map(([key, value], idx) => (
            <div key={idx}>
              <span className="font-semibold">{key}:</span>{" "}
              {typeof value === "object" ? renderDetails(value) : String(value)}
            </div>
          ))}
      </div>
    );
  }

  // String or number
  return String(item);
}

export default App;