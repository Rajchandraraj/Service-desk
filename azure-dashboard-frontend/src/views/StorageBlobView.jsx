import React, { useEffect, useState } from "react";
import ResourceList from "../components/ResourceList";
import ResourceDetails from "../components/ResourceDetails";

const StorageAccountView = ({
  selectedResource,
  onSelectResource,
  subscriptionName,
}) => {
  const [storageAccounts, setStorageAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("blob");
  const [formData, setFormData] = useState({
    name: "",
    // Different forms for different resource types
    blob: { publicAccessLevel: "container" },
    fileShare: { quota: 1 },
    table: {},
    queue: {},
  });

  useEffect(() => {
    const fetchStorageAccounts = async () => {
      try {
        const response = await fetch("http://localhost:3001/api/storage-accounts");
        const data = await response.json();
        setStorageAccounts(data);
      } catch (error) {
        console.error("Error fetching storage accounts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStorageAccounts();
  }, []);

  // Generic resource handlers
  const handleCreateResource = async () => {
    if (!formData.name || !selectedResource) return;

    try {
      let endpoint, body;
      const resourceGroupName = selectedResource.resourceGroup;
      const accountName = selectedResource.name;

      switch (activeTab) {
        case "blob":
          endpoint = `http://localhost:3001/api/storage-accounts/${accountName}/blob-containers`;
          body = {
            resourceGroupName,
            containerName: formData.name,
            publicAccess: formData.blob.publicAccessLevel,
          };
          break;
        case "fileShare":
          endpoint = `http://localhost:3001/api/storage-accounts/${accountName}/file-shares`;
          body = {
            resourceGroupName,
            shareName: formData.name,
            quota: formData.fileShare.quota,
          };
          break;
        case "table":
          endpoint = `http://localhost:3001/api/storage-accounts/${accountName}/tables`;
          body = {
            resourceGroupName,
            tableName: formData.name,
          };
          break;
        case "queue":
          endpoint = `http://localhost:3001/api/storage-accounts/${accountName}/queues`;
          body = {
            resourceGroupName,
            queueName: formData.name,
          };
          break;
        default:
          throw new Error("Invalid resource type");
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setFormData({
          name: "",
          blob: { publicAccessLevel: "container" },
          fileShare: { quota: 1 },
          table: {},
          queue: {},
        });
        await fetchStorageAccounts();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create resource");
      }
    } catch (error) {
      console.error("Creation error:", error);
      alert(error.message);
    }
  };

  const handleDeleteResource = async (resourceName) => {
    try {
      let endpoint;
      const resourceGroupName = selectedResource.resourceGroup;
      const accountName = selectedResource.name;

      switch (activeTab) {
        case "blob":
          endpoint = `http://localhost:3001/api/storage-accounts/${accountName}/blob-containers/${resourceName}`;
          break;
        case "fileShare":
          endpoint = `http://localhost:3001/api/storage-accounts/${accountName}/file-shares/${resourceName}`;
          break;
        case "table":
          endpoint = `http://localhost:3001/api/storage-accounts/${accountName}/tables/${resourceName}`;
          break;
        case "queue":
          endpoint = `http://localhost:3001/api/storage-accounts/${accountName}/queues/${resourceName}`;
          break;
        default:
          throw new Error("Invalid resource type");
      }

      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceGroupName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete resource");
      }

      await fetchStorageAccounts();
    } catch (error) {
      console.error("Deletion error:", error);
      alert(error.message);
    }
  };

  const renderResourceList = () => {
    if (!selectedResource) return null;

    const resources = {
      blob: selectedResource.blobContainers || [],
      fileShare: selectedResource.fileShares || [],
      table: selectedResource.tables || [],
      queue: selectedResource.queues || [],
    };

    return (
      <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
        {resources[activeTab].map((resource, idx) => (
          <li key={idx}>
            <strong>{resource.name}</strong>
            {activeTab === "blob" && ` — ${resource.publicAccess || 'private'}`}
            {activeTab === "fileShare" && ` — ${resource.quota}GB`}
            <button
              onClick={() => handleDeleteResource(resource.name)}
              className="text-red-500 ml-2"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    );
  };

  const renderForm = () => {
    return (
      <div className="mt-4 space-y-4">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          Create New {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
        </h3>
        <input
          type="text"
          placeholder={`${activeTab === "blob" ? "Container" : 
                       activeTab === "fileShare" ? "Share" : 
                       activeTab === "table" ? "Table" : "Queue"} Name`}
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="block w-full px-4 py-2 border rounded-md"
        />

        {activeTab === "blob" && (
          <select
            value={formData.blob.publicAccessLevel}
            onChange={(e) => setFormData({
              ...formData,
              blob: { ...formData.blob, publicAccessLevel: e.target.value }
            })}
            className="block w-full px-4 py-2 border rounded-md"
          >
            <option value="container">Container (public read access for containers and blobs)</option>
            <option value="blob">Blob (public read access for blobs only)</option>
            <option value="">Private (no public read access)</option>
          </select>
        )}

        {activeTab === "fileShare" && (
          <input
            type="number"
            placeholder="Quota (GB)"
            min="1"
            value={formData.fileShare.quota}
            onChange={(e) => setFormData({
              ...formData,
              fileShare: { ...formData.fileShare, quota: e.target.value }
            })}
            className="block w-full px-4 py-2 border rounded-md"
          />
        )}

        <button
          onClick={handleCreateResource}
          className="w-full bg-green-500 text-white px-4 py-2 rounded-md"
        >
          Create
        </button>
      </div>
    );
  };

  const details = selectedResource ? (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Overview</h3>
        <p className="text-sm text-gray-600">Account Name: {selectedResource.name}</p>
        <p className="text-sm text-gray-600">Resource Group: {selectedResource.resourceGroup}</p>
        <p className="text-sm text-gray-600">Location: {selectedResource.location}</p>
        <p className="text-sm text-gray-600">SKU: {selectedResource.sku?.name}</p>
        <p className="text-sm text-gray-600">Subscription: {selectedResource.subscriptionId || subscriptionName}</p>
      </div>

      <div className="space-y-2">
        <div className="flex border-b">
          {["blob", "fileShare", "table", "queue"].map((tab) => (
            <button
              key={tab}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === tab
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "blob" ? "Blob Containers" : 
               tab === "fileShare" ? "File Shares" : 
               tab === "table" ? "Tables" : "Queues"}
            </button>
          ))}
        </div>

        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {activeTab === "blob" ? "Blob Containers" : 
           activeTab === "fileShare" ? "File Shares" : 
           activeTab === "table" ? "Tables" : "Queues"}
        </h3>

        {renderResourceList()}
        {renderForm()}
      </div>
    </div>
  ) : (
    <div className="text-sm text-center text-gray-500">Select a storage account to view details.</div>
  );

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <ResourceList
        resources={storageAccounts}
        selectedResource={selectedResource}
        onSelectResource={onSelectResource}
        title="Storage Accounts"
        resourceKey="name"
        secondaryTextKey="resourceGroup"
      />
      <ResourceDetails title="Storage Account Details">{details}</ResourceDetails>
    </div>
  );
};

export default StorageAccountView;