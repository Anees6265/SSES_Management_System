import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdLayers, MdSearch, MdClose } from "react-icons/md";
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
  const [searchTerm, setSearchTerm] = useState("");
  const { data: levelsData, isLoading } = useGetAllLevelsQuery();

  const levels = [...(levelsData?.data || [])].sort((a, b) => b.isActive - a.isActive);

  const filteredLevels = levels.filter((lvl) => {
    const q = searchTerm.toLowerCase();
    const nameMatch = lvl.name?.toLowerCase().includes(q);
    const subDeptMatch = lvl.subDepartmentId?.name?.toLowerCase().includes(q);
    return nameMatch || subDeptMatch;
  });

  if (isLoading) return <Loader />;

  return (
    <>
      <Header title="Levels Management" />
      <div className="px-3.5 sm:px-6 pb-8">
        <div className="py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <PageNavbar
            title="All Levels"
            subtitle="View all levels across all subdepartments"
            showBackButton={false}
          />
          {levels.length > 0 && (
            <div className="relative w-full sm:w-64">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search levels..."
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-gray-400 shadow-2xs"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs p-1"
                >
                  <MdClose size={14} />
                </button>
              )}
            </div>
          )}
        </div>

        {searchTerm && (
          <div className="flex items-center justify-between text-xs text-gray-500 pb-3">
            <span>
              Showing {filteredLevels.length} of {levels.length} levels
            </span>
            <button
              onClick={() => setSearchTerm("")}
              className="text-orange-500 hover:text-orange-600 font-semibold cursor-pointer"
            >
              Clear filter
            </button>
          </div>
        )}

        {filteredLevels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-gray-100 p-6">
            <MdLayers size={44} className="mb-3 text-gray-300" />
            <p className="text-sm font-semibold text-gray-700">
              {searchTerm ? `No levels matching "${searchTerm}"` : "No levels found"}
            </p>
            {searchTerm && (
              <p className="text-xs text-gray-400 mt-1">Try searching by a different name or subdepartment</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4 mt-2 sm:mt-4">
            {filteredLevels.map((level) => (
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
                    onView={() => {
                      const subId = level.subDepartmentId?._id || "";
                      const deptId = level.subDepartmentId?.departmentId?._id || "";
                      navigate(`/show-sublevel-tables?levelId=${level._id}&subdeptId=${subId}&deptId=${deptId}`, {
                        state: {
                          level,
                          subdepartment: level.subDepartmentId,
                          departmentId: deptId,
                          departmentName: level.subDepartmentId?.departmentId?.name,
                        },
                      });
                    }}
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

