/* eslint-disable react/prop-types */
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef, useMemo } from "react";
import {
  useGetNewStudentByIdQuery,
  useUpdateStudentImageMutation,
  useUploadResumeMutation,
  useUpdateStudentEmailMutation,
  useGetReportCardQuery,
  useSetStudentPasswordMutation,
  useGetStudentLevelHistoryQuery,
  useGetStudentThesisQuery,
  useUploadStudentThesisMutation,
  useDeleteStudentThesisMutation
} from "../../../redux/api/authApi";
import { taskAPI } from '../../../services/taskService';
import PermissionModal from "./PermissionModal";
import PlacementModal from "./PlacementModal";
import Loader from "../../shared/loader/Loader";
import UpdateTechnologyModal from "./UpdateTechnologyModal";
import { toast } from "react-toastify";

// Icons & Images
import profilePlaceholder from "../../../assets/images/profile-img.png";
import attendence from "../../../assets/icons/attendence-card-icon.png";
import level from "../../../assets/icons/level-card-icon.png";
import permission from "../../../assets/icons/permission-card-icon.png";
import placed from "../../../assets/icons/placement-card-icon.png";
import company from "../../../assets/icons/company-icon.png";
import position from "../../../assets/icons/position-icon.png";
import loca from "../../../assets/icons/location-icon.png";
import date from "../../../assets/icons/calendar-icon.png";
import download from "../../../assets/icons/download-icon.png";
import studentProfileBg from "../../../assets/images/Student_profile_2nd_bg.jpg";
import Header from '../../shared/sidebar/Header';
import { IoCamera } from "react-icons/io5";

const translateLevelName = (name) => {
  if (!name) return "";
  const cleaned = name.trim().toLowerCase();
  if (cleaned.includes("level 1") || cleaned.includes("1a") || cleaned.includes("1b") || cleaned.includes("1c")) return "1st Year";
  if (cleaned.includes("level 2") || cleaned.includes("2a") || cleaned.includes("2b") || cleaned.includes("2c")) return "2nd Year";
  if (cleaned.includes("level 3") || cleaned.includes("3a") || cleaned.includes("3b") || cleaned.includes("3c")) return "3rd Year";
  if (cleaned.includes("level 4") || cleaned.includes("4a") || cleaned.includes("4b") || cleaned.includes("4c")) return "4th Year";

  const numMatch = name.match(/\d+/);
  if (numMatch) {
    const num = numMatch[0];
    if (num === "1") return "1st Year";
    if (num === "2") return "2nd Year";
    if (num === "3") return "3rd Year";
    if (num === "4") return "4th Year";
    return `${num}th Year`;
  }
  return name;
};

