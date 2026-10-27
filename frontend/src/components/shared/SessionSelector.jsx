import React from 'react';
import { useGetAllSessionsQuery } from '../../redux/api/authApi';
import SelectDropdown from './form-fields/SelectDropdown';

const SessionSelector = ({ 
  selectedSessionId, 
  onSessionChange, 
  label = "Select Session",
  showLabel = true,
  required = false,
  disabled = false,
  showAll = true,
  includeAllOption = false,
  allOptionLabel = "All Sessions",
  placeholder = "Choose a session...",
  className = "",
  buttonClassName = "",
  showStatus = false,
  align = "left",
}) => {
  const { data: sessionsData, isLoading } = useGetAllSessionsQuery(showAll);

  const sessionsList = sessionsData?.data || [];
  const displaySessions = showAll 
    ? sessionsList 
    : sessionsList.filter((s) => s.isActive);

  const options = [
    ...(includeAllOption ? [{ value: "", label: allOptionLabel }] : []),
    ...displaySessions.map((session) => {
      const statusText = session.status 
        ? session.status.charAt(0).toUpperCase() + session.status.slice(1)
        : (session.isActive ? 'Active' : 'Inactive');
      const itemLabel = showStatus ? `${session.name} (${statusText})` : session.name;
      return {
        value: session._id,
        label: itemLabel,
      };
    }),
  ];

  if (isLoading) {
    return (
      <div className={className}>
        {showLabel && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="w-full h-10 px-3.5 flex items-center justify-between border border-gray-200 rounded-xl bg-gray-50 text-xs sm:text-sm text-gray-400 shadow-2xs animate-pulse">
          <span>Loading sessions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {showLabel && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <SelectDropdown
        value={selectedSessionId || ""}
        onChange={(val) => onSessionChange(val)}
        options={options}
        placeholder={includeAllOption ? allOptionLabel : placeholder}
        disabled={disabled}
        align={align}
        buttonClassName={
          buttonClassName ||
          "h-10 w-full flex items-center justify-between gap-2 px-3.5 border border-gray-200 hover:border-[var(--primary,#F97316)] bg-white rounded-xl text-xs sm:text-sm text-gray-700 font-medium transition-colors cursor-pointer shadow-2xs focus:outline-none"
        }
      />
      {displaySessions.length === 0 && (
        <p className="text-xs text-red-600 mt-1">
          No sessions found. Please create a session in Settings.
        </p>
      )}
    </div>
  );
};

export default SessionSelector;