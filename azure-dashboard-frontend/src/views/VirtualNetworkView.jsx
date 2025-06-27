import React, { useEffect, useState } from "react";
import ResourceList from "../components/ResourceList";
import ResourceDetails from "../components/ResourceDetails";

const VirtualNetworkView = ({
  selectedResource,
  onSelectResource,
  subscriptionName,
}) => {
  const [virtualNetworks, setVirtualNetworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subnetForm, setSubnetForm] = useState({ name: "", addressPrefix: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [editingSubnet, setEditingSubnet] = useState(null);

  useEffect(() => {
    const fetchVirtualNetworks = async () => {
      try {
        const response = await fetch("https://azurebackend.skyclouds.live/api/vnets");
        const data = await response.json();
        setVirtualNetworks(data);
      } catch (error) {
        console.error("Error fetching virtual networks:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVirtualNetworks();
  }, []);

  const handleAddSubnet = async () => {
    if (!subnetForm.name || !subnetForm.addressPrefix || !selectedResource) return;

    const newSubnet = { name: subnetForm.name, addressPrefix: subnetForm.addressPrefix };
    const resourceGroupName = selectedResource.resourceGroup;
    const vnetName = selectedResource.name;
    
    // Send request to backend to add subnet
    const response = await fetch(`https://azurebackend.skyclouds.live/api/vnets/${vnetName}/subnets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resourceGroupName,
      subnetName: subnetForm.name,
      addressPrefix: subnetForm.addressPrefix
    }),
  });
    
    if (response.ok) {
      setSubnetForm({ name: "", addressPrefix: "" }); // Reset form
      // Fetch updated VNets to include the new subnet
      await fetchVirtualNetworks();
    } else {
      alert("Error adding subnet.");
    }
  };

const handleDeleteSubnet = async (subnetName) => {
  try {
    // Extract resource group name and VNet name from selectedResource
    const resourceGroupName = selectedResource.resourceGroup;
    const vnetName = selectedResource.name;

    const response = await fetch(
      `https://azurebackend.skyclouds.live/api/vnets/${vnetName}/subnets/${subnetName}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceGroupName }),
      }
    );

    if (response.ok) {
      await fetchVirtualNetworks();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to delete subnet");
    }
  } catch (error) {
    console.error("Subnet deletion error:", error);
    alert(error.message);
  }
};

const handleEditSubnet = (subnet) => {
  setIsEditing(true);
  setEditingSubnet(subnet);
  setSubnetForm({ 
    name: subnet.name, 
    addressPrefix: subnet.addressPrefix 
  });
};

const handleUpdateSubnet = async () => {
  try {
    if (!subnetForm.name || !subnetForm.addressPrefix || !editingSubnet) {
      throw new Error("All fields are required");
    }

    // Extract resource group name and VNet name from selectedResource
    const resourceGroupName = selectedResource.resourceGroup;
    const vnetName = selectedResource.name;

    const response = await fetch(
      `https://azurebackend.skyclouds.live/api/vnets/${vnetName}/subnets/${editingSubnet.name}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceGroupName,
          addressPrefix: subnetForm.addressPrefix,
          // Note: Subnet name can't be changed in Azure, so we keep the original
        }),
      }
    );

    if (response.ok) {
      setIsEditing(false);
      setEditingSubnet(null);
      setSubnetForm({ name: "", addressPrefix: "" });
      await fetchVirtualNetworks();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update subnet");
    }
  } catch (error) {
    console.error("Subnet update error:", error);
    alert(error.message);
  }
};

  const details = selectedResource ? (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Overview</h3>
        <p className="text-sm text-gray-600">VNet Name: {selectedResource.name}</p>
        <p className="text-sm text-gray-600">Resource Group: {selectedResource.resourceGroup}</p>
        <p className="text-sm text-gray-600">Location: {selectedResource.location}</p>
        <p className="text-sm text-gray-600">Address Space: {selectedResource.addressPrefixes?.join(", ") || "N/A"}</p>
        <p className="text-sm text-gray-600">Subscription: {selectedResource.subscriptionId || subscriptionName}</p>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Subnets</h3>
        {selectedResource.subnets?.length > 0 ? (
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
            {selectedResource.subnets.map((subnet, idx) => (
              <li key={idx}>
                <strong>{subnet.name}</strong> — {subnet.addressPrefix}
                <button
                  onClick={() => handleDeleteSubnet(subnet.name)}
                  className="text-red-500 ml-2"
                >
                  Delete
                </button>
                <button
                  onClick={() => handleEditSubnet(subnet)}
                  className="text-blue-500 ml-2"
                >
                  Edit
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No subnets found.</p>
        )}
      </div>

      {/* Form for adding or editing subnet */}
      <div className="mt-4 space-y-4">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Add/Edit Subnet</h3>
        <input
          type="text"
          placeholder="Subnet Name"
          value={subnetForm.name}
          onChange={(e) => setSubnetForm({ ...subnetForm, name: e.target.value })}
          className="block w-full px-4 py-2 border rounded-md"
        />
        <input
          type="text"
          placeholder="Address Prefix"
          value={subnetForm.addressPrefix}
          onChange={(e) => setSubnetForm({ ...subnetForm, addressPrefix: e.target.value })}
          className="block w-full px-4 py-2 border rounded-md"
        />
        {isEditing ? (
          <button
            onClick={handleUpdateSubnet}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded-md"
          >
            Update Subnet
          </button>
        ) : (
          <button
            onClick={handleAddSubnet}
            className="w-full bg-green-500 text-white px-4 py-2 rounded-md"
          >
            Add Subnet
          </button>
        )}
      </div>
    </div>
  ) : (
    <div className="text-sm text-center text-gray-500">Select a virtual network to view details.</div>
  );

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <ResourceList
        resources={virtualNetworks}
        selectedResource={selectedResource}
        onSelectResource={onSelectResource}
        title="Virtual Networks"
        resourceKey="name"
        secondaryTextKey="resourceGroup"
      />
      <ResourceDetails title="Virtual Network Details">{details}</ResourceDetails>
    </div>
  );
};

export default VirtualNetworkView;
