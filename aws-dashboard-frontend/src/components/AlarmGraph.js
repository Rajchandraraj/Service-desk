import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Label, CartesianGrid, Legend
} from "recharts";
import { FaGlobe, FaClock } from "react-icons/fa"; // npm install react-icons
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const AlarmGraph = ({ alarm, onClose,height = 250, width = "100%" }) => {
  const [metricData, setMetricData] = useState([]);
  const [showLocal, setShowLocal] = useState(false); // Toggle for time format
  const [timeWindow, setTimeWindow] = useState("1d");
  const [customRange, setCustomRange] = useState([null, null]);
  const [startDate, endDate] = customRange;
  const instanceId = alarm.dimensions?.find((d) => d.Name === "InstanceId")?.Value;
  const threshold = alarm.threshold || 0.7;

  // Dynamically get metric name (default to CPUUtilization)
  const metricName = alarm.metric || "CPUUtilization";
  // For display: remove camel case, add space, etc.
  const metricLabel = metricName.replace(/([a-z])([A-Z])/g, '$1 $2');

  useEffect(() => {
    if (instanceId) {
      axios
        .get(`${API_BASE_URL}/ec2/ec2/metrics/${alarm.region}/${instanceId}`)
        .then((res) => {
          console.log("API Response for", metricName, res.data); // <-- yeh line add karo
          setMetricData(res.data?.[metricName] || []);
        })
        .catch(() => setMetricData([]));
    } else {
      // No sample data, just set empty array
      setMetricData([]);
    }
  }, [alarm, instanceId, metricName]);

  // Helper for time formatting
  const formatTime = (v) =>
    showLocal
      ? new Date(v).toLocaleTimeString()
      : new Date(v).toISOString().split("T")[1].split(".")[0] + " UTC";

  const formatLabel = (v) =>
    showLocal
      ? `Time: ${new Date(v).toLocaleString()}`
      : `Time: ${new Date(v).toISOString().replace("T", " ").replace("Z", " UTC")}`;

  // Calculate min, max, latest value
  const values = metricData.map(d => d.y);
  const minValue = values.length ? Math.min(...values) : "-";
  const maxValue = values.length ? Math.max(...values) : "-";
  const latestValue = values.length ? values[values.length - 1] : "-";
  const timeRange = metricData.length
    ? `${new Date(metricData[0].x).toLocaleString()} - ${new Date(metricData[metricData.length - 1].x).toLocaleString()}`
    : "-";

  return (
    <div className="my-8 flex justify-center">
      <div
        className="bg-white p-10 rounded-xl shadow-2xl min-w-[1050px] border-2 border-blue-400"
        style={{ maxWidth: 1200 }}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-xl">Alarm Graph: {alarm.name}</h3>
          <button
            onClick={onClose}
            className="text-red-600 font-bold px-3 py-1 rounded hover:bg-red-100"
          >
            X
          </button>
        </div>

        {/* Alarm Details */}
        <div className="mb-4 grid grid-cols-2 gap-2 text-sm items-center">
          <div><b>Region:</b> {alarm.region}</div>
          <div className="flex items-center gap-2">
            <b>Metric:</b> {metricLabel}
            {/* Time window buttons and custom picker */}
            <div className="flex gap-1 ml-4">
              {["1h", "1d", "2d", "3d", "1w"].map((win) => (
                <button
                  key={win}
                  className={`px-2 py-0.5 rounded border text-xs ${timeWindow === win ? "bg-blue-500 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
                  onClick={() => {
                    setTimeWindow(win);
                    setCustomRange([null, null]);
                  }}
                >
                  {win.toUpperCase()}
                </button>
              ))}
              <DatePicker
                selectsRange
                startDate={startDate}
                endDate={endDate}
                onChange={(update) => {
                  setCustomRange(update);
                  setTimeWindow("custom");
                }}
                isClearable
                placeholderText="Custom"
                className="px-2 py-0.5 border rounded text-xs"
                maxDate={new Date()}
                showTimeSelect
                dateFormat="Pp"
              />
            </div>
          </div>
          <div><b>State:</b> <span className={`font-bold ${alarm.state === "ALARM" ? "text-red-600" : "text-green-600"}`}>{alarm.state}</span></div>
          <div><b>Threshold:</b> {threshold}</div>
          <div><b>Time Range:</b> {timeRange}</div>
          <div><b>Last Updated:</b> {alarm.lastUpdated ? new Date(alarm.lastUpdated).toLocaleString() : <i>N/A</i>}</div>
        </div>

        {/* Metric Summary */}
        <div className="mb-4 flex gap-8 text-xs">
          <div><b>Latest Value:</b> {latestValue !== "-" ? latestValue.toFixed(2) : "-"}</div>
          <div><b>Max:</b> {maxValue !== "-" ? maxValue.toFixed(2) : "-"}</div>
          <div><b>Min:</b> {minValue !== "-" ? minValue.toFixed(2) : "-"}</div>
        </div>

        <div className="flex justify-end mb-2">
          <div className="relative">
            <button
              className="text-xs px-2 py-1 rounded border bg-gray-100 hover:bg-gray-200 flex items-center gap-1"
              onClick={() => setShowLocal((v) => !v)}
              title={showLocal ? "Switch to UTC" : "Switch to Local Time"}
            >
              {showLocal ? <FaClock /> : <FaGlobe />}
              {showLocal ? "Local" : "UTC"}
              <svg className="ml-1 w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {/* You can expand this to a dropdown if you want more options */}
          </div>
        </div>
        <ResponsiveContainer width={950} height={520}>
          <LineChart
            data={metricData}
            margin={{ top: 30, right: 40, left: 60, bottom: 50 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="x"
              tickFormatter={formatTime}
              minTickGap={30}
              height={50}
            >
              <Label
                value={`Time (${showLocal ? "Local" : "UTC"})`}
                offset={-5}
                position="insideBottom"
                style={{ fontWeight: "bold", fontSize: 14 }}
              />
            </XAxis>
            <YAxis
              domain={['auto', 'auto']}
              tickCount={8}
              width={80}
            >
              <Label
                value={`${metricLabel} (%)`}
                angle={-90}
                position="insideLeft"
                style={{ textAnchor: 'middle', fontWeight: "bold", fontSize: 14 }}
              />
            </YAxis>
            <Tooltip
              formatter={(value, name) => [`${value.toFixed(2)}%`, metricLabel]}
              labelFormatter={formatLabel}
              contentStyle={{ fontSize: 14 }}
            />
            <Legend verticalAlign="top" height={36} />
            <Line
              type="monotone"
              dataKey="y"
              name={metricLabel}
              stroke="#ef4444"
              strokeWidth={3}
              dot={{ r: 4, stroke: "#ef4444", strokeWidth: 2, fill: "#fff" }}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            />
            <ReferenceLine y={threshold} stroke="#f59e42" strokeDasharray="6 3">
              <Label
                value={`Threshold (${threshold})`}
                position="right"
                fill="#f59e42"
                fontSize={13}
                fontWeight="bold"
                offset={10}
              />
            </ReferenceLine>
          </LineChart>
        </ResponsiveContainer>
        {metricData.length === 0 && (
          <div className="text-center text-gray-500 p-2 text-xs">
            No real metric data available for this alarm type.
          </div>
        )}
      </div>
    </div>
  );
};



export function AlarmList({ alarms }) {
  const [selectedAlarmId, setSelectedAlarmId] = useState(null);

  return (
    <div>
      {alarms.map(alarm => (
        <div key={alarm.id} className="border-b">
          <div
            className="p-4 cursor-pointer hover:bg-gray-50"
            onClick={() => setSelectedAlarmId(selectedAlarmId === alarm.id ? null : alarm.id)}
          >
            <div className="font-bold">{alarm.name}</div>
            <div className="text-xs text-gray-600">{alarm.region}</div>
            <div className="text-xs text-gray-600">{alarm.state}</div>
            {/* Graph just below details, INSIDE the box */}
            {selectedAlarmId === alarm.id && (
              <div className="mb-8">
                <AlarmGraph alarm={alarm} onClose={() => setSelectedAlarmId(null)} />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default AlarmGraph;

