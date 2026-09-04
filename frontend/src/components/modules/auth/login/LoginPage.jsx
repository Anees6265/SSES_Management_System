import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import CryptoJS from "crypto-js";
import { useLoginMutation, useStudentLoginMutation } from "../../../../redux/api/authApi";
import Loader from "../../../shared/loader/Loader";
import CompactFaceLogin from "../../face-auth/CompactFaceLogin";
import { toast } from 'react-toastify';

import ReusableForm from "../../../shared/forms/ReusableForm";
import { loginValidationSchema } from "../../../shared/forms/validationSchema";
import InputField from "../../../shared/form-fields/InputField";
import { buttonStyles } from "../../../../styles/buttonStyles";
import { Eye, EyeOff } from "lucide-react";

import logo from "../../../../assets/images/logo-ssism.png";
import googleLogo from "../../../../assets/icons/google-icon.png";
import mail from "../../../../assets/icons/gmail-icon.png";

import singajiBg from "../../../../assets/images/singaji_building.jpg";

const secretKey = "ITEG@123";
const encrypt = (data) => CryptoJS.AES.encrypt(data, secretKey).toString();

// ── Student Login Form ────────────────────────────────────────────────────────
const StudentLoginForm = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ prkey: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [studentLogin, { isLoading }] = useStudentLoginMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.prkey.trim() || !form.password.trim()) {
      toast.error("PR Key and Password are required");
      return;
    }
    try {
      const res = await studentLogin(form).unwrap();
      console.log("Student login response:", res);
      localStorage.setItem("studentToken", encrypt(res.token));
      localStorage.setItem("studentRefreshToken", encrypt(res.refreshToken));
      localStorage.setItem("studentData", JSON.stringify(res.student));
      localStorage.setItem("role", "student");
      console.log("localStorage set, navigating to /student-portal/dashboard");
      toast.success(`Welcome, ${res.student.firstName}!`);
      navigate("/student-portal/dashboard");
    } catch (err) {
      console.error("Student login error:", err);
      toast.error(err?.data?.message || "Login failed");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-left">
      <div>
        <label className="block text-sm font-semibold text-slate-100 mb-1">PR Key or Email</label>
        <input
          type="text"
          value={form.prkey}
          onChange={e => setForm(p => ({ ...p, prkey: e.target.value }))}
          placeholder="Enter PR Key or Email"
          className="w-full border border-white/20 bg-gray-50 text-slate-800 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:border-orange-500 shadow-sm transition"
        />
      </div>
      <div className="relative">
        <label className="block text-sm font-semibold text-slate-100 mb-1">Password</label>
        <input
          type={showPass ? "text" : "password"}
          value={form.password}
          onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
          placeholder="Enter your password"
          className="w-full border border-white/20 bg-gray-50 text-slate-800 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:border-orange-500 pr-10 shadow-sm transition"
        />
        <button type="button" onClick={() => setShowPass(p => !p)}
          className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-650">
          {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      <button type="submit" disabled={isLoading}
        className={`w-full py-3.5 rounded-xl font-bold mt-6 shadow-md hover:shadow-lg transition ${buttonStyles.primary}`}>
        {isLoading ? "Signing in..." : "Sign In as Student"}
      </button>
      <p className="text-center text-xs text-slate-350 mt-3 font-semibold">
        Contact admin if you don't have a password set.
      </p>
    </form>
  );
};

