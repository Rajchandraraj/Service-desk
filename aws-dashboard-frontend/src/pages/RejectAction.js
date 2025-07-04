// src/pages/RejectAction.js
import React, { useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

export default function RejectAction() {
  const { requestId } = useParams();
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const handleReject = async () => {
    setStatus("loading");
    try {
      await axios.post(`${BACKEND_URL}/approval/reject/${requestId}`);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(
        err.response?.data?.error ||
        "Failed to reject request."
      );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      {status === "idle" && (
        <button
          onClick={handleReject}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-bold"
        >
          Reject
        </button>
      )}
      {status === "loading" && <p>Processing rejection...</p>}
      {status === "success" && (
        <p className="text-red-600 font-bold">Request rejected!</p>
      )}
      {status === "error" && <p className="text-red-600 font-bold">{error}</p>}
    </div>
  );
}