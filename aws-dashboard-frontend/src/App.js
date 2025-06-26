import React, { useState, useEffect } from 'react';
import EC2Dashboard from './pages/EC2Dashboard.js';
import MonitoringDashboard from './pages/MonitoringDashboard.js';
import S3CreateForm from './pages/S3CreateForm.js';
import EC2CreateForm from './pages/EC2CreateForm.js';
import StandaloneAutomation from './pages/standaloneautomation.js';
import VPCCreateForm from './pages/VPCCreateForm.js';
import ECSCreateForm from './pages/ECSCreateForm.js';
import BillingDashboard from './pages/billinginformation.js'; // <-- Sahi file ka import
import axios from 'axios';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';

const BACKEND_URL = 'http://localhost:5000';
const API_BASE_URL = 'http://localhost:5001'; // <-- Add your API base URL here


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
  const navigate = useNavigate();
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
          onChange={e => {
            setRegion(e.target.value);
            navigate(`/security/${expanded || 'pci'}/${e.target.value}`);
          }}
          className="border p-2 rounded text-base font-semibold"
        >
          <option value="us-east-1">us-east-1</option>
          <option value="us-west-2">us-west-2</option>
          <option value="ap-south-1">ap-south-1</option>
        </select>
        <button
          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-xl font-bold text-base shadow hover:scale-105 transition"
          onClick={async () => {
            navigate(`/security/pci/${region}`);
            await handlePCI();
          }}
          disabled={pciLoading}
        >
          {pciLoading ? 'Running PCI...' : 'PCI Checks'}
        </button>
        <button
          className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 py-2 rounded-xl font-bold text-base shadow hover:scale-105 transition"
          onClick={async () => {
            navigate(`/security/foundation/${region}`);
            await handleAWSFoundation();
          }}
          disabled={foundationLoading}
        >
          {foundationLoading ? 'Running Foundation...' : 'AWS Foundation Checks'}
        </button>
      </div>

      {/* EC2/S3 buttons row - Always visible below region+PCI/Foundation */}
      <div className="flex gap-3 mb-6">
        {/* EC2 Security Checks button */}
        <button
          className={`min-w-[150px] px-3 py-2 rounded-lg font-semibold text-sm shadow transition 
            ${expanded === 'ec2'
              ? 'bg-gradient-to-r from-blue-600 to-blue-400 text-white scale-105'
              : 'bg-white border border-blue-300 text-blue-700 hover:bg-blue-50'}`}
          onClick={() => {
            navigate(`/security/EC2-Security-Checks/${region}`);
            handleExpand('ec2');
          }}
        >
          <span className="inline-block mr-2 align-middle">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><rect width="20" height="8" x="2" y="7" fill="none" stroke="currentColor" strokeWidth="2" rx="2"/><path fill="currentColor" d="M8 11h8v2H8z"/></svg>
          </span>
          EC2 Security Checks
        </button>
        {/* S3 Security Checks button */}
        <button
          className={`min-w-[150px] px-3 py-2 rounded-lg font-semibold text-sm shadow transition 
            ${expanded === 's3'
              ? 'bg-gradient-to-r from-green-600 to-green-400 text-white scale-105'
              : 'bg-white border border-green-300 text-green-700 hover:bg-green-50'}`}
          onClick={() => {
            navigate(`/security/S3-Security-Checks/${region}`);
            handleExpand('s3');
          }}
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
                  key === 'foundation checks' ? (
                    <tr key={key}>
                      <td className="px-4 py-2 border-b"></td>
                      <td className="px-4 py-2 border-b text-center">
                        {Array.isArray(value) && (
                          <table className="min-w-full border border-gray-200 rounded bg-gray-50 text-sm my-2">
                            <tbody>
                              {value.map((item, idx) => (
                                <tr key={idx}>
                                  <td className="px-2 py-1 border-b font-semibold">{item.name || '-'}</td>
                                  <td className="px-2 py-1 border-b text-center">
                                    <span className={`font-bold ${item.status === 'PASS' ? 'text-green-600' : item.status === 'FAIL' ? 'text-red-600' : 'text-gray-700'}`}>
                                      {item.status === 'PASS' ? 'Passed' : item.status === 'FAIL' ? 'Failed' : item.status}
                                    </span>
                                  </td>
                                  <td className="px-2 py-1 border-b">{item.description || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  ) : (
                    <tr key={key}>
                      <td className="px-4 py-2 border-b">{key.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-2 border-b text-center">
                        {value === 'pass' && <span className="text-green-600 font-bold">Passed</span>}
                        {value === 'fail' && <span className="text-red-600 font-bold">Failed</span>}
                        {value !== 'pass' && value !== 'fail' && (
                          <div className="text-gray-700 text-left">
                            {Array.isArray(value) ? (
                              <table className="min-w-full border border-gray-200 rounded bg-gray-50 text-sm my-2">
                                <tbody>
                                  {value.map((item, idx) => (
                                    <tr key={idx}>
                                      <td className="px-2 py-1 border-b font-semibold">{item.name || '-'}</td>
                                      <td className="px-2 py-1 border-b text-center">
                                        <span className={`font-bold ${item.status === 'PASS' ? 'text-green-600' : item.status === 'FAIL' ? 'text-red-600' : 'text-gray-700'}`}>
                                          {item.status === 'PASS' ? 'Passed' : item.status === 'FAIL' ? 'Failed' : item.status}
                                        </span>
                                      </td>
                                      <td className="px-2 py-1 border-b">{item.description || '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              typeof value === 'object'
                                ? <span className="font-mono text-xs">{JSON.stringify(value, null, 2)}</span>
                                : <span>{String(value)}</span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
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
        {['Monitoring', 'Resource management', 'Resource creation', 'Standalone Automation', 'Billing Information', 'Security'].map(tab => (
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

function MainNav() {
  const navigate = useNavigate();
  return (
    <nav className="flex space-x-4 mt-4">
      <button onClick={() => navigate('/monitoring')} className="px-4 py-2 rounded bg-gray-200">Monitoring</button>
      <button onClick={() => navigate('/resourcemanagement/ec2')} className="px-4 py-2 rounded bg-gray-200">Resource Management</button>
      <button onClick={() => navigate('/resourcecreation/s3')} className="px-4 py-2 rounded bg-gray-200">Resource Creation</button>
      <button onClick={() => navigate('/standaloneautomation')} className="px-4 py-2 rounded bg-gray-200">Standalone Automation</button>
      <button onClick={() => navigate('/billinginformation')} className="px-4 py-2 rounded bg-gray-200">Billing Information</button>
      <button onClick={() => navigate('/security')} className="px-4 py-2 rounded bg-gray-200">Security</button>
    </nav>
  );
}

// Place this just before export default App;
function AppWithRouter() {
  return (
    <BrowserRouter>
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
        <MainNav />
        <Routes>
          <Route path="/monitoring" element={<MonitoringDashboard />} />
          <Route path="/resourcemanagement/:service?/:region?" element={<ResourceManagementPage />} />
          <Route path="/resourcecreation/:service?/:region?" element={<ResourceCreationPage />} />
          
          <Route path="/standaloneautomation" element={<StandaloneAutomation />} />
          <Route path="/billinginformation/:start1?/:end1?/:region?/:start2?/:end2?" element={<BillingDashboard />} />
         <Route path="/security/:section?/:region?" element={<SecurityTab />} />
        </Routes>
        {/* Chatbot Floating Button and Iframe */}
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={() => {
              const iframe = document.getElementById('chatbot-frame');
              iframe.classList.toggle('hidden');
            }}
            className="w-20 h-20 rounded-full shadow-xl border-2 border-white overflow-hidden hover:scale-105 transition-transform duration-300"
            title="Chat with us"
          >
            <img
              src="/chat-icon.jpg"
              alt="Chatbot"
              className="w-full h-full object-cover"
            />
          </button>
          <iframe
            id="chatbot-frame"
            src="https://www.chatbase.co/chatbot-iframe/MK90PJJDvw9IvDVAnfoD-"
            className="hidden mt-3 w-[400px] h-[600px] rounded-2xl shadow-2xl border border-gray-300 bg-white"
            style={{ position: 'absolute', bottom: '90px', right: '0' }}
          ></iframe>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default AppWithRouter;
function ResourceCreationSelection() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-4 mt-8">
      <button onClick={() => navigate('/resourcemanagement/ec2')} className="px-4 py-2 rounded bg-gray-200">Resource Management</button>
      <button onClick={() => navigate('/resourcecreation/s3')} className="px-4 py-2 rounded bg-blue-200">Create S3</button>
      <button onClick={() => navigate('/resourcecreation/ec2')} className="px-4 py-2 rounded bg-blue-200">Create EC2</button>
      <button onClick={() => navigate('/resourcecreation/vpc')} className="px-4 py-2 rounded bg-blue-200">Create VPC</button>
      <button onClick={() => navigate('/resourcecreation/ecs')} className="px-4 py-2 rounded bg-blue-200">Create ECS</button>
    </div>
  );
}

function ResourceCreationPage() {
  const params = useParams();
  const navigate = useNavigate();

  // Service aur region ko URL se lo, default agar nahi ho to
  const serviceFromUrl = (params.service || 's3').toUpperCase();
  const regionFromUrl = params.region || 'us-east-1';

  // Jab region change ho, URL bhi update karo
  const handleRegionChange = (e) => {
    const newRegion = e.target.value;
    navigate(`/resourcecreation/${serviceFromUrl.toLowerCase()}/${newRegion}`);
  };

  // Jab service change ho, URL bhi update karo
  const handleServiceChange = (e) => {
    const newService = e.target.value;
    navigate(`/resourcecreation/${newService.toLowerCase()}/${regionFromUrl}`);
  };

  // Service ke hisaab se form render karo
  let form = null;
  if (serviceFromUrl === 'S3') form = <S3CreateForm region={regionFromUrl} />;
  else if (serviceFromUrl === 'EC2') form = <EC2CreateForm region={regionFromUrl} />;
  else if (serviceFromUrl === 'VPC') form = <VPCCreateForm region={regionFromUrl} />;
  else if (serviceFromUrl === 'ECS') form = <ECSCreateForm region={regionFromUrl} />;
  else form = <S3CreateForm region={regionFromUrl} />; // default

  return (
    <div className="mt-4">
      <div className="mb-4">
        <label className="font-medium mr-2">Region:</label>
        <select
          value={regionFromUrl}
          onChange={handleRegionChange}
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
          value={serviceFromUrl}
          onChange={handleServiceChange}
          className="border p-1 rounded"
        >
          <option value="S3">S3</option>
          <option value="EC2">EC2</option>
          <option value="VPC">VPC</option>
          <option value="ECS">ECS</option>
        </select>
      </div>

      {form}
    </div>
  );
}

function ResourceManagementPage() {
  const params = useParams();
  const navigate = useNavigate();

  // Service aur region ko URL se lo, default agar nahi ho to
  const serviceFromUrl = (params.service || 'ec2').toUpperCase();
  const regionFromUrl = params.region || 'us-east-1';

  // Jab region change ho, URL bhi update karo
  const handleRegionChange = (e) => {
    const newRegion = e.target.value;
    navigate(`/resourcemanagement/${serviceFromUrl.toLowerCase()}/${newRegion}`);
  };

  // Jab service/resourceTab change ho, URL bhi update karo
  const handleServiceChange = (tab) => {
    navigate(`/resourcemanagement/${tab.toLowerCase()}/${regionFromUrl}`);
  };

  return (
    <div className="mt-4">
      <div className="mb-4">
        <label className="font-medium mr-2">Region:</label>
        <select
          value={regionFromUrl}
          onChange={handleRegionChange}
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
            onClick={() => handleServiceChange(tab)}
            className={`px-4 py-2 rounded ${serviceFromUrl === tab ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
          >
            {tab}
          </button>
        ))}
      </nav>

      {serviceFromUrl === 'EC2' ? (
        <EC2Dashboard region={regionFromUrl} />
      ) : (
        <Placeholder title={serviceFromUrl} />
      )}
    </div>
  );
}