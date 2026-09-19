import { useParams, useNavigate } from "react-router-dom";
import { 
  useGetUserByIdQuery, 
  useUpdateUserMutation, 
  useGetAllSubdepartmentsQuery, 
  useGetLeaveRequestsQuery,
  useGetAllDepartmentsQuery 
} from "../../../redux/api/authApi";
import { 
  IoCamera, 
  IoCopyOutline, 
  IoCheckmarkOutline, 
  IoCallOutline, 
  IoMailOutline, 
  IoEyeOutline, 
  IoEyeOffOutline,
  IoSearchOutline
} from "react-icons/io5";
import { 
  FiUser, 
  FiBriefcase, 
  FiShield, 
  FiSettings, 
  FiMail, 
  FiPhone, 
  FiCalendar, 
  FiClock, 
  FiBookOpen, 
  FiEdit3, 
  FiExternalLink, 
  FiAlertCircle, 
  FiX, 
  FiCheckCircle 
} from "react-icons/fi";
import Header from "../../shared/sidebar/Header";
import { toast } from 'react-toastify';
import { useState, useRef, useMemo, useEffect } from 'react';

// Color themes mapping
const colorThemes = {
  orange: {
    text: 'text-orange-600',
    bg: 'bg-orange-500',
    softBg: 'bg-orange-50',
    border: 'border-orange-200/70',
    ring: 'ring-orange-500/20'
  },
  purple: {
    text: 'text-purple-600',
    bg: 'bg-purple-500',
    softBg: 'bg-purple-50',
    border: 'border-purple-200/70',
    ring: 'ring-purple-500/20'
  },
  blue: {
    text: 'text-blue-600',
    bg: 'bg-blue-500',
    softBg: 'bg-blue-50',
    border: 'border-blue-200/70',
    ring: 'ring-blue-500/20'
  },
  emerald: {
    text: 'text-emerald-600',
    bg: 'bg-emerald-500',
    softBg: 'bg-emerald-50',
    border: 'border-emerald-200/70',
    ring: 'ring-emerald-500/20'
  },
  red: {
    text: 'text-rose-600',
    bg: 'bg-rose-500',
    softBg: 'bg-rose-50',
    border: 'border-rose-200/70',
    ring: 'ring-rose-500/20'
  }
};

const UserProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Queries & Mutations
  const { data, isLoading, isError, error, refetch } = useGetUserByIdQuery(id);
  const { data: subdepartmentsRes } = useGetAllSubdepartmentsQuery();
  const { data: departmentsRes } = useGetAllDepartmentsQuery();
  const { data: leavesRes } = useGetLeaveRequestsQuery("all");
  const [updateUser, { isLoading: isUpdatingUser }] = useUpdateUserMutation();

  // Component state
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
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
  const leaves = leavesRes?.data || [];
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

  // Calculate pending leaves count
  const pendingLeavesCount = useMemo(() => {
    return leaves.filter(l => l.status === "pending").length;
  }, [leaves]);

  // Dynamic timeline activities based on role
  const mockActivities = useMemo(() => {
    if (!userData?.role) return [];
    const isAcademic = ["faculty", "hod"].includes(userData.role);
    if (isAcademic) {
      return [
        { title: "Marked daily attendance spreadsheet", time: "Today • 10:15 AM", type: "attendance", icon: <FiClock /> },
        { title: "Reviewed student leave permission request", time: "Yesterday • 04:30 PM", type: "leave", icon: <FiCalendar /> },
        { title: "Modified course syllabus milestone checklist", time: "3 days ago • 11:20 AM", type: "curriculum", icon: <FiBookOpen /> },
        { title: "Conducted weekly technical mock assessment", time: "5 days ago • 02:00 PM", type: "assessment", icon: <FiCheckCircle /> }
      ];
    } else {
      return [
        { title: "Modified global system permissions table", time: "Today • 09:45 AM", type: "security", icon: <FiShield /> },
        { title: "Registered new faculty account credentials", time: "Yesterday • 02:15 PM", type: "user", icon: <FiUser /> },
        { title: "Updated department academic structure parameter", time: "4 days ago • 03:50 PM", type: "settings", icon: <FiSettings /> },
        { title: "Configured semester audit compliance report", time: "6 days ago • 04:15 PM", type: "audit", icon: <FiBriefcase /> }
      ];
    }
  }, [userData]);

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
    if (!userId) {
      toast.error('User ID not found');
      return;
    }

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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading professional profile...</p>
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

  return (
    <div className="w-full">
      {/* Full-width sticky Top Header */}
      <Header 
        title="Professional Profile" 
        subtitle="Employee information, organizational hierarchy & access controls" 
        showBack={true}
      />

      {/* Main Full-Width Content Container */}
      <div className="p-3 sm:p-5 lg:p-6 space-y-5 lg:space-y-6">
        
        {/* ── 1. Full-Width Clean Modern Hero Card ── */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Subtle Orange-to-Amber Top Gradient Accent Line */}
          <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400" />

          {/* Profile Content inside Hero */}
          <div className="p-4 sm:p-6 lg:p-7">
            <div className="flex flex-col md:flex-row items-center md:items-center justify-between gap-5">
              
              {/* Left: Avatar & Identity Details */}
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left w-full md:w-auto">
                
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl bg-slate-50 p-1 shadow-sm border-2 border-slate-200/70 overflow-hidden relative">
                    {userData?.profileImage ? (
                      <img
                        src={userData.profileImage}
                        alt={userData?.name || "Profile"}
                        className="w-full h-full object-cover rounded-xl sm:rounded-2xl"
                      />
                    ) : (
                      <div className="w-full h-full rounded-xl sm:rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 text-white flex items-center justify-center font-black text-2xl sm:text-3xl tracking-wider shadow-inner">
                        {initials}
                      </div>
                    )}

                    {/* Image Uploading Spinner */}
                    {isImageUploading && (
                      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center rounded-xl sm:rounded-2xl">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Camera Upload Button */}
                  <button
                    type="button"
                    onClick={triggerImageUpload}
                    disabled={isImageUploading}
                    className="absolute -bottom-1 -right-1 w-8 h-8 sm:w-9 sm:h-9 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-md border-2 border-white transition duration-200 cursor-pointer"
                    title="Upload profile photo"
                    aria-label="Upload photo"
                  >
                    <IoCamera size={16} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>

                {/* Name, Designation, Department */}
                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
                      {userData?.name || "Employee Name"}
                    </h1>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {userData?.role || "Employee"}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm font-semibold text-slate-600 flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <span className="font-bold text-orange-600">{userData?.position || "Designation Not Assigned"}</span>
                    <span className="text-slate-300">•</span>
                    <span>{userData?.department || "General Department"}</span>
                  </p>

                  {/* Badges row: Active/Inactive & Quick Copy ID */}
                  <div className="flex items-center justify-center sm:justify-start gap-2 pt-0.5 flex-wrap">
                    <span className={`inline-flex items-center text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                      userData?.isActive 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                        userData?.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                      }`} />
                      {userData?.isActive ? 'Active' : 'Inactive / Suspended'}
                    </span>

                    <button
                      onClick={() => handleCopy(userData?._id, 'Employee ID')}
                      className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md border border-slate-200 transition cursor-pointer"
                      title="Click to copy ID"
                    >
                      {copiedKey === 'Employee ID' ? <IoCheckmarkOutline className="text-emerald-600" /> : <IoCopyOutline size={12} />}
                      <span>ID: {userData?._id ? `${userData._id.slice(0, 8)}...` : '—'}</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Right: Quick Action Buttons */}
              <div className="flex items-center justify-center sm:justify-end gap-2 w-full md:w-auto pt-2 md:pt-0 flex-wrap">
                {userData?.mobileNo && (
                  <a
                    href={`tel:${userData.mobileNo}`}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 border border-slate-200 transition active:scale-95 cursor-pointer"
                    title="Call mobile"
                  >
                    <IoCallOutline className="text-orange-500 text-sm" />
                    <span>Call</span>
                  </a>
                )}

                {userData?.email && (
                  <a
                    href={`mailto:${userData.email}`}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 border border-slate-200 transition active:scale-95 cursor-pointer"
                    title="Send email"
                  >
                    <IoMailOutline className="text-orange-500 text-sm" />
                    <span>Email</span>
                  </a>
                )}

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setShowEditModal(true)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    <FiEdit3 size={14} />
                    <span>Edit Profile</span>
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* ── 2. Full-Width 4 Metric Cards (2 cols on mobile, 4 cols on desktop) ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
          <ProfessionalMetricCard
            icon={<FiBriefcase />}
            title="Department"
            value={userData?.department || "N/A"}
            color="orange"
            description="Academic unit group"
          />
          <ProfessionalMetricCard
            icon={<FiUser />}
            title="Position"
            value={userData?.position || "N/A"}
            color="purple"
            description="Job designation"
          />
          <ProfessionalMetricCard
            icon={<FiShield />}
            title="Access Level"
            value={userData?.role}
            color="blue"
            description={`${userData?.permissions?.length || 0} permissions assigned`}
          />
          <ProfessionalMetricCard
            icon={<FiCalendar />}
            title="Pending Leaves"
            value={pendingLeavesCount}
            color="red"
            description="Leave requests queue"
            onClick={() => navigate('/leave-requests')}
          />
        </div>

        {/* ── 3. Full-Width 3-Column Detailed Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          
          {/* ──── Column 1: Contact Information & Active Permissions ──── */}
          <div className="space-y-5 lg:space-y-6">
            
            {/* Contact Information Card */}
            <DetailSection
              title="Contact Information"
              subtitle="Registry details and direct reachout"
              icon={<FiMail />}
            >
              <div className="space-y-2.5">
                <ProfessionalDetailRow 
                  icon={<FiMail />} 
                  label="Email Address" 
                  value={userData?.email}
                  action={
                    userData?.email && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCopy(userData.email, 'email')}
                          className="p-1.5 rounded-lg hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                          title="Copy email"
                        >
                          {copiedKey === 'email' ? <IoCheckmarkOutline className="text-emerald-600" /> : <IoCopyOutline size={13} />}
                        </button>
                        <a
                          href={`mailto:${userData.email}`}
                          className="p-1.5 rounded-lg hover:bg-orange-50 text-slate-400 hover:text-orange-600 transition cursor-pointer"
                          title="Send email"
                        >
                          <FiExternalLink size={13} />
                        </a>
                      </div>
                    )
                  }
                />

                <ProfessionalDetailRow 
                  icon={<FiPhone />} 
                  label="Mobile Number" 
                  value={userData?.mobileNo} 
                  action={
                    userData?.mobileNo && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCopy(userData.mobileNo, 'mobile')}
                          className="p-1.5 rounded-lg hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                          title="Copy mobile"
                        >
                          {copiedKey === 'mobile' ? <IoCheckmarkOutline className="text-emerald-600" /> : <IoCopyOutline size={13} />}
                        </button>
                        <a
                          href={`tel:${userData.mobileNo}`}
                          className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                          title="Call mobile"
                        >
                          <IoCallOutline size={14} />
                        </a>
                      </div>
                    )
                  }
                />

                <ProfessionalDetailRow 
                  icon={<FiUser />} 
                  label="Full Registry Name" 
                  value={userData?.name} 
                />

                <ProfessionalDetailRow 
                  icon={<FiSettings />} 
                  label="Employee Account ID" 
                  value={userData?._id}
                  action={
                    userData?._id && (
                      <button
                        onClick={() => handleCopy(userData._id, 'account ID')}
                        className="p-1.5 rounded-lg hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                        title="Copy account ID"
                      >
                        {copiedKey === 'account ID' ? <IoCheckmarkOutline className="text-emerald-600" /> : <IoCopyOutline size={13} />}
                      </button>
                    )
                  }
                />
              </div>
            </DetailSection>

            {/* Active Permissions Card */}
            <DetailSection
              title="Active Permissions"
              subtitle="Authorized system modules & access rights"
              icon={<FiShield />}
              badge={`${userData?.permissions?.length || 0}`}
              headerAction={
                isAdmin && (
                  <button
                    type="button"
                    onClick={() => navigate('/roles-permissions')}
                    className="text-[11px] font-bold text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1"
                  >
                    <span>Matrix</span>
                    <FiExternalLink size={11} />
                  </button>
                )
              }
            >
              {/* Search permissions filter */}
              <div className="relative mb-3">
                <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  value={permissionSearch}
                  onChange={(e) => setPermissionSearch(e.target.value)}
                  placeholder="Search permissions..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 focus:outline-none transition"
                />
                {permissionSearch && (
                  <button
                    onClick={() => setPermissionSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    <FiX />
                  </button>
                )}
              </div>

              {/* Permissions list */}
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {filteredPermissions.length > 0 ? (
                  filteredPermissions.map((perm, idx) => {
                    const featureKey = perm.feature || perm.module || '';
                    const label = perm.name || featureKey.replace(/^(Page|Tab|Button|Action)_/, '').replace(/([A-Z])/g, ' $1').trim();
                    const actions = perm.access || perm.actions || [];
                    return (
                      <div key={idx} className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 flex flex-col gap-1.5 hover:bg-white hover:border-slate-200 transition">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold text-slate-800 leading-snug">{label}</span>
                          <span className="text-[9px] font-mono text-slate-400 shrink-0">
                            {featureKey.startsWith('Page_') ? 'PAGE' : 'ACTION'}
                          </span>
                        </div>
                        {perm.description && (
                          <p className="text-[10px] text-slate-500 line-clamp-1">{perm.description}</p>
                        )}
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {actions.map((act, i) => {
                            const actUpper = String(act).toUpperCase();
                            let badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                            if (actUpper === "DELETE") badgeColor = "bg-rose-50 text-rose-700 border-rose-200";
                            if (actUpper === "UPDATE") badgeColor = "bg-amber-50 text-amber-700 border-amber-200";
                            if (actUpper === "CREATE" || actUpper === "WRITE") badgeColor = "bg-blue-50 text-blue-700 border-blue-200";
                            return (
                              <span key={i} className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase tracking-wider border ${badgeColor}`}>
                                {act}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-6 text-center text-xs text-slate-400 font-medium">
                    {permissionSearch ? "No matching permissions found" : "No permissions assigned"}
                  </div>
                )}
              </div>
            </DetailSection>

          </div>

          {/* ──── Column 2: Professional Details & Assigned Courses ──── */}
          <div className="space-y-5 lg:space-y-6">
            
            {/* Professional Details Card */}
            <DetailSection
              title="Professional Details"
              subtitle="Organizational placement details"
              icon={<FiBriefcase />}
            >
              <div className="space-y-2.5">
                <ProfessionalDetailRow icon={<FiBriefcase />} label="Department" value={userData?.department} />
                <ProfessionalDetailRow icon={<FiUser />} label="Designated Position" value={userData?.position} />
                <ProfessionalDetailRow icon={<FiShield />} label="Access Role" value={userData?.role} capitalize />
                <ProfessionalDetailRow 
                  icon={<FiSettings />} 
                  label="Account Status" 
                  value={userData?.isActive ? "Active Employee" : "Inactive / Suspended"} 
                />
              </div>
            </DetailSection>

            {/* Assigned Courses Card */}
            <DetailSection
              title="Assigned Courses"
              subtitle="Departmental syllabus tags"
              icon={<FiBookOpen />}
              badge={`${assignedCourses.length}`}
            >
              <div className="flex flex-wrap gap-2">
                {assignedCourses.length > 0 ? (
                  assignedCourses.map((course, idx) => (
                    <span 
                      key={idx} 
                      className="bg-orange-50 text-orange-600 border border-orange-200/70 px-3 py-1.5 rounded-xl text-xs font-bold transition hover:bg-orange-100/70 flex items-center gap-1.5"
                    >
                      <FiBookOpen size={12} />
                      <span>{course}</span>
                    </span>
                  ))
                ) : (
                  <div className="w-full py-6 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                    <FiBookOpen className="mx-auto text-slate-300 text-lg mb-1" />
                    <span className="text-xs text-slate-400 italic font-semibold">No assigned courses in this department</span>
                  </div>
                )}
              </div>
            </DetailSection>

          </div>

          {/* ──── Column 3: Security & Activity Timeline ──── */}
          <div className="space-y-5 lg:space-y-6">
            
            {/* System & Security Card */}
            <DetailSection
              title="System & Security"
              subtitle="Account compliance metadata"
              icon={<FiSettings />}
            >
              <div className="space-y-2.5">
                <ProfessionalDetailRow 
                  icon={<FiSettings />} 
                  label="Aadhar Verification" 
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
                          className="p-1.5 rounded-lg hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                          title={showAadhar ? "Hide full Aadhar" : "View full Aadhar"}
                        >
                          {showAadhar ? <IoEyeOffOutline size={15} /> : <IoEyeOutline size={15} />}
                        </button>
                        <button
                          onClick={() => handleCopy(userData.adharCard, 'Aadhar number')}
                          className="p-1.5 rounded-lg hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                          title="Copy Aadhar"
                        >
                          {copiedKey === 'Aadhar number' ? <IoCheckmarkOutline className="text-emerald-600" /> : <IoCopyOutline size={13} />}
                        </button>
                      </div>
                    )
                  }
                />

                <ProfessionalDetailRow 
                  icon={<FiCalendar />} 
                  label="Account Created" 
                  value={userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : "N/A"} 
                />

                <ProfessionalDetailRow 
                  icon={<FiClock />} 
                  label="Last Updated" 
                  value={userData?.updatedAt ? new Date(userData.updatedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "N/A"} 
                />
              </div>
            </DetailSection>

            {/* Activity Timeline Card */}
            <DetailSection
              title="Activity Timeline"
              subtitle="Recent platform interactions"
              icon={<FiClock />}
            >
              <div className="space-y-0">
                {mockActivities.map((act, idx) => {
                  const isLast = idx === mockActivities.length - 1;
                  return (
                    <div key={idx} className="flex items-start gap-3.5 group">
                      {/* Spine: Centered Icon + Vertical Line */}
                      <div className="flex flex-col items-center shrink-0">
                        <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-500 border border-orange-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                          <FiClock size={14} />
                        </div>
                        {!isLast && (
                          <div className="w-0.5 bg-slate-200 min-h-[22px] flex-1 my-0.5" />
                        )}
                      </div>

                      {/* Content */}
                      <div className={`min-w-0 flex-1 pt-1 ${isLast ? 'pb-1' : 'pb-4'}`}>
                        <p className="text-xs font-bold text-slate-800 leading-snug">{act.title}</p>
                        <p className="text-[10px] font-semibold text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-orange-400 shrink-0" />
                          <span>{act.time}</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </DetailSection>

          </div>

        </div>

      </div>

      {/* ── 4. Quick Edit Profile Modal ── */}
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

    </div>
  );
};

// ── Metric Card ──
const ProfessionalMetricCard = ({ icon, title, value, color = "orange", description, onClick }) => {
  const theme = colorThemes[color] || colorThemes.orange;
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs transition duration-200 flex items-center justify-between group ${
        onClick ? 'cursor-pointer hover:border-orange-300 hover:shadow-xs' : ''
      }`}
    >
      <div className="min-w-0 flex-1 pr-2">
        <span className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-wider truncate">{title}</span>
        <h4 className={`text-sm sm:text-base font-black mt-1 truncate ${theme.text}`}>
          {value ?? "—"}
        </h4>
        <span className="block text-[10px] text-slate-400 mt-0.5 font-medium truncate">{description}</span>
      </div>
      <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center text-lg border ${theme.softBg} ${theme.text} ${theme.border} shrink-0 transition-transform duration-200 group-hover:scale-105 shadow-2xs`}>
        {icon}
      </div>
    </div>
  );
};

// ── Detail Section Card ──
const DetailSection = ({ title, subtitle, icon, badge, headerAction, children }) => (
  <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 lg:p-6 shadow-2xs flex flex-col">
    <div className="flex items-center justify-between gap-3 mb-4 pb-3.5 border-b border-slate-100">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200/70 flex items-center justify-center text-orange-500 shadow-2xs shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider truncate">{title}</h3>
            {badge && (
              <span className="text-[10px] font-extrabold px-2 py-0.2 rounded-full bg-orange-50 text-orange-600 border border-orange-200/60">
                {badge}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">{subtitle}</p>
        </div>
      </div>
      {headerAction && <div className="shrink-0">{headerAction}</div>}
    </div>
    <div className="flex-1">{children}</div>
  </div>
);

// ── Detail Attribute Row ──
const ProfessionalDetailRow = ({ icon, label, value, capitalize, action }) => (
  <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-xl bg-slate-50/70 hover:bg-white border border-transparent hover:border-slate-200 transition duration-150">
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-slate-500 shadow-2xs shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">{label}</span>
        <span className={`block text-xs sm:text-sm font-semibold text-slate-800 truncate ${capitalize ? 'capitalize' : ''}`}>
          {value || "—"}
        </span>
      </div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

// ── Edit Profile Modal ──
const EditProfileModal = ({ user, departments, isAdmin, isLoading, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: user?.name || "",
    position: user?.position || "",
    department: user?.department || "",
    mobileNo: user?.mobileNo || "",
    adharCard: user?.adharCard || "",
    isActive: user?.isActive !== undefined ? user.isActive : true
  });

  const [errors, setErrors] = useState({});

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
    onSave(formData);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg border border-slate-100 flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Mobile drag bar */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 border border-orange-200/60 flex items-center justify-center font-bold">
              <FiEdit3 size={17} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">Edit Professional Profile</h3>
              <p className="text-[11px] text-slate-400 font-medium">Update registry information & access parameters</p>
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
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          
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
              className={`w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border bg-slate-50 focus:bg-white focus:outline-none transition ${
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
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Department
              </label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-500 focus:outline-none transition cursor-pointer"
              >
                <option value="">Select Department</option>
                {departments.map((dept, i) => (
                  <option key={i} value={dept}>{dept}</option>
                ))}
                {formData.department && !departments.includes(formData.department) && (
                  <option value={formData.department}>{formData.department}</option>
                )}
              </select>
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
                className={`w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border bg-slate-50 focus:bg-white focus:outline-none transition ${
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
                className={`w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border bg-slate-50 focus:bg-white focus:outline-none transition ${
                  errors.adharCard ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-orange-500'
                }`}
              />
              {errors.adharCard && <p className="text-[10px] text-rose-500 font-bold mt-1">{errors.adharCard}</p>}
            </div>
          </div>

          {/* Status (Only admins can toggle) */}
          {isAdmin && (
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Account Status
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isActive: true })}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                    formData.isActive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isActive: false })}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                    !formData.isActive
                      ? 'bg-rose-50 text-rose-700 border-rose-300'
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}
                >
                  Inactive / Suspended
                </button>
              </div>
            </div>
          )}

        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 sm:px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-3xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
          >
            {isLoading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            <span>Save Changes</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default UserProfile;