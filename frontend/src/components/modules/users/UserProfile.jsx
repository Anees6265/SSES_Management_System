import { useParams, useNavigate } from "react-router-dom";
import { 
  useGetUserByIdQuery, 
  useUpdateUserMutation, 
  useGetAllSubdepartmentsQuery, 
  useGetAllDepartmentsQuery,
  useChangeUserPasswordMutation,
  useAdminResetUserPasswordMutation
} from "../../../redux/api/authApi";
import { 
  IoCamera, 
  IoCopyOutline, 
  IoCheckmarkOutline, 
  IoCallOutline, 
  IoMailOutline, 
  IoEyeOutline, 
  IoEyeOffOutline,
  IoSearchOutline,
  IoSparkles
} from "react-icons/io5";
import { 
  FiUser, 
  FiBriefcase, 
  FiShield, 
  FiMail, 
  FiPhone, 
  FiCalendar, 
  FiClock, 
  FiBookOpen, 
  FiEdit3, 
  FiExternalLink, 
  FiAlertCircle, 
  FiX, 
  FiLock,
  FiTrash2,
  FiCreditCard
} from "react-icons/fi";
import Header from "../../shared/sidebar/Header";
import SelectDropdown from "../../shared/form-fields/SelectDropdown";
import AvatarPickerModal from "../../shared/avatar/AvatarPickerModal";
import { toast } from 'react-toastify';
import { useState, useRef, useMemo, useEffect } from 'react';

