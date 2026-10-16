// Centralized API configuration for all environments (Local, Docker, AWS, Vercel)
const rawApiUrl = import.meta.env.VITE_API_URL || "/api";

// Clean base API URL without trailing slash (e.g. "http://localhost:5000/api" or "/api")
export const API_BASE_URL = rawApiUrl.replace(/\/+$/, "");

// Root domain/origin for auth callbacks or face-auth checks
export const getApiRootUrl = () => {
  if (API_BASE_URL.startsWith("http://") || API_BASE_URL.startsWith("https://")) {
    return API_BASE_URL.replace(/\/api$/, "");
  }
  return typeof window !== "undefined" ? window.location.origin : "";
};

export default {
  API_BASE_URL,
  getApiRootUrl,
};
