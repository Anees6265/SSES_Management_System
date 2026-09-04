import { useSelector } from 'react-redux';
import { selectUserPermissions } from '../redux/auth/authSlice';

/**
 * A custom hook to check user permissions.
 * @returns {{hasPermission: (feature: string, access: string) => boolean}}
 */
export const usePermissions = () => {
    const userPermissions = useSelector(selectUserPermissions);

    /**
     * Checks if the current user has a specific permission.
     * @param {string} feature - The feature name (e.g., 'Button_CreateUser').
     * @param {string} access - The access type (e.g., 'read', 'execute').
     * @returns {boolean} - True if the user has the permission, false otherwise.
     */
    const hasPermission = (feature, access) => {
        if (!userPermissions || userPermissions.length === 0) {
            return false;
        }

        const featurePermission = userPermissions.find(p => p.feature === feature);

        if (!featurePermission) {
            return false;
        }

        return featurePermission.access.includes(access);
    };

    return { hasPermission };
};
