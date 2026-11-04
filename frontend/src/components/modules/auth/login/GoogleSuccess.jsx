import { useEffect, useRef } from "react";
import { toast } from "react-toastify";
import CryptoJS from "crypto-js";

const GoogleSuccess = () => {
  const secretKey = "ITEG@123"; 
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;

    const queryParams = new URLSearchParams(window.location.search);
    const error = queryParams.get("error");
    const message = queryParams.get("message");
    const token = queryParams.get("token");
    const refreshToken = queryParams.get("refreshToken");
    const userId = queryParams.get("userId");
    const name = queryParams.get("name");
    const role = (queryParams.get("role") || "").toLowerCase().trim();
    const email = queryParams.get("email");
    const profileImage = queryParams.get("profileImage");
    const positionRole = queryParams.get("positionRole") || "admin";
    const department = queryParams.get("department") || "General";
    const isStudent = queryParams.get("isStudent") === "true" || role === "student";

    if (error) {
      processedRef.current = true;
      toast.error(decodeURIComponent(message || "Google authentication failed."));
      window.location.replace("/login");
      return;
    }

    if (token && userId) {
      processedRef.current = true;
      const encryptedToken = CryptoJS.AES.encrypt(token, secretKey).toString();
      const encryptedRefreshToken = refreshToken
        ? CryptoJS.AES.encrypt(refreshToken, secretKey).toString()
        : "";

      if (isStudent) {
        localStorage.setItem("studentToken", encryptedToken);
        if (encryptedRefreshToken) {
          localStorage.setItem("studentRefreshToken", encryptedRefreshToken);
        }
        localStorage.setItem("role", "student");
        const nameParts = (name || "Student").split(" ");
        const studentObj = {
          _id: userId,
          id: userId,
          firstName: nameParts[0] || "Student",
          lastName: nameParts.slice(1).join(" ") || "",
          name: name || "Student",
          email: email || "",
          role: "student",
          image: profileImage || "",
        };
        localStorage.setItem("studentData", JSON.stringify(studentObj));
        localStorage.setItem("user", JSON.stringify(studentObj));
        toast.success(`Welcome back, ${name || "Student"}!`);
        window.location.replace("/student-portal/dashboard");
      } else {
        localStorage.setItem("token", encryptedToken);
        if (encryptedRefreshToken) {
          localStorage.setItem("refreshToken", encryptedRefreshToken);
        }
        const assignedRole = role || "faculty";
        localStorage.setItem("role", assignedRole);
        localStorage.setItem("positionRole", positionRole || (['superadmin', 'admin'].includes(assignedRole) ? 'admin' : 'faculty'));
        const userObj = {
          _id: userId,
          id: userId,
          name: name || "User",
          email: email || "",
          role: assignedRole,
          position: positionRole,
          positionRole: positionRole,
          department: ['superadmin', 'admin'].includes(assignedRole) ? 'SSISM' : department,
          profileImage: profileImage || "",
        };
        localStorage.setItem("user", JSON.stringify(userObj));
        toast.success(`Welcome back, ${name || "User"}!`);
        window.location.replace("/");
      }
    } else {
      // Check if user is already authenticated in localStorage
      const existingToken = localStorage.getItem("token");
      const existingStudentToken = localStorage.getItem("studentToken");
      const existingRole = localStorage.getItem("role");

      if (existingStudentToken && existingRole === "student") {
        window.location.replace("/student-portal/dashboard");
      } else if (existingToken) {
        window.location.replace("/");
      } else {
        window.location.replace("/login");
      }
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center space-y-4 border border-gray-100">
        <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center mx-auto">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <h2 className="text-base font-bold text-gray-900">Signing in with Google...</h2>
        <p className="text-xs text-gray-500">Please wait while we verify your institutional session.</p>
      </div>
    </div>
  );
};

export default GoogleSuccess;
