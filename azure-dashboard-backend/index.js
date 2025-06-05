const express = require("express");
const cors = require("cors");
const { DefaultAzureCredential } = require("@azure/identity");
const { ResourceManagementClient } = require("@azure/arm-resources");
const { SubscriptionClient } = require("@azure/arm-subscriptions");
const { ComputeManagementClient } = require("@azure/arm-compute");
const { NetworkManagementClient } = require("@azure/arm-network");
const { StorageManagementClient } = require('@azure/arm-storage');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

let credentials, subscriptionId, resourceClient, subscriptionClient, computeClient, networkClient, storageClient;

// Initialize Azure clients
async function initializeAzureClients() {
  try {
    credentials = new DefaultAzureCredential();
    subscriptionClient = new SubscriptionClient(credentials);

    const subscriptions = [];
    for await (const sub of subscriptionClient.subscriptions.list()) {
      subscriptions.push(sub);
    }

    if (subscriptions.length === 0) {
      throw new Error("No Azure subscriptions found");
    }

    subscriptionId = subscriptions[0].subscriptionId;
    console.log(`Using subscription ID: ${subscriptionId}`);

    resourceClient = new ResourceManagementClient(credentials, subscriptionId);
    computeClient = new ComputeManagementClient(credentials, subscriptionId);
    networkClient = new NetworkManagementClient(credentials, subscriptionId);
    storageClient = new StorageManagementClient(credentials, subscriptionId);
  } catch (err) {
    console.error("Failed to initialize Azure clients:", err);
    process.exit(1);
  }
}

// Get all available locations
app.get("/api/locations", async (req, res) => {
  try {
    const locations = new Set();

    for await (const rg of resourceClient.resourceGroups.list()) {
      if (rg.location) locations.add(rg.location);
    }

    for await (const rg of resourceClient.resourceGroups.list()) {
      const vmIterator = computeClient.virtualMachines.list(rg.name);
      for await (const vm of vmIterator) {
        if (vm.location) locations.add(vm.location);
      }
    }

    res.json(Array.from(locations));
  } catch (err) {
    console.error("Error fetching locations:", err);
    res.status(500).json({ error: `Failed to fetch locations: ${err.message}` });
  }
});

// Get all resource groups
app.get("/api/resource-groups", async (req, res) => {
  try {
    const resourceGroups = [];
    for await (const rg of resourceClient.resourceGroups.list()) {
      resourceGroups.push({
        name: rg.name,
        location: rg.location,
        id: rg.id,
        subscriptionId
      });
    }

    console.log(`Fetched ${resourceGroups.length} resource groups.`);
    res.json(resourceGroups);
  } catch (err) {
    console.error("Error fetching resource groups:", err);
    res.status(500).json({ error: `Failed to fetch resource groups: ${err.message}` });
  }
});

// Get all virtual machines with powerState using 'expand: instanceView'
app.get("/api/virtual-machines", async (req, res) => {
  try {
    const vms = [];

    for await (const rg of resourceClient.resourceGroups.list()) {
      try {
        const vmIterator = computeClient.virtualMachines.list(rg.name);
        
        for await (const vm of vmIterator) {
          let powerState = "Unknown";
          let osType = "Unknown";

          try {
            // Try to get power state directly from instanceView
            const instanceView = await computeClient.virtualMachines.instanceView(rg.name, vm.name);
            if (instanceView.statuses) {
              for (const status of instanceView.statuses) {
                if (status.code && status.code.startsWith("PowerState/")) {
                  powerState = status.displayStatus || "Unknown";
                  break;
                }
              }
            }
            
            osType = vm.storageProfile?.osDisk?.osType || "Unknown";
          } catch (error) {
            console.warn(`Failed to get instanceView for VM ${vm.name}: ${error.message}`);
            // If instanceView fails, try to get basic VM info
            try {
              const basicInfo = await computeClient.virtualMachines.get(rg.name, vm.name);
              osType = basicInfo.storageProfile?.osDisk?.osType || "Unknown";
            } catch (e) {
              console.warn(`Failed to get basic info for VM ${vm.name}: ${e.message}`);
            }
          }
          vms.push({
            name: vm.name,
            resourceGroup: rg.name,
            location: vm.location,
            powerState,
            osType,
            vmSize: vm.hardwareProfile?.vmSize,
            subscriptionId,
            id: vm.id
          });
        }
      } catch (err) {
        console.warn(`Error processing resource group ${rg.name}: ${err.message}`);
      }
    }

    console.log(`Fetched ${vms.length} virtual machines`);
    res.json(vms);
  } catch (err) {
    console.error("Error fetching virtual machines:", err);
    res.status(500).json({
      error: `Failed to fetch virtual machines: ${err.message}`,
      details: err.response ? err.response.body : null,
    });
  }
});

