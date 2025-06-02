// src/views/ResourceGroupView.jsx

import ResourceList from "../components/ResourceList";
import ResourceDetails from "../components/ResourceDetails";

const ResourceGroupView = ({
  resourceGroups,
  selectedResource,
  onSelectResource,
  subscriptionName,
}) => {
  const details = selectedResource ? (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
        Overview
      </h3>
      <p className="text-sm text-gray-600">
        Resource Group Name: {selectedResource.name}
      </p>
      <p className="text-sm text-gray-600">
        Location: {selectedResource.location}
      </p>
      <p className="text-sm text-gray-600">
        Subscription: {selectedResource.subscriptionId || subscriptionName}
      </p>
    </div>
  ) : (
    <div className="text-sm text-center text-gray-500">
      Select a resource group to view details.
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <ResourceList
        resources={resourceGroups}
        selectedResource={selectedResource}
        onSelectResource={onSelectResource}
        title="Resource Groups"
        resourceKey="name"
        secondaryTextKey="location"
      />
      <ResourceDetails title="Resource Group Details">{details}</ResourceDetails>
    </div>
  );
};

export default ResourceGroupView;
