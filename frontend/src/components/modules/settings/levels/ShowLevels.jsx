import { useState } from 'react';
import PageNavbar from '../../../shared/navbar/PageNavbar';
import { useGetAllLevelsQuery } from '../../../../redux/api/authApi';
import Loader from '../../../shared/loader/Loader';
import { Layers } from 'lucide-react';
import Pagination from '../../../shared/pagination/Pagination';
import { useNavigate } from 'react-router-dom';
import CommonCard from '../CommonCard';
import { MdOutlineMenuBook } from 'react-icons/md';
import { HiOutlineUserGroup } from 'react-icons/hi';

const ShowLevels = () => {
  const { data: levelsData, isLoading, refetch } = useGetAllLevelsQuery();
  const [searchTerm, setSearchTerm] = useState("");
  const [rowsPerPage] = useState(10);
  const [selectedRows, setSelectedRows] = useState([]);
  const navigate = useNavigate();

  const allLevels = levelsData?.data || [];

  if (isLoading) return <Loader />;

  return (
    <>
      <PageNavbar
        title="All Levels"
        subtitle="View all levels across departments and subdepartments"
        showBackButton={false}
      />
      <div className="mt-1 border bg-[var(--backgroundColor)] shadow-sm rounded-xl sm:rounded-2xl">
        <div className="px-3.5 sm:px-6">
          <div className="flex justify-between items-center flex-wrap gap-3 sm:gap-4 py-3 sm:py-4">
            <Pagination
              rowsPerPage={rowsPerPage}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filtersConfig={[]}
              filteredData={allLevels}
              selectedRows={selectedRows}
              allData={allLevels}
              sectionName="levels"
            />
          </div>
        </div>
        
        <div className="p-3.5 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
            {allLevels.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No levels found</p>
              </div>
            ) : (
              allLevels.map((level) => (
                <CommonCard
                  key={level._id}
                  variant="card1"
                  icon={Layers}
                  title={level.name}
                  status={level.isActive}
                  infoItems={[
                    { icon: <HiOutlineUserGroup size={14} className="text-orange-400" />, label: level.subDepartmentId?.name || 'N/A' },
                    { icon: <MdOutlineMenuBook size={14} className="text-orange-400" />, label: level.subDepartmentId?.departmentId?.name || 'N/A' },
                  ]}
                  onView={() => {
                    const subId = level.subDepartmentId?._id;
                    const path = subId ? `/subdepartment/${subId}/levels` : '/subdepartment-details';
                    navigate(path, {
                      state: {
                        departmentId: level.subDepartmentId?.departmentId?._id,
                        subdepartment: level.subDepartmentId,
                        departmentName: level.subDepartmentId?.departmentId?.name
                      }
                    });
                  }}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ShowLevels;