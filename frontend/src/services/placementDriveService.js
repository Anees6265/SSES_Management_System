import api from "../utils/axiosInstance";

export const createPlacementDrive = (driveData) => api.post("/placements/drives", driveData);
export const getAllPlacementDrives = () => api.get("/placements/drives");
export const getPlacementDriveById = (id) => api.get(`/placements/drives/${id}`);
export const shortlistStudentsForDrive = (driveId, studentIds) => api.post(`/placements/drives/${driveId}/shortlist`, { studentIds });
export const shareResumesForDrive = (driveId, studentIds) => api.post(`/placements/drives/${driveId}/share-resumes`, { studentIds });
export const updateResumeShareStatus = (driveId, studentId, status) => api.patch(`/placements/drives/${driveId}/resumes/${studentId}/status`, { status });
