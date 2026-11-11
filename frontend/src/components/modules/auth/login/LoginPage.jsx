import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import CryptoJS from "crypto-js";
import { useLoginMutation, useStudentLoginMutation } from "../../../../redux/api/authApi";
import { initClientIp } from "../../../../utils/clientIpHelper";
import Loader from "../../../shared/loader/Loader";
// import CompactFaceLogin from "../../face-auth/CompactFaceLogin"; // Face recognition login disabled
import { toast } from "react-toastify";
import { Eye, EyeOff } from "lucide-react";
import SecurityHelmet from "../../../shared/SecurityHelmet";
import { API_BASE_URL } from "../../../../config/apiConfig";

import logo from "../../../../assets/images/logo-ssism.png";
import googleLogo from "../../../../assets/icons/google-icon.png";
import mail from "../../../../assets/icons/gmail-icon.png";
import singajiBg from "../../../../assets/images/singaji_building.jpg";

const secretKey = "ITEG@123";
const encrypt = (data) => CryptoJS.AES.encrypt(data, secretKey).toString();

const LoginPage = () => {
  const navigate = useNavigate();

  // Unified single form state for all users (Staff / Faculty / Admin / Students)
  const [formData, setFormData] = useState({ email: "", password: "" });

  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  // Face recognition login disabled
  // const [showFaceLogin, setShowFaceLogin] = useState(false);

  const [login, { isLoading: isAdminLoading }] = useLoginMutation();
  const [studentLogin, { isLoading: isStudentLoading }] = useStudentLoginMutation();

  const isLoading = isAdminLoading || isStudentLoading;

  useEffect(() => {
    initClientIp();
    const token = localStorage.getItem("token");
    const studentToken = localStorage.getItem("studentToken");
    const role = localStorage.getItem("role");

    if (studentToken && role === "student") {
      navigate("/student-portal/dashboard", { replace: true });
    } else if (token) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  // Unified Login: automatically identifies user role
  // Staff (faculty, hod, superadmin, admin, placement_officer, coordinator) -> respective dashboard (/)
  // All other registered users/emails -> default to student portal (/student-portal/dashboard)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginError("");

    const inputEmail = (formData.email || "").trim().toLowerCase();
    const inputPassword = formData.password || "";

    if (!inputEmail || !inputPassword.trim()) {
      setLoginError("Email and password are required.");
      return;
    }

    if (!/^[a-zA-Z0-9._%+-]+@ssism\.org$/i.test(inputEmail)) {
      setLoginError("Please enter your official @ssism.org email address.");
      return;
    }

    const staffRoles = [
      "superadmin",
      "admin",
      "faculty",
      "hod",
      "placement_officer",
      "coordinator",
      "cordinator",
    ];

    try {
      let response;
      let isStudentResponse = false;

      try {
        response = await login({ email: inputEmail, password: inputPassword }).unwrap();
        if (response.isStudent || response.role === "student") {
          isStudentResponse = true;
        }
      } catch (err) {
        // Fallback attempt with studentLogin endpoint if user login returned error
        try {
          response = await studentLogin({
            email: inputEmail,
            prkey: inputEmail,
            password: inputPassword,
          }).unwrap();
          isStudentResponse = true;
        } catch (studentErr) {
          throw err?.data?.message ? err : studentErr;
        }
      }

      // Clear any previous session leftovers to prevent state collision
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("studentToken");
      localStorage.removeItem("studentRefreshToken");
      localStorage.removeItem("user");
      localStorage.removeItem("studentData");
      localStorage.removeItem("role");
      localStorage.removeItem("positionRole");

      const userRole = (
        response.role ||
        response.user?.role ||
        (isStudentResponse ? "student" : "")
      )
        .toLowerCase()
        .trim()
        .replace(/[\s-]+/g, "_");

      const isStaff = staffRoles.includes(userRole);

      // If user is staff (faculty, hod, superadmin, admin, placement_officer, coordinator),
      // redirect them to their respective portal (/ dashboard).
      // Any other registered email (or non-staff role) defaults to the student portal.
      if (isStaff && !isStudentResponse) {
        const userData = {
          ...response.user,
          department: ["superadmin", "admin"].includes(response.user?.role?.toLowerCase())
            ? "SSISM"
            : response.user?.department,
        };
        localStorage.setItem("token", encrypt(response.token));
        if (response.refreshToken) {
          localStorage.setItem("refreshToken", encrypt(response.refreshToken));
        }
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("role", userData.role);
        localStorage.setItem("positionRole", userData.positionRole || "admin");

        toast.success("Login successful!");
        navigate("/", { replace: true });
      } else {
        // Default to student portal for students and any other registered roles
        const studentObj = response.student || response.user || {
          email: inputEmail,
          role: "student",
          firstName: "Student",
        };
        const studentToken = response.studentToken || response.token;
        const studentRefreshToken = response.studentRefreshToken || response.refreshToken;

        localStorage.setItem("studentToken", encrypt(studentToken));
        if (studentRefreshToken) {
          localStorage.setItem("studentRefreshToken", encrypt(studentRefreshToken));
        }
        localStorage.setItem("studentData", JSON.stringify(studentObj));
        localStorage.setItem("user", JSON.stringify(studentObj));
        localStorage.setItem("role", "student");

        toast.success(`Welcome, ${studentObj.firstName || studentObj.name || "Student"}!`);
        navigate("/student-portal/dashboard", { replace: true });
      }
    } catch (error) {
      setLoginError(error?.data?.message || error?.message || "Invalid email or password.");
    }
  };

  const handleGoogleLogin = () => {
    const apiBase = API_BASE_URL;
    const googleEndpoint = import.meta.env.VITE_LOGIN_WITH_GOOGLE || "/user/google";
    const origin = encodeURIComponent(window.location.origin);
    window.location.href = `${apiBase}${googleEndpoint}?origin=${origin}`;
  };

  const handleOtpLogin = () => navigate("/otp-verification");
  // Face recognition login disabled
  // const handleFaceLogin = () => setShowFaceLogin(true);
  // const handleFaceLoginSuccess = () => {
  //   setShowFaceLogin(false);
  //   navigate("/", { replace: true });
  // };
  // const handleFaceLoginClose = () => setShowFaceLogin(false);

  return (
    <div className="min-h-[100dvh] w-full relative flex flex-col justify-between overflow-x-hidden font-sans bg-white selection:bg-orange-500 selection:text-white">
      <SecurityHelmet title="Login" />
      {isLoading && <Loader />}

      {/* ── Background: Singaji Campus Building visible across bottom with smooth white top fade ── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Campus Building & Buses Image: positioned on the building facade */}
        <div
          className="absolute inset-x-0 bottom-0 h-[75%] sm:h-[80%] lg:h-[82%] bg-no-repeat bg-cover"
          style={{
            backgroundImage: `url(${singajiBg})`,
            backgroundPosition: "center 38%",
            backgroundSize: "cover",
            opacity: 0.88,
          }}
        />

        {/* Seamless White Fade Overlay: Crisp pure white at header, fading completely to transparent at bottom */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 26%, rgba(255, 255, 255, 0.86) 42%, rgba(255, 255, 255, 0.40) 58%, rgba(255, 255, 255, 0.10) 76%, transparent 100%)",
          }}
        />
      </div>

      {/* ── Top Header ────────────────────────────────────────── */}
      <header className="relative z-10 w-full px-6 sm:px-12 lg:px-16 py-4 sm:py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Sant Singaji Logo" className="h-10 w-10 sm:h-11 sm:w-11 object-contain" />
          <div className="flex flex-col">
            <span className="text-xs sm:text-[13px] font-black text-slate-800 tracking-wider uppercase leading-tight">
              SANT SINGAJI
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 tracking-widest uppercase leading-tight">
              EDUCATIONAL SOCIETY
            </span>
          </div>
        </div>
        {/* Right side intentionally left empty (no Pay Fee button, as requested) */}
      </header>

      {/* ── Main Hero Section ─────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center lg:justify-between px-4 sm:px-8 lg:px-20 py-4 sm:py-6 lg:py-8 gap-8 lg:gap-12 w-full">
        {/* Left Content (Visible on desktop, hidden on mobile) */}
        <div className="hidden lg:flex flex-col max-w-xl text-left">
          <p className="text-[#E67E22] font-bold text-sm sm:text-base tracking-wide uppercase mb-1">
            Empowering Rural Youth
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight drop-shadow-xs">
            SANT SINGAJI EDUCATIONAL SOCIETY
          </h1>

          {/* Context content from previous version */}
          <p className="text-slate-700 text-sm sm:text-base leading-relaxed mt-4 font-semibold max-w-lg">
            A comprehensive digital institutional portal to streamline academic progress, student records,
            curriculum syllabus, and placement analytics for faculty and students.
          </p>

          {/* Key highlights / badges */}
          <div className="flex flex-wrap gap-2.5 mt-6 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/85 backdrop-blur-sm border border-orange-200 text-orange-800 shadow-xs">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
              Academic Portal
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/85 backdrop-blur-sm border border-orange-200 text-orange-800 shadow-xs">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
              Curriculum & Tasks
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/85 backdrop-blur-sm border border-orange-200 text-orange-800 shadow-xs">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
              Placement Cell
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/85 backdrop-blur-sm border border-orange-200 text-orange-800 shadow-xs">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
              Attendance Insights
            </span>
          </div>
        </div>

        {/* Right Side: Floating Clean White Card */}
        <div className="w-full max-w-[360px] sm:max-w-[380px] bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-gray-100 p-5 sm:p-7 md:p-8 my-auto">
          {/* Circular SSISM Logo at top of Card */}
          <div className="flex justify-center mb-3">
            <img src={logo} alt="SSISM Logo" className="h-12 w-12 sm:h-14 sm:w-14 object-contain" />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 text-center mb-4">Login</h2>

          {loginError && (
            <div className="mb-3.5 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-medium text-center">
              {loginError}
            </div>
          )}

          {/* Unified Login Form for All Users */}
          <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
            <div>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="name@ssism.org"
                required
                autoComplete="email"
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
              />
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Password"
                required
                autoComplete="current-password"
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 pr-10 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#E67E22] hover:bg-[#D35400] text-white font-semibold py-2.5 px-4 rounded-lg shadow-sm hover:shadow transition duration-200 text-sm tracking-wide mt-2 disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Links matching reference screenshot */}
          <div className="flex items-center justify-between mt-4 text-xs font-medium">
            <button
              type="button"
              onClick={() =>
                toast.info(
                  "Self registration is managed by the institution. Please contact your administrator or admission office."
                )
              }
              className="text-[#E67E22] hover:text-[#D35400] transition"
            >
              Self Registration
            </button>
            <Link to="/forget-password" className="text-[#E67E22] hover:text-[#D35400] transition">
              Forgot password
            </Link>
          </div>

          {/* Alternative SSO / Authentication Methods */}
          <div className="flex items-center my-4">
            <hr className="flex-grow border-gray-200" />
            <span className="mx-2 text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
              or sign in with
            </span>
            <hr className="flex-grow border-gray-200" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="flex items-center justify-center gap-2 py-2 px-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-xs font-medium text-gray-700 transition shadow-2xs"
              title="Google SSO"
            >
              <img src={googleLogo} alt="Google" className="h-4 w-4" />
              <span className="text-xs">Google</span>
            </button>
            {/* Face ID Authentication (Disabled)
            <button
              type="button"
              onClick={handleFaceLogin}
              className="flex items-center justify-center gap-1.5 py-2 px-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-xs font-medium text-gray-700 transition shadow-2xs"
              title="Face ID Authentication"
            >
              <span className="text-xs">👤</span>
              <span className="text-[11px]">Face ID</span>
            </button>
            */}
            <button
              type="button"
              onClick={handleOtpLogin}
              className="flex items-center justify-center gap-2 py-2 px-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-xs font-medium text-gray-700 transition shadow-2xs"
              title="Email OTP Login"
            >
              <img src={mail} alt="OTP" className="h-4 w-4" />
              <span className="text-xs">OTP</span>
            </button>
          </div>
        </div>
      </main>

      {/* Face Login Modal (Disabled)
      {showFaceLogin && (
        <CompactFaceLogin
          onLoginSuccess={handleFaceLoginSuccess}
          onClose={handleFaceLoginClose}
          onNoFaceRegistered={() => {
            setShowFaceLogin(false);
            toast.error("Face not registered! Please login first with email/password to register your face.");
          }}
        />
      )}
      */}
    </div>
  );
};

export default LoginPage;
