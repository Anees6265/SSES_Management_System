/**
 * Helper to retrieve and cache the client device's real public IP address.
 * Caches in-memory and in sessionStorage to prevent redundant API calls.
 */

let inMemoryIp = "";

export const initClientIp = async () => {
  if (typeof window === "undefined") return "";

  // 1. Check existing cache in sessionStorage
  try {
    const cached = sessionStorage.getItem("sses_client_public_ip");
    if (cached && cached !== "127.0.0.1" && cached !== "::1") {
      inMemoryIp = cached;
      return inMemoryIp;
    }
  } catch (err) {
    // Session storage may be restricted in some browsers/iframes
  }

  // 2. Fetch public IP asynchronously with timeout (non-blocking)
  const fetchWithTimeout = async (url, timeoutMs = 2500) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!response.ok) return null;
      return await response.json();
    } catch {
      clearTimeout(timer);
      return null;
    }
  };

  try {
    // Primary: ipify
    let data = await fetchWithTimeout("https://api.ipify.org?format=json", 2500);
    let detectedIp = data?.ip;

    // Fallback if primary fails
    if (!detectedIp) {
      data = await fetchWithTimeout("https://api64.ipify.org?format=json", 2000);
      detectedIp = data?.ip;
    }

    if (detectedIp && typeof detectedIp === "string") {
      inMemoryIp = detectedIp.trim();
      try {
        sessionStorage.setItem("sses_client_public_ip", inMemoryIp);
      } catch {
        // Ignore storage write error
      }
      return inMemoryIp;
    }
  } catch {
    // Silently continue without error; backend will fallback to socket/proxy IP
  }

  return inMemoryIp;
};

// Immediate background fetch on module load
if (typeof window !== "undefined") {
  initClientIp().catch(() => {});
}

/**
 * Returns current cached client IP synchronously
 */
export const getClientIp = () => {
  if (inMemoryIp) return inMemoryIp;
  if (typeof window !== "undefined") {
    try {
      const cached = sessionStorage.getItem("sses_client_public_ip");
      if (cached) {
        inMemoryIp = cached;
        return cached;
      }
    } catch {
      // Ignore
    }
  }
  return "";
};