// Start VM
app.post("/api/virtual-machines/:vmName/start", async (req, res) => {
  const { vmName } = req.params;

  try {
    let found = false;
    let lastError = null;

    for await (const rg of resourceClient.resourceGroups.list()) {
      try {
        await computeClient.virtualMachines.get(rg.name, vmName);
        await computeClient.virtualMachines.beginStartAndWait(rg.name, vmName);

        console.log(`VM ${vmName} in RG ${rg.name} started successfully.`);
        found = true;

        return res.status(200).json({
          message: `VM ${vmName} started successfully`,
          resourceGroup: rg.name,
          vmName
        });
      } catch (err) {
        if (err.statusCode === 404) {
          lastError = err;
          continue;
        } else {
          throw err;
        }
      }
    }

    if (!found) {
      return res.status(404).json({
        error: `VM ${vmName} not found in any resource group`,
        details: lastError?.message || null
      });
    }
  } catch (err) {
    console.error("Error starting VM:", err);
    res.status(500).json({
      error: `Failed to start VM: ${err.message}`,
      vmName
    });
  }
});

// Stop VM
app.post("/api/virtual-machines/:vmName/stop", async (req, res) => {
  const { vmName } = req.params;

  try {
    let found = false;
    let lastError = null;

    for await (const rg of resourceClient.resourceGroups.list()) {
      try {
        await computeClient.virtualMachines.get(rg.name, vmName);
        await computeClient.virtualMachines.beginDeallocateAndWait(rg.name, vmName);

        console.log(`VM ${vmName} in RG ${rg.name} stopped successfully.`);
        found = true;

        return res.status(200).json({
          message: `VM ${vmName} stopped successfully`,
          resourceGroup: rg.name,
          vmName
        });
      } catch (err) {
        if (err.statusCode === 404) {
          lastError = err;
          continue;
        } else {
          throw err;
        }
      }
    }

    if (!found) {
      return res.status(404).json({
        error: `VM ${vmName} not found in any resource group`,
        details: lastError?.message || null
      });
    }
  } catch (err) {
    console.error("Error stopping VM:", err);
    res.status(500).json({
      error: `Failed to stop VM: ${err.message}`,
      vmName
    });
  }
});

// Get available VM sizes
app.get("/api/virtual-machines/:vmName/sizes", async (req, res) => {
  const { vmName } = req.params;

  try {
    let found = false;
    let lastError = null;

    for await (const rg of resourceClient.resourceGroups.list()) {
      try {
        const vm = await computeClient.virtualMachines.get(rg.name, vmName);
        const availableSizes = await computeClient.virtualMachines.listAvailableSizes(rg.name, vmName);

        found = true;

        return res.json({
          currentSize: vm.hardwareProfile?.vmSize,
          resourceGroup: rg.name,
          availableSizes: availableSizes.map(size => ({
            name: size.name,
            numberOfCores: size.numberOfCores,
            memoryInMB: size.memoryInMB,
            maxDataDiskCount: size.maxDataDiskCount
          }))
        });
      } catch (err) {
        if (err.statusCode === 404) {
          lastError = err;
          continue;
        } else {
          throw err;
        }
      }
    }

    if (!found) {
      return res.status(404).json({
        error: `VM ${vmName} not found in any resource group`,
        details: lastError?.message || null
      });
    }
  } catch (err) {
    console.error("Error fetching VM sizes:", err);
    res.status(500).json({
      error: `Failed to fetch available VM sizes: ${err.message}`,
      vmName
    });
  }
});

