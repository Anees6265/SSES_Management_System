import React from 'react';
import { useGetAllSessionsQuery } from '../../redux/api/authApi';

const SessionSelector = ({ 
  selectedSessionId, 
  onSessionChange, 
  label = "Select Session",
  showLabel = true,
  required = true,
  disabled = false,
  showAll = true,
  includeAllOption = false,
  allOptionLabel = "All Sessions",
  placeholder = "Choose a session...",
  className = ""
}) => {
  const { data: sessionsData, isLoading } = useGetAllSessionsQuery(showAll);

  const sessionsList = sessionsData?.data || [];
  const displaySessions = showAll 
    ? sessionsList 
    : sessionsList.filter(s => s.isActive);

  if (isLoading) {
    return (
      <div className={`${className}`}>
        {showLabel && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm text-gray-500">
          Loading sessions...
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {showLabel && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        value={selectedSessionId || ''}
        onChange={(e) => onSessionChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 text-sm bg-white cursor-pointer"
        required={required}
        disabled={disabled}
      >
        {includeAllOption ? (
          <option value="">{allOptionLabel}</option>
        ) : (
          <option value="">{placeholder}</option>
        )}
        {displaySessions.map((session) => {
          const statusText = session.status 
            ? session.status.charAt(0).toUpperCase() + session.status.slice(1)
            : (session.isActive ? 'Active' : 'Inactive');
          return (
            <option key={session._id} value={session._id}>
              {session.name} ({statusText})
            </option>
          );
        })}
      </select>
      {displaySessions.length === 0 && (
        <p className="text-sm text-red-600 mt-1">
          No sessions found. Please create a session in Settings.
        </p>
      )}
    </div>
  );
};

export default SessionSelector;