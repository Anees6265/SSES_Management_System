import { Routes, Route } from "react-router-dom";
import { usePermissions } from '../../../contexts/PermissionContext';
// Admission process components
import AdmissionDashboard from "../../../admition-process/AdmissionDashboard";
import AdmissionProcess from "../../../admition-process/AdmissionProcess";
import AdmissionEditPage from "../../../admition-process/AdmissionEditPage";

// Student records components
import StudentDetailTable from "../students/StudentDetailTable";
import StudentEditPage from "../students/StudentEditPage";
import StudentProfile from "../students/StudentProfile";
import StudentReport from "../students/StudentReport";
import StudentReportForm from "../students/StudentReportForm";
import StudentLevelData from "../students/StudentLevelData";
import StudentLevelInterviewHistory from "../students/StudentLevelInterviewHistory";
import TaskList from "../students/TaskList";
// Placement components
import PlacementReadyStudents from "../placements/PlacementReadyStudents";
import StudentPermission from "../students/StudentPermission";
import PlacementRecords from "../placements/PlacementRecords";
import PlacementPost from "../placements/PlacementPost";
import CompanyDetail from "../placements/CompanyDetail";
import PlacedStudents from "../placements/PlacedStudents";
import InterviewHistory from "../placements/InterviewHistory";
import InterviewRoundsHistory from "../placements/InterviewRoundsHistory";
import PageNotFound from "../../shared/error-pages/PageNotFound";
import AttendanceDetails from "../attendance/AttendanceDetails";
import UsersManagement from "../users/UsersManagement";
import UserProfile from "../users/UserProfile";
import DepartmentManagement from "../settings/departments/DepartmentManagement";
import UserPermission from "../users/UserPermission";
import SubDepartment from "../settings/departments/SubDepartment";
import ShowLevels from "../settings/levels/ShowLevels";
import DepartmentDetails from "../settings/departments/DepartmentDetails";
import SubdepartmentDetails from "../settings/departments/SubdepartmentDetails";
import Header from "../../shared/sidebar/Header";

const Dashboard = () => {
  const { hasPermission } = usePermissions();
  
  return (
    <Routes>
      {/* Dashboard Routes - Permission based */}
      {hasPermission('Page_Dashboard') && (
        <Route path="/" element={<AdmissionDashboard />} />
      )}
      {hasPermission('Page_AttendanceDetails') && (
        <Route path="/attendance-details" element={<AttendanceDetails />} />
      )}
      
      {/* User Management - Superadmin only */}
      {hasPermission('Page_UserManagement') && (
        <>
          <Route path="/user-management" element={<UsersManagement />} />
          <Route path="/user-profile/:id" element={<UserProfile />} />
          <Route path="/user-permission" element={<UserPermission />} />
        </>
      )}
      
      {/* Admission Routes - Permission based */}
      {hasPermission('Page_Admission') && (
        <>
          <Route path="/admission-process" element={<AdmissionProcess />} />
          <Route path="/admission/edit/:id" element={<AdmissionEditPage />} />
        </>
      )}
      
      {/* Student Routes - Permission based */}
      {hasPermission('Page_AdmittedStudents') && (
        <>
          <Route path="/student-dashboard" element={<StudentDashboard />} />
          <Route path="/student-detail-table" element={<StudentDetailTable />} />
          <Route path="/student/edit/:id" element={<StudentEditPage />} />
          <Route path="/student/leveldata/:id" element={<StudentLevelData />} />
          <Route path="/student-profile/:id" element={<StudentProfile />} />
          <Route path="/student/:id/report/edit" element={<StudentReportForm />} />
          <Route path="/student/:id/report" element={<StudentReport />} />
          <Route path="/student/:studentId/level-interviews" element={<StudentLevelInterviewHistory />} />
          <Route path="/student/:id/task-list" element={<TaskList />} />
          <Route path="/student-permission" element={<StudentPermission />} />
        </>
      )}
      
      {/* Placement Routes - Permission based */}
      {hasPermission('Page_Placement') && (
        <>
          <Route path="/readiness-status" element={<PlacementReadyStudents />} />
          <Route path="/placement-interview-record" element={<PlacementRecords />} />
          <Route path="/placement-post" element={<PlacementPost />} />
          <Route path="/interview-history/:id" element={<InterviewHistory />} />
          <Route path="/interview-rounds-history/:studentId/:interviewId" element={<InterviewRoundsHistory />} />
        </>
      )}
      
      {hasPermission('Page_CompanyDetails') && (
        <>
          <Route path="/company-details" element={<CompanyDetail />} />
          <Route path="/placement/company/:companyId" element={<PlacedStudents />} />
        </>
      )}
      
      {/* Settings Routes - Permission based */}
      {hasPermission('Page_Department') && (
        <>
          <Route path="/department-management" element={<DepartmentManagement />} />
          <Route path="/department-details/:id" element={<DepartmentDetails />} />
        </>
      )}
      
      {hasPermission('Page_SubDepartment') && (
        <>
          <Route path="/subdepartment-details" element={<SubdepartmentDetails />} />
          <Route path="/subdepartments" element={<SubDepartment />} />
        </>
      )}
      
      {hasPermission('Page_Level') && (
        <Route path="/levels" element={<ShowLevels />} />
      )}
      
      {/* Error Routes */}
      <Route path="/unauthorized" element={<PageNotFound />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

export default Dashboard;