export default function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: studentData, isLoading, isError } = useGetNewStudentByIdQuery(id);
  const { data: levelHistoryResponse } = useGetStudentLevelHistoryQuery(id);

  const daysInSubLevel = useMemo(() => {
    if (!studentData) return null;
    const currentSubLevelId = studentData.currentSubLevelId?._id || studentData.currentSubLevelId;
    if (!currentSubLevelId) return null;

    let entryDate = null;
    const history = levelHistoryResponse?.data;
    if (Array.isArray(history)) {
      const currentProgress = history.find(h => 
        (h.subLevelId?._id || h.subLevelId)?.toString() === currentSubLevelId.toString()
      );
      if (currentProgress) {
        entryDate = currentProgress.startedAt || currentProgress.createdAt;
      }
      if (!entryDate) {
        const completedProgress = [...history]
          .filter(h => h.status === 'completed' && h.completedAt)
          .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
        if (completedProgress.length > 0) {
          entryDate = completedProgress[0].completedAt;
        }
      }
    }
    if (!entryDate) {
      entryDate = studentData.createdAt;
    }
    if (!entryDate) return null;

    const diffTime = Math.abs(new Date() - new Date(entryDate));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 0 ? "Today" : diffDays === 1 ? "1 Day" : `${diffDays} Days`;
  }, [studentData, levelHistoryResponse]);
  const { data: reportCardResponse, isLoading: reportLoading } = useGetReportCardQuery(id);
  const reportCardData = reportCardResponse?.data;
  const [updateStudentImage] = useUpdateStudentImageMutation();
  const [uploadResume, { isLoading: isResumeUploading }] = useUploadResumeMutation();
  const [updateStudentEmail, { isLoading: isEmailUpdating }] = useUpdateStudentEmailMutation();
  const [setStudentPassword] = useSetStudentPasswordMutation();

  // New schema adapters — map new fields to what the UI expects
  const currentLevelName    = studentData?.currentLevelId?.name    || "—";
  const currentSubLevelName = studentData?.currentSubLevelId?.name || "—";
  const latestLevel         = currentSubLevelName;
  const currentLevel        = currentSubLevelName;

  const [isPermissionModalOpen, setPermissionModalOpen] = useState(false);
  const [isPlacedModalOpen, setPlacedModalOpen]         = useState(false);
  const [isYearView, setIsYearView]                     = useState(false);
  const [isTechModalOpen, setTechModalOpen]             = useState(false);
  const [isImageUploading, setIsImageUploading]         = useState(false);
  const [isEmailModalOpen, setEmailModalOpen]           = useState(false);
  const [isReportCardOpen, setReportCardOpen]           = useState(false);
  const [isSetPasswordOpen, setSetPasswordOpen]         = useState(false);

  const fileInputRef = useRef(null);

  // Thesis AI Evaluation Hooks & States
  const [activeTab, setActiveTab] = useState("overview");
  const { data: thesisResponse, isLoading: isThesisLoading, refetch: refetchThesis } = useGetStudentThesisQuery(id);
  const thesisData = thesisResponse?.data;
  const [uploadThesis] = useUploadStudentThesisMutation();
  const [deleteThesis, { isLoading: isDeletingThesis }] = useDeleteStudentThesisMutation();

  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStage, setUploadStage] = useState('');
  const thesisFileInputRef = useRef(null);

  const handleThesisFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast.error("Only PDF files are allowed!");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size cannot exceed 10MB!");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleThesisFileDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast.error("Only PDF files are allowed!");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size cannot exceed 10MB!");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleThesisUploadAndAnalyze = async () => {
    if (!selectedFile) return;

    setUploadStage('Uploading thesis PDF to secure storage...');
    const messageSequence = [
      'Sending thesis document to Google Gemini 1.5 Flash...',
      'Analyzing content structure and research quality...',
      'Identifying student strengths & technical knowledge...',
      'Scanning for areas of academic concern & issues...',
      'Formulating professional improvement recommendations...',
      'Structuring evaluation report into dynamic schema...',
      'Saving thesis assessment to dashboard database...'
    ];

    let msgIdx = 0;
    const interval = setInterval(() => {
      if (msgIdx < messageSequence.length) {
        setUploadStage(messageSequence[msgIdx]);
        msgIdx++;
      }
    }, 2500);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('thesis', selectedFile);

      const response = await uploadThesis({
        studentId: id,
        formData: formDataToSend
      }).unwrap();

      clearInterval(interval);
      setUploadStage('');
      setSelectedFile(null);
      toast.success(response.message || 'Thesis analyzed successfully!');
      refetchThesis();
    } catch (err) {
      clearInterval(interval);
      setUploadStage('');
      console.error(err);
      toast.error(err.data?.message || err.message || 'Failed to upload and analyze thesis');
    }
  };

  const handleThesisDelete = async () => {
    if (window.confirm("Are you sure you want to delete this thesis and its AI analysis? This action cannot be undone.")) {
      try {
        const response = await deleteThesis(id).unwrap();
        toast.success(response.message || "Thesis deleted successfully");
        refetchThesis();
      } catch (err) {
        console.error(err);
        toast.error(err.data?.message || err.message || "Failed to delete thesis");
      }
    }
  };

  // Helper function to get resume URL from various possible field names
  const getResumeUrl = () => {
    return studentData?.resumeURL || 
           studentData?.resume || 
           studentData?.resumeUrl || 
           studentData?.resume_url || 
           null;
  };

  // Function to handle resume link clicks with error handling
  const handleResumeView = (e) => {
    const resumeUrl = getResumeUrl();
    if (!resumeUrl) {
      e.preventDefault();
      toast.error('Resume URL not found');
      return;
    }
    
    // Test if URL is accessible
    fetch(resumeUrl, { method: 'HEAD' })
      .then(response => {
        if (!response.ok) {
          throw new Error('Resume not accessible');
        }
      })
      .catch(() => {
        // Silently handle resume accessibility check failure
        toast.error('Resume file may not be accessible. Please try again or contact support.');
      });
  };

  // canChooseElective: new schema doesn't have techno/level[] — disable for now
  const canChooseElective = () => false;

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    setIsImageUploading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64Image = e.target.result;
        // console.log('Uploading image for student ID:', studentData._id);

        // Update student image via RTK Query
        const result = await updateStudentImage({
          id: studentData._id,
          image: base64Image
        }).unwrap();

        // console.log('Image upload successful:', result);

      } catch (error) {
        // console.error('Error uploading image:', error);
        const errorMessage = error?.data?.message || error?.message || 'Unknown error';
        alert(`Failed to upload image: ${errorMessage}`);
      } finally {
        setIsImageUploading(false);
      }
    };

    reader.onerror = () => {
      // console.error('Error reading file');
      alert('Error reading file');
      setIsImageUploading(false);
    };

    reader.readAsDataURL(file);
  };

  const triggerImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleResumeUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      toast.error('Please select a PDF file');
      return;
    }

    // Validate file size (max 5MB to avoid server issues)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Resume size should be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64Data = e.target.result;
        // Remove the data:application/pdf;base64, prefix
        const base64String = base64Data.split(',')[1];

        // console.log('Uploading resume:', {
        //   studentId: studentData._id,
        //   fileName: file.name,
        //   fileSize: file.size,
        //   base64Length: base64String.length
        // });

        const payload = {
          studentId: studentData._id,
          fileName: file.name,
          fileData: base64String
        };

        // console.log('API Payload:', payload);

        const result = await uploadResume(payload).unwrap();
        // console.log('Upload result:', result);

        toast.success('Resume uploaded successfully!');

        // Clear the file input
        event.target.value = '';

      } catch (error) {
        // console.error('Full error object:', error);
        // console.error('Error status:', error?.status);
        // console.error('Error data:', error?.data);

        let errorMessage = 'Failed to upload resume';
        if (error?.status === 500) {
          errorMessage = 'Server error. Please try with a smaller file or contact support.';
        } else if (error?.data?.message) {
          errorMessage = error.data.message;
        } else if (error?.message) {
          errorMessage = error.message;
        }

        toast.error(errorMessage);
      }
    };

    reader.onerror = () => {
      // console.error('Error reading file');
      toast.error('Error reading file');
    };

    reader.readAsDataURL(file);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader />
      </div>
    );
  }

  if (isError || !studentData) return <div className="p-4 text-red-500">Error loading student data.</div>;

  // Calculate dynamic attendance data
  const calculateAttendanceData = () => {
    const attendanceRecord = studentData.attendanceRecord || [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    const monthlyData = [["Month", "Attendance", { role: "style" }]];
    
    monthNames.forEach((month, index) => {
      const monthRecord = attendanceRecord.find(record => {
        if (!record.date) return false;
        try {
          const recordDate = new Date(record.date);
          return !isNaN(recordDate.getTime()) && recordDate.getMonth() === index;
        } catch {
          return false;
        }
      });
      
      const attendanceRate = monthRecord ? monthRecord.attendancePercentage || 0 : 0;
      const color = attendanceRate >= 80 ? "#22C55E" : attendanceRate >= 60 ? "#FDA92D" : "#EF4444";
      
      monthlyData.push([month, attendanceRate, color]);
    });
    
    return monthlyData;
  };
  
  const monthlyData = calculateAttendanceData();
  
  // Calculate overall attendance rate
  const calculateOverallAttendance = () => {
    const attendanceRecord = studentData.attendanceRecord || [];
    if (attendanceRecord.length === 0) return 0;
    
    const totalAttendance = attendanceRecord.reduce((sum, record) => sum + (record.attendancePercentage || 0), 0);
    return Math.round(totalAttendance / attendanceRecord.length);
  };
  
  const overallAttendanceRate = calculateOverallAttendance();
  const hasPermission = !!(studentData?.permissionDetails && Object.keys(studentData.permissionDetails).length > 0);
  const permissionStatus = studentData?.permissionDetails?.status || (hasPermission ? "pending" : "No Request");
  const hasPlacement = !!(studentData?.status === "Placed");
  const placementStatus = hasPlacement ? "Placed" : "Not Placed";

  return (
    <div className="min-h-screen bg-white">
      <Header
        title="Student Profile"
        showBack={true}
        breadcrumbs={[
          { label: 'Academics', path: '/student-detail-table' },
          { label: 'Student Progress', path: '/student-detail-table' },
          { label: 'Profile' }
        ]}
      />

      <div className="py-2 sm:py-4">
        {/* Hero Section with Student Info */}
        <div className="bg-white rounded-2xl overflow-hidden mb-8" style={{ boxShadow: '0 0 25px 8px rgba(0, 0, 0, 0.10)' }}>
          <div className="relative">
            <div className="absolute inset-0" style={{
              backgroundImage: `url(${studentProfileBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}></div>
            <div className="absolute top-2 sm:top-7 right-2 sm:right-8 flex flex-col sm:flex-row gap-1 sm:gap-3 z-20">
              <button
                onClick={() => {
                  if (canChooseElective()) {
                    // console.log('Update Technology button clicked');
                    setTechModalOpen(true);
                  }
                }}
                disabled={!canChooseElective()}
                className={`px-2 sm:px-4 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 shadow-lg ${canChooseElective()
                  ? 'bg-[#FDA92D] hover:bg-[#E6941A] hover:shadow-xl hover:scale-105 text-white font-extrabold cursor-pointer'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
                  }`}
                title={canChooseElective() ? 'Choose your elective technology' : 'Complete Level 2A/2B/2C to unlock electives'}
              >
                <span className="hidden sm:inline">Choose Elective</span> 
                <span className="sm:hidden">Elective</span>
              </button>
              <button
                onClick={() => navigate("/student/task-board", {
                  state: {
                    student: studentData,
                    level: studentData.currentLevelId,
                    subdepartment: studentData.subDepartmentId,
                  },
                })}
                className="px-2 sm:px-4 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 shadow-lg bg-[#FDA92D] hover:bg-[#E6941A] hover:shadow-xl hover:scale-105 text-white"
                title="Manage student tasks and assignments"
              >
                <span className="hidden sm:inline">Task List</span>
                <span className="sm:hidden">Tasks</span>
              </button>
              <button
                onClick={() => setEmailModalOpen(true)}
                className="px-2 sm:px-4 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 shadow-lg bg-[#FDA92D] hover:bg-[#E6941A] hover:shadow-xl hover:scale-105 text-white disabled:opacity-50"
              >
                <span className="hidden sm:inline">Update Email</span>
                <span className="sm:hidden">Email</span>
              </button>
              <button
                onClick={() => setSetPasswordOpen(true)}
                className="px-2 sm:px-4 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 shadow-lg bg-[#FDA92D] hover:bg-[#E6941A] hover:shadow-xl hover:scale-105 text-white"
              >
                <span className="hidden sm:inline">Set Password</span>
                <span className="sm:hidden">Password</span>
              </button>
              {/* <button
                onClick={() => document.getElementById('resume-upload').click()}
                disabled={isResumeUploading}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-lg bg-[#FDA92D] hover:bg-[#E6941A] hover:shadow-xl hover:scale-105 text-white disabled:opacity-50"
              >
                {isResumeUploading ? 'Uploading...' : 'Upload Resume'}
              </button> */}
              <input
                id="resume-upload"
                type="file"
                accept=".pdf"
                onChange={handleResumeUpload}
                className="hidden"
              />
            </div>
            <div className="relative px-3 sm:px-8 py-4 sm:py-12">
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
                <div className="relative">
                  <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-full bg-white p-1 sm:p-2 shadow-md">
                    <img
                      src={studentData.image || profilePlaceholder}
                      alt="Profile"
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                  <div
                    className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-full shadow-md flex items-center justify-center cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={triggerImageUpload}
                    style={{ transform: 'translate(-25%, -25%)' }}
                  >
                    {isImageUploading ? (
                      <div className="w-4 h-4 sm:w-3 sm:h-3 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <IoCamera
                        className="w-5 h-5 sm:w-7 sm:h-6 text-gray-700 hover:text-gray-900" />
                    )}
                  </div>
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-lg sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2 text-white">
                    {studentData.firstName} {studentData.lastName}
                  </h2>
                  <p className="text-gray-300 mb-3 sm:mb-4 text-xs sm:text-base">Course: {studentData.course || "N/A"} | Year: {translateLevelName(currentLevelName)} | Level - {currentLevelName} / {currentSubLevelName}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2 lg:gap-6">
                    <ContactCard icon={<svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>} label="Email" value={studentData.email} />
                    <ContactCard icon={<svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>} label="Phone" value={studentData.studentMobile || "N/A"} />
                    <ContactCard icon={<svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} label="Location" value={studentData.address || studentData.village || "N/A"} />
                    <ContactCard icon={<svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>} label="Technology" value={studentData.technology || studentData.techno || studentData.track || "Technology Not Updated"} />

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Performance Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6 mb-4 sm:mb-8 pr-2 sm:pr-0">
          <ProfessionalMetricCard
            icon={attendence}
            title="Report"
            value="View"
            bgColor="#FDA92D"
            description="Student report"
            onClick={() => navigate(`/student/${id}/report`)}
          />
          <ProfessionalMetricCard
            icon={level}
            title="Level History"
            value={latestLevel}
            bgColor="#8E33FF"
            description="Academic progress"
            onClick={() => navigate(`/student/${id}/level-interviews`)}
          />
          <ProfessionalMetricCard
            icon={permission}
            title="Permission Status"
            // value={studentData.permissionStatus || "None"}
            value={permissionStatus || "None"}
            bgColor="#00B8D9"
            description="Current requests"
            onClick={() => setPermissionModalOpen(true)}
          />
          <ProfessionalMetricCard
            icon={placed}
            title="Placement Status"
            // value={studentData.placementStatus || "Pending"}
            value={placementStatus || "Pending"}
            bgColor="#22C55E"
            description="Career progress"
            onClick={() => setPlacedModalOpen(true)}
          />
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-gray-200 mb-6 pr-2 sm:pr-0">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-3 text-sm font-semibold transition-all duration-200 border-b-2 mr-6 ${
              activeTab === "overview"
                ? "border-orange-500 text-orange-500 font-extrabold"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Profile Overview
          </button>
          <button
            onClick={() => setActiveTab("thesis")}
            className={`pb-3 text-sm font-semibold transition-all duration-200 border-b-2 ${
              activeTab === "thesis"
                ? "border-orange-500 text-orange-500 font-extrabold"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            🎓 Thesis AI Evaluation
          </button>
        </div>

        {activeTab === "overview" ? (
          <>
            {/* Analytics Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8 pr-2 sm:pr-0">
          {/* Attendance Analytics */}
          <div className="lg:col-span-2">
            <div className={`transition-all duration-500 ${isYearView ? 'hidden' : 'block'}`}>
              <AnalyticsCard
                title="Attendance Analytics"
                subtitle="Monthly performance tracking with trends"
                icon={<svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                showButton={true}
                buttonText="Yearly"
                onButtonClick={() => setIsYearView(!isYearView)}
              >
                <div className="h-48 sm:h-80">
                  <Chart
                    chartType="ColumnChart"
                    data={monthlyData}
                    options={{
                      backgroundColor: 'transparent',
                      chartArea: { width: '85%', height: '75%' },
                      colors: ['#22C55E', '#FDA92D', '#EF4444'],
                      bar: { groupWidth: '60%' },
                      hAxis: {
                        textStyle: { color: '#6B7280', fontSize: 11 },
                        gridlines: { color: 'transparent' }
                      },
                      vAxis: {
                        textStyle: { color: '#6B7280', fontSize: 11 },
                        gridlines: { color: '#F3F4F6' }
                      },
                      legend: 'none'
                    }}
                    width="100%"
                    height="100%"
                  />
                </div>
              </AnalyticsCard>
            </div>
            <div className={`transition-all duration-500 ${isYearView ? 'block' : 'hidden'}`}>
              <AnalyticsCard
                title="Attendance Analytics"
                subtitle="Yearly performance overview"
                icon={<svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                showButton={true}
                buttonText="Monthly"
                onButtonClick={() => setIsYearView(!isYearView)}
              >
                <div className="h-48 sm:h-80 flex items-center justify-center gap-8">
                  <div className="relative w-80 h-80">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200" opacity={0.7}>
                      {/* 2022 - Innermost ring */}
                      <circle cx="100" cy="100" r="40" fill="none" stroke="#F8F9FA" strokeWidth="8" />
                      <circle cx="100" cy="100" r="40" fill="none" stroke="#B66816" strokeWidth="8"
                        strokeDasharray={`${92 * 2.51} 251`} strokeLinecap="round" />

                      {/* 2023 - Middle ring */}
                      <circle cx="100" cy="100" r="60" fill="none" stroke="#F8F9FA" strokeWidth="8" />
                      <circle cx="100" cy="100" r="60" fill="none" stroke="#FDA92D" strokeWidth="8"
                        strokeDasharray={`${88 * 3.77} 377`} strokeLinecap="round" />

                      {/* 2024 - Outermost ring */}
                      <circle cx="100" cy="100" r="80" fill="none" stroke="#F8F9FA" strokeWidth="8" />
                      <circle cx="100" cy="100" r="80" fill="none" stroke="#ED9A21" strokeWidth="8"
                        strokeDasharray={`${65 * 5.03} 503`} strokeLinecap="round" />
                    </svg>

                    {/* Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-2xl font-bold text-gray-800">82%</div>
                      <div className="text-xs text-gray-500">Average</div>
                    </div>

                    {/* Year Labels */}
                    <div className="absolute inset-0">
                      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-xs font-medium text-gray-600">2024</div>
                      <div className="absolute top-12 left-1/2 transform -translate-x-1/2 text-xs font-medium text-gray-600">2023</div>
                      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 text-xs font-medium text-gray-600">2022</div>
                    </div>
                  </div>

                  {/* Progress Rate Indicator */}
                  <div className="bg-white rounded-lg p-4" style={{ boxShadow: '0 0 18px 5px rgba(0, 0, 0, 0.08)' }}>
                    <h4 className="text-sm font-semibold text-gray-800 mb-4">Progress Rate</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">2024</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full">
                            <div className="h-2 bg-orange-200 rounded-full" style={{ width: '65%' }}></div>
                          </div>
                          <span className="text-xs font-medium text-gray-700">65%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">2023</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full">
                            <div className="h-2 bg-orange-300 rounded-full" style={{ width: '88%' }}></div>
                          </div>
                          <span className="text-xs font-medium text-gray-700">88%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">2022</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full">
                            <div className="h-2 bg-orange-400 rounded-full" style={{ width: '92%' }}></div>
                          </div>
                          <span className="text-xs font-medium text-gray-700">92%</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Trend</span>
                        <span className="text-xs font-medium text-red-600">↓ -4.5%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </AnalyticsCard>
            </div>
          </div>

          {/* Progress Overview */}
          <div>
            <AnalyticsCard
              title="Progress Overview"
              subtitle="Academic achievements"
              icon={<svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>}
            >
              <DynamicProgressOverview 
                studentData={studentData} 
                reportCardData={reportCardData} 
                reportLoading={reportLoading}
              />
            </AnalyticsCard>
          </div>
        </div>

        {/* Detailed Information Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-4 sm:mb-8 pr-2 sm:pr-0">
          {/* Placement Information */}
          <DetailSection
            title="Placement Information"
            subtitle="Current placement status and company details"
            icon={<svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
          >
            <div className="space-y-4">
              <DetailRow icon={company} label="Company" value={studentData.placedInfo?.companyName || "Not placed yet"} />
              <DetailRow icon={position} label="Position" value={studentData.placedInfo?.jobProfile || "Not placed yet"} />
              <DetailRow icon={loca} label="Location" value={studentData.placedInfo?.location || "Not placed yet"} />
              <DetailRow icon={date} label="Joining Date" value={studentData.placedInfo?.joiningDate ? new Date(studentData.placedInfo.joiningDate).toLocaleDateString() : "Not available"} />
            </div>
            {!studentData.placedInfo?.companyName && (
              <div className="mt-6 p-4 bg-yellow-50 rounded-lg" style={{ boxShadow: '0 0 15px 4px rgba(0, 0, 0, 0.06)' }}>
                <p className="text-sm text-yellow-800">No placement information available yet.</p>
              </div>
            )}
          </DetailSection>

          {/* Permission Details */}
          <DetailSection
            title="Permission Management"
            subtitle="Recent requests and approval status"
            icon={<svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>}
          >
            <div className="space-y-4">
              <DetailRow
                icon={date}
                label="Last Request"
                value={studentData?.permissionDetails?.uploadDate
                  ? (() => {
                      try {
                        const date = new Date(studentData.permissionDetails.uploadDate);
                        return !isNaN(date.getTime()) ? date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Invalid date';
                      } catch {
                        return 'Invalid date';
                      }
                    })()
                  : "No recent requests"}
              />
              <DetailRow
                icon={permission}
                label="Reason"
                value={studentData?.permissionDetails?.remark || "Don't have any reason"}
              />
              <DetailRow
                icon={permission}
                label="Approved By"
                value={studentData?.permissionDetails?.approved_by || "No one approved"}
              />
              {studentData?.permissionDetails?.imageURL && (
                <div className="mt-4">
                  <p className="text-xs text-black uppercase tracking-wide font-medium mb-2">Signature</p>
                  <img
                    src={studentData.permissionDetails.imageURL}
                    alt="Permission Signature"
                    className="h-20 object-contain border rounded shadow"
                  />
                </div>
              )}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg" style={{ boxShadow: '0 0 15px 4px rgba(0, 0, 0, 0.06)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Current Status</span>
                  <StatusBadge status={studentData?.permissionDetails?.status || (hasPermission ? "pending" : "No Request")} />
                </div>
              </div>
            </div>
          </DetailSection>
        </div>

        {/* Resume and Additional Info Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-4 sm:mb-8 pr-2 sm:pr-0">
          {/* Resume Card */}
          <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 0 22px 6px rgba(0, 0, 0, 0.09)' }}>
            <div className="px-3 sm:px-6 py-3 sm:py-4 border-b-2 border-gray-200 shadow-sm bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center bg-gray-100">
                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-lg font-bold text-gray-900">Resume</h3>
                    <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Student's uploaded resume document</p>
                  </div>
                </div>
                <button
                  onClick={() => document.getElementById('resume-upload-profile').click()}
                  disabled={isResumeUploading}
                  className="px-2 sm:px-3 py-1.5 sm:py-2 bg-[#FDA92D] hover:bg-[#E6941A] hover:shadow-xl hover:scale-105 text-white text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 shadow-lg disabled:opacity-50"
                >
                  <span className="hidden sm:inline">{isResumeUploading ? 'Uploading...' : 'Upload Resume'}</span>
                  <span className="sm:hidden">{isResumeUploading ? 'Upload...' : 'Upload'}</span>
                </button>
              </div>
            </div>
            <div className="p-3 sm:p-6">
            <div className="space-y-4">
              {getResumeUrl() ? (
                <div>
                  {/* Resume Header */}
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-t-lg border border-blue-200 border-b-0">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 text-sm">📄</span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-blue-900">
                        {(() => {
                          try {
                            const url = getResumeUrl();
                            if (!url) return 'Resume.pdf';
                            const fileName = url.split('/').pop();
                            if (!fileName) return 'Resume.pdf';
                            const parts = fileName.split('-');
                            return parts.length > 1 ? parts.slice(1).join('-') : fileName;
                          } catch {
                            return 'Resume.pdf';
                          }
                        })()} 
                      </p>
                        <p className="text-xs text-blue-600">Resume document</p>
                      </div>
                    </div>
                    {/* <a
                      href={getResumeUrl()}
                      download
                      className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium rounded transition-colors flex items-center"
                    >
                      <img src={download} />
                    </a> */}
                  </div>
                  {/* Resume Card */}
                  <div className="border border-blue-200 rounded-b-lg bg-blue-50 p-6">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <span className="text-blue-600 text-2xl">📄</span>
                      </div>
                      <h4 className="text-lg font-semibold text-blue-900 mb-2">Resume Available</h4>
                      <p className="text-sm text-blue-700 mb-4">Student&rsquo;s resume has been uploaded successfully</p>
                      <div className="flex gap-3 justify-center">
                        <a
                          href={getResumeUrl()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors"
                          onClick={handleResumeView}
                        >
                          <span className="hidden sm:inline">View Resume</span>
                          <span className="sm:hidden">View</span>
                        </a>
                        <a
                          href={getResumeUrl()}
                          download
                          className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center gap-1 sm:gap-2"
                          onClick={handleResumeView}
                        >
                          <img src={download} className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">Download</span>
                          <span className="sm:hidden">DL</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <span className="text-gray-400 text-xl">📄</span>
                  </div>
                  <p className="text-sm font-medium text-gray-600 mb-1">No Resume Uploaded</p>
                  <p className="text-xs text-gray-500">Student has not uploaded a resume yet</p>
                </div>
              )}
            </div>
            <input
              id="resume-upload-profile"
              type="file"
              accept=".pdf"
              onChange={handleResumeUpload}
              className="hidden"
            />
          </div>
          </div>

          {/* Additional Information Card */}
          <DetailSection
            title="Additional Information"
            subtitle="Extra details and notes"
            icon={<svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
          >
            <div className="space-y-4">
              {/* Offer Letter */}
              {studentData.placedInfo?.offerLetterURL ? (
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-green-600 text-sm">📄</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-green-900">Offer Letter</p>
                      <p className="text-xs text-green-600">Placement document</p>
                    </div>
                  </div>
                  <a
                    href={studentData.placedInfo.offerLetterURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors flex items-center"
                  >
                    <img src={download} alt="Download" className="w-3 h-3" />
                  </a>
                </div>
              ) : null}

              {/* Application */}
              {studentData.placedInfo?.applicationURL ? (
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 text-sm">📋</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-blue-900">Application</p>
                      <p className="text-xs text-blue-600">Placement document</p>
                    </div>
                  </div>
                  <a
                    href={studentData.placedInfo.applicationURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors flex items-center"
                  >
                    <img src={download} alt="Download" className="w-3 h-3" />
                  </a>
                </div>
              ) : null}

              {/* Show message if no documents */}
              {!studentData.placedInfo?.offerLetterURL && !studentData.placedInfo?.applicationURL && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <span className="text-gray-400 text-xl">📝</span>
                  </div>
                  <p className="text-sm font-medium text-gray-600 mb-1">No Additional Documents</p>
                  <p className="text-xs text-gray-500">Placement documents will appear here</p>
                </div>
              )}
            </div>
          </DetailSection>
        </div>
        </>
        ) : (
          <div className="bg-white rounded-2xl p-6 border border-gray-150 shadow-sm space-y-6 mb-8 pr-2 sm:pr-0" style={{ boxShadow: '0 0 25px 8px rgba(0, 0, 0, 0.05)' }}>
            <div className="flex justify-between items-center border-b pb-4 border-gray-100">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Student Thesis AI Analysis</h3>
                <p className="text-xs text-gray-500 mt-1">Upload and generate structured academic evaluation points using Google Gemini AI</p>
              </div>
            </div>

            {isThesisLoading ? (
              <div className="py-12 flex justify-center"><Loader /></div>
            ) : thesisData ? (
              <div className="space-y-6">
                {/* Thesis file info */}
                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-150">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">📄</span>
                    <div>
                      <p className="font-semibold text-gray-800">{thesisData.fileName || "Student Thesis"}</p>
                      <p className="text-xs text-gray-500">Uploaded on {new Date(thesisData.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <a
                      href={thesisData.thesisUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 text-sm font-semibold transition-colors bg-white shadow-sm"
                    >
                      View PDF
                    </a>
                    <button
                      type="button"
                      onClick={handleThesisDelete}
                      disabled={isDeletingThesis}
                      className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-semibold transition-colors border border-red-200"
                    >
                      {isDeletingThesis ? "Deleting..." : "Delete & Re-upload"}
                    </button>
                  </div>
                </div>

                {/* AI Analysis Grid */}
                <div className="space-y-4">
                  {/* Overall Summary */}
                  <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                    <h4 className="font-bold text-purple-800 mb-2 flex items-center gap-2 text-sm">
                      <span>✨</span> AI Overall Summary
                    </h4>
                    <p className="text-sm text-purple-900 leading-relaxed font-medium">{thesisData.analysis?.summary}</p>
                  </div>

                  {/* Strengths and Weaknesses side-by-side */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-150">
                      <h4 className="font-bold text-emerald-800 mb-3 flex items-center gap-2 text-sm">
                        <span>✅</span> Strengths (Positive Aspects)
                      </h4>
                      <ul className="space-y-2">
                        {thesisData.analysis?.strengths?.map((str, idx) => (
                          <li key={idx} className="flex gap-2 text-xs text-emerald-900 leading-relaxed">
                            <span className="text-emerald-600 font-bold">•</span>
                            <span>{str}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 bg-red-50 rounded-xl border border-red-150">
                      <h4 className="font-bold text-red-800 mb-3 flex items-center gap-2 text-sm">
                        <span>⚠️</span> Key Issues & Problems
                      </h4>
                      <ul className="space-y-2">
                        {thesisData.analysis?.weaknesses?.map((weak, idx) => (
                          <li key={idx} className="flex gap-2 text-xs text-red-900 leading-relaxed">
                            <span className="text-red-600 font-bold">•</span>
                            <span>{weak}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-150">
                    <h4 className="font-bold text-amber-800 mb-3 flex items-center gap-2 text-sm">
                      <span>💡</span> Actionable Recommendations
                    </h4>
                    <ul className="space-y-2">
                      {thesisData.analysis?.recommendations?.map((rec, idx) => (
                        <li key={idx} className="flex gap-2 text-xs text-amber-900 leading-relaxed font-medium">
                          <span className="text-amber-500 font-bold">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Effort Level */}
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-150 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-gray-800 mb-1 flex items-center gap-2 text-sm">
                        <span>⚡</span> Recommended Effort Level
                      </h4>
                      <p className="text-[11px] text-gray-500">Degree of student effort required to achieve perfection.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        thesisData.analysis?.effortLevel === "Low" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                        thesisData.analysis?.effortLevel === "Medium" ? "bg-yellow-100 text-yellow-800 border border-yellow-200" :
                        thesisData.analysis?.effortLevel === "High" ? "bg-orange-100 text-orange-800 border border-orange-200" :
                        "bg-red-100 text-red-800 border border-red-200"
                      }`}>
                        {thesisData.analysis?.effortLevel || "Medium"} Effort
                      </span>
                      <div className="w-24 bg-gray-250 rounded-full h-2 overflow-hidden border">
                        <div className={`h-full ${
                          thesisData.analysis?.effortLevel === "Low" ? "bg-emerald-500 w-1/4" :
                          thesisData.analysis?.effortLevel === "Medium" ? "bg-yellow-500 w-2/4" :
                          thesisData.analysis?.effortLevel === "High" ? "bg-orange-500 w-3/4" :
                          "bg-red-600 w-full"
                        }`} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div 
                  onClick={() => thesisFileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleThesisFileDrop}
                  className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${
                    isDragging ? "border-orange-500 bg-orange-50" : "border-gray-300 hover:border-orange-400 bg-gray-50"
                  }`}
                >
                  <input
                    type="file"
                    ref={thesisFileInputRef}
                    onChange={handleThesisFileSelect}
                    accept="application/pdf"
                    className="hidden"
                  />
                  <div className="text-5xl mb-4">📁</div>
                  <p className="text-base font-semibold text-gray-700">
                    {selectedFile ? `Selected: ${selectedFile.name}` : "Drag and drop student thesis PDF here, or click to browse"}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">Only PDF files up to 10MB are supported.</p>
                </div>

                {selectedFile && !uploadStage && (
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium"
                    >
                      Clear File
                    </button>
                    <button
                      type="button"
                      onClick={handleThesisUploadAndAnalyze}
                      className="px-5 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-medium shadow-sm hover:shadow-md transition-shadow"
                    >
                      Upload & Analyze Thesis
                    </button>
                  </div>
                )}

                {uploadStage && (
                  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white/95 backdrop-blur-md rounded-2xl p-8 max-w-md w-full shadow-2xl border border-white/50 text-center space-y-6">
                      <div className="relative w-20 h-20 mx-auto">
                        <div className="absolute inset-0 border-4 border-orange-100 rounded-full" />
                        <div className="absolute inset-0 border-4 border-t-orange-500 border-r-orange-550 rounded-full animate-spin" />
                        <span className="absolute inset-0 flex items-center justify-center text-2xl">🤖</span>
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-gray-800">AI Thesis Evaluation in Progress</h4>
                        <p className="text-sm text-gray-600 mt-2 min-h-[40px] flex items-center justify-center font-medium animate-pulse">
                          {uploadStage}
                        </p>
                      </div>
                      <div className="w-full bg-gray-150 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-gradient-to-r from-orange-400 to-orange-600 h-full rounded-full transition-all duration-1000 w-[80%] animate-pulse" />
                      </div>
                      <p className="text-[11px] text-gray-400">Gemini is reading pages, summarizing content, and structure-mapping academic feedback...</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <PermissionModal
        isOpen={isPermissionModalOpen}
        onClose={() => setPermissionModalOpen(false)}
        studentData={studentData}
        studentId={studentData._id}
      />
      <PlacementModal
        isOpen={isPlacedModalOpen}
        onClose={() => setPlacedModalOpen(false)}
        studentData={studentData}
        studentId={studentData._id}
      />
      <UpdateTechnologyModal
        isOpen={isTechModalOpen}
        onClose={() => setTechModalOpen(false)}
        studentId={studentData._id}
      />
      <UpdateEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        studentData={studentData}
        onUpdate={updateStudentEmail}
        isLoading={isEmailUpdating}
      />
      <SetPasswordModal
        isOpen={isSetPasswordOpen}
        onClose={() => setSetPasswordOpen(false)}
        studentId={studentData._id}
        onSetPassword={setStudentPassword}
      />
      <ReportCardModal
        isOpen={isReportCardOpen}
        onClose={() => setReportCardOpen(false)}
        studentData={studentData}
        currentLevel={currentLevel}
      />
    </div>
  );
}

// Professional Contact Card for Hero Section
const ContactCard = ({ icon, label, value }) => (
  <div className="bg-white/20 backdrop-blur-md rounded-lg p-1.5 sm:p-3 border border-white/30" style={{ backdropFilter: 'blur(12px)', background: 'rgba(255, 255, 255, 0.15)' }}>
    <div className="flex items-center gap-1.5 sm:gap-3">
      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
        <span className="text-xs sm:text-sm">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-300 uppercase tracking-wide font-medium">{label}</p>
        <p className="text-xs sm:text-sm font-semibold text-white truncate">{value}</p>
      </div>
    </div>
  </div>
);

// Professional Metric Card with Advanced Styling
const ProfessionalMetricCard = ({ icon, title, value, bgColor, description, onClick }) => (
  <div
    className="group relative bg-white rounded-xl overflow-hidden cursor-pointer"
    style={{ boxShadow: '0 0 20px 5px rgba(0, 0, 0, 0.08)' }}
    onClick={onClick}
  // style={{ backgroundColor: bg }}
  >

    <div className="relative p-2 sm:p-6">
      <div className="flex items-center justify-between mb-2 sm:mb-4">
        <div className="flex-1">
          <p className="text-xs sm:text-sm font-medium text-black mb-0.5 sm:mb-1">{title}</p>
          <h3 className="text-sm sm:text-xl lg:text-2xl font-bold mb-0.5 sm:mb-1" style={{ color: bgColor }}>{value}</h3>
          <p className="text-xs text-black hidden sm:block">{description}</p>
        </div>
        <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center shadow-sm"
          style={{ backgroundColor: `${bgColor}90` }}>
          <img src={icon} className="h-3 w-3 sm:h-6 sm:w-6" alt={title} />
        </div>
      </div>
    </div>
  </div>
);

// Analytics Card Container
const AnalyticsCard = ({ title, subtitle, icon, children, showButton, buttonText, onButtonClick }) => (
  <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 0 22px 6px rgba(0, 0, 0, 0.09)' }}>
    <div className="px-3 sm:px-6 py-3 sm:py-4 border-b-2 border-gray-200 shadow-sm bg-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center bg-gray-100">
            <span className="text-sm sm:text-lg">{icon}</span>
          </div>
          <div>
            <h3 className="text-sm sm:text-lg font-bold text-gray-900">{title}</h3>
            <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">{subtitle}</p>
          </div>
        </div>
        {showButton && (
          <button
            onClick={onButtonClick}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 text-xs sm:text-sm font-medium rounded-lg transition-colors duration-200"
          >
            {buttonText}
          </button>
        )}
      </div>
    </div>
    <div className="p-3 sm:p-6">{children}</div>
  </div>
);

// Progress Metric with Bar
const ProgressMetric = ({ title, value, total, color, suffix = '' }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-black">{title}</span>
        <span className="text-sm font-bold text-black">{value}{suffix}/{total}{suffix}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        ></div>
      </div>
    </div>
  );
};

// Dynamic Progress Overview Component
const DynamicProgressOverview = ({ studentData, reportCardData, reportLoading }) => {
  const [taskStats, setTaskStats] = useState(null);
  const [taskLoading, setTaskLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      if (!studentData?._id) { setTaskLoading(false); return; }
      try {
        const token = (() => {
          try {
            const enc = localStorage.getItem('token');
            if (!enc) return null;
            return CryptoJS.AES.decrypt(enc, 'ITEG@123').toString(CryptoJS.enc.Utf8) || null;
          } catch { return null; }
        })();
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/students/${studentData._id}/tasks`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        setTaskStats(data);
      } catch { /* silent */ } finally {
        setTaskLoading(false);
      }
    };
    fetchTasks();
  }, [studentData?._id]);

  if (reportLoading || taskLoading) {
    return <div className="h-48 sm:h-80 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" /></div>;
  }

  const total     = taskStats?.totalTasks     || 0;
  const completed = taskStats?.completedTasks || 0;
  const pending   = taskStats?.pendingTasks   || 0;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="h-48 sm:h-80 flex flex-col justify-center space-y-6">
      <ProgressMetric title="Task Completion"    value={completionRate} total="100" color="#FDA92D" suffix="%" />
      <ProgressMetric title="Tasks Completed"    value={completed}      total={total || 1} color="#22C55E" />
      <ProgressMetric title="Tasks Pending"      value={pending}        total={total || 1} color="#EF4444" />
      {total > 0 && (
        <div className="text-xs text-gray-500 text-center">{completed}/{total} tasks completed</div>
      )}
    </div>
  );
};

// Detail Section Container
const DetailSection = ({ title, subtitle, icon, children }) => (
  <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 0 22px 6px rgba(0, 0, 0, 0.09)' }}>
    <div className="px-3 sm:px-6 py-3 sm:py-4 border-b-2 border-gray-200 shadow-sm bg-white">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center bg-gray-100">
          <span className="text-sm sm:text-lg">{icon}</span>
        </div>
        <div>
          <h3 className="text-sm sm:text-lg font-bold text-gray-900">{title}</h3>
          <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">{subtitle}</p>
        </div>
      </div>
    </div>
    <div className="p-3 sm:p-6">{children}</div>
  </div>
);

// Detail Row Component
const DetailRow = ({ icon, label, value }) => (
  <div className="flex items-center gap-2 sm:gap-4 p-1.5 sm:p-3 rounded-lg hover:bg-gray-50 transition-colors">
    <div className="w-6 h-6 sm:w-10 sm:h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
      <img className="h-3 w-3 sm:h-5 sm:w-5" src={icon} alt={label} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-black uppercase tracking-wide font-medium">{label}</p>
      <p className="text-xs sm:text-sm font-semibold text-black truncate">{value || "N/A"}</p>
    </div>
  </div>
);

// Status Badge Component
const StatusBadge = ({ status }) => {
  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusStyle(status)}`}>
      {status || 'No Status'}
    </span>
  );
};

// Report Card Modal Component
const ReportCardModal = ({ isOpen, onClose, studentData, currentLevel }) => {
  if (!isOpen) return null;

  const calculateGrade = (percentage) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    return 'F';
  };

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A+': return 'text-green-600';
      case 'A': return 'text-green-500';
      case 'B+': return 'text-blue-600';
      case 'B': return 'text-blue-500';
      case 'C': return 'text-yellow-600';
      default: return 'text-red-600';
    }
  };

  const passedLevels = [];
  const overallAttendance = 0;
  const attendanceGrade = 'N/A';
  const academicGrade = studentData?.status === 'Placed' ? 'A' : 'B';
  const cgpa = '3.0';
  const enrollmentDate = studentData?.createdAt ? new Date(studentData.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
  const currentSemester = 1;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-800 text-white p-6 rounded-t-xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold mb-2">Student Report Card</h2>
              <p className="text-green-100">Academic Performance Summary</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Student Info */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-6">
            <img
              src={studentData.image || profilePlaceholder}
              alt="Student"
              className="w-24 h-24 rounded-full object-cover border-4 border-green-200"
            />
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-800">
                {studentData.firstName} {studentData.lastName}
              </h3>
              <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                <div><span className="font-medium text-gray-600">Student ID:</span> <br/><span className="font-semibold">{studentData._id?.slice(-8) || 'N/A'}</span></div>
                <div><span className="font-medium text-gray-600">Course:</span> <br/><span className="font-semibold">{studentData.course || 'N/A'}</span></div>
                <div><span className="font-medium text-gray-600">Current Semester:</span> <br/><span className="font-semibold">{currentSemester}</span></div>
                <div><span className="font-medium text-gray-600">Email:</span> <br/><span className="font-semibold">{studentData.email}</span></div>
                <div><span className="font-medium text-gray-600">Phone:</span> <br/><span className="font-semibold">{studentData.studentMobile || 'N/A'}</span></div>
                <div><span className="font-medium text-gray-600">Enrollment Date:</span> <br/><span className="font-semibold">{enrollmentDate}</span></div>
                <div><span className="font-medium text-gray-600">Specialization:</span> <br/><span className="font-semibold">{studentData.techno || 'Not Selected'}</span></div>
                <div><span className="font-medium text-gray-600">Address:</span> <br/><span className="font-semibold">{studentData.address || studentData.village || 'N/A'}</span></div>
                <div><span className="font-medium text-gray-600">CGPA:</span> <br/><span className="font-semibold text-green-600 text-lg">{cgpa}/4.0</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Academic Performance */}
        <div className="p-6">
          <h4 className="text-lg font-bold text-gray-800 mb-4">Academic Performance</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Level Progress */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="font-semibold text-gray-700 mb-3">📚 Course Progress</h5>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {studentData?.academicHistory?.length > 0 ? (
                  studentData.academicHistory.map((h, i) => (
                    <div key={i} className="flex justify-between items-center p-2 bg-white rounded border">
                      <span className="font-medium">{h.yearName}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        h.result === 'Pass' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>{h.result} — {h.percentage}%</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No academic history available</p>
                )}
              </div>
              <div className="mt-3 pt-3 border-t">
                <div className="text-sm text-gray-600">Current: {translateLevelName(currentLevelName)} ({studentData?.currentLevelId?.name || '—'} / {studentData?.currentSubLevelId?.name || '—'}){daysInSubLevel ? ` (${daysInSubLevel})` : ''}</div>
              </div>
            </div>

            {/* Attendance Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="font-semibold text-gray-700 mb-3">📅 Attendance Record</h5>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">N/A</div>
                <div className="text-lg font-semibold text-gray-500">Attendance data not available</div>
                <p className="text-xs text-gray-400 mt-2">Attendance module coming soon</p>
              </div>
            </div>

            {/* Skills & Certifications */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="font-semibold text-gray-700 mb-3">🏆 Skills & Achievements</h5>
              <div className="space-y-3">
                <div className="bg-white p-3 rounded border">
                  <div className="text-sm font-medium text-gray-700">Technical Skills</div>
                  <div className="text-xs text-[#FDA92D] mt-1">{studentData.techno || 'Not Selected'}</div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-sm font-medium text-gray-700">Certifications</div>
                  <div className="text-xs text-green-600 mt-1">{passedLevels.length} Level Certificates</div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-sm font-medium text-gray-700">Resume Status</div>
                  <div className={`text-xs mt-1 ${studentData?.resumeURL ? 'text-green-600' : 'text-red-600'}`}>
                    {studentData?.resumeURL ? '✓ Uploaded' : '✗ Not Uploaded'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Overall Performance Dashboard */}
          <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6">
            <h5 className="font-semibold text-gray-700 mb-4">📊 Performance Dashboard</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <div className="text-sm text-gray-600 mb-1">CGPA</div>
                <div className="text-2xl font-bold text-green-600">{cgpa}</div>
                <div className="text-xs text-gray-500">Out of 4.0</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <div className="text-sm text-gray-600 mb-1">Academic</div>
                <div className="text-2xl font-bold text-blue-600">{studentData?.currentLevelId?.name || '—'}</div>
                <div className="text-xs text-gray-500">{studentData?.currentSubLevelId?.name || '—'} {daysInSubLevel ? `• ${daysInSubLevel}` : ''}</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <div className="text-sm text-gray-600 mb-1">Attendance</div>
                <div className="text-2xl font-bold text-gray-400">N/A</div>
                <div className="text-xs text-gray-500">Coming soon</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <div className="text-sm text-gray-600 mb-1">Status</div>
                <div className={`text-lg font-bold ${
                  studentData.placedInfo?.companyName ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {studentData.placedInfo?.companyName ? 'Placed' : 'Active'}
                </div>
                <div className="text-xs text-gray-500">
                  {studentData.placedInfo?.companyName || 'In Progress'}
                </div>
              </div>
            </div>
          </div>

          {/* Personal & Contact Information */}
          <div className="mt-6 bg-gray-50 rounded-lg p-6">
            <h5 className="font-semibold text-gray-700 mb-4">👤 Personal Information</h5>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><span className="font-medium text-gray-600">Father's Name:</span> <br/>{studentData.fatherName || 'N/A'}</div>
              <div><span className="font-medium text-gray-600">Mother's Name:</span> <br/>{studentData.motherName || 'N/A'}</div>
              <div><span className="font-medium text-gray-600">Date of Birth:</span> <br/>{studentData.dateOfBirth ? new Date(studentData.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</div>
              <div><span className="font-medium text-gray-600">Gender:</span> <br/>{studentData.gender || 'N/A'}</div>
              <div><span className="font-medium text-gray-600">Blood Group:</span> <br/>{studentData.bloodGroup || 'N/A'}</div>
              <div><span className="font-medium text-gray-600">Emergency Contact:</span> <br/>{studentData.emergencyContact || studentData.parentMobile || 'N/A'}</div>
            </div>
          </div>

          {/* Academic History */}
          <div className="mt-6 bg-gray-50 rounded-lg p-6">
            <h5 className="font-semibold text-gray-700 mb-4">🎓 Academic History</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-white p-4 rounded border">
                <div className="font-medium text-gray-700 mb-2">Previous Education</div>
                <div><span className="text-gray-600">12th Percentage:</span> {studentData.twelfthPercentage || 'N/A'}%</div>
                <div><span className="text-gray-600">12th Board:</span> {studentData.twelfthBoard || 'N/A'}</div>
                <div><span className="text-gray-600">School:</span> {studentData.schoolName || 'N/A'}</div>
              </div>
              <div className="bg-white p-4 rounded border">
                <div className="font-medium text-gray-700 mb-2">Current Performance</div>
                <div><span className="text-gray-600">Current Level:</span> {currentLevel || 'N/A'}</div>
                <div><span className="text-gray-600">Completion Rate:</span> {studentData?.status || 'Active'}</div>
                <div><span className="text-gray-600">Semester:</span> {currentSemester}</div>
              </div>
            </div>
          </div>

          {/* Placement & Career Information */}
          <div className="mt-6 bg-green-50 rounded-lg p-6">
            <h5 className="font-semibold text-gray-700 mb-4">💼 Career & Placement</h5>
            {studentData.placedInfo?.companyName ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div><span className="font-medium text-gray-600">Company:</span> <br/><span className="font-semibold text-[#E6941A]">{studentData.placedInfo.companyName}</span></div>
                <div><span className="font-medium text-gray-600">Position:</span> <br/><span className="font-semibold">{studentData.placedInfo.jobProfile}</span></div>
                <div><span className="font-medium text-gray-600">Package:</span> <br/><span className="font-semibold">{studentData.placedInfo.package || 'N/A'}</span></div>
                <div><span className="font-medium text-gray-600">Location:</span> <br/><span className="font-semibold">{studentData.placedInfo.location}</span></div>
                <div><span className="font-medium text-gray-600">Joining Date:</span> <br/><span className="font-semibold">{studentData.placedInfo.joiningDate ? new Date(studentData.placedInfo.joiningDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</span></div>
                <div><span className="font-medium text-gray-600">Offer Letter:</span> <br/><span className={`font-semibold ${studentData.placedInfo.offerLetterURL ? 'text-[#FDA92D]' : 'text-red-600'}`}>{studentData.placedInfo.offerLetterURL ? '✓ Available' : '✗ Pending'}</span></div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">🎯</div>
                <div className="text-lg font-medium text-gray-700">Placement In Progress</div>
                <div className="text-sm text-gray-500 mt-1">Student is actively seeking placement opportunities</div>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div><span className="font-medium text-gray-600">Resume Status:</span> <br/><span className={`font-semibold ${studentData.resumeURL || studentData.resume ? 'text-[#FDA92D]' : 'text-red-600'}`}>{studentData.resumeURL || studentData.resume ? '✓ Ready' : '✗ Pending'}</span></div>
                  <div><span className="font-medium text-gray-600">Eligibility:</span> <br/><span className={`font-semibold ${studentData?.status === 'Placed' ? 'text-green-600' : 'text-yellow-600'}`}>{studentData?.status === 'Placed' ? '✓ Placed' : '⚠ In Progress'}</span></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 rounded-b-xl">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <div>Generated on: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
              <div className="mt-1">Academic Year: {new Date().getFullYear()}-{new Date().getFullYear() + 1}</div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
              >
                🖨️ Print Report
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import { Chart } from 'react-google-charts';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import InputField from '../../shared/form-fields/InputField';
import CryptoJS from 'crypto-js';

const SetPasswordModal = ({ isOpen, onClose, studentId, onSetPassword }) => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (password !== confirm) { toast.error("Passwords do not match"); return; }
    setLoading(true);
    try {
      await onSetPassword({ id: studentId, password }).unwrap();
      toast.success("Password set successfully");
      setPassword(""); setConfirm("");
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to set password");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl py-4 px-4 sm:px-6 w-full max-w-sm relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-xl text-gray-400 hover:text-gray-700">&times;</button>
        <h2 className="text-lg font-semibold text-center mb-4 text-[#FDA92D]">Set Student Password</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <label className="block text-xs text-gray-500 mb-1">New Password</label>
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 pr-10"
              placeholder="Min. 6 characters"
              required
            />
            <button type="button" onClick={() => setShow(p => !p)}
              className="absolute right-3 top-[26px] text-gray-400 hover:text-gray-600 text-xs">
              {show ? "Hide" : "Show"}
            </button>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Confirm Password</label>
            <input
              type={show ? "text" : "password"}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
              placeholder="Re-enter password"
              required
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2 bg-[#FDA92D] hover:bg-[#E6941A] text-white rounded-lg text-sm disabled:opacity-50">
              {loading ? "Setting..." : "Set Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const UpdateEmailModal = ({ isOpen, onClose, studentData, onUpdate, isLoading }) => {
  const validationSchema = Yup.object({
    email: Yup.string()
      .email('Please enter a valid email address')
      .required('Email is required')
      .test('different', 'New email must be different from current email', function(value) {
        return value !== studentData?.email;
      })
  });

  const initialValues = {
    email: studentData?.email || ''
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      await onUpdate({ id: studentData._id, email: values.email }).unwrap();
      toast.success('Email updated successfully!');
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update email');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl py-4 px-4 sm:px-6 w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl sm:text-2xl font-semibold text-center mb-4 sm:mb-6 text-[var(--primary)]">Update Email</h2>
        
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ isSubmitting }) => (
            <Form>
              <div className="mb-4">
                <InputField
                  label="Current Email"
                  name="currentEmail"
                  value={studentData?.email || ''}
                  disabled
                  placeholder="Current email address"
                />
              </div>
              
              <div className="mb-4">
                <InputField
                  label="New Email Address"
                  name="email"
                  type="email"
                  placeholder="Enter new email address"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-[#FDA92D] hover:bg-[#E6941A] text-white rounded-lg disabled:opacity-50"
                >
                  {isSubmitting ? 'Updating...' : 'Update Email'}
                </button>
              </div>
            </Form>
          )}
        </Formik>
        
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-xl text-gray-400 hover:text-gray-700"
        >
          &times;
        </button>
      </div>
    </div>
  );
};
