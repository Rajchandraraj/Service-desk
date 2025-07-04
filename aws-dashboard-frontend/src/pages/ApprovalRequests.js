import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { toast } from "react-toastify";

const fetchPendingRequests = async (setRequests) => {
  const res = await axios.get(`${API_BASE_URL}/approval/pending`);
  setRequests(res.data.requests || []);
};

export default function ApprovalRequests() {
  const [requests, setRequests] = useState([]);
  const [submitted, setSubmitted] = useState(false); // Add this line
  const [duplicateError, setDuplicateError] = useState(""); // Add this line

  useEffect(() => {
    fetchPendingRequests(setRequests);
    setDuplicateError("");
  }, []);

  useEffect(() => {
    if (submitted) {
      const timer = setTimeout(() => setSubmitted(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [submitted]);

  const handleAction = async (id, action) => {
    setDuplicateError(""); // Clear error before action
    setSubmitted(false);   // Reset submitted state
    try {
      await axios.post(`${API_BASE_URL}/approval/${action}/${id}`);
      await fetchPendingRequests(setRequests);
      if (action === "approve") {
        setSubmitted(true); // Show success message on page
        toast.success("Request approved!", { position: "top-right", rtl: true });
      } else if (action === "reject") {
        setSubmitted(true); // Show success message on page
        toast.info("Request rejected.", { position: "top-right", rtl: true });
      }
    } catch (err) {
      const msg =
        err.response && err.response.data && err.response.data.message
          ? err.response.data.message
          : "Action failed!";
      setDuplicateError(msg); // Show error on page
      toast.error(msg, { position: "top-right", rtl: true });
    }
  };

  const handleSubmit = async () => {
    // ...existing submission logic
    setSubmitted(true); // Add this line after successful submission
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Pending Approval Requests</h2>
      {requests.length === 0 ? (
        <div>No pending requests.</div>
      ) : (
        <table className="min-w-full bg-white shadow rounded">
          <thead>
            <tr>
              <th>Action</th>
              <th>Instance</th>
              <th>Region</th>
              <th>Requested By</th>
              <th>Reason</th>
              <th>Approve/Reject</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(req => (
              <tr key={req.request_id}>
                <td>{req.action}</td>
                <td>{req.instance_id}</td>
                <td>{req.region}</td>
                <td>{req.requested_by}</td>
                <td>{req.details?.reason}</td>
                <td>
                  <button onClick={() => handleAction(req.request_id, "approve")} className="bg-green-500 text-white px-2 py-1 rounded mr-2">Approve</button>
                  <button onClick={() => handleAction(req.request_id, "reject")} className="bg-red-500 text-white px-2 py-1 rounded">Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {duplicateError && (
        <div className="mb-4 text-red-600 font-semibold text-center">
          {duplicateError}
        </div>
      )}
      {submitted && ( // Add this block to show the submission message
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h3 className="font-bold mb-2">Request Approval</h3>
            <div className="text-green-600 font-semibold text-center py-6">
              Your request has been sent to the respective engineer. Please wait for approval.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}