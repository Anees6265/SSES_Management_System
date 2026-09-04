import { useState, useEffect } from 'react';
import { useSession } from '../contexts/SessionContext';

export const useSessionSelector = (initialSessionId = '') => {
  const { activeSessionId, setActiveSessionId, sessions } = useSession();
  const [selectedSessionId, setSelectedSessionId] = useState(initialSessionId || activeSessionId);

  useEffect(() => {
    if (!selectedSessionId && activeSessionId) {
      setSelectedSessionId(activeSessionId);
    }
  }, [activeSessionId, selectedSessionId]);

  const handleSessionChange = (sessionId) => {
    setSelectedSessionId(sessionId);
    if (sessionId) {
      setActiveSessionId(sessionId);
    }
  };

  const selectedSession = sessions.find(session => session._id === selectedSessionId);

  return {
    selectedSessionId,
    selectedSession,
    sessions,
    handleSessionChange
  };
};

export default useSessionSelector;