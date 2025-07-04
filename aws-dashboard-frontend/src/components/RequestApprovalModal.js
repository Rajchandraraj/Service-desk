import React, { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { toast } from "react-toastify";

const sendBulkApprovals = async (instances, region, action, details) => {
  for (const instanceId of instances) {
    try {
      await axios.post(`${API_BASE_URL}/approval/request`, {
        action,
        instance_id: instanceId,
        region,
        requested_by: "l1@company.com",
        details
      });
      toast.success(`Approval requested for ${instanceId}`, { position: "top-right", rtl: true });
    } catch (err) {
      const msg =
        err.response && err.response.data && err.response.data.message
          ? err.response.data.message
          : "🚦 Approval already requested! Please wait for L2 engineer to approve or reject your previous request before submitting again.";
      toast.error(`Instance ${instanceId}: ${msg}`, { position: "top-right", rtl: true });
    }
  }
};

export default function RequestApprovalModal({ open, onClose, action, instanceId, region, onSubmitted, onError, refreshApprovals }) {
  const [reason, setReason] = useState("");
  const [ticketId, setTicketId] = useState("");
  const [priority, setPriority] = useState("");
  const [loading, setLoading] = useState(false);

  // Reset fields when modal closes
  React.useEffect(() => {
    if (!open) {
      setReason("");
      setTicketId("");
      setPriority("");
      setLoading(false);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/approval/request`, {
        action,
        instance_id: instanceId,
        region,
        requested_by: "l1@company.com",
        details: { reason, ticketId, priority }
      });
      setLoading(false);
      onSubmitted && onSubmitted(); // This will refresh approvals
      toast.success("Your request has been sent to the respective engineer. Please wait for approval.", { position: "top-right", rtl: true });
      setTimeout(() => { onClose && onClose(); }, 3000);
    } catch (err) {
      setLoading(false);
      const msg =
        err.response && err.response.data && err.response.data.message
          ? err.response.data.message
          :
      toast.error(msg, { position: "top-right", rtl: true });
      if (typeof onError === "function") onError(msg);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg w-96">
        <h3 className="font-bold mb-2">Request Approval</h3>
        {/* Ticket Metadata Section */}
        <div className="mb-3 text-sm text-gray-700">
          <label className="block mb-1 font-semibold">Ticket ID:</label>
          <input
            className="border p-1 rounded w-full mb-2"
            value={ticketId}
            onChange={e => setTicketId(e.target.value)}
            placeholder="Enter ticket ID"
          />
          <label className="block mb-1 font-semibold">Priority:</label>
          <select
            className="border p-1 rounded w-full mb-2"
            value={priority}
            onChange={e => setPriority(e.target.value)}
          >
            <option value="">Select priority</option>
            <option value="Low">Low</option>
            <option value="Normal">Normal</option>
            <option value="High">High</option>
          </select>
        </div>
        <p className="mb-2">Why do you want to {action} this instance?</p>
        <textarea
          className="border w-full p-2 rounded mb-3"
          rows={3}
          value={reason}
          onChange={e => setReason(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={() => {
              setLoading(false);
              onClose();
            }}
            className="px-3 py-1 bg-gray-200 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !reason || !ticketId || !priority}
            className="px-3 py-1 bg-blue-600 text-white rounded"
          >
            {loading ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

