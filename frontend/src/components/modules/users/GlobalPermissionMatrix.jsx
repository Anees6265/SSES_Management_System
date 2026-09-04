import React, { useState, useEffect } from 'react';
import { useGetAllPossiblePermissionsQuery, useGetUserPermissionsQuery, useUpdateUserPermissionsMutation } from '../../../redux/api/authApi';
import { ArrowLeft, Save } from 'lucide-react';
import Loader from '../../shared/loader/Loader';
import { toast } from 'react-toastify';

const permissionLabelMap = {
  // Dashboard
  'Page_Dashboard': { name: 'Dashboard Access', category: 'Dashboard & Attendance' },
  'Page_AttendanceDetails': { name: 'Attendance Details Page', category: 'Dashboard & Attendance' },

  // User Management
  'Page_UserManagement': { name: 'User Management Page', category: 'User Management' },
  'Tab_Users': { name: 'Users List Tab', category: 'User Management' },
  'Tab_RolesAndPermissions': { name: 'Roles & Permissions Tab', category: 'User Management' },
  'Button_CreateUser': { name: 'Create User Button', category: 'User Management' },
  'Action_CreateUser': { name: 'Create User Action', category: 'User Management' },
  'Action_EditUser': { name: 'Edit User Action', category: 'User Management' },
  'Action_DeleteUser': { name: 'Delete User Action', category: 'User Management' },
  'Page_RoleManagement': { name: 'Role Cards View', category: 'User Management' },
  'Button_CreateRole': { name: 'Create Role Card', category: 'User Management' },
  'Action_CreateRole': { name: 'Create Role Action', category: 'User Management' },
  'Button_ManagePermissions': { name: 'Manage Role Permissions Button', category: 'User Management' },
  'Page_GlobalPermissionMatrix': { name: 'User Global Permission Matrix', category: 'User Management' },

  // Academics & Admissions
  'Page_Admission': { name: 'Admission Process Section', category: 'Academics & Admissions' },
  'Page_AdmittedStudents': { name: 'Student Progress List', category: 'Academics & Admissions' },
  'Page_Department': { name: 'Department Management Page', category: 'Academics & Admissions' },
  'Page_SubDepartment': { name: 'Sub-Department Management Page', category: 'Academics & Admissions' },
  'Page_Level': { name: 'Academic Level Management', category: 'Academics & Admissions' },
  'Page_SubLevel': { name: 'Academic Sub-Level Management', category: 'Academics & Admissions' },
  'Page_Syllabus': { name: 'Syllabus / Curriculum Config', category: 'Academics & Admissions' },
  'Page_LevelWiseManagement': { name: 'Level-Wise Management', category: 'Academics & Admissions' },
  'Page_DummyStudents': { name: 'Dummy Students Permissions', category: 'Academics & Admissions' },
  'Page_LeaveRequests': { name: 'Student Leave Requests', category: 'Academics & Admissions' },
  'Page_TaskManagement': { name: 'Task Management Page', category: 'Academics & Admissions' },
  'Page_CurriculumManagement': { name: 'Curriculum Management Page', category: 'Academics & Admissions' },

  // Placements
  'Page_Placement': { name: 'Placement Dashboard & Candidates', category: 'Placements' },
  'Page_CompanyDetails': { name: 'Company Details Management', category: 'Placements' },
  'Page_PlacedStudents': { name: 'Placed Students & Stories', category: 'Placements' },

  // System Settings
  'Page_Settings': { name: 'Main Settings Page', category: 'System Settings' },
  'Page_SessionManagement': { name: 'Session Management Page', category: 'System Settings' },
  'Page_Support': { name: 'Support / Help Desk', category: 'System Settings' }
};

