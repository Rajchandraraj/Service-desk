import { useState, useEffect } from "react";
import {
  fetchResourceGroups,
  fetchVirtualMachines,
  fetchVirtualNetworks,
  fetchSubscriptionName,
  performVmAction,
  fetchStorageAccounts,
} from "./api/azureApi"; // Ensure `fetchStorageAccounts` is implemented in your API

import Header from "./components/Header";
import TabsNavigation from "./components/TabsNavigation";
import ResourceTypeSelector from "./components/ResourceTypeSelector";
import ResourceGroupView from "./views/ResourceGroupView";
import VirtualMachineView from "./views/VirtualMachineView";
import VirtualNetworkView from "./views/VirtualNetworkView";
import StorageAccountView from "./views/StorageBlobView";
import ComingSoonView from "./views/ComingSoonView";
import Footer from "./components/Footer";

const App = () => {
  const [location, setLocation] = useState("centralindia");
  const [resourceGroups, setResourceGroups] = useState([]);
  const [virtualMachines, setVirtualMachines] = useState([]);
  const [virtualNetworks, setVirtualNetworks] = useState([]);
  const [storageAccounts, setStorageAccounts] = useState([]); // ✅
  const [selectedResource, setSelectedResource] = useState(null);
  const [subscriptionName, setSubscriptionName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("Resource Management");
  const [resourceType, setResourceType] = useState("Resource Group");

  const tabs = ["Monitoring", "Resource Management", "Resource Provision", "Database"];
  const resourceTypes = ["Resource Group", "VM", "Storage Account", "VNet"];

  useEffect(() => {
    const loadSubscription = async () => {
      const name = await fetchSubscriptionName();
      setSubscriptionName(name);
    };
    loadSubscription();
  }, []);

  useEffect(() => {
    const loadResources = async () => {
      try {
        setIsLoading(true);
        setSelectedResource(null);

        switch (resourceType) {
          case "Resource Group":
            const groups = await fetchResourceGroups(location);
            setResourceGroups(groups);
            break;
          case "VM":
            const vms = await fetchVirtualMachines(location);
            setVirtualMachines(vms);
            break;
          case "VNet":
            const nets = await fetchVirtualNetworks(location);
            setVirtualNetworks(nets);
            break;
          case "Storage Account":
            const storage = await fetchStorageAccounts(location);
            setStorageAccounts(storage);
            break;
          default:
            break;
        }
      } catch (error) {
        console.error(`Error loading ${resourceType}:`, error);
      } finally {
        setIsLoading(false);
      }
    };

    if (activeTab === "Resource Management") {
      loadResources();
    }
  }, [location, resourceType, activeTab]);

  const handleVmAction = async (action, vmName, data = {}) => {
    try {
      await performVmAction(vmName, action, data);
      const updatedVms = await fetchVirtualMachines(location);
      setVirtualMachines(updatedVms);

      if (selectedResource && selectedResource.name === vmName) {
        const updatedVm = updatedVms.find(vm => vm.name === vmName);
        if (updatedVm) setSelectedResource(updatedVm);
      }
    } catch (error) {
      console.error(`Error performing ${action} on VM:`, error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans p-4">
      <Header location={location} onLocationChange={setLocation} />

      <TabsNavigation
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === "Resource Management" ? (
          <>
            <ResourceTypeSelector
              resourceTypes={resourceTypes}
              selectedType={resourceType}
              onTypeChange={setResourceType}
            />

            {resourceType === "Resource Group" && (
              <ResourceGroupView
                isLoading={isLoading}
                resourceGroups={resourceGroups}
                selectedResource={selectedResource}
                onSelectResource={setSelectedResource}
                subscriptionName={subscriptionName}
              />
            )}

            {resourceType === "VM" && (
              <VirtualMachineView
                virtualMachines={virtualMachines}
                selectedResource={selectedResource}
                onSelectResource={setSelectedResource}
                subscriptionName={subscriptionName}
                onVmAction={handleVmAction}
              />
            )}

            {resourceType === "VNet" && (
              <VirtualNetworkView
                virtualNetworks={virtualNetworks}
                selectedResource={selectedResource}
                onSelectResource={setSelectedResource}
                location={location}
              />
            )}

            {resourceType === "Storage Account" && (
              <StorageAccountView
                selectedResource={selectedResource}
                onSelectResource={setSelectedResource}
                subscriptionName={subscriptionName}
              />
            )}
          </>
        ) : (
          <ComingSoonView featureName={activeTab} />
        )}
      </main>

      <Footer />
    </div>
  );
};

export default App;
