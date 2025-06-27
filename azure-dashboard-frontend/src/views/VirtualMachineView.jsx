import React from 'react';
import { useState } from "react";
import ResourceList from "../components/ResourceList";
import ResourceDetails from "../components/ResourceDetails";
import VmActions from "../components/VmActions";

const VirtualMachineView = ({
  virtualMachines,
  selectedResource,
  onSelectResource,
  subscriptionName,
  onVmAction,
}) => {
  const [isResizing, setIsResizing] = useState(false);

  const handleResize = async () => {
    const newSize = prompt("Enter new VM size (e.g., Standard_DS1_v2):");
    if (newSize) {
      setIsResizing(true);
      try {
        await onVmAction("resize", selectedResource.name, { newSize });
      } finally {
        setIsResizing(false);
      }
    }
  };

  const details = selectedResource ? (
    <>
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          Overview
        </h3>
        <p className="text-sm text-gray-600">VM Name: {selectedResource.name}</p>
        <p className="text-sm text-gray-600">
          Resource Group: {selectedResource.resourceGroup}
        </p>
        <p className="text-sm text-gray-600">
          Status: {selectedResource.powerState || "Unknown"}
        </p>
        <p className="text-sm text-gray-600">
          Subscription: {selectedResource.subscriptionId || subscriptionName}
        </p>
      </div>

      <VmActions
        vmName={selectedResource.name}
        onStart={() => onVmAction("start", selectedResource.name)}
        onStop={() => onVmAction("stop", selectedResource.name)}
        onResize={handleResize}
        isResizing={isResizing}
      />
    </>
  ) : (
    <div className="text-sm text-center text-gray-500">
      Select a virtual machine to view details.
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <ResourceList
        resources={virtualMachines}
        selectedResource={selectedResource}
        onSelectResource={onSelectResource}
        title="Virtual Machines"
        resourceKey="name"
        secondaryTextKey="resourceGroup"
      />
      <ResourceDetails title="Virtual Machine Details">{details}</ResourceDetails>
    </div>
  );
};

export default VirtualMachineView;
