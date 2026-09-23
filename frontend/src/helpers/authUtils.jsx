import CryptoJS from "crypto-js";

// Uses environment-configured key or institutional fallback key
const secretKey = import.meta.env.VITE_STORAGE_KEY || "ITEG@123";

/**
 * Encrypt arbitrary string (e.g. token or role) for obscured storage
 */
export const encryptToken = (data) => {
  if (!data) return "";
  try {
    return CryptoJS.AES.encrypt(String(data), secretKey).toString();
  } catch {
    return String(data);
  }
};

/**
 * Decrypt token or string safely
 */
export const decryptToken = (cipherText) => {
  if (!cipherText) return "";
  if (typeof cipherText === "string" && cipherText.split(".").length === 3) {
    return cipherText; // raw standard JWT token
  }
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, secretKey);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || cipherText;
  } catch {
    return cipherText;
  }
};

// Safe role reader from localStorage (supports plain and AES-encrypted roles)
export const getDecryptedRole = () => {
  const storedRole = localStorage.getItem("role");
  if (!storedRole) return null;

  const validPlainRoles = ["superadmin", "admin", "faculty", "hod", "student", "placement_officer"];
  if (validPlainRoles.includes(storedRole.toLowerCase().trim())) {
    return storedRole.toLowerCase().trim();
  }

  try {
    const bytes = CryptoJS.AES.decrypt(storedRole, secretKey);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || storedRole;
  } catch {
    return storedRole;
  }
};

// Safe token reader from localStorage (supports plain and AES-encrypted tokens)
export const getDecryptedToken = () => {
  const token = localStorage.getItem("token") || localStorage.getItem("studentToken");
  if (!token) return null;

  // Standard JWT tokens contain two dots (3 base64 segments)
  if (token.split(".").length === 3) {
    return token;
  }

  try {
    const bytes = CryptoJS.AES.decrypt(token, secretKey);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || token;
  } catch {
    return token;
  }
};

// Clear all auth sessions cleanly
export const clearAllAuthTokens = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("studentToken");
  localStorage.removeItem("studentRefreshToken");
  localStorage.removeItem("user");
  localStorage.removeItem("studentData");
  localStorage.removeItem("role");
  localStorage.removeItem("positionRole");
};


