/* eslint-disable react/prop-types */
// src/components/shared/protected-route/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";

const ProtectedRoutes = ({ children }) => {
    const token = localStorage.getItem("token");

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoutes;
