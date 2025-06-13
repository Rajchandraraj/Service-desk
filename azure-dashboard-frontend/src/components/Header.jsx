const Header = ({ location, onLocationChange }) => {
  const regions = [
    { value: "centralindia", label: "Central India" },
    { value: "eastus", label: "East US" },
    { value: "westus", label: "West US" },
    { value: "southeastasia", label: "Southeast Asia" },
  ];

  return (
    <header className="flex items-center justify-between bg-blue-500 text-white p-4 rounded-lg shadow-md">
      <div className="flex items-center space-x-4">
        <img src="rapyder.png" alt="Logo" className="h-10" onClick={() => window.location.href = 'http://localhost:3002'} />
        <h1 className="text-3xl font-bold">RAPYDER AZURE SERVICE DESK</h1>
      </div>
      <div>
        <label className="mr-2 font-semibold">Region:</label>
        <select
          className="bg-transparent text-gray-700 px-2 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm"
          value={location}
          onChange={(e) => onLocationChange(e.target.value)}
        >
          {regions.map((region) => (
            <option key={region.value} value={region.value}>
              {region.label}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
};

export default Header;