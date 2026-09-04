import api from "../utils/axiosInstance";


export const getPlacementOverview  = () => api.get("/superadmin/dashboard/overview");
export const getDepartmentStats    = () => api.get("/superadmin/dashboard/departments");
export const getPlacementFunnel    = () => api.get("/superadmin/dashboard/funnel");
export const getTopCompanies       = () => api.get("/superadmin/dashboard/top-companies");
export const getPlacementAlerts    = () => api.get("/superadmin/dashboard/alerts");