// ── Main Login Page ───────────────────────────────────────────────────────────
const LoginPage = () => {
  const navigate = useNavigate();
  const [loginError, setLoginError] = useState("");
  const [login, { isLoading }] = useLoginMutation();
  const [showFaceLogin, setShowFaceLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("admin"); // "admin" | "student"

  const initialValues = { email: "", password: "" };

  const handleLoginSubmit = async (values) => {
    try {
      const response = await login(values).unwrap();
      localStorage.setItem("token", encrypt(response.token));
      localStorage.setItem("user", JSON.stringify(response.user));
      localStorage.setItem("role", response.user.role);
      localStorage.setItem("positionRole", response.user.positionRole);
      navigate("/", { replace: true });
    } catch (error) {
      setLoginError(error?.data?.message || "Invalid email or password.");
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_LOGIN_WITH_GOOGLE}`;
  };

  const handleOtpLogin = () => navigate("/otp-verification");
  const handleFaceLogin = () => setShowFaceLogin(true);
  const handleFaceLoginSuccess = () => { setShowFaceLogin(false); navigate("/", { replace: true }); };
  const handleFaceLoginClose = () => setShowFaceLogin(false);

  return (
    <div 
      className="flex h-screen w-screen overflow-hidden relative bg-cover bg-center font-sans items-center justify-center lg:justify-between px-6 lg:px-24"
      style={{ backgroundImage: `url(${singajiBg})` }}
    >
      {/* Full screen dark overlay & blur */}
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px] z-0" />
      {isLoading && <Loader />}

      {/* Left side: Hero Banner */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between h-full py-16 relative z-10 text-white">
        {/* Top Header - Logo and Brand Name */}
        <div className="flex items-center gap-3">
          <div className="bg-white/95 p-2.5 rounded-2xl shadow-md">
            <img src={logo} alt="SSES Logo" className="h-10" />
          </div>
          <div>
            <h1 className="text-white font-black text-xl tracking-wider uppercase">SSES</h1>
            <p className="text-orange-400 text-xs font-bold tracking-widest">Management System</p>
          </div>
        </div>

        {/* Middle Content - Glassmorphism Card */}
        <div className="max-w-lg bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-2xl shadow-2xl text-white my-auto">
          <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-4 inline-block">
            SANT SINGAJI EDUCATIONAL SOCIETY
          </span>
          <h2 className="text-4xl font-black mb-4 leading-tight">
            Empowering Education through Smart Digital Workflows
          </h2>
          <p className="text-slate-200 text-sm leading-relaxed mb-6 font-semibold">
            A comprehensive institutional dashboard designed to streamline academic tracking, student records, placement records, and attendance insights for administrators, faculty, and students.
          </p>
          
          {/* Feature Highlights */}
          <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              Student Portals & Progress
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              Curriculum & Sublevels
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              Real-time Attendance
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              Placement Funnel & Analytics
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-slate-300 text-xs font-medium">
          © {new Date().getFullYear()} Sant Singaji Educational Society. All rights reserved.
        </div>
      </div>

      {/* Right side: Transparent Login Panel */}
      <div className="w-full max-w-md bg-slate-950/70 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl z-10 text-white relative">
        {/* Logo & Title for Mobile View */}
        <div className="flex flex-col items-center mb-6 lg:hidden">
          <img src={logo} alt="SSES Logo" className="h-14" />
          <h2 className="text-lg font-black mt-2 text-white text-center">Sant Singaji Educational Society</h2>
          <p className="text-orange-450 text-[10px] font-bold tracking-widest mt-0.5">SSES MANAGEMENT SYSTEM</p>
        </div>

        <div className="mb-6 text-center lg:text-left">
          <h3 className="text-2xl font-black text-white">Sign In</h3>
          <p className="text-slate-300 text-xs mt-1 font-semibold">Welcome back! Access your account details below.</p>
        </div>

        {/* Tab Toggle */}
        <div className="flex gap-1 bg-white/5 p-1.5 rounded-xl mb-4 border border-white/10">
          <button
            onClick={() => setActiveTab("admin")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
              activeTab === "admin" 
                ? "bg-orange-500 text-white shadow-md" 
                : "text-slate-300 hover:text-white"
            }`}
          >
            Admin / Faculty
          </button>
          <button
            onClick={() => setActiveTab("student")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
              activeTab === "student" 
                ? "bg-orange-500 text-white shadow-md" 
                : "text-slate-300 hover:text-white"
            }`}
          >
            Student Portal
          </button>
        </div>

        {/* Student Tab */}
        {activeTab === "student" && <StudentLoginForm />}

        {/* Admin Tab */}
        {activeTab === "admin" && (
          <ReusableForm
            initialValues={initialValues}
            onSubmit={handleLoginSubmit}
            validationSchema={loginValidationSchema}
            className="w-full"
          >
            {() => (
              <>
                <div className="mt-2 space-y-4 text-left">
                  <div className="login-field-wrapper">
                    <InputField name="email" type="email" label="Email Address" placeholder="Enter email" />
                  </div>
                  <div className="relative login-field-wrapper">
                    <InputField
                      name="password"
                      type={showPassword ? "text" : "password"}
                      label="Password"
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-[38px] bottom-0 flex items-center text-slate-400 hover:text-slate-200"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {loginError && <p className="text-red-400 text-xs font-bold mt-1">{loginError}</p>}

                  <div className="text-right">
                    <Link to="/forget-password" className="text-xs font-bold text-slate-300 hover:text-orange-400 hover:underline transition">
                      Forgot Password?
                    </Link>
                  </div>
                </div>

                <button type="submit" className={`w-full py-3.5 rounded-xl font-bold mt-6 shadow-md hover:shadow-lg transition ${buttonStyles.primary}`} disabled={isLoading}>
                  {isLoading ? "Logging in..." : "Sign in"}
                </button>

                <div className="flex items-center my-5">
                  <hr className="flex-grow border-white/10" />
                  <span className="mx-3 text-slate-400 text-[10px] font-bold uppercase tracking-wider">or login with</span>
                  <hr className="flex-grow border-white/10" />
                </div>

                <div className="flex flex-col space-y-2.5">
                  <button type="button" onClick={handleFaceLogin}
                    className="flex w-full justify-center items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 shadow-sm rounded-xl py-3 hover:shadow transition duration-200">
                    <span className="text-base">👤</span>
                    <span className="text-xs font-bold text-white">Face ID Lock</span>
                  </button>
                  
                  <div className="grid grid-cols-2 gap-2.5">
                    <button type="button" onClick={handleOtpLogin}
                      className="flex justify-center items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 shadow-sm rounded-xl py-3 hover:shadow transition duration-200">
                      <img className="h-4" src={mail} alt="OTP Login" />
                      <span className="text-xs font-bold text-white">Email OTP</span>
                    </button>
                    <button type="button" onClick={handleGoogleLogin}
                      className="flex justify-center items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 shadow-sm rounded-xl py-3 hover:shadow transition duration-200">
                      <img className="h-4" src={googleLogo} alt="Google" />
                      <span className="text-xs font-bold text-white">Google SSO</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </ReusableForm>
        )}
      </div>

      {showFaceLogin && (
        <CompactFaceLogin
          onLoginSuccess={handleFaceLoginSuccess}
          onClose={handleFaceLoginClose}
          onNoFaceRegistered={() => {
            setShowFaceLogin(false);
            toast.error('Face not registered! Please login first with email/password to register your face.');
          }}
        />
      )}
    </div>
  );
};

export default LoginPage;
