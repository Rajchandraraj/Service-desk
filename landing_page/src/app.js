import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import './index.css';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <header className="bg-gray-800 text-white p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-4">
          <img src="/rapyder.png" alt="Logo" className="h-10" />
          <h1 className="text-xl font-bold">Welcome to Rapyder Service Desk</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto mt-12 bg-white p-8 rounded-lg shadow-lg text-center">
        <h2 className="text-2xl font-semibold text-gray-700 mb-6">
          Select Your Cloud Provider
        </h2>

        <div className="flex justify-center gap-10 mb-4">
          {/* AWS */}
          <div>
            <button
              onClick={() => navigate('/aws')}
              className="p-3 border border-gray-300 rounded-xl shadow-sm hover:shadow-md transition duration-200"
            >
              <img src="/aws-logo.png" alt="AWS" className="h-12 w-auto" />
            </button>
          </div>

          {/* Azure */}
          <div>
            <button
              onClick={() => navigate('/azure')}
              className="p-3 border border-gray-300 rounded-xl shadow-sm hover:shadow-md transition duration-200"
            >
              <img src="/azure-logo.png" alt="Azure" className="h-12 w-auto" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

// Placeholder pages
function AWSPage() {
  return <div className="text-center p-8">Welcome to the AWS Dashboard</div>;
}

function AzurePage() {
  return <div className="text-center p-8">Welcome to the Azure Dashboard</div>;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/aws" element={<AWSPage />} />
        <Route path="/azure" element={<AzurePage />} />
      </Routes>
    </Router>
  );
}

export default App;
