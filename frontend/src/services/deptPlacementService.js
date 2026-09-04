import api from "../utils/axiosInstance";

const base = (id) => `/placements/department/${id}`;

export const getDeptOverview         = (id) => api.get(`${base(id)}/overview`);
export const getDeptFunnel           = (id) => api.get(`${base(id)}/funnel`);
export const getDeptStatusBreakdown  = (id) => api.get(`${base(id)}/status-breakdown`);
export const getDeptAlerts           = (id) => api.get(`${base(id)}/alerts`);
export const getDeptReadyStudents    = (id) => api.get(`${base(id)}/ready-students`);
export const getDeptRecentPlacements = (id) => api.get(`${base(id)}/recent-placements`);
export const getDeptTopCompanies     = (id) => api.get(`${base(id)}/top-companies`);
