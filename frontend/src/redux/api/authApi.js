/* eslint-disable no-unused-vars */
// src/features/api/authApi.js
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import CryptoJS from "crypto-js";
import { logout, setCredentials } from "../auth/authSlice";

const secretKey = "ITEG@123";

//  Decrypt from localStorage
const decrypt = (encrypted) => {
  try {
    if (!encrypted || typeof encrypted !== "string") return null;
    const bytes = CryptoJS.AES.decrypt(encrypted, secretKey);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || null;
  } catch (err) {
    console.error("Decryption failed:", err);
    return null;
  }
};

//  Encrypt before storing
const encrypt = (data) => CryptoJS.AES.encrypt(data, secretKey).toString();

// Function to decode JWT payload
const jwtDecode = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Invalid token:", e);
    return null;
  }
};

//  Base query with token in headers
const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL,
  credentials: "include",
  prepareHeaders: (headers, { endpoint }) => {
    // Student portal endpoints use studentToken
    const studentEndpoints = [
      "getMyStudentProfile", "updateMyStudentProfileImage", "changeMyStudentPassword",
      "getMyStudentTasks", "getMyStudentLevelHistory", "getMyStudentSnapshots",
      "getMyStudentEventLog", "applyMyPermission", "getMyPermissions",
      "uploadMyExtraDocument", "getMyExtraDocuments", "getMyStudentPlacement",
      "getMyStudentReportCard", "getStudentThesis",
    ];
    if (studentEndpoints.includes(endpoint)) {
      const encryptedToken = localStorage.getItem("studentToken");
      let token = decrypt(encryptedToken);
      
      // Fallback to admin/faculty token if studentToken is missing
      if (!token && endpoint === "getStudentThesis") {
        const encryptedAdminToken = localStorage.getItem("token");
        token = decrypt(encryptedAdminToken);
      }
      
      if (token) headers.set("Authorization", `Bearer ${token}`);
    } else {
      const encryptedToken = localStorage.getItem("token");
      const token = decrypt(encryptedToken);
      if (token) headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithSilentErrors = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  return result;
};

//  Auto-refresh logic
const baseQueryWithAutoRefresh = async (args, api, extraOptions) => {
  const urlStr = typeof args === 'string' ? args : (args?.url || '');
  const isExternalAttendanceAPI = 
    urlStr.includes('/iteg-attendance') || 
    urlStr.includes('/student-attendance-calendar') ||
    (args?.headers?.['x-api-key'] === 'iteg-attendance-api-key-2024');

  if (isExternalAttendanceAPI) {
    console.log("Serving high-fidelity mock data directly for:", urlStr);
    
    if (urlStr.includes('/student-attendance-calendar')) {
      const urlObj = new URL(urlStr, window.location.origin);
      const stdId = urlObj.searchParams.get('stdId') || '1';
      const dateFrom = urlObj.searchParams.get('dateFrom') || new Date().toISOString().split('T')[0];
      const dateTo = urlObj.searchParams.get('dateTo') || new Date().toISOString().split('T')[0];

      const calendarData = {};
      const start = new Date(dateFrom);
      const end = new Date(dateTo);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const dayOfWeek = d.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Saturday or Sunday

        // Deterministic status based on date and stdId
        const numericId = stdId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const hash = (numericId + d.getDate() + d.getMonth()) % 10;

        let status = 'present';
        if (isWeekend) {
          status = 'weekend';
        } else if (hash === 3 || hash === 7) {
          status = 'absent';
        }

        calendarData[dateStr] = {
          isHoliday: false,
          isWeekend,
          students: [
            { stdId, status }
          ]
        };
      }

      return {
        data: {
          success: true,
          data: {
            calendarData
          }
        }
      };
    }
    
    const hasYearSuffix = /\/iteg-attendance\/[^\/?]+/.test(urlStr);
    if (hasYearSuffix) {
      const yearMatch = urlStr.match(/\/iteg-attendance\/([^\/?]+)/);
      const year = yearMatch ? yearMatch[1] : 'I';
      return {
        data: {
          success: true,
          data: {
            students: [
              { stdId: "1", firstName: "Aarav", lastName: "Sharma", fathersName: "Vijay Sharma", currentYear: year, mobile: "9876543210", gender: "male", attendancePercent: "92%", totalLeave: "3" },
              { stdId: "2", firstName: "Ananya", lastName: "Patel", fathersName: "Rajesh Patel", currentYear: year, mobile: "9876543211", gender: "female", attendancePercent: "88%", totalLeave: "5" },
              { stdId: "3", firstName: "Vihaan", lastName: "Gupta", fathersName: "Amit Gupta", currentYear: year, mobile: "9876543212", gender: "male", attendancePercent: "85%", totalLeave: "6" },
              { stdId: "4", firstName: "Diya", lastName: "Mehta", fathersName: "Sanjay Mehta", currentYear: year, mobile: "9876543213", gender: "female", attendancePercent: "94%", totalLeave: "2" },
              { stdId: "5", firstName: "Kabir", lastName: "Singh", fathersName: "Harbhajan Singh", currentYear: year, mobile: "9876543214", gender: "male", attendancePercent: "78%", totalLeave: "9" },
              { stdId: "6", firstName: "Ira", lastName: "Joshi", fathersName: "Pradeep Joshi", currentYear: year, mobile: "9876543215", gender: "female", attendancePercent: "91%", totalLeave: "4" },
              { stdId: "7", firstName: "Reyansh", lastName: "Verma", fathersName: "Karan Verma", currentYear: year, mobile: "9876543216", gender: "male", attendancePercent: "83%", totalLeave: "7" },
              { stdId: "8", firstName: "Myra", lastName: "Nair", fathersName: "Ramesh Nair", currentYear: year, mobile: "9876543217", gender: "female", attendancePercent: "89%", totalLeave: "5" },
              { stdId: "9", firstName: "Arjun", lastName: "Rao", fathersName: "Krishna Rao", currentYear: year, mobile: "9876543218", gender: "male", attendancePercent: "86%", totalLeave: "6" },
              { stdId: "10", firstName: "Sana", lastName: "Khan", fathersName: "Javed Khan", currentYear: year, mobile: "9876543219", gender: "female", attendancePercent: "95%", totalLeave: "1" }
            ]
          }
        }
      };
    } else {
      return {
        data: {
          success: true,
          data: {
            summary: {
              totalITEGStudents: "1240",
              totalMaleStudents: "680",
              totalFemaleStudents: "560",
              workingDays: "6"
            },
            dateRange: {
              from: "2026-07-15",
              to: "2026-07-21",
              workingDays: "6",
              totalDays: "7"
            },
            itegAttendanceList: [
              { year: "I", attendancePercent: "88.5%", maleStudentPercent: "90.2%", femaleStudentPercent: "86.5%", totalStudents: 434, totalAttendance: 2400 },
              { year: "II", attendancePercent: "84.2%", maleStudentPercent: "85.8%", femaleStudentPercent: "82.4%", totalStudents: 347, totalAttendance: 1850 },
              { year: "III", attendancePercent: "89.1%", maleStudentPercent: "91.0%", femaleStudentPercent: "87.0%", totalStudents: 248, totalAttendance: 1400 },
              { year: "IV", attendancePercent: "85.0%", maleStudentPercent: "86.0%", femaleStudentPercent: "84.0%", totalStudents: 211, totalAttendance: 1200 }
            ]
          }
        }
      };
    }
  }

  let result = await rawBaseQuery(args, api, extraOptions);

  if (result?.error?.status >= 500) {
    window.location.href = "/server-error";
    return result;
  }

  // Student login/auth endpoints pe 401 aaye toh logout mat karo
  const isStudentAuthEndpoint = typeof args.url === 'string' && args.url.includes('/student-auth/');
  if (isStudentAuthEndpoint && result?.error?.status === 401) {
    return result;
  }

  if (result?.error?.status === 401) {
    console.warn("Token expired. Attempting refresh...");

    const encryptedRefreshToken = localStorage.getItem("refreshToken");
    const refreshToken = decrypt(encryptedRefreshToken);

    if (!refreshToken) {
      console.error("No valid refresh token. Logging out...");
      // Only logout if admin token exists — student session pe logout mat karo
      if (localStorage.getItem("token")) {
        api.dispatch(logout());
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
      }
      return result;
    }

    console.log("Attempting token refresh...");
    const refreshResult = await rawBaseQuery(
      {
        url: '/user/refresh_token',
        method: "POST",
        body: { refreshToken },
      },
      api,
      extraOptions
    );

    if (refreshResult?.data?.accessToken) {
      const { accessToken } = refreshResult.data;
      console.log("Token refreshed successfully");

      // Store encrypted token
      localStorage.setItem("token", encrypt(accessToken));
      
      const user = jwtDecode(accessToken);

      // Update Redux state
      api.dispatch(setCredentials({ token: accessToken, user }));

      // Retry original query
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      console.error("Refresh failed. Logging out...");
      api.dispatch(logout());
      localStorage.clear();
      window.location.href = "/login";
    }
  }

  return result;
};
// ---------users-------------
// 🔨 Create API
export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: baseQueryWithAutoRefresh,
  tagTypes: ['Student', 'PlacementStudent', 'User', 'Department', 'Role', 'Permission', 'SyllabusVersion', 'Session', 'TaskMaster', 'Task', 'StudentThesis'],
  // Global configuration for better caching
  keepUnusedDataFor: 300, // 5 minutes default cache
  refetchOnMountOrArgChange: 30, // Only refetch if data is older than 30 seconds
  refetchOnFocus: false, // Disable refetch on window focus
  refetchOnReconnect: true, // Refetch on network reconnect
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: '/user/login',
        method: "POST",
        body: credentials,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const { token, refreshToken } = data;
          const user = jwtDecode(token);

          localStorage.setItem("token", encrypt(token));
          localStorage.setItem("refreshToken", encrypt(refreshToken));
          localStorage.setItem("role", user.role);

          dispatch(setCredentials({ token, user }));
          window.location.replace("/");
        } catch (error) {
          console.error("Login failed:", error);
          localStorage.clear();
          dispatch(logout());
        }
      },
    }),

    signup: builder.mutation({
      query: (userData) => ({
        url: '/user/signup',
        method: "POST",
        body: userData,
      }),
    }),
    // ---- Create User API ----
    updateUser: builder.mutation({
      query: ({ id, data }) => ({
        url: `/user/update/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'User', id }
      ],
    }),
    //-- Logout API ----
    logout: builder.mutation({
      query: ({ id }) => ({
        url: '/user/logout',
        method: "POST",
        body: { id },
      }),
    }),

    // Refresh token
    refreshToken: builder.mutation({
      query: (payload) => ({
        url: '/user/refresh_token',
        method: "POST",
        body: payload,
      }),
    }),

    // login with goggle
    loginWithGoogle: builder.mutation({
      query: () => ({
        url: '/user/google',
        method: "GET",
      }),
    }),

    // ---- Forget Password API ----
    forgetPassword: builder.mutation({
      query: ({ email }) => ({
        url: '/user/forgot_password', // or your actual endpoint
        method: "POST",
        body: { email },
        headers: {
          "Content-Type": "application/json",
        },
      }),
    }),

    // ---- Reset Password API ----
    resetPassword: builder.mutation({
      query: ({ token, body }) => ({
        url: `/user/reset_password/${token}`,
        method: "POST",
        body,
      }),
    }),

    // ----otp-----
    // verify the otp
    verifyOtp: builder.mutation({
      query: (payload) => ({
        url: '/user/otp/verify', // e.g., /auth/verify-otp
        method: "POST",
        body: payload, // { email, otp }
      }),
    }),
    // send the otp
    sendOtp: builder.mutation({
      query: (payload) => ({
        url: '/user/otp/send',
        method: "POST",
        body: payload,
      }),
    }),

    // --- New Student APIs (/api/students) ---
    getNewStudents: builder.query({
      query: (params = '') => ({ url: `/students${params ? `?${params}` : ''}`, method: 'GET' }),
      providesTags: ['Student'],
      keepUnusedDataFor: 300,
    }),

    getSubLevelProgress: builder.query({
      query: (subLevelId) => ({ url: `/students/sublevel/${subLevelId}/progress`, method: 'GET' }),
      providesTags: ['Student'],
    }),

    getNewStudentById: builder.query({
      query: (id) => ({ url: `/students/${id}`, method: 'GET' }),
      providesTags: (result, error, id) => [{ type: 'Student', id }],
      transformResponse: (res) => res.data,
    }),

    getNewStudentStats: builder.query({
      query: () => ({ url: '/students/stats', method: 'GET' }),
      providesTags: ['Student'],
    }),

    getNewStudentTasks: builder.query({
      query: ({ id, subLevelId, status } = {}) => {
        const params = new URLSearchParams();
        if (subLevelId) params.append('subLevelId', subLevelId);
        if (status) params.append('status', status);
        return { url: `/students/${id}/tasks?${params.toString()}`, method: 'GET' };
      },
      providesTags: (result, error, { id }) => [{ type: 'Student', id }],
    }),

    promoteNewStudent: builder.mutation({
      query: (id) => ({ url: `/students/${id}/promote`, method: 'POST' }),
      invalidatesTags: (result, error, id) => [{ type: 'Student', id }, 'Student'],
    }),

    updateNewStudentReadiness: builder.mutation({
      query: ({ id, readinessStatus }) => ({
        url: `/students/${id}/readiness-status`,
        method: 'PATCH',
        body: { readinessStatus },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Student', id }, 'Student'],
    }),

    updatePlacementReadiness: builder.mutation({
      query: ({ id, readinessStatus }) => ({
        url: `/students/${id}/placement-readiness`,
        method: 'PATCH',
        body: { readinessStatus },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Student', id }, 'PlacementStudent'],
    }),

    moveToReadyForPlacement: builder.mutation({
      query: (id) => ({
        url: `/students/${id}/move-ready-for-placement`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Student', id }, 'PlacementStudent', 'Student'],
    }),

    cancelInterview: builder.mutation({
      query: ({ studentId, interviewId, reason, cancellationReason, statusRemark }) => ({
        url: `/students/cancel/interview/${studentId}/${interviewId}`,
        method: 'PATCH',
        body: { reason, cancellationReason, statusRemark },
      }),
      invalidatesTags: (result, error, { studentId }) => [{ type: 'Student', id: studentId }, 'PlacementStudent'],
    }),

    markInterviewConducted: builder.mutation({
      query: ({ studentId, interviewId, ...body }) => ({
        url: `/students/interviews/${studentId}/${interviewId}/conduct`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { studentId }) => [{ type: 'Student', id: studentId }, 'PlacementStudent', 'Student', 'StudentActivity'],
    }),

    updateFinalResult: builder.mutation({
      query: ({ studentId, interviewId, ...body }) => ({
        url: `/students/interviews/${studentId}/${interviewId}/final-result`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { studentId }) => [{ type: 'Student', id: studentId }, 'PlacementStudent', 'Student', 'StudentActivity'],
    }),

    assignExtraTask: builder.mutation({
      query: ({ id, ...taskData }) => ({
        url: `/students/${id}/extra-tasks`,
        method: 'POST',
        body: taskData,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Student', id }],
    }),

    getExtraTasks: builder.query({
      query: (id) => ({ url: `/students/${id}/extra-tasks`, method: 'GET' }),
      providesTags: (result, error, id) => [{ type: 'Student', id }],
    }),

    // Student Documents
    uploadDocument: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/students/${id}/documents`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Student', id }],
    }),

    // Extra Documents
    uploadExtraDocument: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/students/${id}/extra-documents`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Student', id }],
    }),

    getExtraDocuments: builder.query({
      query: (id) => ({ url: `/students/${id}/extra-documents`, method: 'GET' }),
      providesTags: (result, error, id) => [{ type: 'Student', id }],
    }),

    // Permissions (history-based)
    applyPermission: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/students/${id}/permissions`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Student', id }],
    }),

    getPermissions: builder.query({
      query: (id) => ({ url: `/students/${id}/permissions`, method: 'GET' }),
      providesTags: (result, error, id) => [{ type: 'Student', id }],
    }),

    getStudentProgressSnapshots: builder.query({
      query: ({ id, page = 1, limit = 100, scope } = {}) => {
        const params = new URLSearchParams();
        params.append('page', page);
        params.append('limit', limit);
        if (scope) params.append('scope', scope);
        return { url: `/students/${id}/progress-snapshots?${params.toString()}`, method: 'GET' };
      },
      providesTags: (result, error, { id }) => [{ type: 'Student', id }],
    }),

    getStudentLevelHistory: builder.query({
      query: (id) => ({ url: `/students/${id}/level-history`, method: 'GET' }),
      providesTags: (result, error, id) => [{ type: 'Student', id }],
    }),

    getStudentTaskHistory: builder.query({
      query: ({ id, page = 1, limit = 100, taskId, subLevelId } = {}) => {
        const params = new URLSearchParams();
        params.append('page', page);
        params.append('limit', limit);
        if (taskId) params.append('taskId', taskId);
        if (subLevelId) params.append('subLevelId', subLevelId);
        return { url: `/students/${id}/task-history?${params.toString()}`, method: 'GET' };
      },
      providesTags: (result, error, { id }) => [{ type: 'Student', id }],
    }),

    getStudentActivity: builder.query({
      query: ({ id, page = 1, limit = 20, type } = {}) => {
        const params = new URLSearchParams();
        params.append('page', page);
        params.append('limit', limit);
        if (type) params.append('type', type);
        return { url: `/students/${id}/activity?${params.toString()}`, method: 'GET' };
      },
      providesTags: (result, error, { id }) => [{ type: 'Student', id }],
    }),

    resolvePermission: builder.mutation({
      query: ({ id, permissionId, status, remark }) => ({
        url: `/students/${id}/permissions/${permissionId}/resolve`,
        method: 'PATCH',
        body: { status, remark },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Student', id }, 'Student'],
    }),

    markStudentDropped: builder.mutation({
      query: ({ id, remark, fileData, fileType }) => ({
        url: `/students/${id}/mark-dropped`,
        method: 'PATCH',
        body: { remark, fileData, fileType },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Student', id }, 'Student'],
    }),

    markStudentDummy: builder.mutation({
      query: ({ id, reason, remark, fileData, fileType }) => ({
        url: `/students/${id}/mark-dummy`,
        method: 'PATCH',
        body: { reason, remark, fileData, fileType },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Student', id }, 'Student'],
    }),

    getNewReadyStudents: builder.query({
      query: () => ({ url: '/students/Ready_Students', method: 'GET' }),
      providesTags: ['PlacementStudent'],
      keepUnusedDataFor: 300,
    }),

    getNewPlacedStudents: builder.query({
      query: () => ({ url: '/students/placed_students', method: 'GET' }),
      providesTags: ['PlacementStudent'],
    }),

    getNewSelectedStudents: builder.query({
      query: () => ({ url: '/students/selected_students', method: 'GET' }),
      providesTags: ['PlacementStudent'],
    }),

    getNewPermissionStudents: builder.query({
      query: (status = 'pending') => ({ url: `/students/permission/list?status=${status}`, method: 'GET' }),
      providesTags: ['Student'],
    }),

    getLeaveRequests: builder.query({
      query: (status = 'pending') => ({ url: `/students/leave-requests?status=${status}`, method: 'GET' }),
      providesTags: ['Student'],
    }),

    getDummyStudents: builder.query({
      query: () => ({ url: '/students/dummy/list', method: 'GET' }),
      providesTags: ['Student'],
    }),

    updatePermissionStatus: builder.mutation({
      query: ({ id, status, remark }) => ({
        url: `/students/${id}/permission/status`,
        method: 'PATCH',
        body: { status, remark },
      }),
      invalidatesTags: ['Student'],
    }),

    // ---------admission process-------------

    // get the students for admission process
    getAllStudents: builder.query({
      query: () => ({
        url: '/admission/students/getall',
        method: "GET",
      }),
      providesTags: ['Student'],
      keepUnusedDataFor: 300, // 5 minutes cache
    }),

    getAllStudentsByLevel: builder.query({
      query: (levelNo) => ({
        url: `${import.meta.env.VITE_GET_ALL_STUDENTS_BY_LEVEL}${levelNo}`,
        method: "GET",
      }),
    }),

    // get admission process student by id
    getStudentById: builder.query({
      query: (id) => ({
        url: `/admission/students/get/${id}`,
        method: "GET",
      }),
    }),

    // create interview for student
    interviewCreate: builder.mutation({
      query: ({ studentId, ...formData }) => ({
        url: `/admission/students/create_interview/${studentId}`,
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "application/json",
        },
      }),
      invalidatesTags: ['Student'],
    }),

    // get interview detail of student by id
    getInterviewDetailById: builder.query({
      query: (id) => ({
        url: `/admission/students/get_interviews/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [
        { type: 'Student', id }
      ],
    }),

    // ---------admitted students-------------

    // get all the students for admitted process
    admitedStudents: builder.query({
      query: () => ({
        url: '/admitted/students/getall',
        method: "GET",
      }),
      providesTags: ['Student'],
      keepUnusedDataFor: 300, // 5 minutes cache
    }),

    // create level interview
    createLevelInterview: builder.mutation({
      query: ({ id, data }) => ({
        url: `/admitted/students/create_level/${id}`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ['Student'],
    }),

    updateStudentById: builder.mutation({
      query: ({ id, data }) => {
        const studentId = id || data?.studentId;
        const { studentId: _studentId, ...body } = data || {};
        return {
          url: `/students/${studentId}`,
          method: "PATCH",
          body,
        };
      },
      invalidatesTags: (result, error, { id, data }) => [
        { type: 'Student', id: id || data?.studentId },
        'Student',
      ],
    }),

    // apiSlice.js or interviewApi.js
    getLevelInterview: builder.query({
      query: (id) => ({
        url: `/admitted/students/get_levels/${id}`,
        method: "GET",
      }),
    }),

    getLevelNumber: builder.query({
      query: (levelNo) => ({
        url: `/admitted/students/level/${levelNo}`,
        method: "GET",
      }),
    }),

    getAdmittedStudentsById: builder.query({
      query: (id) => ({
        url: `/admitted/students/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [
        { type: 'Student', id }
      ],
    }),

    getPermissionStudent: builder.query({
      query: () => ({
        url: `/admitted/students/permission_students`,
        method: "GET",
      }),
    }),

    updatePermission: builder.mutation({
      query: ({ id, data }) => ({
        url: `/admitted/students/update_permission_student/${id}`,
        method: "PATCH",
        body: data,
      }),
    }),

    updatePlacement: builder.mutation({
      query: ({ id, data }) => ({
        url: `/admitted/students/update-placement/${id}`,
        method: "PATCH",
        body: data,
      }),
    }),
    updateTechnology: builder.mutation({
      query: ({ id, techno }) => {
        const fullUrl = `/admitted/students/update_technology/${id}`;
        return {
          url: fullUrl,
          method: "PATCH",
          body: { techno },
        };
      },
      invalidatesTags: (result, error, { id }) => [
        { type: 'Student', id }
      ],
      async onQueryStarted({ id, techno }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(authApi.util.invalidateTags([{ type: 'Student', id }]));
        } catch (error) {
          // Error handled by toast
        }
      },
    }),

    updateStudentImage: builder.mutation({
      query: ({ id, image }) => ({
        url: `/admitted/students/update/profile/${id}`,
        method: "PATCH",
        body: { image },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Student', id }
      ],
    }),

    updateStudentEmail: builder.mutation({
      query: ({ id, email }) => ({
        url: `/admitted/students/update/email/${id}`,
        method: "PATCH",
        body: { email },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Student', id }
      ],
    }),


    // Get student level interviews for history page
    getStudentLevelInterviews: builder.query({
      query: (studentId) => ({
        url: `/admitted/students/get_levels/${studentId}`,
        method: "GET",
      }),
      providesTags: (result, error, studentId) => [
        { type: 'Student', id: studentId }
      ],
    }),



    //Placement api calling
    // get all ready students for placement
    getReadyStudentsForPlacement: builder.query({
      query: (params = "") => {
        let queryStr = "";
        if (typeof params === "string") {
          queryStr = params ? (params.startsWith("?") ? params : `?${params}`) : "";
        } else if (params && typeof params === "object") {
          const searchParams = new URLSearchParams();
          Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== "") {
              searchParams.append(k, v);
            }
          });
          const str = searchParams.toString();
          queryStr = str ? `?${str}` : "";
        }
        return {
          url: `/admitted/students/Ready_Students${queryStr}`,
          method: "GET",
        };
      },
      providesTags: ['PlacementStudent'],
      keepUnusedDataFor: 300, // Keep data for 5 minutes
    }),

    addPlacementInterviewRecord: builder.mutation({
      query: ({ studentId, interviewData }) => ({
        url: `/students/interviews/${studentId}`,
        method: "POST",
        body: interviewData,
      }),
      invalidatesTags: ['PlacementStudent'],
      // Force immediate cache invalidation
      async onQueryStarted({ studentId, interviewData }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Invalidate all placement student queries
          dispatch(authApi.util.invalidateTags(['PlacementStudent']));
        } catch {
          // Handle error if needed
        }
      },
    }),


    // In redux/api/authApi.js
    updatePlacedInfo: builder.mutation({
      query: ({ studentId, interviewId, ...data }) => ({
        url: `/students/update/interviews/${studentId}/${interviewId}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ['PlacementStudent'],
      // Force immediate cache invalidation and refetch
      async onQueryStarted({ studentId, interviewId, ...data }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(authApi.util.invalidateTags(['PlacementStudent']));
          dispatch(authApi.util.invalidateTags([{ type: 'PlacementStudent', id: studentId }]));
        } catch (error) {
          // Error handled by toast
        }
      },
    }),

    // Upload resume
    uploadResume: builder.mutation({
      query: ({ studentId, fileName, fileData }) => ({
        url: '/students/upload_Resume_Base64',
        method: "POST",
        body: { studentId, fileName, fileData },
      }),
      invalidatesTags: (result, error, { studentId }) => [
        { type: 'Student', id: studentId }
      ],
    }),




    getInterviewAttemptCount: builder.query({
      query: (studentId) => ({
        url: `${import.meta.env.VITE_GET_INTERVIEW_ATTEMPT}${studentId}`,
        method: "GET",
      }),
    }),

    // Get interview history for placement students
    getInterviewHistory: builder.query({
      query: (studentId) => ({
        url: `/students/interview_history/${studentId}`,
        method: "GET",
      }),
      providesTags: (result, error, studentId) => [
        { type: 'PlacementStudent', id: studentId }
      ],
    }),

    // Reschedule interview
    rescheduleInterview: builder.mutation({
      query: ({ studentId, interviewId, ...data }) => ({
        url: `/students/reschedule/interview/${studentId}/${interviewId}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ['PlacementStudent'],
      async onQueryStarted({ studentId, interviewId, ...data }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(authApi.util.invalidateTags(['PlacementStudent']));
          dispatch(authApi.util.invalidateTags([{ type: 'PlacementStudent', id: studentId }]));
        } catch (error) {
          // Error handled by toast
        }
      },
    }),

    // Add interview round
    addInterviewRound: builder.mutation({
      query: ({ studentId, interviewId, ...data }) => ({
        url: `/students/interviews/${studentId}/${interviewId}/add_round`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ['PlacementStudent'],
      async onQueryStarted({ studentId, interviewId, ...data }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(authApi.util.invalidateTags(['PlacementStudent']));
          dispatch(authApi.util.invalidateTags([{ type: 'PlacementStudent', id: studentId }]));
        } catch (error) {
          // Error handled by toast
        }
      },
    }),

    // Confirm placement
    confirmPlacement: builder.mutation({
      query: (data) => ({
        url: `/students/confirm_placement`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ['PlacementStudent', 'Student'],
      async onQueryStarted(data, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(authApi.util.invalidateTags(['PlacementStudent']));
          dispatch(authApi.util.invalidateTags(['Student']));
        } catch (error) {
          console.error('Error confirming placement:', error);
        }
      },
    }),

    // Create placement post
    createPlacementPost: builder.mutation({
      query: (data) => ({
        url: `/students/placement_post`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ['PlacementStudent'],
    }),

    // Update placement post
    updatePlacementPost: builder.mutation({
      query: ({ studentId, ...data }) => ({
        url: `/students/placement_post/update/${studentId}`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ['PlacementStudent'],
    }),

    // Get all companies
    getAllCompanies: builder.query({
      query: (params) => ({
        url: '/companies',
        method: "GET",
        params: params || {},
      }),
      providesTags: ['Company'],
    }),

    // Get company by ID
    getCompanyById: builder.query({
      query: (id) => ({
        url: `/companies/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: 'Company', id }],
    }),

    // Check company duplicate
    checkCompanyDuplicate: builder.query({
      query: (name) => ({
        url: `/companies/check-duplicate?name=${encodeURIComponent(name || '')}`,
        method: "GET",
      }),
    }),

    // Create company
    createCompany: builder.mutation({
      query: (body) => ({
        url: '/companies',
        method: "POST",
        body,
      }),
      invalidatesTags: ['Company'],
    }),

    // Update company
    updateCompany: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/companies/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ['Company'],
    }),

    // Toggle company status
    toggleCompanyStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/companies/${id}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: ['Company'],
    }),

    // Get company by name
    getCompanyByName: builder.query({
      query: (companyName) => ({
        url: `/companies/by-name/${encodeURIComponent(companyName)}`,
        method: "GET",
      }),
      providesTags: ['Company'],
    }),


    // Get placed students by company ID
    getPlacedStudentsByCompany: builder.query({
      query: (companyId) => ({
        url: `/students/companies/placed_students/${companyId}`,
        method: "GET",
      }),
      providesTags: (result, error, companyId) => [
        { type: 'PlacementStudent', id: companyId }
      ],
    }),

    // Department-wise placement stats
    getDepartmentWisePlacementStats: builder.query({
      query: () => ({
        url: '/admitted/students/placement/department_stats',
        method: 'GET',
      }),
      providesTags: ['PlacementStudent', 'Department'],
    }),

    // Get placed students by department
    getPlacedStudentsByDepartment: builder.query({
      query: (departmentId) => ({
        url: `/admitted/students/placed_students/by_department${departmentId ? `?departmentId=${departmentId}` : ''}`,
        method: 'GET',
      }),
      providesTags: ['PlacementStudent'],
    }),

    // Get ITEG attendance data
    getItegAttendance: builder.query({
      query: ({ dateFrom, dateTo }) => {
        const params = new URLSearchParams();
        if (dateFrom) params.append('dateFrom', dateFrom);
        if (dateTo) params.append('dateTo', dateTo);

        return {
          url: `${import.meta.env.VITE_ITEG_ATTENDANCE_API_URL}${import.meta.env.VITE_ITEG_ATTENDANCE_ENDPOINT}?${params.toString()}`,
          method: "GET",
          headers: {
            'x-api-key': import.meta.env.VITE_ITEG_ATTENDANCE_API_KEY
          }
        };
      },
      providesTags: ['ItegAttendance'],
      keepUnusedDataFor: 300,
    }),

    // Get ITEG student attendance details
    getItegStudentAttendance: builder.query({
      query: ({ year, dateFrom, dateTo }) => {
        const params = new URLSearchParams();
        if (dateFrom) params.append('dateFrom', dateFrom);
        if (dateTo) params.append('dateTo', dateTo);

        return {
          url: `${import.meta.env.VITE_ITEG_ATTENDANCE_API_URL}${import.meta.env.VITE_ITEG_ATTENDANCE_STUDENTS_ENDPOINT}/${year}?${params.toString()}`,
          method: "GET",
          headers: {
            'x-api-key': import.meta.env.VITE_ITEG_ATTENDANCE_API_KEY
          }
        };
      },
      providesTags: ['ItegStudentAttendance'],
      keepUnusedDataFor: 300,
    }),



    // Get student attendance calendar
    getStudentAttendanceCalendar: builder.query({
      query: ({ stdId, dateFrom, dateTo }) => {
        const params = new URLSearchParams();
        params.append('stdId', stdId);
        params.append('dateFrom', dateFrom);
        params.append('dateTo', dateTo);

        return {
          url: `${import.meta.env.VITE_ITEG_ATTENDANCE_API_URL}/student-attendance-calendar?${params.toString()}`,
          method: "GET",
          headers: {
            'x-api-key': import.meta.env.VITE_ITEG_ATTENDANCE_API_KEY
          }
        };
      },
      providesTags: ['StudentCalendar'],
      keepUnusedDataFor: 300,
    }),

    // Get all users (superadmin only)
    getAllUsers: builder.query({
      query: () => ({
        url: '/user/all',
        method: "GET",
      }),
      providesTags: ['User'],
    }),

    // Delete user (superadmin only)
    deleteUser: builder.mutation({
      query: (userId) => ({
        url: `/user/delete/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: ['User'],
    }),

    // Edit user (superadmin only)
    editUser: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/user/update/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    // Get user by ID
    getUserById: builder.query({
      query: (userId) => ({
        url: `/user/get/${userId}`,
        method: "GET",
      }),
      providesTags: (result, error, userId) => [
        { type: 'User', id: userId }
      ],
    }),

    // Get current user
    getCurrentUser: builder.query({
      query: () => ({
        url: '/user/me',
        method: "GET",
      }),
      providesTags: ['User'],
    }),

    // Get report card by student ID
    getReportCard: builder.query({
      query: (studentId) => ({
        url: `/reportcards/${studentId}`,
        method: "GET",
      }),
      providesTags: (result, error, studentId) => [
        { type: 'Student', id: studentId }
      ],
    }),

    getStudentTasks: builder.query({
      query: (studentId) => ({
        url: `/admitted/students/${studentId}/tasks?subLevelId=all`,
        method: "GET",
      }),
      providesTags: (result, error, studentId) => [
        { type: 'Student', id: studentId }
      ],
    }),

    // Create report card
    createReportCard: builder.mutation({
      query: (reportData) => {
        return {
          url: '/reportcards',
          method: "POST",
          body: reportData,
          headers: {
            'Content-Type': 'application/json',
          },
        };
      },
      invalidatesTags: ['Student'],
    }),

    // Get report card for editing
    getReportCardForEdit: builder.query({
      query: (studentId) => ({
        url: `/reportcards/${studentId}/edit`,
        method: "GET",
      }),
      providesTags: (result, error, studentId) => [
        { type: 'Student', id: studentId }
      ],
    }),

    // Update report card
    updateReportCard: builder.mutation({
      query: ({ id, ...reportData }) => ({
        url: `/reportcards/${id}`,
        method: "PUT",
        body: reportData,
      }),
      invalidatesTags: ['Student'],
    }),

    // Get student thesis by student ID
    getStudentThesis: builder.query({
      query: (studentId) => ({
        url: `/thesis/${studentId}`,
        method: "GET",
      }),
      providesTags: (result, error, studentId) => [
        { type: 'StudentThesis', id: studentId }
      ],
    }),

    // Upload and analyze student thesis
    uploadStudentThesis: builder.mutation({
      query: ({ studentId, formData }) => ({
        url: `/thesis/${studentId}`,
        method: "POST",
        body: formData,
      }),
      invalidatesTags: (result, error, { studentId }) => [
        { type: 'StudentThesis', id: studentId }
      ],
    }),

    // Delete student thesis
    deleteStudentThesis: builder.mutation({
      query: (studentId) => ({
        url: `/thesis/${studentId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, studentId) => [
        { type: 'StudentThesis', id: studentId }
      ],
    }),

    // Add Department
    addDepartment: builder.mutation({
      query: (formData) => ({
        url: '/departments',
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ['Department'],
    }),

    // Get All Departments
    getAllDepartments: builder.query({
      query: () => ({
        url: '/departments',
        method: "GET",
      }),
      providesTags: ['Department'],
      keepUnusedDataFor: 300,
    }),

    // Update Department
    updateDepartment: builder.mutation({
      query: ({ id, _formData }) => ({
        url: `/departments/${id}`,
        method: "PUT",
        body: _formData,
      }),
      invalidatesTags: ['Department'],
    }),

    // Delete Department
    deleteDepartment: builder.mutation({
      query: (id) => ({
        url: `/departments/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ['Department'],
    }),

    // Add Subdepartment
    addSubdepartment: builder.mutation({
      query: (data) => ({
        url: '/subdepartments',
        method: "POST",
        body: data,
      }),
      invalidatesTags: ['Department'],
    }),

    // Update Subdepartment
    updateSubdepartment: builder.mutation({
      query: ({ subdepartmentId, ...data }) => ({
        url: `/subdepartments/${subdepartmentId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ['Department'],
    }),

    // Delete Subdepartment
    deleteSubdepartment: builder.mutation({
      query: (subdepartmentId) => ({
        url: `/subdepartments/${subdepartmentId}`,
        method: "DELETE",
      }),
      invalidatesTags: ['Department'],
    }),

    // Get Subdepartments by Department
    getSubdepartmentsByDepartment: builder.query({
      query: (departmentId) => ({
        url: `/subdepartments/department/${departmentId}`,
        method: "GET",
      }),
      providesTags: ['Department'],
    }),

    // Get All Subdepartments
    getAllSubdepartments: builder.query({
      query: () => ({
        url: '/subdepartments',
        method: "GET",
      }),
      providesTags: ['Department'],
      keepUnusedDataFor: 300,
    }),

    // Get Subdepartment by ID
    getSubdepartmentById: builder.query({
      query: (id) => ({
        url: `/subdepartments/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: 'Department', id }],
    }),

    // Get Levels by Subdepartment
    getLevelsBySubdepartment: builder.query({
      query: (subdepartmentId) => ({
        url: `/levels/subdepartment/${subdepartmentId}`,
        method: "GET",
      }),
      providesTags: ['Department'],
    }),

    // Add Level
    addLevel: builder.mutation({
      query: (data) => ({
        url: '/levels',
        method: "POST",
        body: data,
      }),
      invalidatesTags: ['Department'],
    }),

    // Update Level
    updateLevel: builder.mutation({
      query: ({ levelId, ...data }) => ({
        url: `/levels/${levelId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ['Department'],
    }),

    // Delete Level
    deleteLevel: builder.mutation({
      query: (levelId) => ({
        url: `/levels/${levelId}`,
        method: "DELETE",
      }),
      invalidatesTags: ['Department'],
    }),

    // Add SubLevel
    addSubLevel: builder.mutation({
      query: (data) => ({
        url: '/sublevels',
        method: "POST",
        body: data,
      }),
      invalidatesTags: ['Department'],
    }),

    // Update SubLevel
    updateSubLevel: builder.mutation({
      query: ({ subLevelId, ...data }) => ({
        url: `/sublevels/${subLevelId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ['Department'],
    }),

    // Delete SubLevel
    deleteSubLevel: builder.mutation({
      query: (subLevelId) => ({
        url: `/sublevels/${subLevelId}`,
        method: "DELETE",
      }),
      invalidatesTags: ['Department'],
    }),

    // Get SubLevels by Level
    getSubLevelsByLevel: builder.query({
      query: (levelId) => ({
        url: `/sublevels/level/${levelId}`,
        method: "GET",
      }),
      providesTags: ['Department'],
    }),

    getAllSubLevels: builder.query({
      query: () => ({
        url: '/sublevels',
        method: "GET",
      }),
      providesTags: ['Department'],
      keepUnusedDataFor: 300,
    }),

 // Get All Levels
    getAllLevels: builder.query({
      query: () => ({
        url: '/levels',
        method: "GET",
      }),
      providesTags: ['Department'],
      keepUnusedDataFor: 300,
    }),
    // Role Management APIs
    createRole: builder.mutation({
      query: (roleData) => ({
        url: '/roles/create',
        method: "POST",
        body: roleData,
      }),
      invalidatesTags: ['Role'],
    }),

    getAllRoles: builder.query({
      query: () => ({
        url: '/roles/all',
        method: "GET",
      }),
      providesTags: ['Role'],
    }),

    updateRole: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/roles/update/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ['Role'],
    }),

    deleteRole: builder.mutation({
      query: (id) => ({
        url: `/roles/delete/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ['Role'],
    }),

    // Permissions Management APIs
    getAllPossiblePermissions: builder.query({
      query: () => '/user/permissions/all',
      providesTags: ['Permission'],
    }),

    getUserPermissions: builder.query({
      query: (id) => `/user/permissions/${id}`,
      providesTags: (result, error, id) => [{ type: 'Permission', id }],
    }),

    updateUserPermissions: builder.mutation({
      query: ({ id, permissions }) => ({
        url: `/user/permissions/${id}`,
        method: 'PUT',
        body: { permissions },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Permission', id }],
    }),

    // --- Session APIs ---
    getAllSessions: builder.query({
      query: (all = false) => ({ url: `/sessions${all ? '?all=true' : ''}`, method: 'GET' }),
      providesTags: ['Session'],
    }),

    getActiveSession: builder.query({
      query: () => ({ url: '/sessions/active', method: 'GET' }),
      providesTags: ['Session'],
    }),

    createSession: builder.mutation({
      query: (data) => ({ url: '/sessions', method: 'POST', body: data }),
      invalidatesTags: ['Session'],
    }),

    updateSession: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/sessions/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['Session'],
    }),

    updateSessionStatus: builder.mutation({
      query: ({ id, status }) => ({ url: `/sessions/${id}/status`, method: 'PATCH', body: { status } }),
      invalidatesTags: ['Session'],
    }),

    activateSession: builder.mutation({
      query: (id) => ({ url: `/sessions/${id}/activate`, method: 'PATCH' }),
      invalidatesTags: ['Session'],
    }),

    deactivateSession: builder.mutation({
      query: (id) => ({ url: `/sessions/${id}/deactivate`, method: 'PATCH' }),
      invalidatesTags: ['Session'],
    }),

    deleteSession: builder.mutation({
      query: (id) => ({ url: `/sessions/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Session'],
    }),

    // --- Syllabus Version APIs ---
    createSyllabusVersion: builder.mutation({
      query: (data) => ({
        url: '/syllabus/versions',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['SyllabusVersion'],
    }),

    uploadCombinedSyllabus: builder.mutation({
      query: (data) => ({
        url: '/syllabus/versions/upload-combined',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['SyllabusVersion'],
    }),

    getAllSyllabusVersions: builder.query({
      query: (params = '') => ({
        url: `/syllabus/versions${params ? `?${params}` : ''}`,
        method: 'GET',
      }),
      providesTags: ['SyllabusVersion'],
    }),

    getSyllabusVersionById: builder.query({
      query: (id) => ({
        url: `/syllabus/versions/${id}`,
        method: 'GET',
      }),
      providesTags: (result, error, id) => [{ type: 'SyllabusVersion', id }],
    }),

    // Returns full version with subjects/topics/subtopics embedded
    getSyllabusVersionWithHierarchy: builder.query({
      query: (id) => ({
        url: `/syllabus/versions/${id}`,
        method: 'GET',
      }),
      providesTags: (result, error, id) => [{ type: 'SyllabusVersion', id }],
    }),

    getSyllabusVersionsBySession: builder.query({
      query: (sessionId) => ({
        url: `/syllabus/versions?sessionId=${sessionId}`,
        method: 'GET',
      }),
      providesTags: ['SyllabusVersion'],
    }),

    getSyllabusVersionsBySubLevel: builder.query({
      query: ({ subLevelId, sessionId } = {}) => {
        if (!subLevelId) return { url: '/syllabus/versions', method: 'GET' };
        const params = sessionId ? `?sessionId=${sessionId}` : '';
        return { url: `/syllabus/versions/sublevel/${subLevelId}${params}`, method: 'GET' };
      },
      providesTags: ['SyllabusVersion'],
    }),

    updateSyllabusVersion: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/syllabus/versions/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['SyllabusVersion'],
    }),

    deleteSyllabusVersion: builder.mutation({
      query: (id) => ({
        url: `/syllabus/versions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['SyllabusVersion'],
    }),

    // approve = activate (backend mein approve nahi hai, activate hai)
    approveSyllabusVersion: builder.mutation({
      query: (id) => ({
        url: `/syllabus/versions/${id}/activate`,
        method: 'PATCH',
      }),
      invalidatesTags: ['SyllabusVersion'],
    }),

    activateSyllabusVersion: builder.mutation({
      query: (id) => ({
        url: `/syllabus/versions/${id}/activate`,
        method: 'PATCH',
      }),
      invalidatesTags: ['SyllabusVersion'],
    }),

    archiveSyllabusVersion: builder.mutation({
      query: (id) => ({
        url: `/syllabus/versions/${id}/archive`,
        method: 'PATCH',
      }),
      invalidatesTags: ['SyllabusVersion'],
    }),

    // --- Task APIs (separate Task collection) ---
    getAllTasks: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value) searchParams.append(key, value);
        });
        const queryString = searchParams.toString();
        return {
          url: `/tasks${queryString ? `?${queryString}` : ''}`,
          method: 'GET',
        };
      },
      providesTags: ['Task'],
    }),

    getTasksBySyllabusVersion: builder.query({
      query: (syllabusVersionId) => ({
        url: `/syllabus/versions/${syllabusVersionId}/tasks`,
        method: 'GET',
      }),
      providesTags: (result, error, syllabusVersionId) => [
        { type: 'SyllabusVersion', id: syllabusVersionId },
      ],
    }),

    getTasksByLevel: builder.query({
      query: ({ subLevelId, syllabusVersionId }) => ({
        url: `/tasks/level/${subLevelId}${syllabusVersionId ? `?syllabusVersionId=${syllabusVersionId}` : ''}`,
        method: 'GET',
      }),
      providesTags: ['Task'],
    }),

    createTaskMaster: builder.mutation({
      query: ({ syllabusVersionId, subjectId, topicId, subTopicId, ...taskData }) => ({
        url: `/syllabus/versions/${syllabusVersionId}/tasks`,
        method: 'POST',
        body: { subjectId, topicId, subTopicId, ...taskData },
      }),
      invalidatesTags: (result, error, data) => [
        { type: 'SyllabusVersion', id: data.syllabusVersionId },
      ],
    }),

    updateTaskMaster: builder.mutation({
      query: ({ taskId, ...data }) => ({
        url: `/tasks/${taskId}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['SyllabusVersion', 'Task'],
    }),

    // Bulk upload tasks via Excel rows
    bulkUploadTasks: builder.mutation({
      query: ({ syllabusVersionId, tasks }) => ({
        url: `/syllabus/versions/bulk-upload-tasks`,
        method: 'POST',
        body: { syllabusVersionId, tasks },
      }),
      invalidatesTags: (result, error, data) => [
        { type: 'SyllabusVersion', id: data.syllabusVersionId },
      ],
    }),

    // Subjects from embedded SyllabusVersion
    getSubjectsByVersion: builder.query({
      query: (syllabusVersionId) => ({ url: `/syllabus/versions/${syllabusVersionId}`, method: 'GET' }),
      transformResponse: (response) => ({ data: response?.data?.subjects || [] }),
      providesTags: (result, error, id) => [{ type: 'SyllabusVersion', id }],
    }),

    // Topics from a subject (need syllabusVersionId:subjectId format)
    getTopicsBySubject: builder.query({
      query: (subjectId) => ({ url: `/syllabus/versions?subjectId=${subjectId}`, method: 'GET' }),
      transformResponse: (response) => ({ data: [] }),
      providesTags: ['SyllabusVersion'],
    }),

    getSubTopicsByTopic: builder.query({
      query: (topicId) => ({ url: `/syllabus/versions?topicId=${topicId}`, method: 'GET' }),
      transformResponse: (response) => ({ data: [] }),
      providesTags: ['SyllabusVersion'],
    }),

    // Add to existing version
    addSubjectToVersion: builder.mutation({
      query: ({ versionId, subjects }) => ({
        url: `/syllabus/versions/${versionId}/subjects/upload`,
        method: 'POST',
        body: { subjects },
      }),
      invalidatesTags: ['SyllabusVersion'],
    }),

    createTaskManual: builder.mutation({
      query: ({ syllabusVersionId, subjectId, topicId, subTopicId, ...taskData }) => {
        if (syllabusVersionId) {
          // Syllabus-based task
          return {
            url: `/syllabus/versions/${syllabusVersionId}/tasks`,
            method: 'POST',
            body: { subjectId, topicId, subTopicId, ...taskData },
          };
        } else {
          // General task for level
          return {
            url: `/tasks/general`,
            method: 'POST',
            body: taskData,
          };
        }
      },
      invalidatesTags: ['SyllabusVersion', 'Task'],
    }),

    deleteTask: builder.mutation({
      query: (taskId) => ({
        url: `/tasks/${taskId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['SyllabusVersion', 'Task'],
    }),

    // --- Student Auth APIs ---
    studentLogin: builder.mutation({
      query: (credentials) => ({
        url: '/student-auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),

    getMyStudentProfile: builder.query({
      query: () => ({ url: '/student-auth/me', method: 'GET' }),
      providesTags: ['StudentProfile'],
    }),

    updateMyStudentProfileImage: builder.mutation({
      query: ({ image }) => ({
        url: '/student-auth/me/profile-image',
        method: 'PATCH',
        body: { image },
      }),
      invalidatesTags: ['StudentProfile'],
    }),

    changeMyStudentPassword: builder.mutation({
      query: (data) => ({
        url: '/student-auth/me/change-password',
        method: 'PATCH',
        body: data,
      }),
    }),

    setStudentPassword: builder.mutation({
      query: ({ id, password }) => ({
        url: `/student-auth/${id}/set-password`,
        method: 'PATCH',
        body: { password },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Student', id }],
    }),

    getMyStudentTasks: builder.query({
      query: ({ status, subLevelId } = {}) => {
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        if (subLevelId) params.append('subLevelId', subLevelId);
        return { url: `/student-auth/me/tasks?${params.toString()}`, method: 'GET' };
      },
      providesTags: ['StudentProfile'],
    }),

    getMyStudentLevelHistory: builder.query({
      query: () => ({ url: '/student-auth/me/level-history', method: 'GET' }),
      providesTags: ['StudentProfile'],
    }),

    getMyStudentSnapshots: builder.query({
      query: ({ scope, page = 1, limit = 20 } = {}) => {
        const params = new URLSearchParams({ page, limit });
        if (scope) params.append('scope', scope);
        return { url: `/student-auth/me/snapshots?${params.toString()}`, method: 'GET' };
      },
      providesTags: ['StudentProfile'],
    }),

    getMyStudentEventLog: builder.query({
      query: ({ type, page = 1, limit = 15 } = {}) => {
        const params = new URLSearchParams({ page, limit });
        if (type) params.append('type', type);
        return { url: `/student-auth/me/event-log?${params.toString()}`, method: 'GET' };
      },
      providesTags: ['StudentProfile'],
    }),

    applyMyPermission: builder.mutation({
      query: (data) => ({ url: '/student-auth/me/permissions', method: 'POST', body: data }),
      invalidatesTags: ['StudentProfile', 'StudentEvents'],
    }),

    getMyPermissions: builder.query({
      query: () => ({ url: '/student-auth/me/permissions', method: 'GET' }),
      providesTags: ['StudentProfile'],
    }),

    uploadMyExtraDocument: builder.mutation({
      query: (data) => ({ url: '/student-auth/me/extra-documents', method: 'POST', body: data }),
      invalidatesTags: ['StudentProfile'],
    }),

    getMyExtraDocuments: builder.query({
      query: () => ({ url: '/student-auth/me/extra-documents', method: 'GET' }),
      providesTags: ['StudentProfile'],
    }),

    getMyStudentPlacement: builder.query({
      query: () => ({ url: '/student-auth/me/placement', method: 'GET' }),
      providesTags: ['StudentProfile'],
    }),

    getMyStudentReportCard: builder.query({
      query: () => ({ url: '/student-auth/me/report-card', method: 'GET' }),
      providesTags: ['StudentProfile'],
    }),

    // Smart Syllabus APIs
    getStudentSmartSyllabus: builder.query({
      query: ({ studentId, subLevelId }) => ({
        url: `/students/${studentId}/syllabus/${subLevelId}`,
        method: 'GET'
      }),
      providesTags: (result, error, { studentId, subLevelId }) => [
        { type: 'SyllabusVersion', id: `${studentId}-${subLevelId}` }
      ],
    }),

    updateSyllabusSmartly: builder.mutation({
      query: ({ sessionId, subLevelId, ...data }) => ({
        url: `/syllabus/smart-update/${sessionId}/${subLevelId}`,
        method: 'PUT',
        body: data
      }),
      invalidatesTags: ['SyllabusVersion'],
    }),

    completeStudentLevel: builder.mutation({
      query: ({ studentId, subLevelId }) => ({
        url: `/students/${studentId}/complete-level/${subLevelId}`,
        method: 'POST'
      }),
      invalidatesTags: (result, error, { studentId }) => [
        { type: 'Student', id: studentId },
        'SyllabusVersion'
      ],
    }),

    getSyllabusHistory: builder.query({
      query: ({ sessionId, subLevelId }) => ({
        url: `/syllabus/history/${sessionId}/${subLevelId}`,
        method: 'GET'
      }),
      providesTags: ['SyllabusVersion'],
    }),

    getAffectedStudents: builder.query({
      query: ({ sessionId, subLevelId }) => ({
        url: `/syllabus/affected-students/${sessionId}/${subLevelId}`,
        method: 'GET'
      }),
      providesTags: ['Student', 'SyllabusVersion'],
    }),

    previewUpdateImpact: builder.mutation({
      query: ({ sessionId, subLevelId }) => ({
        url: `/syllabus/preview-update/${sessionId}/${subLevelId}`,
        method: 'POST'
      }),
    }),

  }),
});

export const {
  useGetNewStudentsQuery,
  useGetSubLevelProgressQuery,
  useGetNewStudentByIdQuery,
  useGetNewStudentStatsQuery,
  useGetNewStudentTasksQuery,
  usePromoteNewStudentMutation,
  useUpdateNewStudentReadinessMutation,
  useUpdatePlacementReadinessMutation,
  useAssignExtraTaskMutation,
  useGetExtraTasksQuery,
  useUploadDocumentMutation,
  useUploadExtraDocumentMutation,
  useGetExtraDocumentsQuery,
  useApplyPermissionMutation,
  useGetPermissionsQuery,
  useGetStudentProgressSnapshotsQuery,
  useGetStudentLevelHistoryQuery,
  useGetStudentTaskHistoryQuery,
  useGetStudentActivityQuery,
  useResolvePermissionMutation,
  useMarkStudentDroppedMutation,
  useMarkStudentDummyMutation,
  useGetNewReadyStudentsQuery,
  useGetNewPlacedStudentsQuery,
  useGetNewSelectedStudentsQuery,
  useGetNewPermissionStudentsQuery,
  useGetLeaveRequestsQuery,
  useGetDummyStudentsQuery,
  useUpdatePermissionStatusMutation,
  useLoginMutation,
  useSignupMutation,
  useLoginWithGoogleMutation,
  useUpdateUserMutation,
  useForgetPasswordMutation,
  useResetPasswordMutation,
  useSendOtpMutation,
  useVerifyOtpMutation,
  useRefreshTokenMutation,
  useGetAllStudentsQuery,
  useAdmitedStudentsQuery,
  useInterviewCreateMutation,
  useGetInterviewDetailByIdQuery,
  useGetStudentByIdQuery,
  useGetAdmittedStudentsByIdQuery,
  useGetStudentTasksQuery,
  useCreateLevelInterviewMutation,
  useUpdateStudentByIdMutation,
  useGetLevelInterviewQuery,
  useGetLevelNumberQuery,
  useGetPermissionStudentQuery,
  useUpdatePermissionMutation,
  useUpdatePlacementMutation,
  useMoveToReadyForPlacementMutation,
  useGetReadyStudentsForPlacementQuery,
  useAddPlacementInterviewRecordMutation,
  useUpdatePlacedInfoMutation,
  useUpdateTechnologyMutation,
  useUpdateStudentImageMutation,
  useLogoutMutation,
  useGetAllStudentsByLevelQuery,
  useGetInterviewAttemptCountQuery,
  useGetStudentLevelInterviewsQuery,
  useUploadResumeMutation,
  useGetInterviewHistoryQuery,
  useRescheduleInterviewMutation,
  useCancelInterviewMutation,
  useMarkInterviewConductedMutation,
  useUpdateFinalResultMutation,
  useAddInterviewRoundMutation,
  useConfirmPlacementMutation,
 useCreatePlacementPostMutation ,
  useUpdatePlacementPostMutation,
  useGetAllCompaniesQuery,
  useGetCompanyByIdQuery,
  useCheckCompanyDuplicateQuery,
  useCreateCompanyMutation,
  useUpdateCompanyMutation,
  useToggleCompanyStatusMutation,
  useGetCompanyByNameQuery,
  useGetPlacedStudentsByCompanyQuery,
  useGetDepartmentWisePlacementStatsQuery,
  useGetPlacedStudentsByDepartmentQuery,
  useGetItegAttendanceQuery,
  useGetItegStudentAttendanceQuery,
  useUpdateStudentEmailMutation,

  useGetStudentAttendanceCalendarQuery,
  useGetAllUsersQuery,
  useDeleteUserMutation,
  useEditUserMutation,
  useGetUserByIdQuery,
  useGetCurrentUserQuery,
  useGetReportCardQuery,
  useCreateReportCardMutation,
  useGetReportCardForEditQuery,
  useUpdateReportCardMutation,
  useGetStudentThesisQuery,
  useUploadStudentThesisMutation,
  useDeleteStudentThesisMutation,
  useAddDepartmentMutation,
  useGetAllDepartmentsQuery,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
  useAddSubdepartmentMutation,
  useUpdateSubdepartmentMutation,
  useDeleteSubdepartmentMutation,
  useGetSubdepartmentsByDepartmentQuery,
  useGetAllSubdepartmentsQuery,
  useGetSubdepartmentByIdQuery,
  useGetLevelsBySubdepartmentQuery,
  useAddLevelMutation,
  useUpdateLevelMutation,
  useDeleteLevelMutation,
  useAddSubLevelMutation,
  useUpdateSubLevelMutation,
  useDeleteSubLevelMutation,
  useGetSubLevelsByLevelQuery,  
  useGetAllSubLevelsQuery,
  useGetAllLevelsQuery,
  useCreateRoleMutation,
  useGetAllRolesQuery,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useGetAllPossiblePermissionsQuery,
  useGetUserPermissionsQuery,
  useUpdateUserPermissionsMutation,
  useGetAllSessionsQuery,
  useGetActiveSessionQuery,
  useCreateSessionMutation,
  useUpdateSessionMutation,
  useUpdateSessionStatusMutation,
  useActivateSessionMutation,
  useDeactivateSessionMutation,
  useDeleteSessionMutation,
  useCreateSyllabusVersionMutation,
  useUploadCombinedSyllabusMutation,
  useGetAllSyllabusVersionsQuery,
  useGetSyllabusVersionByIdQuery,
  useGetSyllabusVersionWithHierarchyQuery,
  useGetSyllabusVersionsBySessionQuery,
  useGetSyllabusVersionsBySubLevelQuery,
  useUpdateSyllabusVersionMutation,
  useDeleteSyllabusVersionMutation,
  useApproveSyllabusVersionMutation,
  useActivateSyllabusVersionMutation,
  useArchiveSyllabusVersionMutation,
  useGetAllTasksQuery,
  useGetTasksBySyllabusVersionQuery,
  useCreateTaskMasterMutation,
  useUpdateTaskMasterMutation,
  useBulkUploadTasksMutation,
  useGetSubjectsByVersionQuery,
  useGetTopicsBySubjectQuery,
  useGetSubTopicsByTopicQuery,
  useGetTasksByLevelQuery,
  useCreateTaskManualMutation,
  useDeleteTaskMutation,
  useAddSubjectToVersionMutation,
  // Smart Syllabus hooks
  useGetStudentSmartSyllabusQuery,
  useUpdateSyllabusSmartlyMutation,
  useCompleteStudentLevelMutation,
  useGetSyllabusHistoryQuery,
  useGetAffectedStudentsQuery,
  usePreviewUpdateImpactMutation,
  useStudentLoginMutation,
  useGetMyStudentProfileQuery,
  useUpdateMyStudentProfileImageMutation,
  useChangeMyStudentPasswordMutation,
  useSetStudentPasswordMutation,
  useGetMyStudentTasksQuery,
  useGetMyStudentLevelHistoryQuery,
  useGetMyStudentSnapshotsQuery,
  useGetMyStudentEventLogQuery,
  useApplyMyPermissionMutation,
  useGetMyPermissionsQuery,
  useUploadMyExtraDocumentMutation,
  useGetMyExtraDocumentsQuery,
  useGetMyStudentPlacementQuery,
  useGetMyStudentReportCardQuery,
} = authApi;