// Resize VM
app.post("/api/virtual-machines/:vmName/resize", async (req, res) => {
  const { vmName } = req.params;
  const { newSize } = req.body;

  if (!newSize) {
    return res.status(400).json({ error: "New size is required" });
  }

  try {
    let found = false;
    let lastError = null;

    for await (const rg of resourceClient.resourceGroups.list()) {
      try {
        const vm = await computeClient.virtualMachines.get(rg.name, vmName);

        await computeClient.virtualMachines.beginUpdateAndWait(rg.name, vmName, {
          ...vm,
          hardwareProfile: {
            vmSize: newSize,
          },
        });

        found = true;

        return res.status(200).json({
          message: `VM ${vmName} resized to ${newSize}`,
          resourceGroup: rg.name,
          vmName,
          newSize
        });
      } catch (err) {
        if (err.statusCode === 404) {
          lastError = err;
          continue;
        } else {
          throw err;
        }
      }
    }

    if (!found) {
      return res.status(404).json({
        error: `VM ${vmName} not found in any resource group`,
        details: lastError?.message || null
      });
    }
  } catch (err) {
    console.error("Error resizing VM:", err);
    res.status(500).json({
      error: `Failed to resize VM: ${err.message}`,
      vmName,
      newSize
    });
  }
});

// Get all VNets
app.get("/api/vnets", async (req, res) => {
  try {
    const vnets = [];

    // Loop through all resource groups
    for await (const rg of resourceClient.resourceGroups.list()) {
      const vnetIterator = networkClient.virtualNetworks.list(rg.name);

      // Loop through each VNet
      for await (const vnet of vnetIterator) {
        // Fetch subnets for the current VNet
        const subnets = [];
        const subnetIterator = networkClient.subnets.list(rg.name, vnet.name);

        // Fetch each subnet and push its data
        for await (const subnet of subnetIterator) {
          subnets.push({
            name: subnet.name,
            addressPrefix: subnet.addressPrefix || subnet.addressPrefixes?.[0] || "N/A",
          });
        }

        // Add the VNet details along with subnets
        vnets.push({
          name: vnet.name,
          resourceGroup: rg.name,
          location: vnet.location,
          id: vnet.id,
          subscriptionId: vnet.id.split("/")[2], // Extract subscriptionId from resource ID
          addressPrefixes: vnet.addressSpace?.addressPrefixes || [],
          subnets: subnets.length > 0 ? subnets : [{ name: "No subnets found", addressPrefix: "N/A" }],
        });
      }
    }

    console.log(`Fetched ${vnets.length} virtual networks.`);
    res.json(vnets);
  } catch (err) {
    console.error("Error fetching VNets:", err);
    res.status(500).json({ error: `Failed to fetch VNets: ${err.message}` });
  }
});

// Add Subnet
app.post("/api/vnets/:vnetName/subnets", async (req, res) => {
  console.log("Incoming request:", req.url);
  console.log("Request body:", req.body);
  const { vnetName } = req.params;
  const { resourceGroupName, subnetName, addressPrefix } = req.body;

  if (!resourceGroupName || !subnetName || !addressPrefix) {
    return res.status(400).json({ error: "resourceGroupName, subnetName, and addressPrefix are required" });
  }

  try {
    const subnetParams = {
      name: subnetName,
      addressPrefix: addressPrefix,
    };

    const subnet = await networkClient.subnets.beginCreateOrUpdateAndWait(resourceGroupName, vnetName, subnetName, subnetParams);
    res.status(201).json({ message: `Subnet ${subnetName} created successfully`, subnet });
  } catch (err) {
    console.error("Error adding subnet:", err);
    res.status(500).json({ error: `Failed to add subnet: ${err.message}` });
  }
});

// Modify Subnet
app.put("/api/vnets/:vnetName/subnets/:subnetName", async (req, res) => {
  const { vnetName, subnetName } = req.params;
  const { resourceGroupName, addressPrefix } = req.body;

  if (!resourceGroupName || !addressPrefix) {
    return res.status(400).json({ error: "resourceGroupName and addressPrefix are required" });
  }

  try {
    const subnetParams = {
      name: subnetName,
      addressPrefix: addressPrefix,
    };

    const subnet = await networkClient.subnets.beginCreateOrUpdateAndWait(resourceGroupName, vnetName, subnetName, subnetParams);
    res.status(200).json({ message: `Subnet ${subnetName} modified successfully`, subnet });
  } catch (err) {
    console.error("Error modifying subnet:", err);
    res.status(500).json({ error: `Failed to modify subnet: ${err.message}` });
  }
});

