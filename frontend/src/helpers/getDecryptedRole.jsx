// src/helpers/getDecryptedRole.js
import CryptoJS from "crypto-js";

const secretKey = "ITEG@123"; // AES encryption key

export const getDecryptedRole = () => {
  const role = localStorage.getItem("role");
  if (!role) return null;

  const validPlainRoles = ["superadmin", "admin", "faculty", "hod", "student", "placement_officer"];
  if (validPlainRoles.includes(role.toLowerCase().trim())) {
    return role.toLowerCase().trim();
  }

  try {
    const bytes = CryptoJS.AES.decrypt(role, secretKey);
    const decryptedRole = bytes.toString(CryptoJS.enc.Utf8);
    return decryptedRole || role;
  } catch (error) {
    console.error("Role decryption fallback to raw:", error);
    return role;
  }
};

