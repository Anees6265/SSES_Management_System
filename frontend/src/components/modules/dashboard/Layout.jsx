import Sidebar from '../../shared/sidebar/Sidebar';
import { SidebarProvider } from '../../../contexts/SidebarContext';
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import SecurityHelmet from '../../shared/SecurityHelmet';
import AdminDashboard from "./AdminDashboard";
import StudentDetailTable from "../students/StudentDetailTable";
import DepartmentSelector from "../students/DepartmentSelector";
import StudentEditPage from "../students/StudentEditPage";
import StudentReport from "../students/StudentReport";
import StudentReportForm from "../students/StudentReportForm";
import StudentLevelData from "../students/StudentLevelData";
import StudentLevelInterviewHistory from "../students/StudentLevelInterviewHistory";
import PlacementReadyStudents from "../placements/PlacementReadyStudents";
import RoleBasedPlacementDashboard from "../placements/dashboard/RoleBasedPlacementDashboard";
import DepartmentPlacementDetail from "../placements/dashboard/DepartmentPlacementDetail";
import StudentPermission from "../students/StudentPermission";
import LeaveRequests from "../students/LeaveRequests";
import PlacementRecords from "../placements/PlacementRecords";
import PlacementPost from "../placements/PlacementPost";
import CompanyDetail from "../placements/CompanyDetail";
import PlacedStudents from "../placements/PlacedStudents";
import InterviewHistory from "../placements/InterviewHistory";
import InterviewRoundsHistory from "../placements/InterviewRoundsHistory";
import PageNotFound from "../../shared/error-pages/PageNotFound";
import ProtectedRoute from '../../shared/protected-route/ProtectedRoute';
import AttendanceDetails from "../attendance/AttendanceDetails";
import UsersManagement from "../users/UsersManagement";
import UserProfile from "../users/UserProfile";
import DepartmentManagement from "../settings/departments/DepartmentManagement";
import UserPermission from "../users/UserPermission";
import SubDepartment from "../settings/departments/SubDepartment";
import ShowLevels from "../settings/levels/ShowLevels";
import DepartmentDetails from "../settings/departments/DepartmentDetails";
import SubdepartmentDetails from "../settings/departments/SubdepartmentDetails";
import ShowSubLevelTablesData from "../settings/levels/ShowSubLevelTablesData";
import SubLevelManagement from "../settings/levels/SubLevelManagement";
import StudentProfilePage from "../settings/levels/StudentProfilePage";
import StudentTaskBoard from "../settings/levels/StudentTaskBoard";
import StudentArchivePage from "../students/StudentArchivePage";
import TaskManagement from "../settings/tasks/TaskManagement";
import TaskList from "../students/TaskList";
import SettingFIle from "../settings/SettingFIle";
import Supportfile from "../settings/Supportfile";
import SessionManagement from "../settings/sessions/SessionManagement";
import CurriculumManagement from "../settings/curriculum/CurriculumManagement";
import PlacementDriveManagement from "../placements/PlacementDriveManagement";
import ResumeSharingScreen from "../placements/ResumeSharingScreen";
import ActivityLogs from "../activity/ActivityLogs";

// admin/superadmin → DepartmentSelector, faculty → direct StudentDetailTable
const RoleBasedStudentPage = () => {
  return <DepartmentSelector />;
};

const STAFF_ROLES = ["superadmin", "admin", "faculty", "hod", "placement_officer", "coordinator"];

const routeTitleMap = {
    "/": "Dashboard",
    "/attendance-details": "Attendance Details",
    "/user-management": "User Management",
    "/student-detail-table": "Student Records",
    "/leave-requests": "Leave Requests",
    "/student-permission": "Student Permissions",
    "/readiness-status": "Placement Readiness",
    "/placements/dashboard": "Placement Dashboard",
    "/placements/drives": "Placement Drives",
    "/placements/resume-sharing": "Resume Sharing",
    "/placement-interview-record": "Placement Interview Records",
    "/company-details": "Company Details",
    "/placement-post": "Placement Posts",
    "/department-management": "Department Management",
    "/subdepartments": "Sub-Departments",
    "/levels": "Levels Management",
    "/task-management": "Task Management",
    "/curriculum-management": "Curriculum Management",
    "/session-management": "Session Management",
    "/activity-logs": "Activity Logs",
    "/settings": "Settings",
    "/support": "Support & Help",
};

