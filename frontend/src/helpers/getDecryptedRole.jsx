// src/helpers/getDecryptedRole.js
import CryptoJS from "crypto-js";

const secretKey = "ITEG@123"; // AES encryption key

export const getDecryptedRole = () => {
  const encryptedRole = localStorage.getItem("role");
  if (encryptedRole) {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedRole, secretKey);
      const decryptedRole = bytes.toString(CryptoJS.enc.Utf8);
      return decryptedRole;
    } catch (error) {
      console.error("Role decryption failed:", error);
    }
  }
  return null; // If role doesn't exist or decryption fails
};
