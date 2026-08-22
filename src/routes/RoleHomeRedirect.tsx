import React from "react";
import { Navigate } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import { useAuth } from "../context/AuthContext";
import { getPrimaryRoleSlug, getRoleHomePath } from "./roleRouting";

export const RoleHomeRedirect: React.FC = () => {
    const { user, isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <LoadingSpinner fullScreen message="جارٍ التحقق من جلسة الدخول..." />
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <Navigate to={getRoleHomePath(getPrimaryRoleSlug(user))} replace />;
};

export default RoleHomeRedirect;
