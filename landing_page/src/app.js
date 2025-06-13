import React from 'react';
import './index.css';

function App() {
  const redirectTo = (url) => {
    window.location.href = url;
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
  {/* Header */}
  <header className="bg-red-800 text-white p-4 flex items-center justify-between rounded-lg shadow-md">
    
      <img src="/rapyder.png" alt="Logo" className="h-10" />
      <h1 className="text-2xl font-bold">Welcome to Rapyder Service Desk</h1>
    
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
      </div>

      {/* Azure */}
      <div>
        <button
          onClick={() => redirectTo('http://localhost:5173')}
          className="p-3 border border-gray-300 rounded-xl shadow-sm hover:shadow-md transition duration-200"
        >
          <img src="/azure-logo.png" alt="Azure" className="h-12 w-auto" />
        </button>
      </div>
    </div>

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


  </main>
</div>
  );
}

export default App;
