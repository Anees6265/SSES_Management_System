import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useVerifyOtpMutation } from "../../../../redux/api/authApi";
import { toast, ToastContainer } from "react-toastify";
import CryptoJS from "crypto-js";
import "react-toastify/dist/ReactToastify.css";
import bg from "../../../../assets/images/bgImg.png";
import enter from "../../../../assets/images/otpEnter.png";

const OtpEnter = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || "";

  const [otp, setOtp] = useState(Array(6).fill(""));
  const [verifyOtp, { isLoading }] = useVerifyOtpMutation();
  const [status, setStatus] = useState(null);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds

  const secretKey = "ITEG@123"; // Same AES encryption key as LoginPage

  // Timer effect
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleChange = (value, index) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleVerify = async () => {
    const finalOtp = otp.join("");
    if (finalOtp.length < 6) {
      toast.error("Please enter all 6 digits");
      return;
    }

    try {
      const response = await verifyOtp({ email, otp: finalOtp }).unwrap();
      console.log("✅ OTP Response:", response);

      const { token, user } = response;

      if (!token || !user) {
        toast.error("Token or user data missing in response");
        return;
      }

      // ✅ Encrypt token
      const encryptedToken = CryptoJS.AES.encrypt(token, secretKey).toString();

      // ✅ Store everything consistently like login
      localStorage.setItem("token", encryptedToken);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("role", user.role);
      localStorage.setItem("positionRole", user.positionRole);

      toast.success("Login successful!");

      setTimeout(() => {
        navigate("/", { replace: true });
      }, 1000);
    } catch (err) {
      console.error("❌ OTP Verification Error:", err);
      setStatus({ type: "error", message: "❌ OTP is invalid or expired." });
      toast.error("Invalid or expired OTP.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center " style={{ backgroundImage: `url(${bg})`, backgroundPosition: 'center', backgroundSize: 'cover' }}>
      <div className="bg-white p-10 rounded-lg w-full max-w-md border border-200 text-center shadow-lg py-14">
        <img
          src={enter} alt="lock"
          className=" h-20 mx-auto mb-4"
        />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Verify Your Email Address</h2>
        <p className="text-gray-500 text-sm mb-2">
          Please enter the 6-digit OTP sent to your email.
        </p>
        <div className="mb-4">
          <p className="text-gray-500 text-sm font-medium">
            OTP Valid for 5 min
          </p>
          <p className="text-gray-600 text-lg font-bold">
            {formatTime(timeLeft)}
          </p>
        </div>

        <div className="flex justify-center space-x-2 mb-4">
          {otp.map((digit, idx) => (
            <input
              key={idx}
              id={`otp-${idx}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              className="w-12 h-12 text-center border rounded-md shadow-sm text-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={digit}
              onChange={(e) => handleChange(e.target.value, idx)}
            />
          ))}
        </div>

        <p className="text-sm text-gray-700">
          Want to Change Your Email Address?{" "}
          <span
            className="text-blue-800 font-semibold underline cursor-pointer"
            onClick={() => navigate("/otp-verification")}
          >
            Change Here
          </span>
        </p>

        <button
          onClick={handleVerify}
          disabled={isLoading}
          className="mt-6 w-full bg-orange-400 hover:bg-[#FDA92D]  text-white py-2 rounded-full font-semibold text-lg"
        >
          {isLoading ? "Verifying..." : "Verify Email"}
        </button>

        <p className="mt-4 text-sm">
          <span className="text-blue-800 font-medium underline cursor-pointer">
            Resend Code
          </span>
        </p>

        {status && (
          <p
            className={`mt-3 text-sm ${status.type === "error" ? "text-red-600" : "text-green-600"
              }`}
          >
            {status.message}
          </p>
        )}
      </div>
      <ToastContainer position="top-center" autoClose={2000} />
    </div>
  );
};

export default OtpEnter;

