import { useEffect } from 'react';
import { toast } from 'react-toastify';

/**
 * Custom hook to handle attendance API errors gracefully
 * @param {Object} error - Error object from RTK Query
 * @param {boolean} isError - Boolean indicating if there's an error
 * @param {string} context - Context where the error occurred (optional)
 */
export const useAttendanceErrorHandler = (error, isError, context = 'Attendance') => {
  useEffect(() => {
    if (isError && error) {
      // Check if it's an attendance-related API error
      const isAttendanceError = 
        error?.data?.message?.toLowerCase().includes('attendance') ||
        error?.originalStatus === 'FETCH_ERROR' ||
        error?.status === 'FETCH_ERROR' ||
        error?.status >= 500;

      if (isAttendanceError) {
        // Show a non-intrusive toast notification
        toast.warn(`${context} APIs are currently unavailable. Please try again later.`, {
          toastId: 'attendance-api-error', // Prevent duplicate toasts
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        

      }
    }
  }, [error, isError, context]);

  return {
    isAttendanceError: isError && error,
    errorMessage: error?.data?.message || 'Service temporarily unavailable'
  };
};

export default useAttendanceErrorHandler;