// Delete Subnet
app.delete("/api/vnets/:vnetName/subnets/:subnetName", async (req, res) => {
  const { vnetName, subnetName } = req.params;
  const { resourceGroupName } = req.body;

  if (!resourceGroupName) {
    return res.status(400).json({ error: "resourceGroupName is required" });
  }

  try {
    await networkClient.subnets.beginDeleteAndWait(resourceGroupName, vnetName, subnetName);
    res.status(200).json({ message: `Subnet ${subnetName} deleted successfully` });
  } catch (err) {
    console.error("Error deleting subnet:", err);
    res.status(500).json({ error: `Failed to delete subnet: ${err.message}` });
  }
});

const {
  BlobServiceClient,
  StorageSharedKeyCredential,
} = require("@azure/storage-blob");
const {
  ShareServiceClient,
} = require("@azure/storage-file-share");
const {
  QueueServiceClient,
} = require("@azure/storage-queue");
const {
  TableServiceClient,
  AzureNamedKeyCredential,
} = require("@azure/data-tables");

// Helper to collect iterator items
const listAll = async (iterator) => {
  const items = [];
  try {
    for await (const item of iterator) {
      items.push(item);
    }
  } catch (err) {
    console.error("Error iterating:", err.message);
  }
  return items;
};

app.get("/api/storage-accounts", async (req, res) => {
  try {
    const { location } = req.query;
    const accounts = [];

    const resourceGroups = resourceClient.resourceGroups.list();
    for await (const rg of resourceGroups) {
      try {
        const accountsIterator = storageClient.storageAccounts.listByResourceGroup(rg.name);
        const storageAccounts = [];

        for await (const account of accountsIterator) {
          storageAccounts.push(account);
        }

        for (const account of storageAccounts) {
          if (location && account.location.toLowerCase() !== location.toLowerCase()) continue;

          try {
            const keys = await storageClient.storageAccounts.listKeys(rg.name, account.name);
            const accountKey = keys.keys[0].value;

            // Build endpoints
            const blobUrl = `https://${account.name}.blob.core.windows.net`;
            const fileUrl = `https://${account.name}.file.core.windows.net`;
            const queueUrl = `https://${account.name}.queue.core.windows.net`;
            const tableUrl = `https://${account.name}.table.core.windows.net`;

            console.log(`\nProcessing account: ${account.name}`);
            console.log(`Blob URL: ${blobUrl}`);
            console.log(`File URL: ${fileUrl}`);
            console.log(`Queue URL: ${queueUrl}`);
            console.log(`Table URL: ${tableUrl}`);

            const sharedKeyCred = new StorageSharedKeyCredential(account.name, accountKey);
            const blobServiceClient = new BlobServiceClient(blobUrl, sharedKeyCred);
            const fileServiceClient = new ShareServiceClient(fileUrl, sharedKeyCred);
            const queueServiceClient = new QueueServiceClient(queueUrl, sharedKeyCred);
            const tableServiceClient = new TableServiceClient(tableUrl, new AzureNamedKeyCredential(account.name, accountKey));

            let blobContainers = [], fileShares = [], queues = [], tables = [];

            // List containers
            try {
              blobContainers = await listAll(blobServiceClient.listContainers());
            } catch (err) {
              console.error(`Failed to list blob containers: ${err.message}`);
            }

            // List file shares
            try {
              fileShares = await listAll(fileServiceClient.listShares());
            } catch (err) {
              console.error(`Failed to list file shares: ${err.message}`);
            }

            // List queues
            try {
              queues = await listAll(queueServiceClient.listQueues());
            } catch (err) {
              console.error(`Failed to list queues: ${err.message}`);
            }

            // List tables
            try {
              tables = await listAll(tableServiceClient.listTables());
            } catch (err) {
              console.error(`Failed to list tables: ${err.message}`);
            }

            accounts.push({
              name: account.name,
              resourceGroup: rg.name,
              location: account.location,
              id: account.id,
              subscriptionId: account.id.split("/")[2],
              sku: account.sku,
              kind: account.kind,
              properties: {
                creationTime: account.creationTime,
                statusOfPrimary: account.statusOfPrimary,
                primaryEndpoints: account.primaryEndpoints,
              },
              blobContainers: blobContainers.map(c => ({ name: c.name })),
              fileShares: fileShares.map(s => ({ name: s.name })),
              queues: queues.map(q => ({ name: q.name })),
              tables: tables.map(t => ({ name: t.name })),
            });

          } catch (err) {
            console.error(`Error processing storage account '${account.name}':`, err.message);
            accounts.push({
              name: account.name,
              resourceGroup: rg.name,
              location: account.location,
              id: account.id,
              error: `Failed to get storage services: ${err.message}`,
            });
          }
        }
      } catch (err) {
        console.error(`Error processing resource group '${rg.name}':`, err.message);
      }
    }

    res.json(accounts);
  } catch (err) {
    console.error("Error fetching storage accounts:", err.message);
    res.status(500).json({
      error: "Failed to fetch storage accounts",
      details: err.message,
    });
  }
});


