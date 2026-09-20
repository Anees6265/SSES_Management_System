import { useNavigate } from "react-router-dom";
import { useGetAllSubdepartmentsQuery } from "../../../redux/api/authApi";
import Header from "../../shared/sidebar/Header";
import Loader from "../../shared/loader/Loader";
import SubDepartmentCard from "../settings/departments/SubDepartmentCard";
import EmptyState from "../../shared/empty-state/EmptyState";

const DepartmentSelector = () => {
  const navigate = useNavigate();
  const { data: res = {}, isLoading } = useGetAllSubdepartmentsQuery();
  const subDepts = res.data || [];

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader /></div>;

  return (
    <>
      <Header
        title="Student Progress"
        subtitle="Select a department to view students"
        breadcrumbs={[{ label: "Academics" }, { label: "Student Progress" }]}
      />

      <div className="p-3.5 sm:p-5 lg:p-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 sm:mb-4">
          Select Department
        </p>

        {subDepts.length === 0 ? (
          <EmptyState
            title="No Departments Found"
            subtitle="No academic departments or sub-departments are configured yet in the system."
            actionText="Go to Department Settings"
            onAction={() => navigate("/department-management")}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {subDepts.map((dept) => (
              <SubDepartmentCard
                key={dept._id}
                title={dept.name}
                departmentName={dept.departmentId?.name}
                status={dept.isActive}
                totalStudents={dept.totalStudents || 0}
                allowedCourses={dept.allowedCourses || []}
                faculties={dept.faculties || []}
                levelCounts={dept.levelCounts || []}
                subLevelCounts={dept.subLevelCounts || []}
                showSubLevels={true}
                onView={() => navigate(`/student-detail-table/${dept._id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default DepartmentSelector;
