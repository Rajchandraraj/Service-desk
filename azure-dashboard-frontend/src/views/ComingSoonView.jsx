import React from 'react';
import PropTypes from 'prop-types';

const ComingSoonView = ({ featureName }) => {
  return (
    <div className="text-center text-gray-500 py-10">
      <p>Coming soon: {featureName} view will be available in future updates.</p>
    </div>
  );
};

ComingSoonView.propTypes = {
  featureName: PropTypes.string.isRequired,
};

export default ComingSoonView;
