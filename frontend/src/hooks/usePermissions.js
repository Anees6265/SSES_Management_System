import { useSelector } from 'react-redux';
import { selectUserPermissions } from '../redux/auth/authSlice';

const PERMISSION_ALIASES = {
    Page_PlacementDashboard: ['Page_Placement'],
    Page_PlacementDrives: ['Page_Placement'],
    Page_ResumeSharing: ['Page_Placement'],
    Page_PlacementRecords: ['Page_Placement'],
    Page_PlacementCandidates: ['Page_Placement'],
    Page_Students: ['Page_Admission'],
    Page_Admission: ['Page_Students'],
    Page_Levels: ['Page_LevelWiseManagement'],
    Page_LevelWiseManagement: ['Page_Levels'],
    Page_CurriculumManagement: ['Page_Syllabus'],
    Page_Syllabus: ['Page_CurriculumManagement'],
    Page_DummyStudents: ['Page_StudentPermission'],
    Page_StudentPermission: ['Page_DummyStudents'],
};

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
    const hasPermission = (feature, access = 'read') => {
        if (!userPermissions || userPermissions.length === 0) {
            return false;
        }

        const featurePermission = userPermissions.find(p => p.feature === feature);

        if (featurePermission && featurePermission.access && featurePermission.access.includes(access)) {
            return true;
        }

        // Check backwards compatibility aliases
        const aliases = PERMISSION_ALIASES[feature];
        if (aliases) {
            for (const alias of aliases) {
                const aliasPerm = userPermissions.find(p => p.feature === alias);
                if (aliasPerm && aliasPerm.access && aliasPerm.access.includes(access)) {
                    return true;
                }
            }
        }

        return false;
    };

    return { hasPermission };
};
