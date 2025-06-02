import PropTypes from 'prop-types';

const ResourceDetails = ({ title, children }) => {
  return (
    <div className="w-full lg:w-2/3">
      <div className="bg-white rounded-md shadow-sm border border-gray-200 h-full">
        <div className="bg-gray-50 border-b px-4 py-3">
          <h2 className="text-base font-medium text-gray-800">{title}</h2>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

ResourceDetails.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

export default ResourceDetails;