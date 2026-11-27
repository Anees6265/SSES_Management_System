

import { useState, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../../redux/auth/authSlice';
import { toast } from 'react-toastify';
import { confirmToast } from '../../../utils/confirmToast';
import { Trash2, Edit, X, Eye, EyeOff, Phone, User as UserIcon, Plus, Key, Lock, Search, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGetAllUsersQuery, useDeleteUserMutation, useEditUserMutation, useSignupMutation, useGetAllDepartmentsQuery, useAdminResetUserPasswordMutation } from '../../../redux/api/authApi';
import CommonTable from '../../shared/table/CommonTable';
import Pagination from '../../shared/pagination/Pagination';
import Loader from '../../shared/loader/Loader';
import InputField from '../../shared/form-fields/InputField';
import CustomDropdown from '../../shared/form-fields/CustomDropdown';
import SelectDropdown from '../../shared/form-fields/SelectDropdown';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { buttonStyles } from '../../../styles/buttonStyles';
import profile from '../../../assets/images/profile-img.png';
import OrangeButton from '../../shared/sidebar/OrangeButton';
import { usePermissions } from '../../../hooks/usePermissions';
import ExportDropdown from '../../shared/search-export/ExportDropdown';
import Header from '../../shared/sidebar/Header';
import EmptyState from '../../shared/empty-state/EmptyState';
import ActiveFilterChips from '../../shared/search-export/ActiveFilterChips';
import { usePersistentState } from '../../../hooks/usePersistentFilters';

const UsersManagement = () => {
    const navigate = useNavigate();
    const currentUser = useSelector(selectCurrentUser);
    const isHod = ['hod', 'faculty', 'placement_officer', 'coordinator'].includes(currentUser?.role);
    const { hasPermission } = usePermissions();
    const createUserFormRef = useRef();
    const editUserFormRef = useRef();
    const [searchTerm, setSearchTerm] = usePersistentState('users_mgmt_search', '');
    const [departmentFilter, setDepartmentFilter] = usePersistentState('users_mgmt_dept_filter', 'all');
    const [filteredUsers, setFilteredUsers] = useState(null);
    const [editModal, setEditModal] = useState({ show: false, user: null });
    const [resetPassModal, setResetPassModal] = useState({ show: false, user: null });
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [mobilePage, setMobilePage] = useState(1);
    const mobilePageSize = 10;

    const { data: usersData, isLoading: loading, error } = useGetAllUsersQuery();
    const { data: deptData } = useGetAllDepartmentsQuery();
    const [deleteUser] = useDeleteUserMutation();
    const [editUser] = useEditUserMutation();
    const [createUser] = useSignupMutation();

    const departmentOptions = useMemo(() => {
        const rawList = deptData?.data || deptData?.departments || (Array.isArray(deptData) ? deptData : []);
        if (Array.isArray(rawList) && rawList.length > 0) {
            const list = rawList
                .filter(d => d.isActive !== false)
                .map(d => ({ value: d.name, label: d.name }));
            if (list.length > 0) return list;
        }
        return [
            { value: 'ITEG', label: 'ITEG' },
            { value: 'MEG', label: 'MEG' },
            { value: 'BEG', label: 'BEG' },
        ];
    }, [deptData]);

    const createUserValidationSchema = Yup.object().shape({
        name: Yup.string()
            .trim()
            .min(2, 'Name must be at least 2 characters')
            .required('Full name is required'),
        email: Yup.string()
            .trim()
            .email('Invalid email address')
            .matches(/^[a-zA-Z0-9._%+-]+@ssism\.org$/, 'Only institutional emails (@ssism.org) are allowed')
            .required('Email address is required'),
        mobileNo: Yup.string()
            .trim()
            .required('Mobile number is required')
            .matches(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9)'),
        adharCard: Yup.string()
            .trim()
            .required('Aadhar card number is required')
            .matches(/^\d{12}$/, 'Aadhar card number must be exactly 12 digits'),
        role: Yup.string()
            .required('Role is required'),
        department: Yup.string().when('role', {
            is: (val) => ['faculty', 'hod', 'placement_officer', 'coordinator'].includes(val),
            then: (schema) => schema.required('Department is required for Department Staff'),
            otherwise: (schema) => schema.notRequired(),
        }),
        position: Yup.string()
            .required('Position is required'),
        password: Yup.string()
            .min(6, 'Password must be at least 6 characters')
            .required('Password is required'),
        isActive: Yup.boolean(),
    });

    const editUserValidationSchema = Yup.object().shape({
        name: Yup.string().trim().required('Name is required'),
        position: Yup.string().required('Position is required'),
        role: Yup.string().required('Role is required'),
        department: Yup.string().when('role', {
            is: (val) => ['faculty', 'hod', 'placement_officer', 'coordinator'].includes(val),
            then: (schema) => schema.required('Department is required for Department Staff'),
            otherwise: (schema) => schema.notRequired(),
        }),
        mobileNo: Yup.string()
            .trim()
            .matches(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9)')
            .nullable(),
        isActive: Yup.boolean(),
    });

    const users = usersData?.users || [];

    const departmentFilterOptions = useMemo(() => {
        return [
            { value: "all", label: "All Departments" },
            ...departmentOptions
        ];
    }, [departmentOptions]);

    const activeUserChips = useMemo(() => {
        const chips = [];
        if (departmentFilter && departmentFilter !== 'all') {
            chips.push({
                key: 'department',
                label: 'Department',
                value: departmentFilter,
                displayValue: departmentFilter,
                onRemove: () => setDepartmentFilter('all'),
            });
        }
        if (searchTerm) {
            chips.push({
                key: 'search',
                label: 'Search',
                value: searchTerm,
                displayValue: `"${searchTerm}"`,
                onRemove: () => setSearchTerm(''),
            });
        }
        return chips;
    }, [departmentFilter, searchTerm]);

    const filterableColumns = [
        { label: 'Role', key: 'role' },
        { label: 'Department', key: 'department' },
        { label: 'Status', key: 'isActive' },
    ];

    const displayData = useMemo(() => {
        let base = filteredUsers ?? users;
        if (departmentFilter && departmentFilter !== 'all') {
            base = base.filter((u) => u.department?.toLowerCase() === departmentFilter.toLowerCase());
        }
        if (!searchTerm) return base;
        const q = searchTerm.toLowerCase().trim();
        return base.filter((u) =>
            [u.name, u.email, u.mobileNo, u.role, u.department, u.position].some((v) =>
                v?.toLowerCase().includes(q)
            )
        );
    }, [filteredUsers, users, departmentFilter, searchTerm]);

    useEffect(() => {
        setMobilePage(1);
    }, [searchTerm, departmentFilter]);

    const totalMobilePages = Math.ceil(displayData.length / mobilePageSize) || 1;
    const paginatedMobileUsers = useMemo(() => {
        const start = (mobilePage - 1) * mobilePageSize;
        return displayData.slice(start, start + mobilePageSize);
    }, [displayData, mobilePage, mobilePageSize]);

    const exportData = useMemo(() => displayData.map(u => ({
        Name: u.name || '',
        Email: u.email || '',
        'Contact No': u.mobileNo || '',
        Role: u.role || '',
        Department: u.department || '',
        Position: u.position || '',
        Status: u.isActive ? 'Active' : 'Inactive'
    })), [displayData]);

    const handleDeleteUser = async (userId, userName) => {
        if (await confirmToast(`Are you sure you want to delete ${userName}?`, { confirmButtonClass: "bg-red-500 hover:bg-red-600 text-white" })) {
            try {
                await deleteUser(userId).unwrap();
                toast.success('User deleted successfully');
            } catch {
                toast.error('Failed to delete user');
            }
        }
    };

    const handleCreateUser = async (values, { resetForm }) => {
        try {
            const trimmedName = values.name?.trim();
            const trimmedEmail = values.email?.trim().toLowerCase();
            const trimmedMobile = values.mobileNo ? String(values.mobileNo).trim() : '';
            const trimmedAdhar = values.adharCard ? String(values.adharCard).trim() : '';
            const trimmedDept = values.department?.trim();
            const trimmedPos = values.position?.trim();
            const trimmedPass = values.password?.trim();

            if (!trimmedName || !trimmedEmail || !trimmedMobile || !trimmedPass || !trimmedAdhar || !values.role || !trimmedPos) {
                toast.error('Please fill in all required fields');
                return;
            }

            if (['faculty', 'hod'].includes(values.role) && !trimmedDept) {
                toast.error('Department is required for Faculty / HOD');
                return;
            }

            if (!/^[a-zA-Z0-9._%+-]+@ssism\.org$/.test(trimmedEmail)) {
                toast.error('Only institutional emails (@ssism.org) are allowed');
                return;
            }

            if (!/^[6-9]\d{9}$/.test(trimmedMobile)) {
                toast.error('Mobile number must be a valid 10-digit number starting with 6, 7, 8, or 9');
                return;
            }

            if (!/^\d{12}$/.test(trimmedAdhar)) {
                toast.error('Aadhar card must be a valid 12-digit number');
                return;
            }

            const payload = {
                ...values,
                name: trimmedName,
                email: trimmedEmail,
                mobileNo: trimmedMobile,
                adharCard: trimmedAdhar,
                department: ['superadmin', 'admin'].includes(values.role) ? 'SSISM' : (trimmedDept || 'General'),
                position: trimmedPos,
                password: trimmedPass,
            };

            await createUser(payload).unwrap();
            toast.success('User created successfully');
            resetForm();
            setCreateModalOpen(false);
        } catch (error) {
            toast.error(error?.data?.message || 'Failed to create user');
        }
    };

    const formatRoleName = (role) => {
        if (!role) return "";
        if (role.toLowerCase() === "placement_officer") return "Placement Officer";
        if (role.toLowerCase() === "superadmin") return "Super Admin";
        if (role.toLowerCase() === "coordinator") return "Coordinator";
        if (role.toLowerCase() === "hod") return "HOD";
        return role.charAt(0).toUpperCase() + role.slice(1);
    };

    const getRoleBadgeColor = (role) => {
        switch (role?.toLowerCase()) {
            case 'superadmin': return 'bg-red-100 text-red-800 border-red-200';
            case 'admin': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'faculty': return 'bg-green-100 text-green-800 border-green-200';
            case 'hod': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'placement_officer': return 'bg-teal-100 text-teal-800 border-teal-200';
            case 'coordinator': return 'bg-sky-100 text-sky-800 border-sky-200';
            case 'chairman': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'ceo': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const CreateUserForm = ({ formikRef }) => {
        const [autoGenerate, setAutoGenerate] = useState(false);
        const [showPassword, setShowPassword] = useState(false);

        const generatePassword = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%';
            return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        };

        return (
            <Formik
                innerRef={formikRef}
                initialValues={{ name: '', email: '', mobileNo: '', adharCard: '', role: '', department: '', position: '', isActive: true, password: '' }}
                validationSchema={createUserValidationSchema}
                onSubmit={handleCreateUser}
            >
                {({ setFieldValue, values }) => (
                    <Form className="space-y-6">
                        {/* Section 1: General Details */}
                        <div className="space-y-3.5">
                            <div className="border-b border-slate-100 pb-1.5 mb-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">General Information</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                                <InputField label="Full Name" name="name" placeholder="Enter full name" />
                                <InputField label="Email Address" name="email" type="email" placeholder="user@ssism.org" />
                                <InputField 
                                    label="Mobile Number" 
                                    name="mobileNo" 
                                    placeholder="Enter 10-digit mobile number" 
                                    maxLength={10}
                                    onInput={(e) => {
                                        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
                                    }}
                                />
                                <InputField 
                                    label="Aadhar Number" 
                                    name="adharCard" 
                                    placeholder="Enter 12-digit Aadhar number" 
                                    maxLength={12}
                                    onInput={(e) => {
                                        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 12);
                                    }}
                                />
                            </div>
                        </div>

                        {/* Section 2: Organization & Placement */}
                        <div className="space-y-3.5">
                            <div className="border-b border-slate-100 pb-1.5 mb-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Organization & Role</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                                <InputField 
                                    label="Role" 
                                    name="role" 
                                    type="select" 
                                    placeholder="Select role"
                                    usePortal={true}
                                    options={[
                                        { value: 'faculty', label: 'Faculty' },
                                        { value: 'hod', label: 'HOD' },
                                        { value: 'placement_officer', label: 'Placement Officer' },
                                        { value: 'coordinator', label: 'Coordinator' },
                                        { value: 'admin', label: 'Admin' },
                                        { value: 'superadmin', label: 'Super Admin' }
                                    ]} 
                                />
                                {['superadmin', 'admin'].includes(values.role) ? (
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                                            Department
                                        </label>
                                        <div className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                            SSISM (Institution Wide)
                                        </div>
                                    </div>
                                ) : (
                                    <InputField 
                                        label="Department" 
                                        name="department" 
                                        type="select" 
                                        placeholder="Select department"
                                        usePortal={true}
                                        options={departmentOptions} 
                                    />
                                )}
                            </div>
                            <InputField 
                                label="Position" 
                                name="position" 
                                type="select" 
                                placeholder="Select designated position"
                                usePortal={true}
                                options={[{ value: 'Assistant Professor', label: 'Assistant Professor' }, { value: 'Associate Professor', label: 'Associate Professor' }, { value: 'Professor', label: 'Professor' }, { value: 'Lecturer', label: 'Lecturer' }, { value: 'Chairman', label: 'Chairman' }, { value: 'CEO', label: 'CEO' }]} 
                            />
                        </div>

                        {/* Section 3: Credentials & Status */}
                        <div className="space-y-4">
                            <div className="border-b border-slate-100 pb-1.5 mb-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Credentials & Access</span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5 sm:px-5 sm:py-4 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Account Status</label>
                                    <p className="text-[11px] text-gray-500 font-medium mt-0.5">Activate or deactivate user platform access</p>
                                </div>
                                <div className="flex items-center self-start sm:self-auto">
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={values.isActive}
                                        onClick={() => setFieldValue('isActive', !values.isActive)}
                                        className={`relative inline-flex items-center h-8 w-16 rounded-full transition-colors duration-200 ease-in-out cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                            values.isActive
                                                ? 'bg-orange-500 focus:ring-orange-500 shadow-sm'
                                                : 'bg-slate-300 hover:bg-slate-400 focus:ring-slate-400 shadow-inner'
                                        }`}
                                    >
                                        {/* Inner ON / OFF text on toggle track */}
                                        <span
                                            className={`absolute text-[10px] font-extrabold uppercase tracking-wider select-none transition-all duration-200 ${
                                                values.isActive
                                                    ? 'left-2.5 text-white'
                                                    : 'right-2.5 text-slate-600'
                                            }`}
                                        >
                                            {values.isActive ? 'ON' : 'OFF'}
                                        </span>

                                        {/* Sliding Thumb Knob */}
                                        <span
                                            className={`inline-block w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                                                values.isActive ? 'translate-x-[36px]' : 'translate-x-[4px]'
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>

                            <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-3.5 sm:p-5 space-y-3 sm:space-y-4">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Account Password</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="autoGenerate"
                                            checked={autoGenerate}
                                            onChange={(e) => {
                                                setAutoGenerate(e.target.checked);
                                                if (e.target.checked) setFieldValue('password', generatePassword());
                                            }}
                                            className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500 cursor-pointer"
                                        />
                                        <label htmlFor="autoGenerate" className="text-xs font-bold text-slate-500 cursor-pointer">Autogenerate</label>
                                    </div>
                                </div>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={values.password}
                                        onChange={(e) => setFieldValue('password', e.target.value)}
                                        placeholder="Enter password"
                                        className="w-full h-11 px-3 pr-10 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:border-orange-400 transition"
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-650 cursor-pointer">
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Form>
                )}
            </Formik>
        );
    };

// ── USER ACTION THREE DOTS DROPDOWN ──────────────────────────────────────────
const UserActionDropdown = ({
  user,
  canResetPassword,
  canDelete,
  onResetPassword,
  onEdit,
  onDelete,
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
        title="User Actions"
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
            {canResetPassword && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onResetPassword(user);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-colors cursor-pointer text-left"
              >
                <Key size={14} className="text-amber-500 shrink-0" />
                <span>Reset Password</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onEdit(user);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-colors cursor-pointer text-left"
            >
              <Edit size={14} className="text-blue-500 shrink-0" />
              <span>Edit User</span>
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
                <Trash2 size={14} className="text-rose-500 shrink-0" />
                <span>Delete User</span>
              </button>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};

    const columns = [
        {
            key: 'name',
            label: 'Name',
            align: 'center',
            render: (user) => (
                <div className="flex items-center min-w-0 max-w-xs mx-auto">
                    <img className="h-9 w-9 rounded-full object-cover mr-3 shrink-0 border border-slate-200" src={user.profileImage || profile} alt={user.name} />
                    <div className="min-w-0 text-left">
                        <div className="font-bold text-gray-900 truncate">{user.name}</div>
                        <div className="text-xs text-gray-500 truncate">{user.position || 'Employee'}</div>
                    </div>
                </div>
            )
        },
        { 
            key: 'email', 
            label: 'Email',
            align: 'center',
            render: (user) => (
                <span className="text-xs sm:text-sm text-gray-600 block truncate max-w-[200px] mx-auto text-center" title={user.email}>
                    {user.email}
                </span>
            )
        },
        { 
            key: 'mobileNo', 
            label: 'Contact No.',
            align: 'center',
            render: (user) => (
                <span className="text-xs sm:text-sm text-gray-600 block text-center">
                    {user.mobileNo || '—'}
                </span>
            )
        },
        {
            key: 'role',
            label: 'Role',
            align: 'center',
            render: (user) => (
                <span className={`inline-flex px-2.5 py-0.5 text-xs font-bold rounded-full border ${getRoleBadgeColor(user.role)}`}>
                    {formatRoleName(user.role)}
                </span>
            )
        },
        { 
            key: 'department', 
            label: 'Department',
            align: 'center',
            render: (user) => (
                <span className={`text-xs sm:text-sm font-medium ${['superadmin', 'admin'].includes(user?.role) ? 'text-purple-700 font-semibold' : 'text-gray-700'}`}>
                    {['superadmin', 'admin'].includes(user?.role) ? 'SSISM' : (user.department || '—')}
                </span>
            )
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
            )
        },
    ];

    const actionButton = (user) => (
        <UserActionDropdown
            user={user}
            canResetPassword={Boolean(!isHod && (currentUser?.role === 'superadmin' || currentUser?.role === 'admin'))}
            canDelete={Boolean(!isHod && currentUser?.role === 'superadmin')}
            onResetPassword={(u) => setResetPassModal({ show: true, user: u })}
            onEdit={(u) => setEditModal({ show: true, user: u })}
            onDelete={(u) => handleDeleteUser(u._id || u.id, u.name)}
        />
    );

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader /></div>;
    if (error) return <div className="p-6 text-center text-red-500">Error loading users. Please try again.</div>;

    return (
        <>
            <Header
                title="User Management"
                badge={`${displayData.length} Users`}
                breadcrumbs={[
                    { label: "User Management", path: "/user-management" },
                    { label: "Users" },
                ]}
            >
                <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 flex-wrap">
                    {hasPermission('Button_CreateUser', 'read') && (
                        <>
                            <button
                                type="button"
                                onClick={() => setCreateModalOpen(true)}
                                className="rounded-xl bg-orange-500 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-white transition-all duration-200 hover:bg-orange-600 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] inline-flex items-center justify-center gap-1.5 shrink-0"
                            >
                                <Plus size={16} />
                                <span>Create New</span>
                            </button>
                            <OrangeButton
                                isOpen={createModalOpen}
                                onClose={() => setCreateModalOpen(false)}
                                panelTitle="Create New User"
                                panelSubtitle="Add a new employee or staff account to the platform."
                                maxWidth="sm:max-w-xl"
                                leftBtnText="Cancel"
                                rightBtnText="Create User"
                                onRightClick={() => createUserFormRef.current?.submitForm()}
                                drawerContent={<CreateUserForm formikRef={createUserFormRef} />}
                            />
                        </>
                    )}
                </div>
            </Header>

            <div className="p-3 sm:p-5 lg:p-6 w-full min-h-screen bg-gray-50/40 space-y-4 sm:space-y-6">
                {/* Top Action & Search Bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-2xs">
                            {/* Search Input on Left */}
                            <div className="relative flex-1 max-w-full md:max-w-md">
                                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search users..."
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

                            {/* Department Filter & Download Dropdown on Right */}
                            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
                                <SelectDropdown
                                    value={departmentFilter}
                                    onChange={(val) => setDepartmentFilter(val || "all")}
                                    options={departmentFilterOptions}
                                    className="w-full sm:w-48"
                                    buttonClassName="h-10 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-bold transition hover:border-orange-400 shadow-2xs cursor-pointer"
                                />

                                <ExportDropdown
                                    data={exportData}
                                    sectionName="users"
                                    className="w-full sm:w-auto"
                                />
                            </div>
                        </div>

                        {/* Active Filter Chips */}
                        {activeUserChips.length > 0 && (
                            <ActiveFilterChips
                                chips={activeUserChips}
                                onClearAll={() => {
                                    setDepartmentFilter('all');
                                    setSearchTerm('');
                                }}
                            />
                        )}

                        {/* ── DESKTOP & TABLET VIEW: FULL DATA TABLE (>= 768px) ── */}
                        <div className="hidden md:block">
                            <CommonTable
                                columns={columns}
                                data={displayData}
                                searchTerm={searchTerm}
                                pagination={true}
                                editable={true}
                                actionButton={actionButton}
                                onRowClick={(user) => navigate(`/user-profile/${user._id || user.id}`)}
                                rowsPerPage={10}
                            />
                        </div>

                        {/* ── MOBILE VIEW: MODERN RESPONSIVE USER CARDS (< 768px) ── */}
                        <div className="md:hidden space-y-3">
                            {displayData.length === 0 ? (
                                <EmptyState
                                    title="No Users Found"
                                    subtitle={
                                        searchTerm
                                            ? `No users matched "${searchTerm}". Try checking your spelling or clear search.`
                                            : "No user accounts match the current filters or no users exist yet."
                                    }
                                    actionText={searchTerm ? "Clear Search" : undefined}
                                    onAction={searchTerm ? () => setSearchTerm("") : undefined}
                                />
                            ) : (
                                <>
                                    {paginatedMobileUsers.map((user) => (
                                        <div
                                            key={user._id || user.id}
                                            onClick={() => navigate(`/user-profile/${user._id || user.id}`)}
                                            className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs hover:border-orange-200 transition-all duration-150 active:scale-[0.99] cursor-pointer space-y-3"
                                        >
                                            {/* Top Row: Avatar, Name, Position, Status Badge */}
                                            <div className="flex items-start justify-between gap-2.5">
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <img
                                                        src={user.profileImage || profile}
                                                        alt={user.name}
                                                        className="w-11 h-11 rounded-full object-cover border border-slate-200 shrink-0"
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <h4 className="font-bold text-sm text-gray-900 truncate leading-snug">
                                                            {user.name}
                                                        </h4>
                                                        <p className="text-xs text-gray-500 truncate mt-0.5">
                                                            {user.position || "Employee"}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Status Pill */}
                                                <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border shrink-0 ${
                                                    user.isActive 
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                        : 'bg-rose-50 text-rose-700 border-rose-200'
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                    {user.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>

                                            {/* Middle Details Grid */}
                                            <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 text-xs space-y-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-slate-400 font-medium">Role:</span>
                                                    <span className={`inline-flex px-2 py-0.5 text-[11px] font-bold rounded-full ${getRoleBadgeColor(user.role)}`}>
                                                        {formatRoleName(user.role)}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-slate-400 font-medium">Department:</span>
                                                    <span className="font-bold text-slate-700 truncate">
                                                        {['superadmin', 'admin'].includes(user?.role) ? 'SSISM' : (user.department || "—")}
                                                    </span>
                                                </div>

                                                {user.email && (
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-slate-400 font-medium">Email:</span>
                                                        <a
                                                            href={`mailto:${user.email}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="font-semibold text-orange-600 hover:underline truncate max-w-[200px]"
                                                        >
                                                            {user.email}
                                                        </a>
                                                    </div>
                                                )}

                                                {user.mobileNo && (
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-slate-400 font-medium">Contact:</span>
                                                        <a
                                                            href={`tel:${user.mobileNo}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="font-bold text-slate-800 hover:text-orange-600 flex items-center gap-1"
                                                        >
                                                            <Phone size={12} className="text-orange-500" />
                                                            <span>{user.mobileNo}</span>
                                                        </a>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Bottom Actions Row */}
                                            <div className="flex items-center justify-between pt-1 border-t border-slate-100 gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/user-profile/${user._id || user.id}`);
                                                        }}
                                                        className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 p-1"
                                                    >
                                                        <Eye size={13} />
                                                        <span>View Profile</span>
                                                    </button>

                                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                    {actionButton(user)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Mobile Pagination */}
                                    {totalMobilePages > 1 && (
                                        <div className="bg-gray-100 p-3 sm:px-6 sm:py-4 rounded-2xl border border-gray-200 shadow-2xs">
                                            <Pagination
                                                totalItems={displayData.length}
                                                currentPage={mobilePage}
                                                pageSize={mobilePageSize}
                                                totalPages={totalMobilePages}
                                                onPageChange={setMobilePage}
                                                label="entries"
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
            </div>

            <OrangeButton
                isOpen={editModal.show}
                onClose={() => setEditModal({ show: false, user: null })}
                panelTitle="Edit User"
                panelSubtitle="Update user profile information and department role."
                leftBtnText="Cancel"
                rightBtnText="Save Changes"
                onRightClick={() => editUserFormRef.current?.submitForm()}
                maxWidth="sm:max-w-xl"
                drawerContent={
                    <Formik
                        innerRef={editUserFormRef}
                        initialValues={{ 
                            name: editModal.user?.name || '', 
                            position: editModal.user?.position || '', 
                            role: editModal.user?.role || '', 
                            department: ['superadmin', 'admin'].includes(editModal.user?.role) ? 'SSISM' : (editModal.user?.department || ''), 
                            mobileNo: editModal.user?.mobileNo || '',
                            isActive: editModal.user?.isActive ?? true 
                        }}
                        validationSchema={editUserValidationSchema}
                        onSubmit={async (values) => {
                            try {
                                const isGlobalRole = ['superadmin', 'admin'].includes(values.role);
                                const payload = {
                                    id: editModal.user._id || editModal.user.id,
                                    ...values,
                                    department: isGlobalRole ? 'SSISM' : values.department,
                                };
                                await editUser(payload).unwrap();
                                toast.success('User updated successfully');
                                setEditModal({ show: false, user: null });
                            } catch (err) {
                                toast.error(err?.data?.message || 'Failed to update user');
                            }
                        }}
                    >
                        {({ setFieldValue, values }) => (
                            <Form className="space-y-6">
                                {/* Section 1: User Info */}
                                <div className="space-y-3.5">
                                    <div className="border-b border-slate-100 pb-1.5 mb-3">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">User Information</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                                        <InputField label="Full Name" name="name" placeholder="Enter user name" />
                                        <InputField 
                                            label="Position" 
                                            name="position" 
                                            type="select" 
                                            placeholder="Select designated position"
                                            usePortal={true}
                                            options={[{ value: 'Assistant Professor', label: 'Assistant Professor' }, { value: 'Associate Professor', label: 'Associate Professor' }, { value: 'Professor', label: 'Professor' }, { value: 'Lecturer', label: 'Lecturer' }, { value: 'Chairman', label: 'Chairman' }, { value: 'CEO', label: 'CEO' }]} 
                                        />
                                    </div>
                                    <div>
                                        <InputField 
                                            label="Mobile Number" 
                                            name="mobileNo" 
                                            placeholder="Enter 10-digit mobile number" 
                                            maxLength={10}
                                            onInput={(e) => {
                                                e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Section 2: Access & Department */}
                                <div className="space-y-4">
                                    <div className="border-b border-slate-100 pb-1.5 mb-3">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Access & Department</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                                        <InputField 
                                            label="Role" 
                                            name="role" 
                                            type="select" 
                                            placeholder="Select role"
                                            usePortal={true}
                                            options={[
                                                { value: 'faculty', label: 'Faculty' },
                                                { value: 'hod', label: 'HOD' },
                                                { value: 'placement_officer', label: 'Placement Officer' },
                                                { value: 'coordinator', label: 'Coordinator' },
                                                { value: 'admin', label: 'Admin' },
                                                { value: 'superadmin', label: 'Super Admin' }
                                            ]} 
                                        />
                                        {['superadmin', 'admin'].includes(values.role) ? (
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                                                    Department
                                                </label>
                                                <div className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                                    SSISM (Institution Wide)
                                                </div>
                                            </div>
                                        ) : (
                                            <InputField 
                                                label="Department" 
                                                name="department" 
                                                type="select" 
                                                placeholder="Select department"
                                                usePortal={true}
                                                options={departmentOptions} 
                                            />
                                        )}
                                    </div>

                                    {/* Account Status Switch Box */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5 sm:px-5 sm:py-4 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Account Status</label>
                                            <p className="text-[11px] text-gray-500 font-medium mt-0.5">Activate or deactivate user platform access</p>
                                        </div>
                                        <div className="flex items-center self-start sm:self-auto">
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={values.isActive}
                                                onClick={() => setFieldValue('isActive', !values.isActive)}
                                                className={`relative inline-flex items-center h-8 w-16 rounded-full transition-colors duration-200 ease-in-out cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                                    values.isActive
                                                        ? 'bg-orange-500 focus:ring-orange-500 shadow-sm'
                                                        : 'bg-slate-300 hover:bg-slate-400 focus:ring-slate-400 shadow-inner'
                                                }`}
                                            >
                                                {/* Inner ON / OFF text on toggle track */}
                                                <span
                                                    className={`absolute text-[10px] font-extrabold uppercase tracking-wider select-none transition-all duration-200 ${
                                                        values.isActive
                                                            ? 'left-2.5 text-white'
                                                            : 'right-2.5 text-slate-600'
                                                    }`}
                                                >
                                                    {values.isActive ? 'ON' : 'OFF'}
                                                </span>

                                                {/* Sliding Thumb Knob */}
                                                <span
                                                    className={`inline-block w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                                                        values.isActive ? 'translate-x-[36px]' : 'translate-x-[4px]'
                                                    }`}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </Form>
                        )}
                    </Formik>
                }
            />

            {/* Admin Reset User Password Modal */}
            {resetPassModal.show && (
                <AdminResetPasswordModal
                    user={resetPassModal.user}
                    onClose={() => setResetPassModal({ show: false, user: null })}
                />
            )}
        </>
    );
};

// ── Admin Reset Password Modal ──
const AdminResetPasswordModal = ({ user, onClose }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [adminResetUserPassword, { isLoading }] = useAdminResetUserPasswordMutation();

    const handleAutoGenerate = () => {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
        let gen = "";
        for (let i = 0; i < 10; i++) {
            gen += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setNewPassword(gen);
        setConfirmPassword(gen);
        setShowPass(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newPassword || newPassword.length < 6) {
            toast.error("Password must be at least 6 characters long");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        try {
            const res = await adminResetUserPassword({
                id: user._id || user.id,
                newPassword,
            }).unwrap();
            toast.success(res?.message || `Password for ${user.name} reset successfully!`);
            onClose();
        } catch (err) {
            toast.error(err?.data?.message || err?.message || "Failed to reset password");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-xs">
                            <Lock size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Reset Password</h3>
                            <p className="text-[11px] text-slate-400 font-medium truncate">Set new password for {user?.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="flex items-center justify-between pb-1">
                        <span className="text-xs text-slate-500">Need a secure password?</span>
                        <button
                            type="button"
                            onClick={handleAutoGenerate}
                            className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                            <Key size={13} /> Autogenerate
                        </button>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">New Password (min 6 chars)</label>
                        <div className="relative">
                            <input
                                type={showPass ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                                className="w-full h-11 px-3.5 pr-10 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-orange-500 transition"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(!showPass)}
                                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                            >
                                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confirm New Password</label>
                        <div className="relative">
                            <input
                                type={showPass ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Re-enter new password"
                                className="w-full h-11 px-3.5 pr-10 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-orange-500 transition"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-200 text-gray-700 bg-white hover:bg-slate-50 font-bold tracking-wider uppercase text-xs rounded-xl transition cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-5 py-2 text-xs font-bold tracking-wider uppercase text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                            {isLoading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                            <span>Reset Password</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UsersManagement;
