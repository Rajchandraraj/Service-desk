import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './MyTable.css'; // Your custom styles

function DataTable() {
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    axios.get("http://localhost:5003/api/data")
      .then(response => setData(response.data))
      .catch(error => console.error("Error fetching data:", error));
  }, []);

  const handleDownload = async (key) => {
    try {
      const response = await axios.get("http://localhost:5003/api/download-url", {
        params: { key }
      });
      const url = response.data.url;

      const link = document.createElement('a');
      link.href = url;
      link.download = key.split('/').pop();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to get download URL:", error);
    }
  };

  // Filter data based on search term
  const filteredData = data.filter(row =>
    Object.values(row).some(val =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="table-container">
      <h2 className="table-heading">Automation Document Summary</h2>

      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ padding: "0.5rem", width: "100%", maxWidth: "400px" }}
        />
      </div>

      <div className="table-wrapper">
        <table className="styled-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Request Type</th>
              <th>Comment</th>
              <th>Download</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, index) => (
              <tr key={index}>
                <td>{row["Category"]}</td>
                <td>{row["Request Type"]}</td>
                <td>{row["Comment"]}</td>
                <td>
                  {row["Download_Link"] ? (
                    <button onClick={() => handleDownload(row["Download_Link"])}>Download</button>
                  ) : "N/A"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredData.length === 0 && (
          <p style={{ marginTop: "1rem" }}>No matching records found.</p>
        )}
      </div>
    </div>
  );
}

export default DataTable;

