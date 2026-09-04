import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGetAllSubdepartmentsQuery } from "../../../../redux/api/authApi";
import Header from "../../../shared/sidebar/Header";
import Loader from "../../../shared/loader/Loader";
import CommonCard from "../../settings/CommonCard";
import { MdAccountTree, MdOutlineMenuBook } from "react-icons/md";
import { HiOutlineUserGroup } from "react-icons/hi";
import PlacementDashboard from "./PlacementDashboard";

const RoleBasedPlacementDashboard = () => {
  const navigate = useNavigate();
  const role = (localStorage.getItem("role") || "").toLowerCase();
  
  const isGlobalAdmin = ["superadmin", "admin"].includes(role);
  
  const { data: res = {}, isLoading } = useGetAllSubdepartmentsQuery(undefined, {
    skip: isGlobalAdmin
  });
  
  const subDepts = res.data || [];

  // Automatic redirect for users with exactly one department
  useEffect(() => {
    if (!isGlobalAdmin && subDepts.length === 1) {
      navigate(`/placements/department/${subDepts[0]._id}`, { replace: true });
    }
  }, [subDepts, isGlobalAdmin, navigate]);

  if (isGlobalAdmin) {
    return <PlacementDashboard />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (subDepts.length === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <>
      <Header
        title="Placement Dashboard"
        subtitle="Select a department to view placement flow"
        breadcrumbs={[{ label: "Placements" }, { label: "Dashboard" }]}
      />

      <div className="p-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Select Department
        </p>

        {subDepts.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No departments found</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subDepts.map((dept) => (
              <CommonCard
                key={dept._id}
                variant="card1"
                icon={MdAccountTree}
                title={dept.name}
                status={dept.isActive}
                infoItems={[
                  { icon: <HiOutlineUserGroup size={14} className="text-orange-400" />, label: "Students", value: dept.totalStudents || 0 },
                  { icon: <MdOutlineMenuBook size={14} className="text-orange-400" />, label: "Courses", value: dept.allowedCourses?.length || 0 },
                ]}
                onView={() => navigate(`/placements/department/${dept._id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default RoleBasedPlacementDashboard;
