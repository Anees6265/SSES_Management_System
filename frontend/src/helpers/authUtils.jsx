import CryptoJS from "crypto-js";

const secretKey = "ITEG@123";

// Decrypt Role from localStorage
export const getDecryptedRole = () => {
  try {
    const encrypted = localStorage.getItem("role");
    const bytes = CryptoJS.AES.decrypt(encrypted, secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return null;
  }
};

// Decrypt Token from localStorage
export const getDecryptedToken = () => {
  try {
    const encrypted = localStorage.getItem("token");
    const bytes = CryptoJS.AES.decrypt(encrypted, secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return null;
  }
};
