import React from 'react';
import './index.css';

function App() {
  const redirectTo = (url) => {
    window.location.href = url;
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* Header */}
      <header className="bg-gray-800 text-white p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-4">
          <img src="/rapyder.png" alt="Logo" className="h-10" />
          <h1 className="text-xl font-bold">Welcome to Rapyder Service Desk</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto mt-12 bg-white p-8 rounded-lg shadow-lg text-center">
        <h2 className="text-2xl font-semibold text-gray-700 mb-6">
          Select Your Cloud Provider
        </h2>

        <div className="flex justify-center gap-10 mb-4">
          {/* AWS */}
          <div>
            <button
              onClick={() => redirectTo('http://localhost:3000')}
              className="p-3 border border-gray-300 rounded-xl shadow-sm hover:shadow-md transition duration-200"
            >
              <img src="/aws-logo.png" alt="AWS" className="h-12 w-auto" />
            </button>
            <p className="text-sm text-gray-500 mt-2"></p>
          </div>

          {/* Azure */}
          <div>
            <button
              onClick={() => redirectTo('http://localhost:5173')}
              className="p-3 border border-gray-300 rounded-xl shadow-sm hover:shadow-md transition duration-200"
            >
              <img src="/azure-logo.png" alt="Azure" className="h-12 w-auto" />
            </button>
            <p className="text-sm text-gray-500 mt-2"></p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
