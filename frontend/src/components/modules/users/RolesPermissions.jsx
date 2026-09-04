import React, { useState } from 'react';
import { useGetAllUsersQuery, useCreateRoleMutation, useGetAllRolesQuery, useDeleteUserMutation, useEditUserMutation } from '../../../redux/api/authApi';
import { FaUserShield, FaUser, FaChalkboardTeacher, FaCrown, FaBriefcase, FaPlus, FaEdit, FaTrash, FaEye } from 'react-icons/fa';
import Loader from '../../shared/loader/Loader';
import { buttonStyles } from '../../../styles/buttonStyles';
import InputField from '../../shared/form-fields/InputField';
import { Formik, Form } from 'formik';
import { X, ArrowLeft } from 'lucide-react';
import { toast } from 'react-toastify';
import CommonTable from '../../shared/table/CommonTable';
import Pagination from '../../shared/pagination/Pagination';
import profile from '../../../assets/images/profile-img.png';
import { useNavigate } from 'react-router-dom';
import GlobalPermissionMatrix from './GlobalPermissionMatrix';

const RolesPermissions = () => {
    const navigate = useNavigate();
    const { data: usersData, isLoading: usersLoading, error: usersError } = useGetAllUsersQuery();
    const { data: rolesData, isLoading: rolesLoading, error: rolesError } = useGetAllRolesQuery();
    const [createRole] = useCreateRoleMutation();
    const [deleteUser] = useDeleteUserMutation();
    const [editUser] = useEditUserMutation();
    const [showCreateRole, setShowCreateRole] = useState(false);
    const [selectedRole, setSelectedRole] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDepartments, setSelectedDepartments] = useState([]);
    const [editModal, setEditModal] = useState({ show: false, user: null });
    const [showPermissionMatrix, setShowPermissionMatrix] = useState({ show: false, user: null });
    
    const users = usersData?.users || [];
    const customRoles = rolesData?.roles || [];
    
    // Extract unique roles from users data (existing system roles)
    const systemRoles = [...new Set(users.map(user => user.role).filter(Boolean))];
    
    // Combine system roles and custom roles
    const allRoles = [
        ...systemRoles.map(role => ({ roleName: role, description: getRoleDescription(role), isCustom: false })),
        ...customRoles.map(role => ({ ...role, isCustom: true }))
    ];
    // Get role statistics
    const getRoleStats = (roleName) => {
        return users.filter(user => user.role === roleName).length;
    };
    
    // Get role icon
    const getRoleIcon = (roleName) => {
        switch (roleName?.toLowerCase()) {
            case 'superadmin':
                return <FaCrown className="text-2xl text-orange-500" />;
            case 'admin':
                return <FaUserShield className="text-2xl text-orange-500" />;
            case 'faculty':
                return <FaChalkboardTeacher className="text-2xl text-orange-500" />;
            case 'hod':
                return <FaUserShield className="text-2xl text-orange-500" />;
            case 'chairman':
                return <FaBriefcase className="text-2xl text-orange-500" />;
            case 'ceo':
                return <FaCrown className="text-2xl text-orange-500" />;
            case 'placement_officer':
                return <FaBriefcase className="text-2xl text-teal-500" />;
            default:
                return <FaUser className="text-2xl text-orange-500" />;
        }
    };
    
    // Get role description
    function getRoleDescription(roleName) {
        switch (roleName?.toLowerCase()) {
            case 'superadmin':
                return 'Full system access with all administrative privileges and user management capabilities.';
            case 'admin':
                return 'Administrative access to manage users, departments, and system configurations.';
            case 'faculty':
                return 'Access to student management, academic records, and educational content.';
            case 'hod':
                return 'Department head access with full visibility and management of their assigned department.';
            case 'chairman':
                return 'Executive oversight of departments and strategic decision-making authority.';
            case 'ceo':
                return 'Highest level executive access with complete organizational oversight.';
            case 'placement_officer':
                return 'Placement officer access for managing department placement activities, student readiness, and drives.';
            default:
                return 'Custom role with specific permissions and access levels.';
        }
    }
    
    const handleCreateRole = async (values, { resetForm }) => {
        try {
            await createRole(values).unwrap();
            toast.success('Role created successfully');
            resetForm();
            setShowCreateRole(false);
        } catch (error) {
            console.error('Error creating role:', error);
            toast.error(error?.data?.message || 'Failed to create role');
        }
    };
    
    const handleManagePermissions = (role) => {
        setSelectedRole(role);
    };
    
    const handleDeleteUser = async (userId, userName) => {
        if (window.confirm(`Are you sure you want to delete ${userName}?`)) {
            try {
                await deleteUser(userId).unwrap();
                toast.success('User deleted successfully');
            } catch (error) {
                console.error('Error deleting user:', error);
                toast.error('Failed to delete user');
            }
        }
    };

    const handleEditUser = (user) => {
        setEditModal({ show: true, user });
    };

    const handleViewUser = (userId) => {
        navigate(`/user-profile/${userId}`);
    };

    const handleUserRowClick = (user) => {
        setShowPermissionMatrix({ show: true, user });
    };
    
    const getRoleBadgeColor = (role) => {
        switch (role?.toLowerCase()) {
            case 'superadmin':
                return 'bg-red-100 text-red-800';
            case 'admin':
                return 'bg-blue-100 text-blue-800';
            case 'faculty':
                return 'bg-green-100 text-green-800';
            case 'hod':
                return 'bg-amber-100 text-amber-800';
            case 'chairman':
                return 'bg-purple-100 text-purple-800';
            case 'ceo':
                return 'bg-yellow-100 text-yellow-800';
            case 'placement_officer':
                return 'bg-teal-100 text-teal-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };
    
    if (usersLoading || rolesLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader />
            </div>
        );
    }
    
    if (usersError || rolesError) {
        return (
            <div className="p-6">
                <div className="text-center py-12">
                    <p className="text-red-500">Error loading data. Please try again.</p>
                </div>
            </div>
        );
    }
    
    return (
        <>
            {/* Global Permission Matrix - Render first to ensure it shows */}
            {showPermissionMatrix.show ? (
                <GlobalPermissionMatrix 
                    user={showPermissionMatrix.user}
                    onBack={() => setShowPermissionMatrix({ show: false, user: null })}
                />
            ) : (
                <>
                    {/* If a role is selected, show users table */}
                    {selectedRole ? (
                <div className="mt-1 border bg-[var(--backgroundColor)] shadow-sm rounded-lg">
                    <div className="flex items-center gap-4 mb-6 px-5 pt-4">
                        <button
                            onClick={() => setSelectedRole(null)}
                            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800">
                                {selectedRole.roleName.charAt(0).toUpperCase() + selectedRole.roleName.slice(1)} Users
                            </h2>
                            <p className="text-sm text-gray-500">
                                {users.filter(user => user.role === selectedRole.roleName).length} user{users.filter(user => user.role === selectedRole.roleName).length !== 1 ? 's' : ''} with this role
                            </p>
                        </div>
                    </div>
                    
                    <div className="px-5 flex justify-between items-center flex-wrap gap-4 mt-4">
                        <Pagination
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            filtersConfig={[
                                {
                                    title: 'Department',
                                    options: [...new Set(users.filter(user => user.role === selectedRole.roleName).map(user => user.department).filter(Boolean))],
                                    selected: selectedDepartments,
                                    setter: setSelectedDepartments
                                }
                            ]}
                            allData={users.filter(user => user.role === selectedRole.roleName)}
                            sectionName="users"
                        />
                    </div>
                    
                    <CommonTable
                        columns={[
                            {
                                key: 'name',
                                label: 'Name',
                                render: (user) => (
                                    <div className="flex items-center">
                                        <img
                                            className="h-8 w-8 rounded-full object-cover mr-3"
                                            src={user.profileImage || profile}
                                            alt={user.name}
                                        />
                                        <div>
                                            <div className="font-medium">{user.name}</div>
                                            <div className="text-sm text-gray-500">{user.position}</div>
                                        </div>
                                    </div>
                                )
                            },
                            { key: 'email', label: 'Email' },
                            { key: 'mobileNo', label: 'Contact No.' },
                            {
                                key: 'role',
                                label: 'Role',
                                render: (user) => (
                                    <div className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                                        {user.role}
                                    </div>
                                )
                            },
                            { key: 'department', label: 'Department' },
                            {
                                key: 'isActive',
                                label: 'Status',
                                render: (user) => (
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                        {user.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                )
                            }
                        ]}
                        data={users.filter(user => {
                            const matchesRole = user.role === selectedRole.roleName;
                            const matchesDepartment = selectedDepartments.length === 0 || selectedDepartments.includes(user.department);
                            return matchesRole && matchesDepartment;
                        })}
                        searchTerm={searchTerm}
                        pagination={true}
                        editable={true}
                        onRowClick={handleUserRowClick}
                        actionButton={(user) => (
                            <div className="flex space-x-1">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewUser(user._id || user.id);
                                    }}
                                    className="p-2 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                    title="View Details"
                                >
                                    <FaEye size={14} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteUser(user._id || user.id, user.name);
                                    }}
                                    className="p-2 rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                    title="Delete User"
                                >
                                    <FaTrash size={14} />
                                </button>
                            </div>
                        )}
                        rowsPerPage={10}
                    />
                </div>
            ) : (
            <div>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold text-gray-800">
                        System Roles
                    </h2>
                    <p className="text-sm text-gray-500">
                        {allRoles.length} role{allRoles.length !== 1 ? 's' : ''} available
                    </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {/* Create New Role Card */}
                    <div
                        onClick={() => setShowCreateRole(true)}
                        className="bg-white p-6 rounded-xl border-2 border-dashed border-gray-300 hover:border-orange-400 transition-all duration-200 cursor-pointer hover:shadow-md"
                    >
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                                <FaPlus className="text-xl text-orange-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                Create New Role
                            </h3>
                            <p className="text-sm text-gray-600">
                                Add a new role to the system
                            </p>
                        </div>
                    </div>
                    
                    {/* Role Cards */}
                    {allRoles.map((role, index) => {
                        const userCount = getRoleStats(role.roleName);
                        
                        return (
                            <div
                                key={index}
                                className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    {getRoleIcon(role.roleName)}
                                    <div className="flex-1 ml-3">
                                        <h3 className="text-lg font-semibold text-gray-800">
                                            {role.roleName?.toLowerCase() === 'placement_officer' ? 'Placement Officer' : role.roleName?.toLowerCase() === 'superadmin' ? 'Super Admin' : role.roleName}
                                        </h3>
                                    </div>
                                    <span className="text-2xl font-bold text-gray-800">
                                        {userCount}
                                    </span>
                                </div>
                                
                                <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                                    {role.description}
                                </p>
                                
                                <button
                                    className="w-full py-2 text-sm font-medium bg-gray-100 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors"
                                    onClick={() => handleManagePermissions(role)}
                                >
                                    Manage Permissions
                                </button>
                            </div>
                        );
                    })}
                </div>
                
                {allRoles.length === 0 && (
                    <div className="text-center py-12">
                        <div className="text-gray-400 text-4xl mb-4 flex justify-center">
                            <FaUser />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Roles Found</h3>
                        <p className="text-gray-500">No user roles are currently defined in the system.</p>
                    </div>
                )}
            </div>
            )}
            
            {/* Create Role Side Panel */}
            {showCreateRole && (
                <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-end z-50">
                    <div className="bg-white h-full w-96 shadow-xl flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h2 className="text-xl font-semibold text-gray-800">Create New Role</h2>
                            <button
                                onClick={() => setShowCreateRole(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="flex-1 p-6">
                            <h3 className="text-lg font-medium text-gray-800 mb-6">Role Information</h3>
                            
                            <Formik
                                initialValues={{
                                    roleName: '',
                                    description: ''
                                }}
                                onSubmit={handleCreateRole}
                            >
                                {({ values, setFieldValue }) => (
                                    <Form className="space-y-6">
                                        <InputField
                                            label="Role Name"
                                            name="roleName"
                                            placeholder="Enter role name"
                                        />
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Description
                                            </label>
                                            <textarea
                                                name="description"
                                                value={values.description}
                                                onChange={(e) => setFieldValue('description', e.target.value)}
                                                placeholder="Enter role description"
                                                rows={4}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none"
                                            />
                                        </div>
                                    </Form>
                                )}
                            </Formik>
                        </div>
                        
                        <div className="p-6 border-t bg-white">
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateRole(false)}
                                    className="flex-1 py-3 font-medium bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        document.querySelector('form').dispatchEvent(
                                            new Event('submit', { cancelable: true, bubbles: true })
                                        );
                                    }}
                                    className={`flex-1 py-3 font-medium ${buttonStyles.primary}`}
                                >
                                    Create Role
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
                </>
            )}
        </>
    );
};

export default RolesPermissions;