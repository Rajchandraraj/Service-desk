import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import AlarmGraph from '../components/AlarmGraph';
import { API_BASE_URL } from '../config';

const REGIONS = ['us-east-1', 'us-west-2', 'ap-south-1'];

function MonitoringDashboard() {
  const [alarms, setAlarms] = useState([]);
  const [selected, setSelected] = useState(null);
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [graphAlarm, setGraphAlarm] = useState(null);
  const [instanceId, setInstanceId] = useState(null);
  const [metricName, setMetricName] = useState('CPUUtilization');
  const [timeWindow, setTimeWindow] = useState('1h');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [metricData, setMetricData] = useState([]);

  useEffect(() => {
    setAlarms([]);
    setSelected(null);
    setMetrics({});
    setError('');
    
    Promise.all(
      REGIONS.map(region =>
        axios.get(`${API_BASE_URL}/ec2/alarms/${region}`)
          .then(res => res.data.map(alarm => ({ ...alarm, region })))
          .catch(() => [])
      )
    ).then(results => {
      const merged = results.flat();
      setAlarms(merged);
    });
  }, []);

  useEffect(() => {
    if (instanceId) {
      let url = `${API_BASE_URL}/ec2/ec2/metrics/${selected.region}/${instanceId}?metric=${metricName}`;
      if (timeWindow !== "custom") {
        url += `&window=${timeWindow}`;
      } else if (startDate && endDate) {
        url += `&start=${startDate.toISOString()}&end=${endDate.toISOString()}`;
      }
      axios
        .get(url)
        .then((res) => setMetricData(res.data?.[metricName] || []))
        .catch(() => setMetricData([]));
    } else {
      setMetricData([
        { x: new Date(Date.now() - 600000).toISOString(), y: 0.3 },
        { x: new Date(Date.now() - 300000).toISOString(), y: 0.8 },
        { x: new Date().toISOString(), y: 0.5 }
      ]);
    }
  }, [selected, instanceId, metricName, timeWindow, startDate, endDate]);

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
    axios.get(`${API_BASE_URL}/ec2/ec2/metrics/${alarm.region}/${instanceId}`)
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
      <ul className="space-y-4">
        {alarms.map((alarm, idx) => (
          <React.Fragment key={alarm.name + alarm.region + idx}>
            <li
              className={
                `p-4 bg-white border-l-4 border-red-500 rounded shadow hover:shadow-lg hover:bg-red-50 transition
                ${alarm.state === 'ALARM' ? 'cursor-pointer hover:ring-2 hover:ring-blue-400' : ''}`
              }
              onClick={alarm.state === "ALARM" ? () => setGraphAlarm(alarm) : undefined}
            >
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-bold text-gray-800 text-base">{alarm.name || <i>No Name</i>}</span>
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">{alarm.region}</span>
                <span className={`text-xs px-2 py-0.5 rounded font-bold ${alarm.state === 'ALARM' ? 'bg-red-200 text-red-700' : 'bg-green-200 text-green-700'}`}>
                  {alarm.state || 'ALARM'}
                </span>
              </div>
              <div className="text-sm text-gray-700"><b>Metric:</b> {alarm.metric || <i>N/A</i>}</div>
              {alarm.dimensions && alarm.dimensions.length > 0 && (
                <div className="text-xs text-gray-600">
                  <b>Dimensions:</b>
                  <ul className="ml-4 list-disc">
                    {alarm.dimensions.map((d, i) => (
                      <li key={i} className="font-mono">{d.Name} = {d.Value}</li>
                    ))}
                  </ul>
                </div>
              )}
              {alarm.reason && (
                <div className="text-xs text-gray-600 mt-1">
                  <b>Reason:</b> {alarm.reason}
                </div>
              )}
              <div className="text-xs text-gray-500 mt-1">
                <b>Last Updated:</b> {alarm.lastUpdated ? new Date(alarm.lastUpdated).toLocaleString() : <i>N/A</i>}
              </div>
            </li>
            {/* Graph just after this alarm, between alarms */}
            {graphAlarm && graphAlarm.name === alarm.name && graphAlarm.region === alarm.region && (
              <div className="mb-8">
                <AlarmGraph alarm={graphAlarm} onClose={() => setGraphAlarm(null)} />
              </div>
            )}
          </React.Fragment>
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