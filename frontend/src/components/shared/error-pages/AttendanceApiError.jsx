/* eslint-disable react/prop-types */
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';

const AttendanceApiError = ({ onRetry, message = "Attendance APIs are not working" }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-lg border border-red-200">
      <FiAlertTriangle className="w-12 h-12 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold text-red-800 mb-2">Service Unavailable</h3>
      <p className="text-red-600 text-center mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <FiRefreshCw className="w-4 h-4" />
          Try Again
        </button>
      )}
    </div>
  );
};

export default AttendanceApiError;