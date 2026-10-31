import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useResetPasswordMutation } from "../../../../redux/api/authApi";
import logo from "../../../../assets/images/logo-ssism.png";
import bg from "../../../../assets/images/bgImg.png";
import { FiLock, FiEye, FiEyeOff, FiCheckCircle, FiAlertTriangle, FiArrowLeft, FiCheck } from "react-icons/fi";
import { toast } from "react-toastify";

const ConfirmPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const hasMinLength = password.length >= 6;
  const isMatching = password && confirmPassword && password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!password) {
      toast.error("Please enter a new password");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      const payload = {
        token,
        body: {
          newPassword: password,
          confirmPassword: confirmPassword,
        },
      };

      const response = await resetPassword(payload).unwrap();

      if (response?.success || response?.message) {
        toast.success(response?.message || "Password reset successful!");
        setIsSuccess(true);
        setTimeout(() => {
          navigate("/login");
        }, 2500);
      }
    } catch (err) {
      console.error("Reset password failed:", err);
      const msg = err?.data?.message || err?.message || "Password reset failed. Token may be expired.";
      setErrorMessage(msg);
      toast.error(msg);
    }
  };

  return (
    <div
      className="flex justify-center items-center min-h-screen bg-gray-100 p-4"
      style={{ backgroundImage: `url(${bg})`, backgroundPosition: "center", backgroundSize: "cover" }}
    >
      <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-2xl w-full max-w-sm sm:max-w-md border border-gray-100">
        
        {/* Header Branding */}
        <div className="flex flex-col items-center mb-6 text-center">
          <img src={logo} alt="SSISM Logo" className="h-16 sm:h-20 w-auto mb-2.5 object-contain" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
            {isSuccess ? "Password Updated" : "Reset Password"}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {isSuccess ? "Your password has been changed successfully" : "Enter and confirm your new password below"}
          </p>
        </div>

        {isSuccess ? (
          /* Success Screen */
          <div className="space-y-5 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-200 shadow-xs">
              <FiCheckCircle size={32} />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-gray-800">Password Reset Successful!</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Your account password has been updated securely. You can now log in using your new credentials.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white py-3 rounded-full text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                Go to Login <FiArrowLeft className="rotate-180" size={15} />
              </button>
              <p className="text-[11px] text-gray-400 mt-2">Redirecting automatically to login page in a moment...</p>
            </div>
          </div>
        ) : (
          /* Reset Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* New Password Field */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
                className="peer h-12 w-full border border-gray-300 rounded-xl px-3.5 pr-11 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:border-orange-500 transition-all duration-200"
              />
              <label
                className={`absolute left-3.5 bg-white px-1 transition-all duration-200 pointer-events-none ${
                  password ? "text-xs -top-2 text-orange-600 font-semibold" : "text-sm text-gray-400 top-3"
                }`}
              >
                New Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600 transition cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>

            {/* Confirm Password Field */}
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder=" "
                className="peer h-12 w-full border border-gray-300 rounded-xl px-3.5 pr-11 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:border-orange-500 transition-all duration-200"
              />
              <label
                className={`absolute left-3.5 bg-white px-1 transition-all duration-200 pointer-events-none ${
                  confirmPassword ? "text-xs -top-2 text-orange-600 font-semibold" : "text-sm text-gray-400 top-3"
                }`}
              >
                Confirm New Password
              </label>
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600 transition cursor-pointer"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>

            {/* Live Password Rules / Hints */}
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5 text-[11px]">
              <div className="flex items-center gap-2">
                <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                  hasMinLength ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
                }`}>
                  {hasMinLength ? <FiCheck size={10} /> : "•"}
                </span>
                <span className={hasMinLength ? "text-emerald-700 font-medium" : "text-slate-500"}>
                  Minimum 6 characters
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                  isMatching ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
                }`}>
                  {isMatching ? <FiCheck size={10} /> : "•"}
                </span>
                <span className={isMatching ? "text-emerald-700 font-medium" : "text-slate-500"}>
                  Passwords match
                </span>
              </div>
            </div>

            {/* Error Card */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-start gap-2">
                <FiAlertTriangle className="shrink-0 mt-0.5" size={15} />
                <div className="space-y-1">
                  <p className="font-semibold">{errorMessage}</p>
                  {(errorMessage.toLowerCase().includes("expired") || errorMessage.toLowerCase().includes("invalid")) && (
                    <Link to="/forget-password" className="text-orange-600 font-bold hover:underline block pt-0.5">
                      Click here to request a new reset link →
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !hasMinLength || !isMatching}
              className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white py-3 rounded-full font-bold text-sm transition shadow-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <FiLock size={16} />
                  <span>Update Password</span>
                </>
              )}
            </button>

            {/* Back to Login link */}
            <div className="text-center pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-orange-600 transition"
              >
                <FiArrowLeft size={14} /> Back to Login
              </Link>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};

export default ConfirmPassword;

