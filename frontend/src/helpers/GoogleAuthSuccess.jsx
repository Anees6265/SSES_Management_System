import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CryptoJS from "crypto-js";

const secretKey = "ITEG@123"; // same key used for AES encryption

const GoogleAuthSuccess = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");
        const refreshToken = params.get("refreshToken");
        const user = params.get("user");

        if (token && refreshToken && user) {
            const encryptedToken = CryptoJS.AES.encrypt(token, secretKey).toString();
            const encryptedRefreshToken = CryptoJS.AES.encrypt(refreshToken, secretKey).toString();

            const parsedUser = JSON.parse(decodeURIComponent(user));

            localStorage.setItem("token", encryptedToken);
            localStorage.setItem("refreshToken", encryptedRefreshToken);
            // localStorage.setItem("user", JSON.stringify(parsedUser));
            localStorage.setItem("role", parsedUser.role);
            localStorage.setItem("positionRole", parsedUser.positionRole);

            navigate("/", { replace: true }); // Go to dashboard/home
        } else {
            console.error("Missing data from Google login callback.");
            navigate("/login"); // fallback
        }
    }, [navigate]);

    return (
        <div className="h-screen flex justify-center items-center">
            <p className="text-lg font-medium">Signing in with Google...</p>
        </div>
    );
};

export default GoogleAuthSuccess;
