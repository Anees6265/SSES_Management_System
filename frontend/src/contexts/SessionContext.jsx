import React, { createContext, useContext, useState, useEffect } from 'react';
import { useGetAllSessionsQuery } from '../redux/api/authApi';

const SessionContext = createContext();

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

export const SessionProvider = ({ children }) => {
  const [activeSessionId, setActiveSessionId] = useState(() => {
    return localStorage.getItem('activeSessionId') || '';
  });
  const { data: sessions, isLoading } = useGetAllSessionsQuery(true);

  // Sync activeSessionId to localStorage whenever it changes
  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem('activeSessionId', activeSessionId);
    }
  }, [activeSessionId]);

  // Auto-select first active or available session on load if none is selected
  useEffect(() => {
    if (sessions?.data && sessions.data.length > 0 && !activeSessionId) {
      const activeSess = sessions.data.find(s => s.isActive || s.status === 'active') || sessions.data[0];
      if (activeSess) {
        setActiveSessionId(activeSess._id);
      }
    }
  }, [sessions, activeSessionId]);

  const activeSession = sessions?.data?.find(session => session._id === activeSessionId);

  const value = {
    activeSessionId,
    setActiveSessionId,
    activeSession,
    sessions: sessions?.data || [],
    isLoading
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

export default SessionContext;