const getRoleBadgeColor = (role) => {
  switch (role?.toLowerCase()) {
    case 'superadmin': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'admin': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'hod': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'faculty': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'placement_officer': return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    case 'coordinator': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const formatRoleName = (role) => {
  if (!role) return '—';
  switch (role.toLowerCase()) {
    case 'superadmin': return 'Super Admin';
    case 'admin': return 'Admin';
    case 'hod': return 'HOD';
    case 'faculty': return 'Faculty';
    case 'placement_officer': return 'Placement Officer';
    case 'coordinator': return 'Coordinator';
    default: return role.charAt(0).toUpperCase() + role.slice(1);
  }
};

const UserProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Queries & Mutations
  const { data, isLoading, isError, error, refetch } = useGetUserByIdQuery(id);
  const { data: subdepartmentsRes } = useGetAllSubdepartmentsQuery();
  const { data: departmentsRes } = useGetAllDepartmentsQuery();
  const [updateUser, { isLoading: isUpdatingUser }] = useUpdateUserMutation();

  // Component state
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [showAadhar, setShowAadhar] = useState(false);
  const [permissionSearch, setPermissionSearch] = useState("");

  const fileInputRef = useRef(null);

  // Authenticated user check for permissions
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  const isSuperAdmin = currentUser?.role === "superadmin";
  const isAdmin = currentUser?.role === "admin" || isSuperAdmin;
  const isSelf = currentUser?._id === id || currentUser?.id === id;
  const canEdit = isAdmin || isSelf;

  const subdepartments = subdepartmentsRes?.data || [];
  const userData = data?.user;

  // Extract department names for the edit modal
  const departmentOptions = useMemo(() => {
    const rawList = departmentsRes?.data || departmentsRes?.departments || (Array.isArray(departmentsRes) ? departmentsRes : []);
    const names = rawList.map(d => (typeof d === 'string' ? d : d.name)).filter(Boolean);
    return [...new Set(names)];
  }, [departmentsRes]);

  // Filter allowed courses based on user's department
  const assignedCourses = useMemo(() => {
    if (!userData?.department) return [];
    const userDept = userData.department.toLowerCase();
    const matchedSubDepts = subdepartments.filter(sd => {
      if (!sd.departmentId) return false;
      const deptName = typeof sd.departmentId === 'object' ? sd.departmentId.name : sd.departmentId;
      return typeof deptName === 'string' && deptName.toLowerCase() === userDept;
    });
    return [...new Set(matchedSubDepts.flatMap(sd => sd.allowedCourses || []))];
  }, [userData, subdepartments]);

  // Initials for avatar fallback
  const initials = useMemo(() => {
    if (!userData?.name) return "US";
    return userData.name
      .split(" ")
      .map(part => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [userData]);

  // Filtered permissions by search
  const filteredPermissions = useMemo(() => {
    if (!userData?.permissions || !Array.isArray(userData.permissions)) return [];
    if (!permissionSearch.trim()) return userData.permissions;
    const search = permissionSearch.trim().toLowerCase();
    return userData.permissions.filter(perm => {
      const featureKey = (perm.feature || perm.module || '').toLowerCase();
      const label = (perm.name || featureKey).toLowerCase();
      const desc = (perm.description || '').toLowerCase();
      return label.includes(search) || featureKey.includes(search) || desc.includes(search);
    });
  }, [userData, permissionSearch]);

  // Copy helper
  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`${key.charAt(0).toUpperCase() + key.slice(1)} copied to clipboard!`, { autoClose: 2000 });
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  // Image upload
  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    const userId = id || userData?._id;
    if (!userId) return;

    setIsImageUploading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64Image = e.target.result;
        await updateUser({
          id: userId,
          data: { profileImage: base64Image }
        }).unwrap();
        refetch();
        toast.success('Profile photo updated successfully!');
      } catch (err) {
        console.error('Error uploading image:', err);
        toast.error(err?.data?.message || 'Failed to upload image');
      } finally {
        setIsImageUploading(false);
      }
    };

    reader.onerror = () => {
      toast.error('Error reading file');
      setIsImageUploading(false);
    };

    reader.readAsDataURL(file);
  };

  const triggerImageUpload = () => {
    fileInputRef.current?.click();
  };

  // Avatar Selection
  const handleSelectAvatar = async (dataUri) => {
    const userId = id || userData?._id;
    if (!userId) return;
    setIsImageUploading(true);
    try {
      await updateUser({
        id: userId,
        data: { profileImage: dataUri }
      }).unwrap();
      refetch();
      if (isSelf) {
        try {
          const stored = JSON.parse(localStorage.getItem("user") || "{}");
          stored.profileImage = dataUri;
          localStorage.setItem("user", JSON.stringify(stored));
        } catch (e) {
          console.warn("Could not update local storage user", e);
        }
      }
      toast.success('Profile avatar updated successfully!');
    } catch (err) {
      console.error('Error updating avatar:', err);
      toast.error(err?.data?.message || 'Failed to update avatar');
    } finally {
      setIsImageUploading(false);
    }
  };

  // Remove photo / Reset to default initials
  const handleRemovePhoto = async () => {
    const userId = id || userData?._id;
    if (!userId) return;
    setIsImageUploading(true);
    try {
      await updateUser({
        id: userId,
        data: { profileImage: "" }
      }).unwrap();
      refetch();
      if (isSelf) {
        try {
          const stored = JSON.parse(localStorage.getItem("user") || "{}");
          stored.profileImage = "";
          localStorage.setItem("user", JSON.stringify(stored));
        } catch {
          // ignore local storage errors
        }
      }
      toast.info('Profile picture reset. Default initials active.');
    } catch (err) {
      console.error('Error removing photo:', err);
      toast.error('Failed to remove photo');
    } finally {
      setIsImageUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading user profile...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <div className="max-w-lg mx-auto p-6 bg-rose-50 border border-rose-200 rounded-3xl text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-2xl">
            <FiAlertCircle />
          </div>
          <h3 className="text-base font-bold text-rose-800">Profile Loading Error</h3>
          <p className="text-xs text-rose-600 font-medium">
            {error?.data?.message || "Failed to retrieve employee profile data from the server."}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-2 px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition cursor-pointer"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const isGlobalRole = ['superadmin', 'admin'].includes(userData?.role?.toLowerCase());
  const displayDepartment = isGlobalRole ? "SSISM (Institution Wide)" : (userData?.department || "—");

  return (
    <div className="w-full flex-1 flex flex-col bg-gray-50/40 min-h-screen">
      {/* ── TOP HEADER ── */}
      <Header 
        title={userData?.name || "User Profile"} 
        subtitle="Employee profile details, organizational role, and access rights."
        showBack={true}
        breadcrumbs={[
          { label: "User Management", path: "/user-management" },
          { label: "Users", path: "/user-management" },
          { label: userData?.name || "Profile" },
        ]}
        actions={
          canEdit && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="h-10 px-3.5 sm:px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-2xs"
                title={isSelf ? "Change Password" : "Reset Password"}
              >
                <FiLock className="text-orange-500" size={14} />
                <span>{isSelf ? "Change Password" : "Reset Password"}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowEditModal(true)}
                className="h-10 px-4 sm:px-5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-xs hover:shadow-md transition active:scale-95 cursor-pointer"
              >
                <FiEdit3 size={15} />
                <span>Edit Profile</span>
              </button>
            </div>
          )
        }
      />

      {/* ── MAIN CONTENT CONTAINER ── */}
      <div className="p-3 sm:p-5 lg:p-6 space-y-5 lg:space-y-6">
        
        {/* ── 1. MODERN IDENTITY HERO CARD ── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5">
            
            {/* Avatar & Basic Info */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 text-center sm:text-left min-w-0">
              {/* Avatar Box */}
              <div className="relative group shrink-0">
                <div 
                  onClick={() => canEdit && setShowAvatarModal(true)}
                  className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-50 p-1 shadow-xs border-2 border-slate-200/80 overflow-hidden relative ${
                    canEdit ? "cursor-pointer hover:border-orange-400 transition" : ""
                  }`}
                  title={canEdit ? "Click to change avatar or photo" : undefined}
                >
                  {userData?.profileImage ? (
                    <img
                      src={userData.profileImage}
                      alt={userData?.name || "Profile"}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <div className="w-full h-full rounded-xl bg-gradient-to-tr from-orange-500 to-amber-400 text-white flex items-center justify-center font-black text-2xl sm:text-3xl tracking-wider shadow-inner">
                      {initials}
                    </div>
                  )}

                  {isImageUploading && (
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center rounded-xl">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}

                  {canEdit && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl text-white">
                      <IoCamera size={20} />
                    </div>
                  )}
                </div>

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setShowAvatarModal(true)}
                    disabled={isImageUploading}
                    className="absolute -bottom-1 -right-1 w-7 h-7 bg-orange-500 hover:bg-orange-600 text-white rounded-lg flex items-center justify-center shadow-md border-2 border-white transition active:scale-95 cursor-pointer"
                    title="Change Photo / Avatar"
                    aria-label="Change photo"
                  >
                    <IoSparkles size={13} />
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              {/* Identity Details */}
              <div className="min-w-0 space-y-1.5">
                <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {userData?.name || "Employee Name"}
                  </h1>

                  {/* Role Badge */}
                  <span className={`inline-flex px-2.5 py-0.5 text-xs font-bold rounded-full border ${getRoleBadgeColor(userData?.role)}`}>
                    {formatRoleName(userData?.role)}
                  </span>

                  {/* Status Badge */}
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    userData?.isActive 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${userData?.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    {userData?.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Designation & Department */}
                <p className="text-xs sm:text-sm font-semibold text-slate-600 flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <span className="font-bold text-orange-600">{userData?.position || "Designation Not Assigned"}</span>
                  <span className="text-slate-300">•</span>
                  <span>{displayDepartment}</span>
                </p>

                {/* Member since metadata */}
                {userData?.createdAt && (
                  <p className="text-[11px] text-slate-400 font-medium">
                    Member since {new Date(userData.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Contact Reachouts */}
            <div className="flex items-center justify-center sm:justify-end gap-2 w-full sm:w-auto flex-wrap">
              {userData?.mobileNo && (
                <a
                  href={`tel:${userData.mobileNo}`}
                  className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 border border-slate-200 transition active:scale-95 cursor-pointer"
                  title="Call contact"
                >
                  <IoCallOutline className="text-orange-500" size={14} />
                  <span>{userData.mobileNo}</span>
                </a>
              )}

              {userData?.email && (
                <a
                  href={`mailto:${userData.email}`}
                  className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 border border-slate-200 transition active:scale-95 cursor-pointer"
                  title="Send email"
                >
                  <IoMailOutline className="text-orange-500" size={14} />
                  <span className="truncate max-w-[180px]">{userData.email}</span>
                </a>
              )}
            </div>

          </div>
        </div>

        {/* ── 2. TWO-COLUMN DETAILED PROFILE LAYOUT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">
          
          {/* ──── LEFT COLUMN (7 COLS): Personal & Institutional Information ──── */}
          <div className="lg:col-span-7 space-y-5 lg:space-y-6">
            
            {/* Contact & Personal Information Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200/70 flex items-center justify-center text-orange-500 shrink-0">
                  <FiUser size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Personal & Contact Details</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Communication parameters and identification</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Full Name */}
                <InfoItem
                  icon={<FiUser size={15} />}
                  label="Full Name"
                  value={userData?.name}
                />

                {/* Email Address */}
                <InfoItem
                  icon={<FiMail size={15} />}
                  label="Email Address"
                  value={userData?.email}
                  action={
                    userData?.email && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleCopy(userData.email, 'email')}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                          title="Copy email"
                        >
                          {copiedKey === 'email' ? <IoCheckmarkOutline className="text-emerald-600" /> : <IoCopyOutline size={13} />}
                        </button>
                      </div>
                    )
                  }
                />

                {/* Mobile Number */}
                <InfoItem
                  icon={<FiPhone size={15} />}
                  label="Mobile Number"
                  value={userData?.mobileNo}
                  action={
                    userData?.mobileNo && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleCopy(userData.mobileNo, 'mobile')}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                          title="Copy phone"
                        >
                          {copiedKey === 'mobile' ? <IoCheckmarkOutline className="text-emerald-600" /> : <IoCopyOutline size={13} />}
                        </button>
                      </div>
                    )
                  }
                />

                {/* Aadhar Card Number */}
                <InfoItem
                  icon={<FiCreditCard size={15} />}
                  label="Aadhar Card"
                  value={
                    userData?.adharCard
                      ? showAadhar
                        ? userData.adharCard
                        : `XXXX-XXXX-${userData.adharCard.slice(-4)}`
                      : "Not Provided"
                  }
                  action={
                    userData?.adharCard && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowAadhar(!showAadhar)}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                          title={showAadhar ? "Hide full Aadhar" : "View full Aadhar"}
                        >
                          {showAadhar ? <IoEyeOffOutline size={14} /> : <IoEyeOutline size={14} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(userData.adharCard, 'Aadhar')}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                          title="Copy Aadhar"
                        >
                          {copiedKey === 'Aadhar' ? <IoCheckmarkOutline className="text-emerald-600" /> : <IoCopyOutline size={13} />}
                        </button>
                      </div>
                    )
                  }
                />
              </div>
            </div>

            {/* Institutional Placement Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200/70 flex items-center justify-center text-orange-500 shrink-0">
                  <FiBriefcase size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Institutional Placement</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Departmental assignment and role configuration</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Department */}
                <InfoItem
                  icon={<FiBriefcase size={15} />}
                  label="Department"
                  value={displayDepartment}
                />

                {/* Position / Designation */}
                <InfoItem
                  icon={<FiUser size={15} />}
                  label="Designated Position"
                  value={userData?.position || "—"}
                />

                {/* Access Role */}
                <InfoItem
                  icon={<FiShield size={15} />}
                  label="Access Role"
                  value={formatRoleName(userData?.role)}
                />

                {/* Account Status */}
                <InfoItem
                  icon={<FiLock size={15} />}
                  label="Account Status"
                  value={userData?.isActive ? "Active Platform Access" : "Deactivated / Suspended"}
                />

                {/* Created Date */}
                <InfoItem
                  icon={<FiCalendar size={15} />}
                  label="Created Date"
                  value={userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : "—"}
                />

                {/* Last Updated */}
                <InfoItem
                  icon={<FiClock size={15} />}
                  label="Last Profile Update"
                  value={userData?.updatedAt ? new Date(userData.updatedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "—"}
                />
              </div>
            </div>

            {/* Department Courses Tags Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <FiBookOpen size={16} className="text-orange-500" />
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Assigned Department Courses</h3>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {assignedCourses.length} {assignedCourses.length === 1 ? 'Course' : 'Courses'}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {assignedCourses.length > 0 ? (
                  assignedCourses.map((course, idx) => (
                    <span 
                      key={idx} 
                      className="bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5"
                    >
                      <FiBookOpen size={12} className="text-orange-500" />
                      <span>{course}</span>
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic py-2">
                    No specialized courses tagged for this department unit.
                  </p>
                )}
              </div>
            </div>

          </div>

          {/* ──── RIGHT COLUMN (5 COLS): Authorized System Permissions ──── */}
          <div className="lg:col-span-5 space-y-5 lg:space-y-6">
            
            {/* Authorized Permissions Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200/70 flex items-center justify-center text-orange-500 shrink-0">
                    <FiShield size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Authorized Permissions</h3>
                    <p className="text-[11px] text-slate-400 font-medium">System modules permitted for this user</p>
                  </div>
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => navigate('/roles-permissions')}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1 shrink-0"
                    title="Manage Permissions Matrix"
                  >
                    <span>Manage</span>
                    <FiExternalLink size={12} />
                  </button>
                )}
              </div>

              {/* Search permissions inside list */}
              <div className="relative">
                <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="text"
                  value={permissionSearch}
                  onChange={(e) => setPermissionSearch(e.target.value)}
                  placeholder="Search permissions..."
                  className="w-full pl-9 pr-8 h-9 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 focus:outline-none transition shadow-2xs"
                />
                {permissionSearch && (
                  <button
                    type="button"
                    onClick={() => setPermissionSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <FiX size={14} />
                  </button>
                )}
              </div>

              {/* Permissions list */}
              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
                {filteredPermissions.length > 0 ? (
                  filteredPermissions.map((perm, idx) => {
                    const featureKey = perm.feature || perm.module || '';
                    const label = perm.name || featureKey.replace(/^(Page|Tab|Button|Action)_/, '').replace(/([A-Z])/g, ' $1').trim();
                    const actions = perm.access || perm.actions || [];
                    
                    return (
                      <div 
                        key={idx} 
                        className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 hover:bg-white hover:border-slate-200 transition space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold text-slate-800 leading-snug">{label}</span>
                          <span className="text-[9px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                            {featureKey.startsWith('Page_') ? 'PAGE' : 'ACTION'}
                          </span>
                        </div>

                        {perm.description && (
                          <p className="text-[10px] text-slate-500 line-clamp-1">{perm.description}</p>
                        )}

                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {actions.map((act, i) => {
                            const actLower = String(act).toLowerCase();
                            let badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
                            if (actLower === "delete") badgeStyle = "bg-rose-50 text-rose-700 border-rose-200";
                            if (actLower === "update" || actLower === "edit") badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";
                            if (actLower === "create" || actLower === "add") badgeStyle = "bg-blue-50 text-blue-700 border-blue-200";
                            if (actLower === "execute") badgeStyle = "bg-purple-50 text-purple-700 border-purple-200";

                            return (
                              <span 
                                key={i} 
                                className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${badgeStyle}`}
                              >
                                {act}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400 font-medium bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    {permissionSearch ? "No matching permissions found" : "No specific permissions assigned"}
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* ── 3. QUICK EDIT PROFILE MODAL ── */}
      {showEditModal && (
        <EditProfileModal
          user={userData}
          departments={departmentOptions}
          isAdmin={isAdmin}
          isLoading={isUpdatingUser}
          onClose={() => setShowEditModal(false)}
          onSave={async (formData) => {
            try {
              await updateUser({
                id: userData?._id || id,
                data: formData
              }).unwrap();
              toast.success("Profile details updated successfully!");
              setShowEditModal(false);
              refetch();
            } catch (err) {
              console.error("Update failed:", err);
              toast.error(err?.data?.message || "Failed to update profile details");
            }
          }}
        />
      )}

      {/* ── 4. CHANGE / RESET PASSWORD MODAL ── */}
      {showPasswordModal && (
        <UserPasswordModal
          user={userData}
          isSelf={isSelf}
          onClose={() => setShowPasswordModal(false)}
          onSuccess={() => refetch()}
        />
      )}

      {/* ── 5. AVATAR PICKER MODAL ── */}
      <AvatarPickerModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        onSelectAvatar={handleSelectAvatar}
        onUploadPhotoClick={triggerImageUpload}
        onRemovePhoto={handleRemovePhoto}
        currentImage={userData?.profileImage}
        userName={userData?.name}
        userRole={userData?.role}
      />

    </div>
  );
};

