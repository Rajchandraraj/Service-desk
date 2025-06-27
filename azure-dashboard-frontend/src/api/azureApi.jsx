const API_BASE = "https://azurebackend.skyclouds.live/api";

const fetchApi = async (endpoint, options = {}) => {
  const response = await fetch(`${API_BASE}${endpoint}`, options);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  return response.json();
};

export const fetchResourceGroups = async (location) => {
  return fetchApi(`/resource-groups?location=${location}`);
};

export const fetchVirtualMachines = async (location) => {
  return fetchApi(`/virtual-machines?location=${location}`);
};

export const performVmAction = async (vmName, action, body = {}) => {
  return fetchApi(`/virtual-machines/${vmName}/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
};

export const fetchSubscriptionName = async () => {
  const data = await fetchApi("/subscription");
  return data.displayName || "Unnamed Subscription";
};

export const fetchVirtualNetworks = async (location) => {
  return fetchApi(`/vnets?location=${location}`);
};

export const fetchVnetDetails = async (vnetName, location) => {
  return fetchApi(`/vnets/${vnetName}/details?location=${location}`);
};

export const addVnetSubnet = async (vnetName, subnetData) => {
  return fetchApi(`/vnets/${vnetName}/subnets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subnetData),
  });
};

export const fetchStorageAccounts = async (location) => {
  return fetchApi(`/storage-accounts?location=${location}`);
};
