import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { logout, setCredentials } from '../redux/auth/authSlice';
import CryptoJS from 'crypto-js';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../config/apiConfig';

const secretKey = "ITEG@123";

const decrypt = (text) => {
  if (!text) return null;
  // If plain JWT (not AES encrypted)
  if (typeof text === 'string' && text.split('.').length === 3) {
    return text;
  }
  try {
    const bytes = CryptoJS.AES.decrypt(text, secretKey);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || text;
  } catch {
    return text;
  }
};

const encrypt = (text) => CryptoJS.AES.encrypt(text, secretKey).toString();

export const useSessionTimeout = () => {
  const [showModal, setShowModal] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const dispatch = useDispatch();

  // Track the expiration timestamp for which the warning modal was already dismissed or handled
  const handledExpRef = useRef(null);
  const isExtendingRef = useRef(false);

  const handleLogout = useCallback(() => {
    dispatch(logout());
    localStorage.clear();
    setShowModal(false);
    window.location.href = '/login';
  }, [dispatch]);

  const handleContinue = useCallback(async () => {
    if (isExtendingRef.current) return;
    isExtendingRef.current = true;
    setIsExtending(true);

    try {
      const rawToken = localStorage.getItem('token') || localStorage.getItem('studentToken');
      const rawRefreshToken = localStorage.getItem('refreshToken') || localStorage.getItem('studentRefreshToken');
      const isStudent = Boolean(localStorage.getItem('studentToken'));

      const token = decrypt(rawToken);
      const refreshToken = decrypt(rawRefreshToken);

      if (!token) {
        handleLogout();
        return;
      }

      // Mark the current expiry as handled immediately so modal will not loop
      try {
        const payload = jwtDecode(token);
        if (payload?.exp) handledExpRef.current = payload.exp;
      } catch (_) {}

      // Immediately close modal so user is not blocked
      setShowModal(false);

      let freshToken = null;
      let freshRefreshToken = null;

      try {
        const response = await fetch(`${API_BASE_URL}/user/extend-session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ token, refreshToken })
        });

        if (response.ok) {
          const data = await response.json();
          freshToken = data.token || data.accessToken;
          freshRefreshToken = data.refreshToken;
        }
      } catch (e) {
        console.warn("Primary extend-session failed, trying fallback:", e.message);
      }

      // Fallback to refresh_token if extend-session didn't return a token
      if (!freshToken && refreshToken) {
        try {
          const refreshResp = await fetch(`${API_BASE_URL}/user/refresh_token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken })
          });
          if (refreshResp.ok) {
            const rData = await refreshResp.json();
            freshToken = rData.token || rData.accessToken;
            freshRefreshToken = rData.refreshToken;
          }
        } catch (e) {
          console.warn("Fallback refresh_token failed:", e.message);
        }
      }

      if (freshToken) {
        if (isStudent) {
          localStorage.setItem('studentToken', encrypt(freshToken));
          if (freshRefreshToken) localStorage.setItem('studentRefreshToken', encrypt(freshRefreshToken));
        } else {
          localStorage.setItem('token', encrypt(freshToken));
          if (freshRefreshToken) localStorage.setItem('refreshToken', encrypt(freshRefreshToken));
          try {
            dispatch(setCredentials({ token: freshToken, user: jwtDecode(freshToken) }));
          } catch (_) {}
        }

        try {
          const newPayload = jwtDecode(freshToken);
          handledExpRef.current = newPayload.exp;
        } catch (_) {}

        toast.success("Session successfully extended!");
      } else {
        // Even if network refresh fails, do NOT immediately spam the user with popup
        setShowModal(false);
      }
    } catch (err) {
      console.warn("Session extend error:", err.message);
      setShowModal(false);
    } finally {
      setIsExtending(false);
      isExtendingRef.current = false;
    }
  }, [dispatch, handleLogout]);

  useEffect(() => {
    const checkTokenExpiry = () => {
      // If currently extending or modal is already active, skip
      if (isExtendingRef.current) return;

      // Check both standard user token and student portal token
      const rawToken = localStorage.getItem('token') || localStorage.getItem('studentToken');
      if (!rawToken) return;

      try {
        const decryptedToken = decrypt(rawToken);
        if (!decryptedToken || decryptedToken.split('.').length !== 3) return;

        const payload = JSON.parse(atob(decryptedToken.split('.')[1]));
        if (!payload || !payload.exp) return;

        const currentTime = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = payload.exp - currentTime;

        // When token has expired
        if (timeUntilExpiry <= 0) {
          console.warn('Session expired. Logging out immediately.');
          handleLogout();
          return;
        }

        // Show warning modal 2 minutes before forced logout (if not already handled for this expiry)
        if (timeUntilExpiry <= 120 && timeUntilExpiry > 0) {
          if (handledExpRef.current !== payload.exp) {
            setShowModal(true);
          }
        }
      } catch (error) {
        console.warn('Session check skipped:', error.message);
      }
    };

    // Run check immediately upon mount / page load
    checkTokenExpiry();

    // Check periodically every 15 seconds
    const interval = setInterval(checkTokenExpiry, 15000);

    // Also check immediately when tab becomes visible or receives focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkTokenExpiry();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkTokenExpiry);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkTokenExpiry);
    };
  }, [handleLogout]);

  return {
    showModal,
    isExtending,
    handleContinue,
    handleLogout
  };
};
