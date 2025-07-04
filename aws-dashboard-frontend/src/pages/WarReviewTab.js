import React, { useState } from "react";
import WarCreateStackForm from "../components/WarCreateStackForm";

export default function WarReviewTab({ region }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="mt-6">
      <h2 className="text-2xl font-bold mb-4">WAR Review - CloudFormation Stack</h2>
      {!showForm && (
        <button
          className="bg-purple-600 text-white px-4 py-2 rounded"
          onClick={() => setShowForm(true)}
        >
          Create Stack
        </button>
      )}
      {showForm && <WarCreateStackForm onClose={() => setShowForm(false)} region={region} />}
    </div>
  );
}