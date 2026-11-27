import React, { useState, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../../redux/auth/authSlice';
import {
  useGetAllUsersQuery,
  useCreateRoleMutation,
  useGetAllRolesQuery,
  useDeleteUserMutation,
  useGetAllDepartmentsQuery,
} from '../../../redux/api/authApi';
import { FaUserShield, FaEye, FaTrash } from 'react-icons/fa';
import Loader from '../../shared/loader/Loader';
import { buttonStyles } from '../../../styles/buttonStyles';
import InputField from '../../shared/form-fields/InputField';
import SelectDropdown from '../../shared/form-fields/SelectDropdown';
import ActiveFilterChips from '../../shared/search-export/ActiveFilterChips';
import Header from '../../shared/sidebar/Header';
import { Formik, Form } from 'formik';
import { X, Search, Plus, MoreVertical } from 'lucide-react';
import { toast } from 'react-toastify';
import { confirmToast } from '../../../utils/confirmToast';
import CommonTable from '../../shared/table/CommonTable';
import profile from '../../../assets/images/profile-img.png';
import { useNavigate } from 'react-router-dom';
import GlobalPermissionMatrix from './GlobalPermissionMatrix';

// ── ACTION THREE DOTS DROPDOWN ──────────────────────────────────────────
const RoleActionDropdown = ({
  user,
  onManagePermissions,
  onViewDetails,
  onDelete,
  canDelete,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);

  const toggleDropdown = (e) => {
    e.stopPropagation();
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownHeight = 130;
    const openUpward = window.innerHeight - rect.bottom < dropdownHeight && rect.top > dropdownHeight;
    setCoords({
      top: openUpward ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
      left: Math.max(16, rect.right - 170),
    });
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleClose = () => setIsOpen(false);
    window.addEventListener("click", handleClose);
    window.addEventListener("scroll", handleClose, true);
    window.addEventListener("resize", handleClose);
    return () => {
      window.removeEventListener("click", handleClose);
      window.removeEventListener("scroll", handleClose, true);
      window.removeEventListener("resize", handleClose);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-flex items-center justify-center text-center" onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleDropdown}
        className="w-8 h-8 rounded-xl border border-gray-200 bg-white hover:bg-orange-50/70 hover:border-orange-300 text-gray-500 hover:text-orange-600 flex items-center justify-center transition-all duration-150 cursor-pointer shadow-2xs active:scale-95 mx-auto"
        title="Actions"
      >
        <MoreVertical size={16} />
      </button>

      {isOpen &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 999999,
            }}
            className="w-44 rounded-xl bg-white border border-gray-200 shadow-xl p-1.5 animate-in fade-in zoom-in-95 duration-100 space-y-0.5 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onManagePermissions(user);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-colors cursor-pointer text-left"
            >
              <FaUserShield size={14} className="text-orange-500 shrink-0" />
              <span>Permissions</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onViewDetails(user);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-colors cursor-pointer text-left"
            >
              <FaEye size={14} className="text-blue-500 shrink-0" />
              <span>View Profile</span>
            </button>

            {canDelete && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onDelete(user);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer text-left"
              >
                <FaTrash size={13} className="text-rose-500 shrink-0" />
                <span>Delete User</span>
              </button>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};

const RolesPermissions = () => {
    const navigate = useNavigate();
    const currentUser = useSelector(selectCurrentUser);
    const isHod = ['hod', 'faculty', 'placement_officer', 'coordinator'].includes(currentUser?.role);
    const createRoleFormRef = useRef();

    const { data: usersData, isLoading: usersLoading, error: usersError } = useGetAllUsersQuery();
    const { data: rolesData, isLoading: rolesLoading, error: rolesError } = useGetAllRolesQuery();
    const { data: deptData, isLoading: deptLoading } = useGetAllDepartmentsQuery();

    const [createRole] = useCreateRoleMutation();
    const [deleteUser] = useDeleteUserMutation();

    const [showCreateRole, setShowCreateRole] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [showPermissionMatrix, setShowPermissionMatrix] = useState({ show: false, user: null });

    const users = usersData?.users || [];
    const customRoles = rolesData?.roles || [];

    const formatRoleName = (role) => {
        if (!role) return "";
        const lower = role.toLowerCase();
        if (lower === "placement_officer") return "Placement Officer";
        if (lower === "superadmin") return "Super Admin";
        if (lower === "coordinator") return "Coordinator";
        if (lower === "hod") return "HOD";
        return role.charAt(0).toUpperCase() + role.slice(1);
    };

    const getRoleBadgeColor = (role) => {
        switch (role?.toLowerCase()) {
            case 'superadmin':
                return 'bg-red-50 text-red-700 border-red-200';
            case 'admin':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'faculty':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'hod':
                return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'placement_officer':
                return 'bg-teal-50 text-teal-700 border-teal-200';
            case 'coordinator':
                return 'bg-sky-50 text-sky-700 border-sky-200';
            case 'chairman':
                return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'ceo':
                return 'bg-yellow-50 text-yellow-700 border-yellow-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    // Role options for filter dropdown
    const roleOptions = useMemo(() => {
        const userRoles = users.map((u) => u.role).filter(Boolean);
        const customRoleNames = customRoles.map((r) => r.roleName).filter(Boolean);
        const standardRoles = ['superadmin', 'admin', 'faculty', 'hod', 'placement_officer', 'coordinator', 'chairman', 'ceo'];
        const allUniqueRoles = Array.from(new Set([...standardRoles, ...userRoles, ...customRoleNames]));

        const opts = allUniqueRoles.map((r) => ({
            value: r,
            label: formatRoleName(r),
        }));

        return [{ value: 'all', label: 'All Roles' }, ...opts];
    }, [users, customRoles]);

    // Department options for filter dropdown
    const departmentOptions = useMemo(() => {
        const rawList = deptData?.data || deptData?.departments || (Array.isArray(deptData) ? deptData : []);
        if (Array.isArray(rawList) && rawList.length > 0) {
            const list = rawList
                .filter((d) => d.isActive !== false)
                .map((d) => ({ value: d.name, label: d.name }));
            if (list.length > 0) return [{ value: 'all', label: 'All Departments' }, ...list];
        }
        return [
            { value: 'all', label: 'All Departments' },
            { value: 'ITEG', label: 'ITEG' },
            { value: 'MEG', label: 'MEG' },
            { value: 'BEG', label: 'BEG' },
        ];
    }, [deptData]);

    // Filtered users calculation
    const filteredUsers = useMemo(() => {
        return users.filter((user) => {
            // Role filter
            if (roleFilter !== 'all' && user.role?.toLowerCase() !== roleFilter.toLowerCase()) {
                return false;
            }
            // Department filter
            if (departmentFilter !== 'all' && user.department?.toLowerCase() !== departmentFilter.toLowerCase()) {
                return false;
            }
            // Search query filter
            if (searchTerm.trim()) {
                const q = searchTerm.toLowerCase().trim();
                const matchName = user.name?.toLowerCase().includes(q);
                const matchEmail = user.email?.toLowerCase().includes(q);
                const matchMobile = user.mobileNo?.toLowerCase().includes(q);
                const matchRole = user.role?.toLowerCase().includes(q);
                const matchDept = user.department?.toLowerCase().includes(q);
                const matchPosition = user.position?.toLowerCase().includes(q);
                if (!matchName && !matchEmail && !matchMobile && !matchRole && !matchDept && !matchPosition) {
                    return false;
                }
            }
            return true;
        });
    }, [users, roleFilter, departmentFilter, searchTerm]);

    // Active filter chips
    const activeChips = useMemo(() => {
        const chips = [];
        if (roleFilter && roleFilter !== 'all') {
            chips.push({
                key: 'role',
                label: 'Role',
                value: roleFilter,
                displayValue: formatRoleName(roleFilter),
                onRemove: () => setRoleFilter('all'),
            });
        }
        if (departmentFilter && departmentFilter !== 'all') {
            chips.push({
                key: 'department',
                label: 'Department',
                value: departmentFilter,
                displayValue: departmentFilter,
                onRemove: () => setDepartmentFilter('all'),
            });
        }
        if (searchTerm.trim()) {
            chips.push({
                key: 'search',
                label: 'Search',
                value: searchTerm,
                displayValue: `"${searchTerm}"`,
                onRemove: () => setSearchTerm(''),
            });
        }
        return chips;
    }, [roleFilter, departmentFilter, searchTerm]);

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

    const handleDeleteUser = async (userId, userName) => {
        if (await confirmToast(`Are you sure you want to delete ${userName}?`, { confirmButtonClass: "bg-red-500 hover:bg-red-600 text-white" })) {
            try {
                await deleteUser(userId).unwrap();
                toast.success('User deleted successfully');
            } catch (error) {
                console.error('Error deleting user:', error);
                toast.error('Failed to delete user');
            }
        }
    };

    const handleViewUser = (userId) => {
        navigate(`/user-profile/${userId}`);
    };

    const handleUserRowClick = (user) => {
        setShowPermissionMatrix({ show: true, user });
    };

    // Columns with centered headers and aligned data
    const columns = [
        {
            key: 'name',
            label: 'Name',
            align: 'center',
            render: (user) => (
                <div className="flex items-center min-w-0 max-w-xs mx-auto">
                    <img
                        className="h-9 w-9 rounded-full object-cover mr-3 shrink-0 border border-slate-200"
                        src={user.profileImage || profile}
                        alt={user.name}
                    />
                    <div className="min-w-0 text-left">
                        <div className="font-bold text-gray-900 truncate">{user.name}</div>
                        <div className="text-xs text-gray-500 truncate">{user.position || 'Employee'}</div>
                    </div>
                </div>
            ),
        },
        {
            key: 'email',
            label: 'Email',
            align: 'center',
            render: (user) => (
                <span className="text-xs sm:text-sm text-gray-600 block truncate max-w-[200px] mx-auto text-center" title={user.email}>
                    {user.email || '—'}
                </span>
            ),
        },
        {
            key: 'mobileNo',
            label: 'Contact No.',
            align: 'center',
            render: (user) => (
                <span className="text-xs sm:text-sm text-gray-600 block text-center">
                    {user.mobileNo || '—'}
                </span>
            ),
        },
        {
            key: 'role',
            label: 'Role',
            align: 'center',
            render: (user) => (
                <span className={`inline-flex px-2.5 py-0.5 text-xs font-bold rounded-full border ${getRoleBadgeColor(user.role)}`}>
                    {formatRoleName(user.role)}
                </span>
            ),
        },
        {
            key: 'department',
            label: 'Department',
            align: 'center',
            render: (user) => (
                <span className={`text-xs sm:text-sm font-medium ${['superadmin', 'admin'].includes(user?.role) ? 'text-purple-700 font-semibold' : 'text-gray-700'}`}>
                    {['superadmin', 'admin'].includes(user?.role) ? 'SSISM' : (user.department || '—')}
                </span>
            ),
        },
        {
            key: 'isActive',
            label: 'Status',
            align: 'center',
            render: (user) => (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded-full border ${
                    user.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    {user.isActive ? 'Active' : 'Inactive'}
                </span>
            ),
        },
    ];

    if (usersLoading || rolesLoading || deptLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader />
            </div>
        );
    }

    if (usersError || rolesError) {
        return (
            <div className="p-6 text-center text-red-500 font-semibold">
                Error loading roles and permissions data. Please try again.
            </div>
        );
    }

    // If GlobalPermissionMatrix is open, show it
    if (showPermissionMatrix.show) {
        return (
            <GlobalPermissionMatrix
                user={showPermissionMatrix.user}
                onBack={() => setShowPermissionMatrix({ show: false, user: null })}
            />
        );
    }

    return (
        <div className="w-full flex-1 flex flex-col bg-gray-50/40 min-h-screen">
            {/* ── TOP HEADER (With Create Role Button) ── */}
            <Header
                title="Roles & Permissions"
                badge={`${filteredUsers.length} Users`}
                breadcrumbs={[
                    { label: "User Management", path: "/user-management" },
                    { label: "Roles & Permissions" },
                ]}
            >
                <div className="flex items-center gap-2">
                    {!isHod && (currentUser?.role === 'superadmin' || currentUser?.role === 'admin') && (
                        <button
                            type="button"
                            onClick={() => setShowCreateRole(true)}
                            className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm px-3.5 sm:px-4 py-2 sm:py-2.5 transition-all duration-200 shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                            title="Create New Role"
                        >
                            <Plus size={16} />
                            <span>Create Role</span>
                        </button>
                    )}
                </div>
            </Header>

            <div className="p-3 sm:p-5 lg:p-6 w-full space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">
                {/* ── TOP SEARCH & FILTER CONTROLS BAR ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-2xs">
                    {/* Search Input on Left */}
                    <div className="relative flex-1 max-w-full md:max-w-md">
                        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search users by name, email, role, department..."
                            className="w-full pl-9 pr-8 h-10 text-xs sm:text-sm font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-slate-50/50 hover:bg-white text-slate-800 placeholder-slate-400 transition shadow-2xs"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                aria-label="Clear search"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Role & Department Filter Dropdowns on Right */}
                    <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
                        {/* Roles Filter Dropdown */}
                        <SelectDropdown
                            value={roleFilter}
                            onChange={(val) => setRoleFilter(val || "all")}
                            options={roleOptions}
                            className="w-full sm:w-48"
                            buttonClassName="h-10 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-bold transition hover:border-orange-400 shadow-2xs cursor-pointer"
                        />

                        {/* Department Filter Dropdown */}
                        <SelectDropdown
                            value={departmentFilter}
                            onChange={(val) => setDepartmentFilter(val || "all")}
                            options={departmentOptions}
                            className="w-full sm:w-48"
                            buttonClassName="h-10 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-bold transition hover:border-orange-400 shadow-2xs cursor-pointer"
                        />
                    </div>
                </div>

                {/* ── ACTIVE FILTER CHIPS ── */}
                {activeChips.length > 0 && (
                    <ActiveFilterChips
                        chips={activeChips}
                        onClearAll={() => {
                            setRoleFilter("all");
                            setDepartmentFilter("all");
                            setSearchTerm("");
                        }}
                    />
                )}

                {/* ── DIRECT USERS DATA TABLE ── */}
                <div className="bg-white border border-gray-200 shadow-2xs rounded-2xl overflow-hidden">
                    <CommonTable
                        columns={columns}
                        data={filteredUsers}
                        searchTerm={searchTerm}
                        pagination={true}
                        editable={true}
                        onRowClick={handleUserRowClick}
                        actionButton={(user) => (
                            <RoleActionDropdown
                                user={user}
                                onManagePermissions={() => handleUserRowClick(user)}
                                onViewDetails={() => handleViewUser(user._id || user.id)}
                                onDelete={() => handleDeleteUser(user._id || user.id, user.name)}
                                canDelete={!isHod && currentUser?.role === 'superadmin'}
                            />
                        )}
                        rowsPerPage={10}
                    />
                </div>
            </div>

            {/* ── CREATE ROLE MODAL ── */}
            {showCreateRole && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 overflow-y-auto"
                    onClick={() => setShowCreateRole(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
                    >
                        <div className="flex items-start justify-between px-5 sm:px-6 py-4 sm:py-5 border-b border-gray-150 bg-slate-50/70 gap-3">
                            <div>
                                <h2 className="text-base sm:text-xl font-bold text-gray-900 leading-tight">Create New Role</h2>
                                <p className="text-xs sm:text-sm text-gray-500 mt-1">Define new role name and role description</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCreateRole(false)}
                                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-xl hover:bg-gray-100 transition-colors shrink-0 cursor-pointer"
                                title="Close"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar">
                            <Formik
                                innerRef={createRoleFormRef}
                                initialValues={{
                                    roleName: '',
                                    description: '',
                                }}
                                onSubmit={handleCreateRole}
                            >
                                {({ values, setFieldValue }) => (
                                    <Form className="space-y-4 sm:space-y-5">
                                        <InputField
                                            label="Role Name"
                                            name="roleName"
                                            placeholder="Enter role name (e.g. Lab Technician)"
                                        />

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                                Description
                                            </label>
                                            <textarea
                                                name="description"
                                                value={values.description}
                                                onChange={(e) => setFieldValue('description', e.target.value)}
                                                placeholder="Enter role responsibilities and description..."
                                                rows={4}
                                                className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-700 focus:outline-none focus:border-orange-400 focus:bg-white transition resize-none"
                                            />
                                        </div>
                                    </Form>
                                )}
                            </Formik>
                        </div>

                        <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-t border-gray-150 bg-white">
                            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateRole(false)}
                                    className="w-full sm:w-auto px-5 py-2 sm:py-2.5 border border-gray-200 text-gray-700 bg-white hover:bg-slate-50 hover:border-gray-400 font-bold tracking-wider uppercase text-xs sm:text-sm rounded-xl transition-all duration-200 active:scale-[0.97] shadow-2xs hover:shadow-xs cursor-pointer flex items-center justify-center text-center"
                                >
                                    <span>Cancel</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => createRoleFormRef.current?.submitForm()}
                                    className={`w-full sm:w-auto px-5 py-2 sm:py-2.5 rounded-xl font-bold tracking-wider uppercase text-xs sm:text-sm transition-all duration-200 active:scale-[0.97] shadow-xs hover:shadow-md cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 text-center ${buttonStyles.primary}`}
                                >
                                    <Plus size={14} />
                                    <span>Create Role</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RolesPermissions;
