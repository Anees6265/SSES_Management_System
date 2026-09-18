import CryptoJS from "crypto-js";

const secretKey = "ITEG@123";

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

