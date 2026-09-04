import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CryptoJS from "crypto-js";

const GoogleSuccess = () => {
  const navigate = useNavigate();
  const secretKey = "ITEG@123"; 

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const token = queryParams.get("token");
    // const refreshToken = queryParams.get("refreshToken");
    const userId = queryParams.get("userId");
    const name = queryParams.get("name");
    const role = queryParams.get("role");
    const email = queryParams.get("email");
    const profileImage = queryParams.get("profileImage");

    if (token && userId) {
      // ✅ Encrypt token
      const encryptedToken = CryptoJS.AES.encrypt(token, secretKey).toString();

      // ✅ Save encrypted token
      localStorage.setItem("token", encryptedToken);

      // ✅ Save user as object
      const user = {
        id: userId,
        name,
        email,
        role,
        profileImage: profileImage || "",
      };
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("role", role); // if you still rely on role directly

      // ✅ Redirect to dashboard
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 1000);
    } else {
      navigate("/login");
    }
  }, [navigate]);

  return (
    <div className="text-center p-10">
      <h2 className="text-xl font-bold">Logging you in...</h2>
    </div>
  );
};

export default GoogleSuccess;
