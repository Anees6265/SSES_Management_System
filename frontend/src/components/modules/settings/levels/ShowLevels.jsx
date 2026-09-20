import { useState, useMemo } from 'react';
import PageNavbar from '../../../shared/navbar/PageNavbar';
import { useGetAllLevelsQuery } from '../../../../redux/api/authApi';
import Loader from '../../../shared/loader/Loader';
import { Layers } from 'lucide-react';
import EmptyState from '../../../shared/empty-state/EmptyState';
import Pagination from '../../../shared/pagination/Pagination';
import { useNavigate } from 'react-router-dom';
import CommonCard from '../CommonCard';
import { MdOutlineMenuBook, MdSearch, MdClose } from 'react-icons/md';
import { HiOutlineUserGroup } from 'react-icons/hi';

const ShowLevels = () => {
  const { data: levelsData, isLoading } = useGetAllLevelsQuery();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;
  const navigate = useNavigate();

  const allLevels = useMemo(() => levelsData?.data || [], [levelsData]);

  // Filter levels by level name, subdepartment name, or department name
  const filteredLevels = useMemo(() => {
    if (!searchTerm.trim()) return allLevels;
    const query = searchTerm.toLowerCase().trim();
    return allLevels.filter((level) => {
      const levelName = (level.name || '').toLowerCase();
      const subDeptName = (level.subDepartmentId?.name || '').toLowerCase();
      const deptName = (level.subDepartmentId?.departmentId?.name || '').toLowerCase();
      return levelName.includes(query) || subDeptName.includes(query) || deptName.includes(query);
    });
  }, [allLevels, searchTerm]);

  // Handle search input changes and reset page to 1
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const clearSearch = () => {
    setSearchTerm("");
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filteredLevels.length / pageSize));

  // Slice for current page
  const paginatedLevels = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLevels.slice(start, start + pageSize);
  }, [filteredLevels, currentPage, pageSize]);

  if (isLoading) return <Loader />;

  return (
    <>
      <PageNavbar
        title="All Levels"
        subtitle="View all levels across departments and subdepartments"
        showBackButton={false}
      />
      <div className="mt-1 border border-slate-200/80 bg-white shadow-xs rounded-xl sm:rounded-2xl">
        {/* Search & Stats Bar */}
        <div className="px-3.5 sm:px-6 py-3.5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <MdSearch size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search level, department..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs sm:text-sm font-medium text-slate-800 rounded-xl border border-slate-200 focus:border-orange-500 focus:outline-none transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <MdClose size={16} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-semibold text-slate-500">
              Total Levels: <strong className="text-slate-800">{filteredLevels.length}</strong>
              {searchTerm && <span className="text-orange-600 font-bold ml-1">found</span>}
            </span>
          </div>
        </div>
        
        {/* Cards Grid */}
        <div className="p-3.5 sm:p-6">
          {filteredLevels.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                icon={Layers}
                title="No Levels Found"
                subtitle={searchTerm
                  ? `No levels match "${searchTerm}". Try searching by another keyword or clear search.`
                  : "No academic levels have been created yet."}
                actionText={searchTerm ? "Clear Search" : undefined}
                onAction={searchTerm ? clearSearch : undefined}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
              {paginatedLevels.map((level) => (
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
              ))}
            </div>
          )}

          {/* Pagination Footer */}
          {filteredLevels.length > pageSize && (
            <div className="mt-6 pt-4 border-t border-slate-100">
              <Pagination
                totalItems={filteredLevels.length}
                currentPage={currentPage}
                pageSize={pageSize}
                totalPages={totalPages}
                onPageChange={(newPage) => {
                  setCurrentPage(newPage);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                label="levels"
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ShowLevels;