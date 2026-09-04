import { useState } from "react";
import { useForgetPasswordMutation } from "../../../../redux/api/authApi";
import logo from "../../../../assets/images/logo-ssism.png";
import bg from "../../../../assets/images/forgetBg.png";

export default function ForgetPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [forgetPassword, { isLoading, isSuccess, isError, error }] = useForgetPasswordMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await forgetPassword({ email }).unwrap();
      setSubmitted(true);
    } catch (err) {
      console.error("Error:", err);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100" style={{ backgroundImage: `url(${bg})`, backgroundPosition: 'center', backgroundSize: 'cover' }}>
      <div className="bg-white p-10 rounded-2xl shadow-lg w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <img src={logo} alt="SSISM Logo" className="h-20 w-auto" />
          <h2 className="text-xl font-bold text-gray-800 mt-2">Forget Password</h2>
        </div>

        {submitted && isSuccess ? (
          <div className="text-green-600 text-center text-sm">
            Password reset link sent to your email.
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
                className="peer h-12 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-[#FDA92D] transition-all duration-200"
                placeholder=" "
              />
              <label className={`absolute left-3 bg-white px-1 transition-all duration-200 pointer-events-none ${email ? 'text-xs -top-2 text-black' : 'text-gray-500 top-3'}`}>
                Email
              </label>
            </div>
            {isError && (
              <div className="text-red-600 text-sm">
                {error?.data?.message || "Failed to send reset email."}
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-[#FDA92D]  text-white py-3 rounded-full mt-2 hover:bg-[#ED9A21] active:bg-[#B66816] transition"
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Get Link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}


// import logo from "../../../../assets/images/logo-ssism.png";
// import ReusableForm from "../../../shared/forms/ReusableForm";
// import EmailField from "../../../shared/form-fields/EmailField";
// import { loginValidationSchema } from "../../../shared/forms/validationSchema";
// import { useNavigate } from "react-router-dom";
// // import {  useForgetPasswordMutation} from "../../../../redux/api/authApi"
// const ForgetPassword = () => {
//   const navigate = useNavigate();
//   const initialValues = {
//     email: "",
//   };

//   return (
//     <div className="flex justify-center items-center h-screen bg-gray-100">
//       <div className="bg-white p-10 rounded-lg w-full max-w-sm">
//         <div className="flex flex-col items-center">
//           <img src={logo} alt="SSISM Logo" className="h-20 w-30" />
//           <h2 className="text-xl font-bold text-gray-800 mt-2">
//             Forget Password
//           </h2>
//         </div>

//         {/* ✅ ReusableForm properly used */}
//         <ReusableForm
//           initialValues={initialValues}
//           validationSchema={loginValidationSchema}
//         >
//           {(values, handleChange) => (
//             <>
//               <div className="mt-4">
//                 <EmailField value={values.email} onChange={handleChange} />
//               </div>

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
