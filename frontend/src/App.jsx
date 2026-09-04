import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import Layout from "./components/modules/dashboard/Layout.jsx";
import { useSessionTimeout } from "./hooks/useSessionTimeout";
import { PermissionProvider } from './contexts/PermissionContext';
import { SessionProvider } from './contexts/SessionContext';

// Lazy load components
const LoginPage = React.lazy(() => import("./components/modules/auth/login/LoginPage"));
const ForgetPassword = React.lazy(() => import("./components/modules/auth/forgot-password/ForgetPassword"));
const ConfirmPassword = React.lazy(() => import("./components/modules/auth/confirm-password/ConfirmPassword"));
const OtpVerification = React.lazy(() => import("./components/modules/auth/otp/OtpVeriFication"));
const OtpEnter = React.lazy(() => import("./components/modules/auth/otp/OtpEnter"));
const GoogleSuccess = React.lazy(() => import('./components/modules/auth/login/GoogleSuccess.jsx'));
const ServerError = React.lazy(() => import("./components/shared/error-pages/ServerError"));
const SessionTimeoutModal = React.lazy(() => import('./components/shared/user-profile/SessionTimeoutModal'));

// Student Portal
const StudentPortalLayout = React.lazy(() => import("./components/student-portal/layout/StudentPortalLayout"));
const StudentDashboard = React.lazy(() => import("./components/student-portal/dashboard/StudentDashboard"));
const StudentTasks = React.lazy(() => import("./components/student-portal/tasks/StudentTasks"));
const StudentLevelHistory = React.lazy(() => import("./components/student-portal/progress/StudentLevelHistory"));
const StudentProfile = React.lazy(() => import("./components/student-portal/profile/StudentProfile"));
const StudentPermissions = React.lazy(() => import("./components/student-portal/permissions/StudentPermissions"));
const StudentDocuments = React.lazy(() => import("./components/student-portal/documents/StudentDocuments"));
const StudentPlacement = React.lazy(() => import("./components/student-portal/placement/StudentPlacement"));
const StudentReportCard = React.lazy(() => import("./components/student-portal/reportcard/StudentReportCard"));
const StudentFaculty = React.lazy(() => import("./components/student-portal/faculty/StudentFaculty"));


// ✅ Protected Route Component (Admin/Faculty)
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
};

// ✅ Student Protected Route
const StudentRoute = ({ children }) => {
  const token = localStorage.getItem("studentToken");
  const role = localStorage.getItem("role");
  return token && role === "student" ? children : <Navigate to="/login" replace />;
};

function App() {
  const { showModal, handleContinue, handleLogout } = useSessionTimeout();

  return (
    <React.Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading...</div>
      </div>
    }>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/otp-verification" element={<OtpVerification />} />
          <Route path="/reset-password/:token" element={<ConfirmPassword />} />
          <Route path="/forget-password" element={<ForgetPassword />} />
          <Route path="/otp-enter" element={<OtpEnter />} />
          <Route path="/google-success" element={<GoogleSuccess />} />
          <Route path="/server-error" element={<ServerError />} />

          {/* Student Portal Routes */}
          <Route
            path="/student-portal"
            element={
              <StudentRoute>
                <StudentPortalLayout />
              </StudentRoute>
            }
          >
            <Route index element={<Navigate to="/student-portal/dashboard" replace />} />
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="tasks" element={<StudentTasks />} />
            <Route path="progress" element={<StudentLevelHistory />} />
            <Route path="permissions" element={<StudentPermissions />} />
            <Route path="documents" element={<StudentDocuments />} />
            <Route path="placement" element={<StudentPlacement />} />
            <Route path="report-card" element={<StudentReportCard />} />
            <Route path="profile" element={<StudentProfile />} />
            <Route path="faculty" element={<StudentFaculty />} />
          </Route>

          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <SessionProvider>
                  <PermissionProvider>
                    <div className="bg-white">
                      <Layout />
                    </div>
                  </PermissionProvider>
                </SessionProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>

      <SessionTimeoutModal
        isOpen={showModal}
        onContinue={handleContinue}
        onLogout={handleLogout}
      />

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        style={{ zIndex: 99999 }}
      />
    </React.Suspense>
  );
}

export default App;


