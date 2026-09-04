import { createSlice } from "@reduxjs/toolkit";
import CryptoJS from "crypto-js";

const secretKey = "ITEG@123";

// Decrypt function for local storage
const decrypt = (encrypted) => {
  try {
    if (!encrypted || typeof encrypted !== "string") return null;
    const bytes = CryptoJS.AES.decrypt(encrypted, secretKey);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || null;
  } catch (err) {
    console.error("Decryption failed:", err);
    return null;
  }
};

// Function to decode JWT payload
const jwtDecode = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Invalid token:", e);
    return null;
  }
};

const initialToken = decrypt(localStorage.getItem("token"));
const initialUser = initialToken ? jwtDecode(initialToken) : null;

const initialState = {
  token: initialToken || null,
  user: initialUser,
  permissions: initialUser?.permissions || [],
  role: initialUser?.role || null,
  isAuthenticated: !!initialUser,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { token, user } = action.payload;
      state.token = token;
      state.user = user;
      state.permissions = user?.permissions || [];
      state.role = user?.role || null;
      state.isAuthenticated = true;
    },
    setRole: (state, action) => {
      state.role = action.payload;
    },
    logout: (state) => {
      state.token = null;
      state.user = null;
      state.permissions = [];
      state.role = null;
      state.isAuthenticated = false;
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("role");
      localStorage.clear();
    },
  },
});

export const { setCredentials, setRole, logout } = authSlice.actions;

export default authSlice.reducer;

export const selectCurrentUser = (state) => state.auth.user;
export const selectUserPermissions = (state) => state.auth.permissions;
