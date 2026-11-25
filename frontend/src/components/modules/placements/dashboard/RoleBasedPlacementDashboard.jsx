import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useGetAllSubdepartmentsQuery } from "../../../../redux/api/authApi";
import Header from "../../../shared/sidebar/Header";
import Loader from "../../../shared/loader/Loader";
import CommonCard from "../../settings/CommonCard";
import { MdAccountTree, MdOutlineMenuBook } from "react-icons/md";
import { HiOutlineUserGroup } from "react-icons/hi";
import PlacementDashboard from "./PlacementDashboard";
import EmptyState from "../../../shared/empty-state/EmptyState";

const RoleBasedPlacementDashboard = () => {
  const navigate = useNavigate();
  const role = (localStorage.getItem("role") || "").toLowerCase();
  
  const isGlobalAdmin = ["superadmin", "admin", "placement_officer"].includes(role);
  
  const { data: res = {}, isLoading } = useGetAllSubdepartmentsQuery(undefined, {
    skip: isGlobalAdmin
  });
  
  const subDepts = useMemo(() => res.data || [], [res]);

  // Automatic redirect for users with exactly one department
  useEffect(() => {
    if (!isGlobalAdmin && subDepts.length === 1) {
      navigate(`/placements/department/${subDepts[0]._id}`, { replace: true });
    }
  }, [subDepts, isGlobalAdmin, navigate]);

  if (isGlobalAdmin) {
    return <PlacementDashboard />;
  }

  if (isLoading || subDepts.length === 1) {
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
        showBack={false}
        breadcrumbs={[{ label: "Placements" }, { label: "Dashboard" }]}
      />

      <div className="bg-slate-50 min-h-screen pb-16">
        <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                Select Academic Department
              </h2>
              <p className="text-xs text-slate-500">
                Choose a department to inspect student readiness, interview rounds, and placed records
              </p>
            </div>
            <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-2xs">
              {subDepts.length} Departments
            </span>
          </div>

          {subDepts.length === 0 ? (
            <EmptyState
              icon={MdAccountTree}
              title="No Departments Found"
              subtitle="No departments are available for placement tracking."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {subDepts.map((dept) => (
                <CommonCard
                  key={dept._id}
                  variant="card1"
                  icon={MdAccountTree}
                  title={dept.name}
                  status={dept.isActive}
                  infoItems={[
                    { icon: <HiOutlineUserGroup size={14} className="text-orange-500" />, label: "Students", value: dept.totalStudents || 0 },
                    { icon: <MdOutlineMenuBook size={14} className="text-orange-500" />, label: "Courses", value: dept.allowedCourses?.length || 0 },
                  ]}
                  onView={() => navigate(`/placements/department/${dept._id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default RoleBasedPlacementDashboard;
