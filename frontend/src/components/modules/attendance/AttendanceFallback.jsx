import { FiCalendar, FiUsers, FiTrendingUp } from 'react-icons/fi';

const AttendanceFallback = ({ title = "Attendance Data", message = "Attendance APIs are not working" }) => {
  return (
    <div className="bg-white rounded-xl overflow-hidden mb-8" style={{ boxShadow: '0 0 22px 6px rgba(0, 0, 0, 0.09)' }}>
      <div className="px-6 py-4 border-b-2 border-gray-200 shadow-sm bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-100">
              <FiTrendingUp className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-600">Service temporarily unavailable</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="text-center py-12">
          <FiCalendar className="w-16 h-16 text-red-300 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-red-800 mb-2">Service Unavailable</h4>
          <p className="text-red-600 mb-4">{message}</p>
          <p className="text-sm text-gray-500">
            Other features of the application continue to work normally.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AttendanceFallback;