import store from "../redux/store";
import { authApi } from "../redux/api/authApi";
import { logout, setCredentials } from "../redux/auth/authSlice";
import CryptoJS from "crypto-js";

const secretKey = "ITEG@123";
// const decrypt = (text) => {
//   CryptoJS.AES.decrypt(text, secretKey).toString(CryptoJS.enc.Utf8);
// };
const encrypt = (text) => CryptoJS.AES.encrypt(text, secretKey).toString();

export const startTokenRefreshTimer = () => {
  const REFRESH_INTERVAL = 60 * 60 * 1000; // 1 hour

  const refresh = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) return;

    try {
      const result = await store
        .dispatch(authApi.endpoints.refreshToken.initiate({ refreshToken }))
        .unwrap();

      if (result?.token) {
        localStorage.setItem("token", encrypt(result.token));
        localStorage.setItem("refreshToken", result.refreshToken);
        localStorage.setItem("role", result.role);

        store.dispatch(
          setCredentials({ token: result.token, role: result.role })
        );
        console.log("✅ Auto-refresh success");
      } else {
        throw new Error("Invalid refresh response");
      }
    } catch (err) {
      console.error("Auto-refresh failed", err);
      store.dispatch(logout());
      localStorage.clear();
      window.location.href = "/login";
    }
  };

  refresh(); // First call immediately
  setInterval(refresh, REFRESH_INTERVAL); // Repeat every hour
};
