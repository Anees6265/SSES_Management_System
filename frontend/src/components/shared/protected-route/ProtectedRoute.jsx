/* eslint-disable react/prop-types */
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const userRole = localStorage.getItem('role');
    
    // If no role is found, redirect to login
    if (!userRole) {
        return <Navigate to="/login" replace />;
    }
    
    // If specific roles are required and user doesn't have permission
    if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
        return <Navigate to="/unauthorized" replace />;
    }
    
    return children;
};

export default ProtectedRoute;