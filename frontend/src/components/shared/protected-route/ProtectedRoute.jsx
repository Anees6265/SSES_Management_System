/* eslint-disable react/prop-types */
import { Navigate } from 'react-router-dom';

const normalizeRole = (role) => {
    const cleaned = String(role || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
    return cleaned === 'cordinator' ? 'coordinator' : cleaned;
};

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const userRole = normalizeRole(localStorage.getItem('role'));
    const normalizedAllowed = allowedRoles.map(normalizeRole);
    
    // If no role is found, redirect to login
    if (!userRole) {
        return <Navigate to="/login" replace />;
    }
    
    // If specific roles are required and user doesn't have permission
    if (normalizedAllowed.length > 0 && !normalizedAllowed.includes(userRole)) {
        return <Navigate to="/unauthorized" replace />;
    }
    
    return children;
};

export default ProtectedRoute;