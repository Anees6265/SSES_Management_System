import { useParams, useNavigate } from "react-router-dom";
import { useGetUserByIdQuery, useUpdateUserMutation, useGetAllSubdepartmentsQuery, useGetLeaveRequestsQuery } from "../../../redux/api/authApi";
import Loader from "../../shared/loader/Loader";
import { IoCamera } from "react-icons/io5";
import { FiUser, FiBriefcase, FiShield, FiSettings, FiMail, FiPhone, FiCalendar, FiClock, FiUserCheck, FiBookOpen } from "react-icons/fi";
import profilePlaceholder from '../../../assets/images/profile-img.png';
import studentProfileBg from "../../../assets/images/Student_profile_2nd_bg.jpg";
import Header from "../../shared/sidebar/Header";
import { toast } from 'react-toastify';
import { useState, useRef, useMemo } from 'react';

const UserProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useGetUserByIdQuery(id);
  const { data: subdepartmentsRes } = useGetAllSubdepartmentsQuery();
  const { data: leavesRes } = useGetLeaveRequestsQuery("all");
  const [updateUser] = useUpdateUserMutation();
  const [isImageUploading, setIsImageUploading] = useState(false);
  const fileInputRef = useRef(null);

  const subdepartments = subdepartmentsRes?.data || [];
  const leaves = leavesRes?.data || [];
  const userData = data?.user;

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

  // Get dynamic timeline activities based on role
  const mockActivities = useMemo(() => {
    if (!userData?.role) return [];
    const isAcademic = ["faculty", "hod"].includes(userData.role);
    if (isAcademic) {
      return [
        { title: "Marked daily attendance spreadsheet", time: "Today • 10:15 AM", type: "attendance" },
        { title: "Reviewed student leave permission request", time: "Yesterday • 04:30 PM", type: "leave" },
        { title: "Modified course syllabus milestone checklist", time: "3 days ago • 11:20 AM", type: "curriculum" }
      ];
    } else {
      return [
        { title: "Modified global system permissions table", time: "Today • 09:45 AM", type: "security" },
        { title: "Registered new faculty account credentials", time: "Yesterday • 02:15 PM", type: "user" },
        { title: "Updated department academic structure parameter", time: "4 days ago • 03:50 PM", type: "settings" }
      ];
    }
  }, [userData]);

  if (isLoading) {
    return (
      <div className="flex justify-center pt-20">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center text-red-655 font-semibold py-6">
        Error loading user data: {error?.data?.message || "Something went wrong!"}
      </div>
    );
  }

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
        toast.success('Profile image updated successfully!');
      } catch (error) {
        console.error('Error uploading image:', error);
        toast.error('Failed to upload image');
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

  return (
    <div className="space-y-5">
      <Header 
        title="Professional Profile" 
        subtitle="Employee information & organizational details" 
        showBack={true}
      />

      <div className="py-1">
        {/* Hero Section with User Info */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-6">
          <div className="relative">
            <div className="absolute inset-0" style={{
              backgroundImage: `url(${studentProfileBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}></div>
            <div className="relative px-5 py-6 sm:py-10 bg-slate-900/10">
              <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-8">
                <div className="relative shrink-0">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white p-1 shadow-sm border border-slate-100 overflow-hidden relative">
                    <img
                      src={userData?.profileImage || profilePlaceholder}
                      alt="Profile"
                      className="w-full h-full object-cover rounded-xl"
                    />
                    {isImageUploading && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={triggerImageUpload}
                    disabled={isImageUploading}
                    className="absolute -bottom-1 -right-1 w-8 h-8 bg-orange-500 hover:bg-orange-650 text-white rounded-xl flex items-center justify-center shadow-md border-2 border-white transition duration-200 cursor-pointer"
                  >
                    <IoCamera size={14} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
                <div className="text-center sm:text-left text-white flex-1 min-w-0">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight drop-shadow-sm">{userData?.name}</h2>
                  <p className="text-xs sm:text-sm text-gray-200 font-semibold mt-1 drop-shadow-xs">{userData?.position || "—"} · {userData?.department || "—"}</p>
                  
                  {/* Stat pills inside Hero */}
                  <div className="flex items-center justify-center sm:justify-start gap-2.5 mt-3.5 flex-wrap">
                    <span className={`inline-flex items-center text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-400 backdrop-blur-xs`}>
                      <span className="relative flex h-1.5 w-1.5 mr-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                      </span>
                      {userData?.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/20 backdrop-blur-xs">
                      {userData?.role || "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Professional Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
            description="System permission"
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

        {/* Professional Detailed Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Contact Information & System Permissions */}
          <div className="space-y-6">
            <DetailSection
              title="Contact Information"
              subtitle="Registry details and contacts"
              icon={<FiMail />}
            >
              <div className="space-y-3.5">
                <ProfessionalDetailRow icon={<FiMail />} label="Email Address" value={userData?.email} />
                <ProfessionalDetailRow icon={<FiPhone />} label="Mobile Number" value={userData?.mobileNo} />
                <ProfessionalDetailRow icon={<FiUser />} label="Full Registry Name" value={userData?.name} />
              </div>
            </DetailSection>

            <DetailSection
              title="Active Permissions"
              subtitle="Authorized system modules"
              icon={<FiShield />}
            >
              <div className="space-y-3">
                {userData?.permissions && userData.permissions.length > 0 ? (
                  userData.permissions.map((perm, idx) => (
                    <div key={idx} className="flex items-center justify-between border-b border-slate-50 pb-2">
                      <span className="text-xs font-bold text-slate-700 capitalize">{perm.module}</span>
                      <div className="flex gap-1.5">
                        {perm.actions?.map((act, i) => (
                          <span key={i} className="bg-slate-100 text-slate-650 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                            {act}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-gray-400 italic font-semibold">No special permissions assigned</span>
                )}
              </div>
            </DetailSection>
          </div>

          {/* Column 2: Professional Details & Assigned Courses */}
          <div className="space-y-6">
            <DetailSection
              title="Professional Details"
              subtitle="Organizational placement details"
              icon={<FiBriefcase />}
            >
              <div className="space-y-3.5">
                <ProfessionalDetailRow icon={<FiBriefcase />} label="Department" value={userData?.department} />
                <ProfessionalDetailRow icon={<FiUser />} label="Designated Position" value={userData?.position} />
                <ProfessionalDetailRow icon={<FiShield />} label="Access Role" value={userData?.role} capitalize />
              </div>
            </DetailSection>

            <DetailSection
              title="Assigned Courses"
              subtitle="Departmental syllabus tags"
              icon={<FiBookOpen />}
            >
              <div className="flex flex-wrap gap-2">
                {assignedCourses.length > 0 ? (
                  assignedCourses.map((course, idx) => (
                    <span 
                      key={idx} 
                      className="bg-orange-50 text-orange-500 border border-orange-100 px-3 py-1.5 rounded-xl text-xs font-bold transition hover:scale-105"
                    >
                      {course}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400 italic font-semibold">No assigned courses in this department</span>
                )}
              </div>
            </DetailSection>
          </div>

          {/* Column 3: Security & Recent Activity Timeline */}
          <div className="space-y-6">
            <DetailSection
              title="System & Security"
              subtitle="Account compliance metadata"
              icon={<FiSettings />}
            >
              <div className="space-y-3.5">
                <ProfessionalDetailRow icon={<FiSettings />} label="Aadhar Verification" value={userData?.adharCard ? `XXXX-XXXX-${userData.adharCard.slice(-4)}` : "N/A"} />
                <ProfessionalDetailRow 
                  icon={<FiCalendar />} 
                  label="Account Created" 
                  value={userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : "N/A"} 
                />
                <ProfessionalDetailRow 
                  icon={<FiClock />} 
                  label="Last Updated" 
                  value={userData?.updatedAt ? new Date(userData.updatedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : "N/A"} 
                />
              </div>
            </DetailSection>

            <DetailSection
              title="Activity Timeline"
              subtitle="Recent platform interactions"
              icon={<FiClock />}
            >
              <div className="space-y-4 relative pl-1">
                <div className="absolute left-[17px] top-3.5 bottom-3.5 w-0.5 bg-slate-100" />
                
                {mockActivities.map((act, idx) => (
                  <div key={idx} className="flex items-start gap-3 relative z-10">
                    <div className="w-8.5 h-8.5 rounded-full bg-orange-50 text-orange-500 border border-orange-100 flex items-center justify-center flex-shrink-0">
                      <FiClock size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 leading-tight">{act.title}</p>
                      <p className="text-[10px] font-semibold text-slate-400 mt-1">{act.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </DetailSection>
          </div>
        </div>
      </div>
    </div>
  );
};

// Colors mapping dictionary for styling theme colors
const colorThemes = {
  orange: {
    text: 'text-orange-500',
    bg: 'bg-orange-500',
    softBg: 'bg-orange-50',
    border: 'border-orange-100'
  },
  purple: {
    text: 'text-purple-600',
    bg: 'bg-purple-500',
    softBg: 'bg-purple-50',
    border: 'border-purple-100'
  },
  blue: {
    text: 'text-blue-600',
    bg: 'bg-blue-50',
    softBg: 'bg-blue-50',
    border: 'border-blue-100'
  },
  green: {
    text: 'text-emerald-600',
    bg: 'bg-emerald-500',
    softBg: 'bg-emerald-50',
    border: 'border-emerald-100'
  },
  red: {
    text: 'text-rose-600',
    bg: 'bg-rose-500',
    softBg: 'bg-rose-50',
    border: 'border-rose-100'
  }
};

// Professional Metric Card matching the quick access card style of the project
const ProfessionalMetricCard = ({ icon, title, value, color = "orange", description, onClick }) => {
  const theme = colorThemes[color] || colorThemes.orange;
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-3xl border border-slate-100 p-5 shadow-sm transition duration-200 flex items-center justify-between group ${
        onClick ? 'cursor-pointer hover:border-orange-200' : ''
      }`}
    >
      <div className="min-w-0">
        <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider">{title}</span>
        <h4 className={`text-sm sm:text-base font-extrabold mt-1 truncate ${theme.text} uppercase`}>
          {value ?? "—"}
        </h4>
        <span className="block text-[10px] text-gray-400 mt-1 font-medium truncate">{description}</span>
      </div>
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg border ${theme.softBg} ${theme.text} ${theme.border} flex-shrink-0 transition-transform duration-200 group-hover:scale-105`}>
        {icon}
      </div>
    </div>
  );
};

// Detail Section Card matching the project timeline/lists wrapper style
const DetailSection = ({ title, subtitle, icon, children }) => (
  <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col">
    <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
      <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 shadow-xs flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">{title}</h3>
        <p className="text-xs text-gray-400 font-semibold mt-0.5 truncate">{subtitle}</p>
      </div>
    </div>
    <div className="flex-1">{children}</div>
  </div>
);

// Detail Attribute Row matching the timeline item or checklist row layout
const ProfessionalDetailRow = ({ icon, label, value, capitalize }) => (
  <div className="flex items-center gap-3.5 py-2 px-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition duration-150">
    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shadow-xs flex-shrink-0">
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">{label}</span>
      <span className={`block text-xs font-semibold text-gray-800 truncate ${capitalize ? 'capitalize' : ''}`}>
        {value || "—"}
      </span>
    </div>
  </div>
);

export default UserProfile;