// ── Neat Information Row Item ──
const InfoItem = ({ icon, label, value, action }) => (
  <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between gap-2.5">
    <div className="flex items-center gap-2.5 min-w-0 flex-1">
      <div className="text-slate-400 shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
        <span className="block text-xs sm:text-sm font-semibold text-slate-800 truncate">
          {value || "—"}
        </span>
      </div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

// ── Edit Profile Modal Component ──
const EditProfileModal = ({ user, departments, isAdmin, isLoading, onClose, onSave }) => {
  const isGlobalRole = ['superadmin', 'admin'].includes(user?.role?.toLowerCase());
  const [formData, setFormData] = useState({
    name: user?.name || "",
    position: user?.position || "",
    department: isGlobalRole ? "SSISM" : (user?.department || ""),
    mobileNo: user?.mobileNo || "",
    adharCard: user?.adharCard || "",
    isActive: user?.isActive !== undefined ? user.isActive : true
  });

  const [errors, setErrors] = useState({});

  const departmentSelectOptions = useMemo(() => {
    const validDepts = (departments || [])
      .map((d) => (typeof d === "object" ? d.name || d._id : d))
      .filter((d) => typeof d === "string" && d.trim() !== "");
    const uniqueDepts = Array.from(new Set(validDepts));

    if (formData.department && !uniqueDepts.includes(formData.department)) {
      uniqueDepts.push(formData.department);
    }

    return [
      { value: "", label: "Select Department" },
      ...uniqueDepts.map((dept) => ({ value: dept, label: dept })),
    ];
  }, [departments, formData.department]);

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = "Full Name is required";

    if (formData.mobileNo && !/^[6-9]\d{9}$/.test(formData.mobileNo.trim())) {
      errs.mobileNo = "Must be a 10-digit number starting with 6, 7, 8, or 9";
    }

    if (formData.adharCard && !/^\d{12}$/.test(formData.adharCard.trim())) {
      errs.adharCard = "Aadhar card must be exactly 12 digits";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      ...formData,
      department: isGlobalRole ? "SSISM" : formData.department,
    });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-lg border border-slate-150 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 border border-orange-200/60 flex items-center justify-center font-bold">
              <FiEdit3 size={15} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">Edit User Profile</h3>
              <p className="text-[11px] text-slate-400 font-medium">Update account information and departmental role</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Full Employee Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Dr. Rajesh Kumar"
              className={`w-full h-11 px-3.5 text-xs sm:text-sm rounded-xl border bg-slate-50 focus:bg-white focus:outline-none transition ${
                errors.name ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-orange-500'
              }`}
            />
            {errors.name && <p className="text-[10px] text-rose-500 font-bold mt-1">{errors.name}</p>}
          </div>

          {/* Designation & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Designation / Position
              </label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                placeholder="e.g. Senior Faculty"
                className="w-full h-11 px-3.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Department
              </label>
              {isGlobalRole ? (
                <div className="w-full h-11 px-3.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-100 font-bold text-slate-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  SSISM (Institution Wide)
                </div>
              ) : (
                <SelectDropdown
                  value={formData.department}
                  onChange={(val) => setFormData({ ...formData, department: val })}
                  options={departmentSelectOptions}
                  placeholder="Select Department"
                  usePortal={true}
                  className="w-full"
                  buttonClassName="w-full h-11 flex items-center justify-between gap-2 px-3.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white hover:border-orange-500 focus:border-orange-500 focus:outline-none transition cursor-pointer font-medium"
                />
              )}
            </div>
          </div>

          {/* Contact Mobile & Aadhar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mobile Number (10 Digits)
              </label>
              <input
                type="text"
                maxLength={10}
                value={formData.mobileNo}
                onChange={(e) => setFormData({ ...formData, mobileNo: e.target.value.replace(/\D/g, '') })}
                placeholder="9876543210"
                className={`w-full h-11 px-3.5 text-xs sm:text-sm rounded-xl border bg-slate-50 focus:bg-white focus:outline-none transition ${
                  errors.mobileNo ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-orange-500'
                }`}
              />
              {errors.mobileNo && <p className="text-[10px] text-rose-500 font-bold mt-1">{errors.mobileNo}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Aadhar Card Number (12 Digits)
              </label>
              <input
                type="text"
                maxLength={12}
                value={formData.adharCard}
                onChange={(e) => setFormData({ ...formData, adharCard: e.target.value.replace(/\D/g, '') })}
                placeholder="12-digit number"
                className={`w-full h-11 px-3.5 text-xs sm:text-sm rounded-xl border bg-slate-50 focus:bg-white focus:outline-none transition ${
                  errors.adharCard ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-orange-500'
                }`}
              />
              {errors.adharCard && <p className="text-[10px] text-rose-500 font-bold mt-1">{errors.adharCard}</p>}
            </div>
          </div>

          {/* Status (Only admins can toggle) */}
          {isAdmin && (
            <div className="pt-1">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Account Status
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isActive: true })}
                  className={`flex-1 h-10 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    formData.isActive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs'
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isActive: false })}
                  className={`flex-1 h-10 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    !formData.isActive
                      ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-2xs'
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Inactive / Suspended
                </button>
              </div>
            </div>
          )}

        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 sm:px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 text-gray-700 bg-white hover:bg-slate-50 font-bold tracking-wider uppercase text-xs rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-5 py-2 text-xs font-bold tracking-wider uppercase text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
          >
            {isLoading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            <span>Save Changes</span>
          </button>
        </div>

      </div>
    </div>
  );
};

