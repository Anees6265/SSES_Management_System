import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import CryptoJS from "crypto-js";
import { useLoginMutation, useStudentLoginMutation } from "../../../../redux/api/authApi";
import Loader from "../../../shared/loader/Loader";
import CompactFaceLogin from "../../face-auth/CompactFaceLogin";
import { toast } from "react-toastify";
import { Eye, EyeOff } from "lucide-react";

import logo from "../../../../assets/images/logo-ssism.png";
import googleLogo from "../../../../assets/icons/google-icon.png";
import mail from "../../../../assets/icons/gmail-icon.png";
import singajiBg from "../../../../assets/images/singaji_building.jpg";

const secretKey = "ITEG@123";
const encrypt = (data) => CryptoJS.AES.encrypt(data, secretKey).toString();

const LoginPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("admin"); // "admin" | "student"

  // Admin form state
  const [adminForm, setAdminForm] = useState({ email: "", password: "" });
  // Student form state
  const [studentForm, setStudentForm] = useState({ prkey: "", password: "" });

  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [showFaceLogin, setShowFaceLogin] = useState(false);

  const [login, { isLoading: isAdminLoading }] = useLoginMutation();
  const [studentLogin, { isLoading: isStudentLoading }] = useStudentLoginMutation();

  const isLoading = isAdminLoading || isStudentLoading;

  // Handle Admin / Faculty Login
  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setLoginError("");

    if (!adminForm.email.trim() || !adminForm.password.trim()) {
      setLoginError("Email and password are required.");
      return;
    }

    try {
      const response = await login(adminForm).unwrap();
      localStorage.setItem("token", encrypt(response.token));
      localStorage.setItem("user", JSON.stringify(response.user));
      localStorage.setItem("role", response.user.role);
      localStorage.setItem("positionRole", response.user.positionRole || "admin");
      toast.success("Login successful!");
      navigate("/", { replace: true });
    } catch (error) {
      setLoginError(error?.data?.message || "Invalid email or password.");
    }
  };

  // Handle Student Login
  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setLoginError("");

    if (!studentForm.prkey.trim() || !studentForm.password.trim()) {
      setLoginError("PR Key and Password are required.");
      return;
    }

    try {
      const res = await studentLogin(studentForm).unwrap();
      localStorage.setItem("studentToken", encrypt(res.token));
      localStorage.setItem("studentRefreshToken", encrypt(res.refreshToken));
      localStorage.setItem("studentData", JSON.stringify(res.student));
      localStorage.setItem("role", "student");
      toast.success(`Welcome, ${res.student.firstName || "Student"}!`);
      navigate("/student-portal/dashboard", { replace: true });
    } catch (err) {
      setLoginError(err?.data?.message || "Student login failed.");
    }
  };

  const handleGoogleLogin = () => {
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    const googleEndpoint = import.meta.env.VITE_LOGIN_WITH_GOOGLE || "/user/google";
    window.location.href = `${apiBase}${googleEndpoint}`;
  };

  const handleOtpLogin = () => navigate("/otp-verification");
  const handleFaceLogin = () => setShowFaceLogin(true);
  const handleFaceLoginSuccess = () => {
    setShowFaceLogin(false);
    navigate("/", { replace: true });
  };
  const handleFaceLoginClose = () => setShowFaceLogin(false);

  return (
    <div className="min-h-screen w-full relative flex flex-col justify-between overflow-x-hidden font-sans bg-white selection:bg-orange-500 selection:text-white">
      {isLoading && <Loader />}

      {/* College Building Background Image (positioned at bottom with realistic soft fade to white at top) */}
      <div
        className="absolute inset-0 z-0 pointer-events-none bg-bottom bg-no-repeat bg-cover opacity-85"
        style={{
          backgroundImage: `url(${singajiBg})`,
          backgroundPosition: "bottom center",
          backgroundSize: "cover",
        }}
      />
      {/* Soft gradient overlay to achieve the clean, bright white upper section matching the reference design */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 30%, rgba(255, 255, 255, 0.88) 60%, rgba(255, 255, 255, 0.25) 100%)",
        }}
      />

      {/* ── Top Header ────────────────────────────────────────── */}
      <header className="relative z-10 w-full px-6 sm:px-12 lg:px-16 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Sant Singaji Logo" className="h-10 w-10 object-contain" />
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-extrabold text-slate-800 tracking-wider uppercase leading-tight">
              SANT SINGAJI
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 tracking-widest uppercase leading-tight">
              EDUCATIONAL SOCIETY
            </span>
          </div>
        </div>
      </header>

      {/* ── Main Hero Section ─────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-between px-6 sm:px-12 lg:px-20 py-4 lg:py-8 gap-8 lg:gap-12">
        {/* Left Content */}
        <div className="flex flex-col max-w-xl text-left">
          <p className="text-[#E67E22] font-bold text-sm sm:text-base tracking-wide uppercase mb-1">
            Empowering Rural Youth
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-800 tracking-tight leading-tight">
            SANT SINGAJI EDUCATIONAL SOCIETY
          </h1>

          {/* Context content from previous version */}
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed mt-4 font-medium max-w-lg">
            A comprehensive digital institutional portal to streamline academic progress, student records,
            curriculum syllabus, and placement analytics for faculty and students.
          </p>

          {/* Key highlights / badges */}
          <div className="flex flex-wrap gap-2.5 mt-6 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/85 backdrop-blur-sm border border-orange-200 text-orange-800 shadow-xs">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
              Student Portals
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
        <div className="w-full max-w-[360px] sm:max-w-[380px] bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-gray-100 p-7 sm:p-8">
          {/* Circular SSISM Logo at top of Card */}
          <div className="flex justify-center mb-3">
            <img src={logo} alt="SSISM Logo" className="h-14 w-14 object-contain" />
          </div>

          <h2 className="text-2xl font-bold text-slate-800 text-center mb-4">Login</h2>

          {/* Tab Switcher (Admin / Faculty vs Student) */}
          <div className="flex bg-slate-100 p-1 rounded-xl mb-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setActiveTab("admin");
                setLoginError("");
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                activeTab === "admin"
                  ? "bg-white text-orange-600 shadow-xs font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Admin / Faculty
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("student");
                setLoginError("");
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                activeTab === "student"
                  ? "bg-white text-orange-600 shadow-xs font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Student Portal
            </button>
          </div>

          {loginError && (
            <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-medium text-center">
              {loginError}
            </div>
          )}

          {/* Form */}
          {activeTab === "admin" ? (
            <form onSubmit={handleAdminSubmit} className="space-y-3 text-left">
              <div>
                <input
                  type="email"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="Email"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                />
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={adminForm.password}
                  onChange={(e) => setAdminForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Password"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 pr-10 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#E67E22] hover:bg-[#D35400] text-white font-semibold py-2.5 px-4 rounded-lg shadow-sm hover:shadow transition duration-200 text-sm tracking-wide mt-2"
              >
                {isAdminLoading ? "Submitting..." : "Submit"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleStudentSubmit} className="space-y-3 text-left">
              <div>
                <input
                  type="text"
                  value={studentForm.prkey}
                  onChange={(e) => setStudentForm((prev) => ({ ...prev, prkey: e.target.value }))}
                  placeholder="PR Key or Email"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                />
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={studentForm.password}
                  onChange={(e) => setStudentForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Password"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 pr-10 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#E67E22] hover:bg-[#D35400] text-white font-semibold py-2.5 px-4 rounded-lg shadow-sm hover:shadow transition duration-200 text-sm tracking-wide mt-2"
              >
                {isStudentLoading ? "Submitting..." : "Submit"}
              </button>
            </form>
          )}

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

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="flex items-center justify-center gap-1.5 py-2 px-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-xs font-medium text-gray-700 transition shadow-2xs"
              title="Google SSO"
            >
              <img src={googleLogo} alt="Google" className="h-4 w-4" />
              <span className="text-[11px]">Google</span>
            </button>
            <button
              type="button"
              onClick={handleFaceLogin}
              className="flex items-center justify-center gap-1.5 py-2 px-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-xs font-medium text-gray-700 transition shadow-2xs"
              title="Face ID Authentication"
            >
              <span className="text-xs">👤</span>
              <span className="text-[11px]">Face ID</span>
            </button>
            <button
              type="button"
              onClick={handleOtpLogin}
              className="flex items-center justify-center gap-1.5 py-2 px-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-xs font-medium text-gray-700 transition shadow-2xs"
              title="Email OTP Login"
            >
              <img src={mail} alt="OTP" className="h-4 w-4" />
              <span className="text-[11px]">OTP</span>
            </button>
          </div>
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="relative z-10 w-full px-6 py-3 text-center text-slate-500 text-xs font-medium bg-white/40 backdrop-blur-xs">
        © {new Date().getFullYear()} Sant Singaji Educational Society. All rights reserved.
      </footer>

      {/* Face Login Modal */}
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
    </div>
  );
};

export default LoginPage;
