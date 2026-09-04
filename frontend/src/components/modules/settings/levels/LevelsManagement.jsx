import { useNavigate } from "react-router-dom";
import { MdLayers } from "react-icons/md";
import { HiOutlineUserGroup } from "react-icons/hi";
import PageNavbar from "../../../shared/navbar/PageNavbar";
import Header from "../../../shared/sidebar/Header";
import CommonCard from "../CommonCard";
import Loader from "../../../shared/loader/Loader";
import { useGetAllLevelsQuery, useGetSubLevelsByLevelQuery } from "../../../../redux/api/authApi";

const SubLevelCount = ({ levelId, render }) => {
  const { data } = useGetSubLevelsByLevelQuery(levelId, { skip: !levelId });
  return render(data?.data?.length || 0);
};

const LevelsManagement = () => {
  const navigate = useNavigate();
  const { data: levelsData, isLoading } = useGetAllLevelsQuery();

  const levels = [...(levelsData?.data || [])].sort((a, b) => b.isActive - a.isActive);

  if (isLoading) return <Loader />;

  return (
    <>
      <Header title="Levels Management" />
      <div className="px-5">
        <div className="py-4">
          <PageNavbar
            title="All Levels"
            subtitle="View all levels across all subdepartments"
            showBackButton={false}
          />
        </div>

        {levels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <MdLayers size={48} className="mb-3 opacity-30" />
            <p className="text-sm">No levels found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
            {levels.map((level) => (
              <SubLevelCount
                key={level._id}
                levelId={level._id}
                render={(subLevelCount) => (
                  <CommonCard
                    variant="card1"
                    icon={MdLayers}
                    title={level.name}
                    status={level.isActive}
                    infoItems={[
                      { icon: <HiOutlineUserGroup size={14} className="text-orange-400" />, label: level.subDepartmentId?.name || "N/A" },
                      { icon: <MdLayers size={14} className="text-orange-400" />, label: `${subLevelCount} SubLevels` },
                    ]}
                    onView={() =>
                      navigate("/show-sublevel-tables", {
                        state: {
                          level,
                          subdepartment: level.subDepartmentId,
                          departmentId: level.subDepartmentId?.departmentId?._id,
                          departmentName: level.subDepartmentId?.departmentId?.name,
                        },
                      })
                    }
                  />
                )}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default LevelsManagement;
