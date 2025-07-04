import React from "react";
import { logout } from "../logging_api/auth";

export default function Dashboard({ user }) {
  const handleLogout = async () => {
    await logout();
    window.location.reload(); // Or use a callback to clear user state in App.js
  };

  return (
    <div className="p-8">
      <header className="flex items-center justify-between mb-8">
        <img
          src="/rapyder.png"
          alt="Rapyder Logo"
          className="h-12"
        />
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-4 py-2 rounded"
        >
          Logout
        </button>
      </header>
      <h1 className="text-2xl font-bold mb-4">Welcome, {user.email}!</h1>
      <nav className="mb-6">
        <ul className="flex gap-4">
          <li>
            <a href="#monitoring" className="text-blue-600 hover:underline">Monitoring</a>
          </li>
          <li>
            <a href="#resource-management" className="text-blue-600 hover:underline">Resource Management</a>
          </li>
          <li>
            <a href="#security" className="text-blue-600 hover:underline">Security</a>
          </li>
          <li>
            <a href="#billing" className="text-blue-600 hover:underline">Billing</a>
          </li>
        </ul>
      </nav>
      <div>
        <p className="text-gray-700">
          Select a section above to get started with your AWS Service Desk dashboard.
        </p>
      </div>
    </div>
  );
}
