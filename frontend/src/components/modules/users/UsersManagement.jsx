

import { useState, useRef, useMemo, useEffect } from 'react';
import { toast } from 'react-toastify';
import { confirmToast } from '../../../utils/confirmToast';
import { Trash2, Edit, X, Eye, EyeOff, Phone, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGetAllUsersQuery, useDeleteUserMutation, useEditUserMutation, useSignupMutation, useGetAllDepartmentsQuery } from '../../../redux/api/authApi';
import CommonTable from '../../shared/table/CommonTable';
import TabsCommon from '../../shared/table/TabsCommon';
import Loader from '../../shared/loader/Loader';
import InputField from '../../shared/form-fields/InputField';
import CustomDropdown from '../../shared/form-fields/CustomDropdown';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { buttonStyles } from '../../../styles/buttonStyles';
import profile from '../../../assets/images/profile-img.png';
import RolesPermissions from './RolesPermissions';
import OrangeButton from '../../shared/sidebar/OrangeButton';
import { usePermissions } from '../../../hooks/usePermissions';
import SearchBox from '../../shared/search-export/SearchBox';
import ExportDropdown from '../../shared/search-export/ExportDropdown';
import Header from '../../shared/sidebar/Header';

const UsersManagement = () => {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    const createUserFormRef = useRef();
    const editUserFormRef = useRef();
    const [activeTab, setActiveTab] = useState('Users');
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredUsers, setFilteredUsers] = useState(null);
    const [editModal, setEditModal] = useState({ show: false, user: null });
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
            is: (val) => ['faculty', 'hod'].includes(val),
            then: (schema) => schema.required('Department is required for Faculty / HOD'),
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
            is: (val) => ['faculty', 'hod'].includes(val),
            then: (schema) => schema.required('Department is required for Faculty / HOD'),
            otherwise: (schema) => schema.notRequired(),
        }),
        mobileNo: Yup.string()
            .trim()
            .matches(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9)')
            .nullable(),
        isActive: Yup.boolean(),
    });

    const tabs = ['Users', 'Roles & Permissions'];
    const users = usersData?.users || [];

    const filterableColumns = [
        { label: 'Role', key: 'role' },
        { label: 'Department', key: 'department' },
        { label: 'Status', key: 'isActive' },
    ];

    const displayData = useMemo(() => {
        const base = filteredUsers ?? users;
        if (!searchTerm) return base;
        return base.filter((u) =>
            [u.name, u.email, u.mobileNo].some((v) =>
                v?.toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    }, [filteredUsers, users, searchTerm]);

    useEffect(() => {
        setMobilePage(1);
    }, [searchTerm]);

    const totalMobilePages = Math.ceil(displayData.length / mobilePageSize) || 1;
    const paginatedMobileUsers = useMemo(() => {
        const start = (mobilePage - 1) * mobilePageSize;
        return displayData.slice(start, start + mobilePageSize);
    }, [displayData, mobilePage, mobilePageSize]);

    const exportData = useMemo(() => users.map(u => ({
        Name: u.name || '',
        Email: u.email || '',
        'Contact No': u.mobileNo || '',
        Role: u.role || '',
        Department: u.department || '',
        Position: u.position || '',
        Status: u.isActive ? 'Active' : 'Inactive'
    })), [users]);

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
        return role.charAt(0).toUpperCase() + role.slice(1);
    };

    const getRoleBadgeColor = (role) => {
        switch (role?.toLowerCase()) {
            case 'superadmin': return 'bg-red-100 text-red-800';
            case 'admin': return 'bg-blue-100 text-blue-800';
            case 'faculty': return 'bg-green-100 text-green-800';
            case 'hod': return 'bg-amber-100 text-amber-800';
            case 'placement_officer': return 'bg-teal-100 text-teal-800';
            case 'chairman': return 'bg-purple-100 text-purple-800';
            case 'ceo': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
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
                                    options={[
                                        { value: 'faculty', label: 'Faculty' },
                                        { value: 'hod', label: 'HOD' },
                                        { value: 'placement_officer', label: 'Placement Officer' },
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
                                        options={departmentOptions} 
                                    />
                                )}
                            </div>
                            <InputField 
                                label="Position" 
                                name="position" 
                                type="select" 
                                placeholder="Select designated position"
                                options={[{ value: 'Assistant Professor', label: 'Assistant Professor' }, { value: 'Associate Professor', label: 'Associate Professor' }, { value: 'Professor', label: 'Professor' }, { value: 'Lecturer', label: 'Lecturer' }, { value: 'Chairman', label: 'Chairman' }, { value: 'CEO', label: 'CEO' }]} 
                            />
                        </div>

                        {/* Section 3: Credentials & Status */}
                        <div className="space-y-4">
                            <div className="border-b border-slate-100 pb-1.5 mb-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Credentials & Access</span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50/50 border border-slate-100 rounded-2xl p-3.5 sm:px-5 sm:py-4 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Account Status</label>
                                    <p className="text-[11px] text-gray-400 font-semibold mt-0.5">Activate or deactivate user platform access</p>
                                </div>
                                <div className="flex items-center gap-2 self-start sm:self-auto">
                                    <button
                                        type="button"
                                        onClick={() => setFieldValue('isActive', !values.isActive)}
                                        className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors duration-300 focus:outline-none ${values.isActive ? 'bg-orange-500' : 'bg-slate-350'}`}
                                    >
                                        <span className={`inline-block w-4.5 h-4.5 transform bg-white rounded-full shadow-md transition-transform duration-300 ${values.isActive ? 'translate-x-5.5' : 'translate-x-1'}`} />
                                    </button>
                                    <span className={`text-xs font-bold ${values.isActive ? 'text-orange-500' : 'text-slate-400'}`}>{values.isActive ? 'Active' : 'Inactive'}</span>
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

    const columns = [
        {
            key: 'name', label: 'Name',
            render: (user) => (
                <div className="flex items-center min-w-0 max-w-xs">
                    <img className="h-9 w-9 rounded-full object-cover mr-3 shrink-0 border border-slate-200" src={user.profileImage || profile} alt={user.name} />
                    <div className="min-w-0 flex-1">
                        <div className="font-bold text-gray-900 truncate">{user.name}</div>
                        <div className="text-xs text-gray-500 truncate">{user.position || 'Employee'}</div>
                    </div>
                </div>
            )
        },
        { 
            key: 'email', 
            label: 'Email',
            render: (user) => (
                <span className="text-xs sm:text-sm text-gray-600 block truncate max-w-[200px]" title={user.email}>
                    {user.email}
                </span>
            )
        },
        { 
            key: 'mobileNo', 
            label: 'Contact No.',
            render: (user) => (
                <span className="text-xs sm:text-sm text-gray-600">
                    {user.mobileNo || '—'}
                </span>
            )
        },
        {
            key: 'role', label: 'Role',
            render: (user) => (
                <span className={`inline-flex px-2.5 py-0.5 text-xs font-bold rounded-full border ${getRoleBadgeColor(user.role)}`}>
                    {formatRoleName(user.role)}
                </span>
            )
        },
        { 
            key: 'department', 
            label: 'Department',
            render: (user) => (
                <span className={`text-xs sm:text-sm font-medium ${['superadmin', 'admin'].includes(user?.role) ? 'text-purple-700 font-semibold' : 'text-gray-700'}`}>
                    {['superadmin', 'admin'].includes(user?.role) ? 'SSISM' : (user.department || '—')}
                </span>
            )
        },
        {
            key: 'isActive', label: 'Status',
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
        <div className="flex space-x-2">
            <button onClick={() => setEditModal({ show: true, user })} className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors" title="Edit User">
                <Edit size={14} />
            </button>
            <button onClick={() => handleDeleteUser(user._id || user.id, user.name)} className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors" title="Delete User">
                <Trash2 size={14} />
            </button>
        </div>
    );

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader /></div>;
    if (error) return <div className="p-6 text-center text-red-500">Error loading users. Please try again.</div>;

    return (
        <>
            <Header title="User Management">
                <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 flex-wrap">
                    <ExportDropdown data={exportData} sectionName="users" />
                    {hasPermission('Button_CreateUser', 'read') && (
                        <>
                            <button
                                type="button"
                                onClick={() => setCreateModalOpen(true)}
                                className="rounded-md bg-orange-500 px-3.5 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-orange-600 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                            >
                                + Create New
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

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-gray-200 bg-white px-3 sm:px-4 py-1 sm:py-0 gap-2">
                <div className="flex-1 min-w-0">
                    <TabsCommon tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
                </div>
                <div className="flex-shrink-0 self-end sm:self-auto">
                    <SearchBox searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
                </div>
            </div>

            <div className="p-2.5 sm:p-4 md:p-6">
                {activeTab === 'Users' ? (
                    <>
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
                                <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-2xs space-y-2">
                                    <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto text-xl">
                                        <UserIcon size={22} />
                                    </div>
                                    <p className="text-sm font-bold text-gray-800">No users found</p>
                                    <p className="text-xs text-gray-400">Try adjusting your search criteria</p>
                                </div>
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
                                                    <span>View Profile</span>
                                                </button>

                                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditModal({ show: true, user })}
                                                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                                                        title="Edit User"
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteUser(user._id || user.id, user.name)}
                                                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                                                        title="Delete User"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Mobile Pagination */}
                                    {totalMobilePages > 1 && (
                                        <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-gray-200 shadow-2xs">
                                            <button
                                                type="button"
                                                disabled={mobilePage === 1}
                                                onClick={() => setMobilePage(p => Math.max(1, p - 1))}
                                                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-gray-200 text-gray-700 disabled:opacity-40"
                                            >
                                                Previous
                                            </button>
                                            <span className="text-xs font-semibold text-gray-600">
                                                Page {mobilePage} of {totalMobilePages}
                                            </span>
                                            <button
                                                type="button"
                                                disabled={mobilePage === totalMobilePages}
                                                onClick={() => setMobilePage(p => Math.min(totalMobilePages, p + 1))}
                                                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-gray-200 text-gray-700 disabled:opacity-40"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </>
                ) : (
                    <RolesPermissions />
                )}
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
                                            options={[
                                                { value: 'faculty', label: 'Faculty' },
                                                { value: 'hod', label: 'HOD' },
                                                { value: 'placement_officer', label: 'Placement Officer' },
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
                                                options={departmentOptions} 
                                            />
                                        )}
                                    </div>

                                    {/* Account Status Switch Box */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50/50 border border-slate-100 rounded-2xl p-3.5 sm:px-5 sm:py-4 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Account Status</label>
                                            <p className="text-[11px] text-gray-400 font-semibold mt-0.5">Activate or deactivate user platform access</p>
                                        </div>
                                        <div className="flex items-center gap-2 self-start sm:self-auto">
                                            <button
                                                type="button"
                                                onClick={() => setFieldValue('isActive', !values.isActive)}
                                                className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors duration-300 focus:outline-none ${values.isActive ? 'bg-orange-500' : 'bg-slate-350'}`}
                                            >
                                                <span className={`inline-block w-4.5 h-4.5 transform bg-white rounded-full shadow-md transition-transform duration-300 ${values.isActive ? 'translate-x-5.5' : 'translate-x-1'}`} />
                                            </button>
                                            <span className={`text-xs font-bold ${values.isActive ? 'text-orange-500' : 'text-slate-400'}`}>{values.isActive ? 'Active' : 'Inactive'}</span>
                                        </div>
                                    </div>
                                </div>
                            </Form>
                        )}
                    </Formik>
                }
            />
        </>
    );
};

export default UsersManagement;
