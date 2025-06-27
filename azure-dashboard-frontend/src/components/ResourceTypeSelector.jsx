import PropTypes from 'prop-types';
import React from 'react';
const ResourceTypeSelector = ({ resourceTypes, selectedType, onTypeChange }) => {
  return (
    <div className="mb-4">
      <label className="block mb-2 text-sm font-medium text-gray-700">
        Select Resource Type:
      </label>
      <select
        className="border px-3 py-2 rounded-md text-sm shadow-sm"
        value={selectedType}
        onChange={(e) => onTypeChange(e.target.value)}
      >
        {resourceTypes.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>
    </div>
  );
};

ResourceTypeSelector.propTypes = {
  resourceTypes: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedType: PropTypes.string.isRequired,
  onTypeChange: PropTypes.func.isRequired,
};

export default ResourceTypeSelector;
