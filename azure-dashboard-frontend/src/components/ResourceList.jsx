
import React from 'react';
const ResourceList = ({
  resources,
  selectedResource,
  onSelectResource,
  title,
  resourceKey,
  secondaryTextKey,
  isLoading,
}) => {
  return (
    <div className="w-full lg:w-1/3">
      <div className="bg-white rounded-md shadow-sm border border-gray-200">
        <div className="bg-gray-50 border-b px-4 py-3">
          <h2 className="text-base font-medium text-gray-800">
            {title} <span className="text-gray-500 text-sm">({resources.length})</span>
          </h2>
        </div>
        <div className="p-2">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : resources.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500">No resources found.</div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {resources.map((resource) => (
                <li
                  key={resource[resourceKey]}
                  onClick={() => onSelectResource(resource)}
                  className={`px-3 py-3 cursor-pointer hover:bg-gray-50 ${
                    selectedResource?.[resourceKey] === resource[resourceKey] ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-center">
                    <div
                      className={`h-2 w-2 rounded-full mr-3 ${
                        selectedResource?.[resourceKey] === resource[resourceKey]
                          ? "bg-blue-600"
                          : "bg-gray-400"
                      }`}
                    ></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {resource[resourceKey]}
                      </p>
                      {secondaryTextKey && (
                        <p className="text-xs text-gray-500 mt-1">
                          {resource[secondaryTextKey]}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResourceList;
