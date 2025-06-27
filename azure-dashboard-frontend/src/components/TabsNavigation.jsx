import PropTypes from 'prop-types';
import React from 'react';
const TabsNavigation = ({ tabs, activeTab, onTabChange }) => {
  return (
    <nav className="mt-6 flex space-x-4 border-b border-gray-300">
      {tabs.map((tab) => (
        <button
          key={tab}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === tab
              ? "border-b-2 border-red-600 text-red-600"
              : "text-gray-500 hover:text-red-600"
          }`}
          onClick={() => onTabChange(tab)}
        >
          {tab}
        </button>
      ))}
    </nav>
  );
};

TabsNavigation.propTypes = {
  tabs: PropTypes.arrayOf(PropTypes.string).isRequired,
  activeTab: PropTypes.string.isRequired,
  onTabChange: PropTypes.func.isRequired,
};

export default TabsNavigation;
