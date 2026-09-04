import axios from "axios";
import CryptoJS from "crypto-js";

const SECRET_KEY = "ITEG@123";

const decrypt = (encrypted) => {
  try {
    if (!encrypted) return null;
    const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8) || null;
  } catch {
    return null;
  }
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

api.interceptors.request.use((config) => {
  const encryptedToken = localStorage.getItem("token");
  const token = decrypt(encryptedToken);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