const Layout = () => {
    const role = localStorage.getItem('role');
    const location = useLocation();

    if (role === 'student') {
        return <Navigate to="/student-portal/dashboard" replace />;
    }

    const getPageTitle = () => {
        if (routeTitleMap[location.pathname]) {
            return `${routeTitleMap[location.pathname]} - Admin Portal`;
        }
        if (location.pathname.startsWith("/student-detail-table")) return "Student Records - Admin Portal";
        if (location.pathname.startsWith("/student/leveldata")) return "Student Level Data - Admin Portal";
        if (location.pathname.startsWith("/student-profile")) return "Student Profile - Admin Portal";
        if (location.pathname.startsWith("/placements/department")) return "Department Placements - Admin Portal";
        if (location.pathname.startsWith("/placement/company")) return "Placed Students - Admin Portal";
        if (location.pathname.startsWith("/subdepartment")) return "Department Hierarchy - Admin Portal";
        return "Admin Portal";
    };

    return (
        <div className="h-screen overflow-hidden">
            <SecurityHelmet title={getPageTitle()} />
            <SidebarProvider>
                <Sidebar>
                <Routes>
                    <Route path="/" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><AdminDashboard /></ProtectedRoute>} />
                    <Route path="/dashboard" element={<Navigate to="/" replace />} />
                    {/* <Route path="/attendance-details" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><AttendanceDetails /></ProtectedRoute>} /> */}
                    <Route path="/user-management" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><UsersManagement /></ProtectedRoute>} />
                    <Route path="/user-profile/:id" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><UserProfile /></ProtectedRoute>} />
                    <Route path="/student/edit/:id" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StudentEditPage /></ProtectedRoute>} />
                    <Route path="/student-detail-table" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><RoleBasedStudentPage /></ProtectedRoute>} />
                    <Route path="/student-detail-table/:subDepartmentId" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StudentDetailTable /></ProtectedRoute>} />
                    <Route path="/student/leveldata/:id" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StudentLevelData /></ProtectedRoute>} />
                    <Route path="/student-profile/:id" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StudentProfilePage /></ProtectedRoute>} />
                    <Route path="/student/:id/archive" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StudentArchivePage /></ProtectedRoute>} />
                    <Route path="/student/:id/report/edit" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StudentReportForm /></ProtectedRoute>} />
                    <Route path="/student/:id/report" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StudentReport /></ProtectedRoute>} />
                    <Route path="/student-level-interviews/:studentId" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StudentLevelInterviewHistory /></ProtectedRoute>} />
                    <Route path="/student/:id/task-list" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><TaskList /></ProtectedRoute>} />
                    <Route path="/student-permission" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StudentPermission /></ProtectedRoute>} />
                    <Route path="/leave-requests" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><LeaveRequests /></ProtectedRoute>} />
                    <Route path="/readiness-status" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><PlacementReadyStudents /></ProtectedRoute>} />
                    <Route path="/placements/dashboard" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><RoleBasedPlacementDashboard /></ProtectedRoute>} />
                    <Route path="/placements/drives" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><PlacementDriveManagement /></ProtectedRoute>} />
                    <Route path="/placements/resume-sharing" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><ResumeSharingScreen /></ProtectedRoute>} />
                    <Route path="/placements/department/:subDepartmentId" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><DepartmentPlacementDetail /></ProtectedRoute>} />
                    <Route path="/placement-interview-record" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><PlacementRecords /></ProtectedRoute>} />
                    <Route path="/company-details" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><CompanyDetail /></ProtectedRoute>} />
                    <Route path="/placement/company/:companyId" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><PlacedStudents /></ProtectedRoute>} />
                    <Route path="/placement-post" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><PlacementPost /></ProtectedRoute>} />
                    <Route path="/interview-history/:id" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><InterviewHistory /></ProtectedRoute>} />
                    <Route path="/interview-rounds-history/:studentId/:interviewId" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><InterviewRoundsHistory /></ProtectedRoute>} />
                    <Route path="/department-management" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><DepartmentManagement /></ProtectedRoute>} />
                    <Route path="/department-details/:id" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><DepartmentDetails /></ProtectedRoute>} />
                    <Route path="/subdepartment/:id/levels" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><SubdepartmentDetails /></ProtectedRoute>} />
                    <Route path="/subdepartment/:id/level/:levelId" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><SubLevelManagement /></ProtectedRoute>} />
                    <Route path="/subdepartment-details" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><SubdepartmentDetails /></ProtectedRoute>} />
                    <Route path="/show-sublevel-tables" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><ShowSubLevelTablesData /></ProtectedRoute>} />
                    <Route path="/setting/student-profile" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StudentProfilePage /></ProtectedRoute>} />
                    <Route path="/student/task-board" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><StudentTaskBoard /></ProtectedRoute>} />
                    <Route path="/task-management" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><TaskManagement /></ProtectedRoute>} />
                    <Route path="/subdepartments" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><SubDepartment /></ProtectedRoute>} />
                    <Route path="/levels" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><ShowLevels /></ProtectedRoute>} />
                    <Route path="/user-permission" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><UserPermission /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><SettingFIle /></ProtectedRoute>} />
                    <Route path="/support" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><Supportfile /></ProtectedRoute>} />
                    <Route path="/curriculum-management" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><CurriculumManagement /></ProtectedRoute>} />
                    <Route path="/session-management" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><SessionManagement /></ProtectedRoute>} />
                    <Route path="/activity-logs" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><ActivityLogs /></ProtectedRoute>} />
                    <Route path="/unauthorized" element={<PageNotFound />} />
                    <Route path="*" element={<PageNotFound />} />
                </Routes>
            </Sidebar>
            </SidebarProvider>
        </div>
    );
};

export default Layout;