const GlobalPermissionMatrix = ({ user, onBack }) => {
    const { data: allPermissionsData, isLoading: isLoadingAll, error: errorAll } = useGetAllPossiblePermissionsQuery();
    const { data: userPermissionsData, isLoading: isLoadingUser, error: errorUser } = useGetUserPermissionsQuery(user._id || user.id);
    const [updateUserPermissions, { isLoading: isUpdating }] = useUpdateUserPermissionsMutation();

    const [permissions, setPermissions] = useState([]);

    const permissionsString = JSON.stringify(userPermissionsData?.permissions || []);

    useEffect(() => {
        if (permissionsString) {
            setPermissions(JSON.parse(permissionsString));
        }
    }, [permissionsString]);

    const handleCheckboxChange = (featureName, accessType) => {
        setPermissions(currentPermissions => {
            const newPermissions = JSON.parse(JSON.stringify(currentPermissions));
            const feature = newPermissions.find(p => p.feature === featureName);

            if (feature) {
                const accessIndex = feature.access.indexOf(accessType);
                if (accessIndex > -1) {
                    feature.access.splice(accessIndex, 1);
                } else {
                    feature.access.push(accessType);
                }
            } else {
                newPermissions.push({ feature: featureName, access: [accessType] });
            }
            return newPermissions;
        });
    };

    const handleSave = async () => {
        try {
            await updateUserPermissions({ id: user._id || user.id, permissions }).unwrap();
            toast.success('Permissions updated successfully!');
            onBack();
        } catch {
            toast.error('Failed to update permissions.');
        }
    };

    if (isLoadingAll || isLoadingUser) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader />
            </div>
        );
    }

    if (errorAll || errorUser) {
        return <div className="p-6 text-center text-red-500">Error loading permissions data.</div>;
    }

    const masterPermissions = allPermissionsData?.permissions?.superadmin || [];
    const allAccessTypes = [...new Set(masterPermissions.flatMap(p => p.access))];

    // Group permissions by category for better readability
    const groupedPermissions = masterPermissions.reduce((acc, item) => {
        const info = permissionLabelMap[item.feature] || {
            name: item.feature.replace(/^(Page|Tab|Button|Action)_/, '').replace(/([A-Z])/g, ' $1').trim(),
            category: 'Others'
        };
        const category = info.category;
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push({
            ...item,
            displayName: info.name
        });
        return acc;
    }, {});

    return (
        <div className="mt-1 border bg-[var(--backgroundColor)] shadow-sm rounded-lg p-6">
            <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800">
                            Global Permissions for {user.name}
                        </h2>
                        <p className="text-sm text-gray-500">
                            Role: <span className="font-medium capitalize">{user.role}</span>
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isUpdating}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:bg-orange-300 transition-colors"
                >
                    <Save size={16} />
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Page / Feature</th>
                            {allAccessTypes.map(accessType => (
                                <th key={accessType} className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider capitalize">
                                    {accessType}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {Object.entries(groupedPermissions).map(([category, items]) => (
                            <React.Fragment key={category}>
                                {/* Category Divider Row */}
                                <tr className="bg-orange-50 font-semibold text-orange-800">
                                    <td colSpan={allAccessTypes.length + 1} className="px-6 py-2.5 text-sm uppercase tracking-wider font-bold">
                                        {category}
                                    </td>
                                </tr>
                                {items.map(({ feature: featureName, displayName }) => (
                                    <tr key={featureName} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            <div className="font-semibold text-gray-800">{displayName}</div>
                                            <div className="text-xs text-gray-400 font-normal">{featureName}</div>
                                        </td>
                                        {allAccessTypes.map(accessType => {
                                            const featurePermission = permissions.find(p => p.feature === featureName);
                                            const isChecked = featurePermission ? featurePermission.access.includes(accessType) : false;
                                            return (
                                                <td key={accessType} className="px-6 py-4 whitespace-nowrap text-center">
                                                    <input
                                                        type="checkbox"
                                                        className="h-5 w-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500 cursor-pointer"
                                                        checked={isChecked}
                                                        onChange={() => handleCheckboxChange(featureName, accessType)}
                                                    />
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default GlobalPermissionMatrix;
