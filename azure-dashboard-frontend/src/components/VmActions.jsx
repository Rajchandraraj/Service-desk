import PropTypes from 'prop-types';

const VmActions = ({ vmName, onStart, onStop, onResize, isResizing }) => {
  return (
    <div className="mt-4 space-x-4">
      <button
        onClick={onStart}
        className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-green-300"
        disabled={isResizing}
      >
        Start {vmName}
      </button>
      <button
        onClick={onStop}
        className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:bg-red-300"
        disabled={isResizing}
      >
        Stop {vmName}
      </button>
      <button
        onClick={onResize}
        className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:bg-yellow-300"
        disabled={isResizing}
      >
        {isResizing ? 'Resizing...' : 'Resize VM'}
      </button>
    </div>
  );
};

VmActions.propTypes = {
  vmName: PropTypes.string.isRequired,
  onStart: PropTypes.func.isRequired,
  onStop: PropTypes.func.isRequired,
  onResize: PropTypes.func.isRequired,
  isResizing: PropTypes.bool,
};

export default VmActions;