// Create blob container
app.post("/api/storage-accounts/:accountName/blob-containers", async (req, res) => {
  const { accountName } = req.params;
  const { resourceGroupName, containerName, publicAccess } = req.body;

  if (!resourceGroupName || !containerName) {
    return res.status(400).json({ error: "resourceGroupName and containerName are required" });
  }

  try {
    const container = await storageClient.blobContainers.create(
      resourceGroupName,
      accountName,
      containerName,
      { 
        publicAccess: publicAccess || "None",
        metadata: req.body.metadata || undefined
      }
    );
    res.status(201).json({
      success: true,
      container: {
        name: container.name,
        publicAccess: container.publicAccess,
        lastModifiedTime: container.lastModifiedTime
      }
    });
  } catch (err) {
    console.error("Error creating blob container:", err);
    res.status(500).json({ 
      error: "Failed to create blob container",
      details: err.message,
      code: err.code
    });
  }
});

// Delete blob container
app.delete("/api/storage-accounts/:accountName/blob-containers/:containerName", async (req, res) => {
  const { accountName, containerName } = req.params;
  const { resourceGroupName } = req.body;

  if (!resourceGroupName) {
    return res.status(400).json({ error: "resourceGroupName is required in request body" });
  }

  try {
    await storageClient.blobContainers.delete(resourceGroupName, accountName, containerName);
    res.json({ 
      success: true,
      message: "Blob container deleted successfully",
      data: {
        accountName,
        containerName,
        deletedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error("Error deleting blob container:", err);
    if (err.code === 'ContainerNotFound') {
      return res.status(404).json({ error: "Blob container not found" });
    }
    res.status(500).json({ 
      error: "Failed to delete blob container",
      details: err.message 
    });
  }
});

// Create file share
app.post("/api/storage-accounts/:accountName/file-shares", async (req, res) => {
  const { accountName } = req.params;
  const { resourceGroupName, shareName, quota, enabledProtocols, metadata } = req.body;

  if (!resourceGroupName || !shareName) {
    return res.status(400).json({ error: "resourceGroupName and shareName are required" });
  }

  try {
    const share = await storageClient.fileShares.create(
      resourceGroupName,
      accountName,
      shareName,
      { 
        shareQuota: parseInt(quota) || 1024, // Default 1TB (in GiB)
        enabledProtocols: enabledProtocols || "SMB",
        metadata: metadata || undefined
      }
    );
    res.status(201).json({
      success: true,
      share: {
        name: share.name,
        quota: share.shareQuota,
        enabledProtocols: share.enabledProtocols
      }
    });
  } catch (err) {
    console.error("Error creating file share:", err);
    res.status(500).json({ 
      error: "Failed to create file share",
      details: err.message 
    });
  }
});

// Delete file share
app.delete("/api/storage-accounts/:accountName/file-shares/:shareName", async (req, res) => {
  const { accountName, shareName } = req.params;
  const { resourceGroupName } = req.body;

  if (!resourceGroupName) {
    return res.status(400).json({ error: "resourceGroupName is required in request body" });
  }

  try {
    await storageClient.fileShares.delete(resourceGroupName, accountName, shareName);
    res.json({ 
      success: true,
      message: "File share deleted successfully",
      data: {
        accountName,
        shareName,
        deletedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error("Error deleting file share:", err);
    if (err.code === 'ShareNotFound') {
      return res.status(404).json({ error: "File share not found" });
    }
    res.status(500).json({ 
      error: "Failed to delete file share",
      details: err.message 
    });
  }
});

// Your other existing routes remain unchanged here
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  initializeAzureClients();
});
