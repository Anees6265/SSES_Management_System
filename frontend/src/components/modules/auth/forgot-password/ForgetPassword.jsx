import { useState } from "react";
import { Link } from "react-router-dom";
import { useForgetPasswordMutation } from "../../../../redux/api/authApi";
import logo from "../../../../assets/images/logo-ssism.png";
import bg from "../../../../assets/images/forgetBg.png";
import { FiMail, FiArrowLeft, FiCheckCircle } from "react-icons/fi";
import { toast } from "react-toastify";

export default function ForgetPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [forgetPassword, { isLoading, isSuccess, isError, error }] = useForgetPasswordMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      toast.error("Please enter your registered email address.");
      return;
    }

    try {
      const res = await forgetPassword({ email: cleanEmail }).unwrap();
      toast.success(res?.message || "Password reset link sent to your email!");
      setSubmitted(true);
    } catch (err) {
      console.error("Forgot password error:", err);
      toast.error(err?.data?.message || err?.message || "Failed to send reset link.");
    }
  };

  return (
    <div
      className="flex justify-center items-center min-h-screen bg-gray-100 p-4"
      style={{ backgroundImage: `url(${bg})`, backgroundPosition: "center", backgroundSize: "cover" }}
    >
      <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-xl w-full max-w-sm border border-gray-100">
        <div className="flex flex-col items-center mb-6">
          <img src={logo} alt="SSISM Logo" className="h-16 sm:h-20 w-auto mb-2" />
          <h2 className="text-xl font-bold text-gray-800">Forgot Password</h2>
          <p className="text-xs text-gray-500 text-center mt-1">
            Enter your registered institutional email to receive a password reset link
          </p>
        </div>

        {submitted && isSuccess ? (
          <div className="space-y-4 text-center">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
              <FiCheckCircle size={28} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Check Your Inbox</p>
              <p className="text-xs text-gray-500 mt-1">
                We sent a password reset link to <span className="font-semibold text-gray-700">{email}</span>. The link is valid for 15 minutes.
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2">
              <Link
                to="/login"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-full text-sm font-bold transition shadow-xs flex items-center justify-center gap-2"
              >
                <FiArrowLeft size={16} /> Back to Login
              </Link>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="text-xs text-orange-600 hover:underline pt-1"
              >
                Send link again with another email
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type="email"
                id="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="peer h-12 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-500 transition-all duration-200"
                placeholder=" "
              />
              <label
                className={`absolute left-3 bg-white px-1 transition-all duration-200 pointer-events-none ${
                  email ? "text-xs -top-2 text-orange-600 font-semibold" : "text-sm text-gray-400 top-3"
                }`}
              >
                Email Address
              </label>
            </div>

            {isError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs">
                {error?.data?.message || error?.message || "Failed to send reset email. Please try again."}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white py-3 rounded-full font-bold text-sm transition shadow-xs cursor-pointer flex items-center justify-center gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sending Link...</span>
                </>
              ) : (
                <>
                  <FiMail size={16} />
                  <span>Get Reset Link</span>
                </>
              )}
            </button>

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
}

//               <button
//                 onClick={navigate("/confirm-password")}
//                 type="submit"
//                 className="w-full bg-[#FDA92D]  text-white py-3 rounded-full mt-4 hover:bg-orange-600 transition"
//               >
//                 Get Link
//               </button>
//             </>
//           )}
//         </ReusableForm>
//       </div>
//     </div>
//   );
// };

// export default ForgetPassword;
