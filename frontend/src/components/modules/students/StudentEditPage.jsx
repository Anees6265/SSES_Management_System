
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  useUpdatePermissionMutation,
  useUpdatePlacementMutation,
} from "../../../redux/api/authApi";
import { toast } from "react-toastify";
import imageCompression from "browser-image-compression";
import Header from "../../shared/sidebar/Header";

const StudentEditPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const student = location.state?.student;

  const [updatePermission] = useUpdatePermissionMutation();
  const [updatePlacement] = useUpdatePlacementMutation();

  const [permissionData, setPermissionData] = useState({
    imageURL: "",
    remark: "",
    approved_by: "admin",
  });

  const [placementData, setPlacementData] = useState({
    companyName: "",
    salary: "",
    location: "",
    jobProfile: "",
  });

  // Compress and convert to base64
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const options = {
      maxSizeMB: 0.3, // ~300 KB
      maxWidthOrHeight: 600,
      useWebWorker: true,
    };

    try {
      const compressedFile = await imageCompression(file, options);
      const base64 = await imageCompression.getDataUrlFromFile(compressedFile);
      setPermissionData((prev) => ({ ...prev, imageURL: base64 }));
    } catch (err) {
      console.error("Compression Error:", err);
      toast.error("Image compression failed.");
    }
  };

  const handlePermissionSubmit = async () => {
    try {
      if (!permissionData.imageURL) {
        toast.error("Please upload an image");
        return;
      }
      await updatePermission({ id, data: permissionData }).unwrap();
      toast.success("Permission updated successfully");
    } catch (error) {
      console.error("Permission Error:", error);
      toast.error(error?.data?.message || "Failed to update permission");
    }
  };

  const handlePlacementSubmit = async () => {
    try {
      await updatePlacement({ id, data: placementData }).unwrap();
      toast.success("Placement updated successfully");
    } catch (error) {
      console.error("Placement Error:", error);
      toast.error(error?.data?.message || "Failed to update placement");
    }
  };

  return (
    <>
      <Header
        title={`Edit Student: ${student?.firstName || ''} ${student?.lastName || ''}`}
        showBack={true}
        breadcrumbs={[
          { label: 'Academics', path: '/student-detail-table' },
          { label: 'Student Progress', path: '/student-detail-table' },
          { label: 'Edit Student' }
        ]}
      />
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-xl shadow-md mt-6">

      {/* Permission Details */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-2">Permission Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 font-medium">Upload Image (Base64)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="border p-2 w-full"
            />
            {permissionData.imageURL && (
              <img
                src={permissionData.imageURL}
                alt="Preview"
                className="mt-2 h-32 rounded border"
              />
            )}
          </div>

          <div>
            <label className="block mb-1 font-medium">Remark</label>
            <input
              type="text"
              value={permissionData.remark}
              onChange={(e) =>
                setPermissionData((prev) => ({
                  ...prev,
                  remark: e.target.value,
                }))
              }
              className="border p-2 w-full"
              placeholder="Enter remark"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Approved By</label>
            <select
              value={permissionData.approved_by}
              onChange={(e) =>
                setPermissionData((prev) => ({
                  ...prev,
                  approved_by: e.target.value,
                }))
              }
              className="border p-2 w-full"
            >
              <option value="super admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="faculty">Faculty</option>
            </select>
          </div>
        </div>
        <button
          onClick={handlePermissionSubmit}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded"
        >
          Update Permission
        </button>
      </div>

      {/* Placement Info */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-2">Placement Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 font-medium">Company Name</label>
            <input
              type="text"
              value={placementData.companyName}
              onChange={(e) =>
                setPlacementData((prev) => ({
                  ...prev,
                  companyName: e.target.value,
                }))
              }
              className="border p-2 w-full"
              placeholder="e.g. Infosys"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Job Profile</label>
            <input
              type="text"
              value={placementData.jobProfile}
              onChange={(e) =>
                setPlacementData((prev) => ({
                  ...prev,
                  jobProfile: e.target.value,
                }))
              }
              className="border p-2 w-full"
              placeholder="e.g. Frontend Developer"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Salary</label>
            <input
              type="text"
              value={placementData.salary}
              onChange={(e) =>
                setPlacementData((prev) => ({
                  ...prev,
                  salary: e.target.value,
                }))
              }
              className="border p-2 w-full"
              placeholder="e.g. 6 LPA"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Location</label>
            <input
              type="text"
              value={placementData.location}
              onChange={(e) =>
                setPlacementData((prev) => ({
                  ...prev,
                  location: e.target.value,
                }))
              }
              className="border p-2 w-full"
              placeholder="e.g. Bangalore"
            />
          </div>
        </div>
        <button
          onClick={handlePlacementSubmit}
          className="mt-4 bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded"
        >
          Update Placement
        </button>
      </div>

      <button
        onClick={() => navigate(-1)}
        className="mt-6 bg-gray-500 text-white py-2 px-6 rounded hover:bg-gray-600"
      >
        Go Back
      </button>
    </div>
    </>
  );
};

export default StudentEditPage;