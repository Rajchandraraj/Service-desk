import React, { useState } from 'react';
import EC2Dashboard from './pages/EC2Dashboard.js';
import MonitoringDashboard from './pages/MonitoringDashboard.js';
import S3CreateForm from './pages/S3CreateForm.js';
import EC2CreateForm from './pages/EC2CreateForm.js';
import StandaloneAutomation from './pages/standaloneautomation.js';
import VPCCreateForm from './pages/VPCCreateForm.js';
import ECSCreateForm from './pages/ECSCreateForm.js';

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
        {['Monitoring', 'Resource management', 'Resource creation', 'Standalone Automation'].map(tab => (
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
      {/* Chatbot Floating Button and Iframe */}
{/* Chatbot Floating Button and Iframe */}
<div className="fixed bottom-4 right-4 z-50">
  {/* Chat Button with Custom Image */}
  <button
    onClick={() => {
      const iframe = document.getElementById('chatbot-frame');
      iframe.classList.toggle('hidden');
    }}
    className="w-20 h-20 rounded-full shadow-xl border-2 border-white overflow-hidden hover:scale-105 transition-transform duration-300"
    title="Chat with us"
  >
    <img
      src="/chat-icon.jpg" // replace with your actual image path
      alt="Chatbot"
      className="w-full h-full object-cover"
    />
  </button>

  {/* Iframe Chatbot - Larger Size */}
  <iframe
    id="chatbot-frame"
    src="https://www.chatbase.co/chatbot-iframe/MK90PJJDvw9IvDVAnfoD-" // replace with your chatbot URL
    className="hidden mt-3 w-[400px] h-[600px] rounded-2xl shadow-2xl border border-gray-300 bg-white"
    style={{ position: 'absolute', bottom: '90px', right: '0' }}
  ></iframe>
</div>

    </div>
  );

}

export default App;
