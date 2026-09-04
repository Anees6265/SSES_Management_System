import { createContext, useContext, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useGetCurrentUserQuery } from '../redux/api/authApi';

const PermissionContext = createContext();

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};

export const PermissionProvider = ({ children }) => {
  const [userPermissions, setUserPermissions] = useState([]);
  const { user } = useSelector((state) => state.auth);
  const { data: currentUserData } = useGetCurrentUserQuery(undefined, {
    skip: !user?.id
  });

  useEffect(() => {
    if (currentUserData?.user?.permissions) {
      setUserPermissions(currentUserData.user.permissions);
    }
  }, [currentUserData]);

  const hasPermission = (feature, access = 'read') => {
    if (!userPermissions || userPermissions.length === 0) {
      return false;
    }

    const permission = userPermissions.find(p => p.feature === feature);
    if (!permission) {
      return false;
    }

    return permission.access.includes(access);
  };

  const hasAnyPermission = (features, access = 'read') => {
    return features.some(feature => hasPermission(feature, access));
  };

  const getUserRole = () => {
    return user?.role || 'guest';
  };

  const value = {
    userPermissions,
    hasPermission,
    hasAnyPermission,
    getUserRole,
    isLoading: !currentUserData && !!user?.id
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

export default PermissionContext;