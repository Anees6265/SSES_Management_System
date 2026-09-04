import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSendOtpMutation } from "../../../../redux/api/authApi";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import logoVerify from "../../../../assets/images/otpVerify.png"
import bg from "../../../../assets/images/forgetBg.png"


const OtpVeriFication = () => {
    const [sendOtp, { isLoading }] = useSendOtpMutation();
    const [email, setEmail] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const navigate = useNavigate();

    const handleSendOtp = async (e) => {
        e.preventDefault();
        try {
            const response = await sendOtp({ email }).unwrap();
            console.log("OTP sent successfully:", response);
            toast.success("OTP sent successfully!");
            setTimeout(() => {
                navigate("/otp-enter", { state: { email } });
            }, 1500);
        } catch (err) {
            console.error("Failed to send OTP:", err);
            setErrorMsg("Failed to send OTP. Please try again.");
            toast.error("Failed to send OTP.");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundImage: `url(${bg})`, backgroundPosition: 'center', backgroundSize: 'cover' }}>
            <div className="bg-white p-10 rounded-lg w-full max-w-md border border-200  shadow-lg py-14">
                <form
                    onSubmit={handleSendOtp}
                    className=" flex flex-col items-center justify-center text-center"
                >
                    {/* Email Icon + Envelope Illustration */}
                    <img
                        src={logoVerify}
                        alt="email"
                    />

                    {/* Title */}
                    <h2 className="text-lg font-semibold mb-1 text-gray-800">Verify Your email address</h2>
                    <p className="text-sm text-gray-500 mb-4">Enter Your Email Address</p>

                    {/* Input */}
                    <input
                        type="email"
                        placeholder="email"
                        className="border w-72 px-4 py-3 rounded-xl mb-4 bg-gray-100 focus:outline-none"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-[#FDA92D]  text-white py-3 rounded-full mt-4 hover:bg-[#ED9A21] active:bg-[#B66816] transition relative"
                    >
                        {isLoading ? "Sending OTP..." : "Send OTP"}
                    </button>

                    {errorMsg && <p className="text-red-600 text-sm mt-2">{errorMsg}</p>}
                </form>

                <ToastContainer position="top-center" autoClose={2000} />
            </div>
        </div>
    );
};

export default OtpVeriFication;
