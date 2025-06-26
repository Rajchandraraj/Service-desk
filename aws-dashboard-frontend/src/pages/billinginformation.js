import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import html2canvas from 'html2canvas';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  LineChart, Line, ResponsiveContainer
} from 'recharts';
import { API_BASE_URL } from '../config';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

const BillingDashboard = () => {
  const region = "us-east-1"; // hardcoded

  const [start1, setStart1] = useState("2025-06-01");
  const [end1, setEnd1] = useState("2025-06-05");
  const [start2, setStart2] = useState("2025-06-06");
  const [end2, setEnd2] = useState("2025-06-10");
  const [comparisonData, setComparisonData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [anomalySummary, setAnomalySummary] = useState(null);
  const chartRef = useRef();
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const fetchBillingComparison = useCallback(async () => {
    try {
      const fetchRange = async (start, end) => {
  const res = await axios.get(`${API_BASE_URL}/utility/api/billing`, {
    params: { start, end, region }
  });
  return res.data.ResultsByTime;
};

      const [range1, range2] = await Promise.all([
        fetchRange(start1, end1),
        fetchRange(start2, end2)
      ]);

      const aggregate = (results) => {
        const data = {};
        results.forEach(day => {
          day.Groups.forEach(group => {
            const service = group.Keys[0];
            const cost = parseFloat(group.Metrics.UnblendedCost.Amount);
            data[service] = (data[service] || 0) + cost;
          });
        });
        return data;
      };

      const data1 = aggregate(range1);
      const data2 = aggregate(range2);

      const allServices = Array.from(new Set([...Object.keys(data1), ...Object.keys(data2)]));
      const comparison = allServices.map(service => ({
        service,
        range1: data1[service] || 0,
        range2: data2[service] || 0
      }));
      setComparisonData(comparison);

      const trend = range2.map(day => ({
        date: day.TimePeriod.Start,
        total: day.Groups.reduce((sum, group) => sum + parseFloat(group.Metrics.UnblendedCost.Amount), 0)
      }));
      setTrendData(trend);
    } catch (error) {
      console.error("Error fetching billing data", error);
    }
  }, [start1, end1, start2, end2, region]);

  const fetchAnomalySummary = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/anomaly-summary`);
      setAnomalySummary(res.data);
    } catch (err) {
      console.error("Failed to fetch anomaly summary", err);
    }
  };

  useEffect(() => {
    fetchBillingComparison();
    fetchAnomalySummary();
  }, [fetchBillingComparison]);

  // Sync state with URL params on mount or when params change
useEffect(() => {
  const params = new URLSearchParams(location.search);
  setStart1(params.get('start1') || "2025-06-01");
  setEnd1(params.get('end1') || "2025-06-05");
  setStart2(params.get('start2') || "2025-06-06");
  setEnd2(params.get('end2') || "2025-06-10");
}, [location.search]);

  const exportAsImage = async () => {
    const canvas = await html2canvas(chartRef.current);
    const link = document.createElement('a');
    link.download = 'billing-dashboard.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const exportAsCSV = () => {
    const headers = ['Service', 'Range 1', 'Range 2'];
    const rows = comparisonData.map(row => [row.service, row.range1.toFixed(2), row.range2.toFixed(2)]);
    const csvContent = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'billing-comparison.csv';
    link.click();
  };

  const updateQuery = (newParams) => {
    const params = new URLSearchParams(location.search);
    Object.entries(newParams).forEach(([key, value]) => {
      params.set(key, value);
    });
    navigate(`${location.pathname}?${params.toString()}`);
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="p-4" ref={chartRef}>
      <h2 className="text-xl font-bold mb-4">AWS Billing Comparison Dashboard</h2>

      {/* Anomaly Summary Section */}
      {anomalySummary && (
        <div className="bg-yellow-100 border border-yellow-400 rounded p-4 mb-6">
          <h3 className="text-lg font-semibold mb-2">Cost Anomaly Detection Summary (MTD)</h3>
          <p><strong>Anomalies detected:</strong> {anomalySummary.anomalies || 0}</p>
          <p><strong>Total cost impact:</strong> ${anomalySummary.impact || '-'}</p>
          <p><strong>Total spend:</strong> ${anomalySummary.spend || '0.00'}</p>
          <p><strong>Spend change (vs. last month):</strong> {anomalySummary.percent_change || '0'}%</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <h4 className="font-semibold">Range 1</h4>
          <input
  type="date"
  max={today}
  value={start1}
  onChange={e => {
    setStart1(e.target.value);
    updateQuery({ start1: e.target.value });
  }}
  className="border p-2 mr-2"
/>
<input
  type="date"
  max={today}
  value={end1}
  onChange={e => {
    setEnd1(e.target.value);
    updateQuery({ end1: e.target.value });
  }}
  className="border p-2"
/>
        </div>
        <div>
          <h4 className="font-semibold">Range 2</h4>
          <input
  type="date"
  max={today}
  value={start2}
  onChange={e => {
    setStart2(e.target.value);
    updateQuery({ start2: e.target.value });
  }}
  className="border p-2 mr-2"
/>
<input
  type="date"
  max={today}
  value={end2}
  onChange={e => {
    setEnd2(e.target.value);
    updateQuery({ end2: e.target.value });
  }}
  className="border p-2"
/>
        </div>
      </div>

      {/* Remove region select dropdown */}
      <div className="flex flex-wrap gap-4 mb-6">
        <button onClick={fetchBillingComparison} className="bg-blue-600 text-white px-4 py-2 rounded">Compare</button>
        <button onClick={exportAsImage} className="bg-green-600 text-white px-4 py-2 rounded">Export Image</button>
        <button onClick={exportAsCSV} className="bg-gray-800 text-white px-4 py-2 rounded">Export CSV</button>
      </div>

      {/* Comparison Bar Chart */}
      <div className="mb-10">
        <h3 className="font-semibold mb-2">Cost Comparison</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={comparisonData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="service" />
            <YAxis />
            <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
            <Legend />
            <Bar dataKey="range1" fill="#8884d8" name="Range 1" />
            <Bar dataKey="range2" fill="#82ca9d" name="Range 2" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Trend Line Chart */}
      <div className="mb-10">
        <h3 className="font-semibold mb-2">Daily Cost Trend (Range 2)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
            <Legend />
            <Line type="monotone" dataKey="total" stroke="#ff7300" name="Daily Total" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default BillingDashboard;
