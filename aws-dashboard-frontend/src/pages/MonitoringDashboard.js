import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { AWS_BACKEND_HOST } from '../config';

const REGIONS = ['us-east-1', 'us-west-2', 'ap-south-1'];

function MonitoringDashboard() {
  const [alarms, setAlarms] = useState([]);
  const [selected, setSelected] = useState(null);
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setAlarms([]);
    setSelected(null);
    setMetrics({});
    setError('');
    
    Promise.all(
      REGIONS.map(region =>
        axios.get(`${AWS_BACKEND_HOST}/alarms/${region}`)
          .then(res => res.data.map(alarm => ({ ...alarm, region })))
          .catch(() => [])
      )
    ).then(results => {
      const merged = results.flat();
      setAlarms(merged);
    });
  }, []);

  const handleSelectAlarm = (alarm) => {
    if (!alarm || !alarm.dimensions) {
      setError('Invalid alarm structure');
      return;
    }

    const instanceId = alarm.dimensions.find(d => d.Name === 'InstanceId')?.Value;
    if (!instanceId) {
      setError('InstanceId not found in alarm dimensions');
      return;
    }

    setSelected(alarm);
    setLoading(true);
    setError('');
    axios.get(`${AWS_BACKEND_HOST}/metrics/${alarm.region}/${instanceId}`)
      .then(res => {
        setMetrics(res.data);
      })
      .catch(() => {
        setMetrics({});
        setError('Failed to load metrics.');
      })
      .finally(() => setLoading(false));
  };

  const renderChart = () => {
    if (!metrics?.CPUUtilization || !Array.isArray(metrics.CPUUtilization) || metrics.CPUUtilization.length === 0) {
      return <div className="text-center text-gray-500">No data available for chart</div>;
    }

    return (
      <div className="p-4 bg-white rounded shadow">
        <h3 className="text-lg font-semibold mb-2">CPUUtilization</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={metrics.CPUUtilization}>
            <XAxis dataKey="x" tickFormatter={(v) => new Date(v).toLocaleTimeString()} />
            <YAxis />
            <Tooltip labelFormatter={(v) => new Date(v).toLocaleString()} />
            <Line type="monotone" dataKey="y" stroke="#ef4444" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="mt-4">
      <h2 className="text-xl font-bold mb-4">CloudWatch Alarms (State: ALARM)</h2>
      {alarms.length === 0 && <p className="text-gray-500">No alarms found across regions.</p>}
      <ul className="space-y-2 mb-6">
        {alarms.map(alarm => (
          <li key={alarm.name + alarm.region} className="p-3 bg-red-100 border-l-4 border-red-500 rounded cursor-pointer" onClick={() => handleSelectAlarm(alarm)}>
            <strong>{alarm.name}</strong> — {alarm.metric} — <code>{alarm.dimensions?.map(d => `${d.Name}=${d.Value}`).join(', ')}</code> — <span className="text-sm italic text-gray-700">{alarm.region}</span>
          </li>
        ))}
      </ul>

      {selected && (
        <>
          {loading && <div className="text-center text-gray-500">Loading metric chart...</div>}
          {!loading && error && <div className="text-center text-red-600">{error}</div>}
          {!loading && !error && renderChart()}
        </>
      )}
    </div>
  );
}

export default MonitoringDashboard;