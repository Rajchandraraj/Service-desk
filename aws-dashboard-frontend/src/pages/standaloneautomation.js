import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

function DataTable() {
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    axios.get(`${API_BASE_URL}/utility/api/data`)
      .then(response => setData(response.data))
      .catch(error => console.error("Error fetching data:", error));
  }, []);

  const handleDownload = async (key) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/download-url`, {
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

  const filteredData = data.filter(row =>
    Object.values(row).some(val =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="p-4 font-sans">
      <h2 className="text-2xl font-bold mb-4 text-center">Automation Document Summary</h2>

      <div className="flex justify-center mb-4">
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={e => {
            setSearchTerm(e.target.value);
            setCurrentPage(1); // Reset to page 1 on new search
          }}
          className="w-full max-w-md px-4 py-2 border rounded shadow"
        />
      </div>

      <div className="overflow-x-auto shadow-md rounded-lg border border-gray-200">
        <table className="min-w-full bg-white text-sm text-left">
          <thead className="bg-gray-100 text-gray-700 uppercase tracking-wider text-xs">
            <tr>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Request Type</th>
              <th className="px-4 py-2 max-w-xs">Comment</th>
              <th className="px-4 py-2">Download</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {currentData.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-4 py-2 whitespace-pre-wrap break-words">{row["Category"]}</td>
                <td className="px-4 py-2 whitespace-pre-wrap break-words">{row["Request Type"]}</td>
                <td className="px-4 py-2 whitespace-pre-wrap break-words max-w-xs">{row["Comment"]}</td>
                <td className="px-4 py-2">
                  {row["Download_Link"] ? (
                    <button
                     // onClick={() => handleDownload(row["Download_Link"])}
	              onClick={() => handleDownload(row["Download_Link"].trim())}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                    >
                      Download
                    </button>
                  ) : (
                    <span className="text-gray-400">N/A</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredData.length === 0 && (
          <div className="p-4 text-center text-gray-500">No matching records found.</div>
        )}
      </div>

      {/* Pagination Controls */}
      {filteredData.length > itemsPerPage && (
        <div className="flex justify-center mt-4 gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded border bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-2 py-1 text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded border bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default DataTable;
