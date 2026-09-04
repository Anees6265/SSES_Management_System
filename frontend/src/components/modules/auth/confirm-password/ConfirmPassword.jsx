// src/components/modules/auth/confirm-password/ConfirmPassword.jsx

import { useParams, useNavigate } from "react-router-dom";
import { useResetPasswordMutation } from "../../../../redux/api/authApi";
import logo from "../../../../assets/images/logo-ssism.png";
import bg from "../../../../assets/images/bgImg.png";
import ReusableForm from "../../../shared/forms/ReusableForm";
import { resetPasswordValidationSchema } from "../../../shared/forms/validationSchema";
import InputField from "../../../shared/form-fields/InputField";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const ConfirmPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [resetPassword, { isLoading }] = useResetPasswordMutation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const initialValues = {
    password: "",
    confirmpassword: "",
  };

  const handleSubmit = async (values) => {
    try {
      const payload = {
        token,
        body: {
          newPassword: values.password,
          confirmPassword: values.confirmpassword,
        },
      };

      const response = await resetPassword(payload).unwrap();

      if (response) {
        // alert("Password reset successful!");
        navigate("/login");
      } else {
        alert("Password reset failed. Please try again.");
      }
    } catch (err) {
      console.error("Reset failed:", err);
      alert(err?.data?.message || "Something went wrong.");
    }
  };



  return (
    <div className="flex justify-center items-center h-screen bg-gray-100" style={{ backgroundImage: `url(${bg})`, backgroundPosition: 'center', backgroundSize: 'cover' }}>
      <div className="bg-white p-10 rounded-2xl shadow-lg w-full max-w-sm">
        <div className="flex flex-col items-center">
          <img src={logo} alt="SSISM Logo" className="h-20 w-30" />
          <h2 className="text-xl font-bold text-gray-800 mt-2">Reset Password</h2>
        </div>

        <ReusableForm
          initialValues={initialValues}
          validationSchema={resetPasswordValidationSchema}
          onSubmit={handleSubmit}
        >
          {({ values, handleChange, errors, touched }) => (
            <>
              <div className="mt-4 relative">
                <InputField
                  name="password"
                  type={showPassword ? "text" : "password"}
                  label="New Password"
                />
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); setShowPassword(!showPassword); }}
                  className="absolute top-[38px] right-3 transform -translate-y-1/2 text-gray-500 cursor-pointer z-10"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <div className="mt-4 relative">
                <InputField
                  name="confirmpassword"
                  type={showConfirmPassword ? "text" : "password"}
                  label="Confirm Password"
                />
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); setShowConfirmPassword(!showConfirmPassword); }}
                  className="absolute top-[38px] right-3 transform -translate-y-1/2 text-gray-500 cursor-pointer z-10"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#FDA92D]  text-white py-3 rounded-full mt-4 hover:bg-orange-600 transition"
              >
                {isLoading ? "Updating..." : "Update"}
              </button>
            </>
          )}
        </ReusableForm>

      </div>
    </div>
  );
};

export default ConfirmPassword;

