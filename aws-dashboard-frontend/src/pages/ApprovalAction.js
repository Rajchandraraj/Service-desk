import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

export default function ApprovalAction() {
  const { requestId } = useParams();
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const approve = async () => {
      try {
        const res = await axios.post(`${BACKEND_URL}/approval/approve/${requestId}`);
        setStatus("success");
        toast.success(res.data.message || "Request approved! You can now resize/start/stop/install this instance.", {
          position: "top-right",
          rtl: true,
        });
      } catch (err) {
        setStatus("error");
        const msg =
          err.response && err.response.data && err.response.data.message
            ? err.response.data.message
            : "Request not found or already processed.";
        setError(msg);
        toast.error(msg, { position: "top-right", rtl: true });
      }
    };
    approve();
  }, [requestId]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      {status === "loading" && <p>Processing approval...</p>}
      {status === "success" && (
        <p className="text-green-600 font-bold">Request approved! You can now resize/start/stop/install this instance.</p>
      )}
      {status === "error" && (
        <div className="text-red-600 font-bold text-xl">
          {error === "Request not found or already processed."
            ? "This approval link has already been used or the request is no longer pending."
            : error}
        </div>
      )}
    </div>
  );
}