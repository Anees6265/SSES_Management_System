import { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { logout } from '../redux/auth/authSlice';
import CryptoJS from 'crypto-js';

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

export const useSessionTimeout = () => {
  const [showModal, setShowModal] = useState(false);
  const dispatch = useDispatch();

  const handleLogout = useCallback(() => {
    dispatch(logout());
    localStorage.clear();
    setShowModal(false);
    window.location.href = '/login';
  }, [dispatch]);

  const handleContinue = useCallback(() => {
    // Dismiss warning so user can quickly save any unsaved work before auto-logout
    setShowModal(false);
  }, []);

  useEffect(() => {
    const checkTokenExpiry = () => {
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

        // When 1 hour limit has elapsed
        if (timeUntilExpiry <= 0) {
          console.warn('Session expired (1 hour limit reached). Logging out immediately.');
          handleLogout();
        } else if (timeUntilExpiry <= 120) {
          // Show warning modal 2 minutes before forced logout
          setShowModal(true);
        }
      } catch (error) {
        console.warn('Session check skipped:', error.message);
      }
    };

    // Run check immediately upon mount / page load
    checkTokenExpiry();

    // Check periodically every 10 seconds
    const interval = setInterval(checkTokenExpiry, 10000);

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
    handleContinue,
    handleLogout
  };
};