// ── Password Modal (Self Change or Admin Reset) ──
const UserPasswordModal = ({ user, isSelf, onClose, onSuccess }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [changeUserPassword, { isLoading: isChanging }] = useChangeUserPasswordMutation();
  const [adminResetUserPassword, { isLoading: isResetting }] = useAdminResetUserPasswordMutation();
  const isLoading = isChanging || isResetting;

  const handleGenerate = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let gen = "";
    for (let i = 0; i < 10; i++) {
      gen += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(gen);
    setConfirmPassword(gen);
    setShowNew(true);
    setShowConfirm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSelf && !currentPassword) {
      toast.error("Please enter your current password");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      if (isSelf) {
        const res = await changeUserPassword({
          currentPassword,
          newPassword,
          confirmPassword,
        }).unwrap();
        toast.success(res?.message || "Password changed successfully!");
      } else {
        const res = await adminResetUserPassword({
          id: user?._id || user?.id,
          newPassword,
        }).unwrap();
        toast.success(res?.message || "Password reset successfully!");
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update password");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-md border border-slate-150 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 border border-orange-200/60 flex items-center justify-center font-bold">
              <FiLock size={15} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                {isSelf ? "Change Password" : "Reset User Password"}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {isSelf ? "Update your personal account credentials" : `Set new password for ${user?.name}`}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-3.5">
          {isSelf && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Current Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full h-11 px-3.5 pr-10 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showCurrent ? <IoEyeOffOutline size={16} /> : <IoEyeOutline size={16} />}
                </button>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                New Password <span className="text-rose-500">*</span>
              </label>
              {!isSelf && (
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="text-[11px] font-bold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer"
                >
                  Auto-generate
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full h-11 px-3.5 pr-10 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 focus:outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showNew ? <IoEyeOffOutline size={16} /> : <IoEyeOutline size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Confirm Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full h-11 px-3.5 pr-10 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 focus:outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showConfirm ? <IoEyeOffOutline size={16} /> : <IoEyeOutline size={16} />}
              </button>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
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
              className="px-5 py-2 text-xs font-bold tracking-wider uppercase text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {isLoading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>{isSelf ? "Update Password" : "Reset Password"}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default UserProfile;
