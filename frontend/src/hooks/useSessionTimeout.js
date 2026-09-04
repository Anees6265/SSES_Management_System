import { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { logout } from '../redux/auth/authSlice';
import { authApi } from '../redux/api/authApi';
import CryptoJS from 'crypto-js';

const secretKey = "ITEG@123";
const encrypt = (text) => CryptoJS.AES.encrypt(text, secretKey).toString();
const decrypt = (text) => {
  try {
    return CryptoJS.AES.decrypt(text, secretKey).toString(CryptoJS.enc.Utf8);
  } catch {
    return null;
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

  const handleContinue = useCallback(async () => {
    const encryptedRefreshToken = localStorage.getItem('refreshToken');
    
    if (!encryptedRefreshToken) {
      handleLogout();
      return;
    }

    try {
      const refreshToken = decrypt(encryptedRefreshToken);
      
      if (!refreshToken) {
        handleLogout();
        return;
      }

      const result = await dispatch(
        authApi.endpoints.refreshToken.initiate({ refreshToken })
      ).unwrap();

      if (result?.accessToken) {
        localStorage.setItem('token', encrypt(result.accessToken));
        setShowModal(false);
        console.log('✅ Token refreshed successfully');
      } else {
        throw new Error('Invalid refresh response');
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      handleLogout();
    }
  }, [dispatch, handleLogout]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const checkTokenExpiry = () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const decryptedToken = decrypt(token);
        if (!decryptedToken || !decryptedToken.includes('.')) return;
        
        const payload = JSON.parse(atob(decryptedToken.split('.')[1]));
        const currentTime = Date.now() / 1000;
        const timeUntilExpiry = payload.exp - currentTime;

        if (timeUntilExpiry > 0 && timeUntilExpiry <= 300) {
          setShowModal(true);
        } else if (timeUntilExpiry <= 0) {
          handleLogout();
        }
      } catch (error) {
        console.warn('Token parsing skipped:', error.message);
      }
    };

    const initialDelay = setTimeout(() => {
      checkTokenExpiry();
      const interval = setInterval(checkTokenExpiry, 60000);
      window.sessionTimeoutInterval = interval;
    }, 3000000);

    return () => {
      clearTimeout(initialDelay);
      if (window.sessionTimeoutInterval) {
        clearInterval(window.sessionTimeoutInterval);
      }
    };
  }, [handleLogout]);

  return {
    showModal,
    handleContinue,
    handleLogout
  };
};