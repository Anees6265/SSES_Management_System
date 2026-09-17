import { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useGetNewStudentsQuery,
  useGetAllSessionsQuery,
  useGetAllLevelsQuery,
  useGetAllSubLevelsQuery
} from "../../../redux/api/authApi";
import Loader from "../../shared/loader/Loader";
import SelectDropdown from "../../shared/form-fields/SelectDropdown";
import CommonTable from "../../shared/table/CommonTable";
import Header from "../../shared/sidebar/Header";
import Avatar from "../../shared/Avatar";
import Pagination from "../../shared/pagination/Pagination";
import { MdTableChart } from "react-icons/md";
import { Search, X, ChevronRight, Phone, RotateCcw, Filter } from "lucide-react";

const toTitle = (str) =>
  str?.toLowerCase().split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || "";

const STATUS_COLORS = {
  Active: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Placed: "bg-purple-50 text-purple-700 border border-purple-200",
  Dropped: "bg-rose-50 text-rose-700 border border-rose-200",
  Completed: "bg-blue-50 text-blue-700 border border-blue-200",
  Dummy: "bg-amber-50 text-amber-700 border border-amber-200",
};

const StudentDetailTable = () => {
  const navigate = useNavigate();
  const { subDepartmentId } = useParams(); // present for admin, absent for faculty

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedTech, setSelectedTech] = useState("All");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [mobilePage, setMobilePage] = useState(1);
  const mobilePageSize = 10;

  // Build query string — if subDepartmentId present, filter by it
  const queryStr = subDepartmentId ? `subDepartmentId=${subDepartmentId}` : "";

  const { data: res = {}, isLoading } = useGetNewStudentsQuery(queryStr, {
    refetchOnMountOrArgChange: true,
  });

  const { data: sessionsData } = useGetAllSessionsQuery(true);
  const sessions = sessionsData?.data || [];

  const students = res.data || [];

  const { data: allLevelsRes = {} } = useGetAllLevelsQuery();
  const allLevels = allLevelsRes.data || [];

  const { data: allSubLevelsRes = {} } = useGetAllSubLevelsQuery();
  const allSubLevels = allSubLevelsRes.data || [];

  // Determine which levels belong to the current subdepartment(s)
  const allowedLevelIds = useMemo(() => {
    let targetSubDeptIds = [];
    if (subDepartmentId) {
      targetSubDeptIds = [subDepartmentId];
    } else {
      targetSubDeptIds = [...new Set(students.map(s => (s.subDepartmentId?._id || s.subDepartmentId)?.toString()).filter(Boolean))];
    }

    return allLevels
      .filter(l => targetSubDeptIds.includes((l.subDepartmentId?._id || l.subDepartmentId)?.toString()))
      .map(l => l._id.toString());
  }, [allLevels, subDepartmentId, students]);

  // Filter sublevels based on allowedLevelIds
  const departmentSubLevels = useMemo(() => {
    return allSubLevels.filter(sl => allowedLevelIds.includes((sl.levelId?._id || sl.levelId)?.toString()));
  }, [allSubLevels, allowedLevelIds]);

  // Dynamic sublevel tabs from departmentSubLevels
  const subLevelTabs = useMemo(() => {
    const names = departmentSubLevels.map(sl => sl.name);
    // Natural sort: e.g., 1A -> 1B -> 1C -> 2A
    names.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    return ["All", ...new Set(names)];
  }, [departmentSubLevels]);

  const filteredData = useMemo(() => {
    return students.filter((s) => {
      const matchTab = activeTab === "All" || s.currentSubLevelId?.name === activeTab;
      const matchStatus = selectedStatus.length === 0 || selectedStatus.includes(s.status);
      const studentSessId = s.sessionId?._id || s.sessionId;
      const matchSession = !selectedSessionId || studentSessId === selectedSessionId || s.sessionId?.name === selectedSessionId;
      const stdTech = (s.track || s.course || "General").toLowerCase();
      const matchTech = selectedTech === "All" || stdTech.includes(selectedTech.toLowerCase());
      const name = `${s.firstName} ${s.lastName}`.toLowerCase();
      const matchSearch = !searchTerm ||
        name.includes(searchTerm.toLowerCase()) ||
        s.prkey?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.studentMobile?.includes(searchTerm);
      return matchTab && matchStatus && matchSession && matchTech && matchSearch;
    });
  }, [students, activeTab, selectedStatus, selectedSessionId, selectedTech, searchTerm]);

  // Reset mobile page whenever filters/tabs change
  useEffect(() => {
    setMobilePage(1);
  }, [searchTerm, activeTab, selectedStatus, selectedSessionId, selectedTech]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedTech !== "All") count++;
    if (selectedStatus.length > 0) count++;
    if (selectedSessionId) count++;
    return count;
  }, [selectedTech, selectedStatus, selectedSessionId]);

  const hasActiveFilters = Boolean(
    searchTerm ||
    activeTab !== "All" ||
    activeFilterCount > 0
  );

  const handleResetFilters = () => {
    setSearchTerm("");
    setActiveTab("All");
    setSelectedStatus([]);
    setSelectedSessionId("");
    setSelectedTech("All");
  };

  const paginatedMobileData = useMemo(() => {
    const start = (mobilePage - 1) * mobilePageSize;
    return filteredData.slice(start, start + mobilePageSize);
  }, [filteredData, mobilePage]);

  const columns = [
    {
      key: "name",
      label: "Student",
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar firstName={row.firstName} lastName={row.lastName} imageUrl={row.image} />
          <div>
            <p className="font-medium text-gray-800">{toTitle(`${row.firstName} ${row.lastName}`)}</p>
            <p className="text-xs text-gray-400">{row.prkey}</p>
          </div>
        </div>
      ),
    },
    {
      key: "fatherName",
      label: "Father's Name",
      render: (row) => toTitle(row.fatherName || ""),
    },
    { key: "studentMobile", label: "Mobile", align: "center" },
    {
      key: "course",
      label: "Course",
      render: (row) => (row.course || "").toUpperCase(),
    },
    {
      key: "level",
      label: "Level / Session",
      align: "center",
      render: (row) => (
        <div className="flex flex-col items-center">
          <span className="text-xs font-medium text-gray-600">
            {row.currentLevelId?.name || "—"} / {row.currentSubLevelId?.name || "—"}
          </span>
          <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded mt-1">
            {row.sessionId?.name || "Session N/A"}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      align: "center",
      render: (row) => (
        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[row.status] || "bg-gray-100 text-gray-600"}`}>
          {row.status}
        </span>
      ),
    },
  ];

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader /></div>;

  const deptName = students[0]?.subDepartmentId?.name;

  return (
    <>
      <Header
        title={deptName ? `${deptName} — Students` : "Student Progress"}
        badge={`${filteredData.length} students`}
        breadcrumbs={[
          { label: "Academics" },
          { label: "Student Progress", path: "/student-detail-table" },
          ...(deptName ? [{ label: deptName }] : []),
        ]}
      />

      {/* SubLevel Tabs */}
      <div className="bg-white border-b px-3 sm:px-6 flex gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar scroll-smooth [-webkit-overflow-scrolling:touch]">
        {subLevelTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer flex items-center shrink-0 ${
              activeTab === tab
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <span>{tab}</span>
            <span className={`ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full font-bold transition-colors ${
              activeTab === tab
                ? "bg-orange-100 text-orange-700"
                : "bg-gray-100 text-gray-500"
            }`}>
              {tab === "All"
                ? students.length
                : students.filter((s) => s.currentSubLevelId?.name === tab).length}
            </span>
          </button>
        ))}
      </div>

      <div className="p-3.5 sm:p-5 space-y-3.5 sm:space-y-4">
        {/* Search and Filters Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-3 sm:p-4 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-full md:max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search student, PR key, or mobile..."
                className="w-full h-10 pl-9 pr-9 text-xs sm:text-sm bg-gray-50/70 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/10 transition placeholder:text-gray-400 font-medium text-gray-800"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100 transition cursor-pointer"
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Mobile Filter Toggle Button */}
            <div className="flex items-center justify-between md:hidden gap-2">
              <button
                type="button"
                onClick={() => setShowMobileFilters((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  showMobileFilters || activeFilterCount > 0
                    ? "bg-orange-50 border-orange-200 text-orange-600"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Filter size={14} />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="w-4.5 h-4.5 rounded-full bg-orange-500 text-white text-[10px] flex items-center justify-center font-extrabold ml-0.5">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw size={12} />
                    <span>Reset</span>
                  </button>
                )}
                <span className="text-xs font-bold text-gray-500">
                  {filteredData.length} {filteredData.length === 1 ? "student" : "students"}
                </span>
              </div>
            </div>

            {/* Dropdown Filters Container */}
            <div className={`${showMobileFilters ? "grid" : "hidden"} md:flex grid-cols-1 sm:grid-cols-3 md:items-center gap-2.5 w-full md:w-auto`}>
              {/* Technology Dropdown */}
              <SelectDropdown
                value={selectedTech}
                onChange={(val) => setSelectedTech(val)}
                options={[
                  { value: "All", label: "All Technologies" },
                  { value: "Python", label: "Python" },
                  { value: "MERN Stack", label: "MERN Stack" },
                  { value: "Java", label: "Java" },
                  { value: ".NET", label: ".NET" },
                  { value: "UI/UX", label: "UI/UX" },
                  { value: "Data Analytics", label: "Data Analytics" },
                  { value: "Salesforce", label: "Salesforce" },
                  { value: "SAP", label: "SAP" }
                ]}
                className="w-full md:w-auto md:min-w-[145px]"
                buttonClassName="h-10 w-full flex items-center justify-between gap-2 px-3 border border-gray-200 bg-white rounded-xl text-xs sm:text-sm text-gray-700 font-medium transition-colors cursor-pointer hover:border-gray-400 focus:outline-none shadow-2xs"
              />

              {/* Status Dropdown */}
              <SelectDropdown
                value={selectedStatus[0] || ""}
                onChange={(val) => setSelectedStatus(val ? [val] : [])}
                options={[
                  { value: "", label: "All Statuses" },
                  { value: "Active", label: "Active" },
                  { value: "Placed", label: "Placed" },
                  { value: "Dropped", label: "Dropped" },
                  { value: "Completed", label: "Completed" },
                  { value: "Dummy", label: "Dummy" }
                ]}
                className="w-full md:w-auto md:min-w-[135px]"
                buttonClassName="h-10 w-full flex items-center justify-between gap-2 px-3 border border-gray-200 bg-white rounded-xl text-xs sm:text-sm text-gray-700 font-medium transition-colors cursor-pointer hover:border-gray-400 focus:outline-none shadow-2xs"
              />

              {/* Session Dropdown Filter */}
              <SelectDropdown
                value={selectedSessionId}
                onChange={(val) => setSelectedSessionId(val)}
                options={[
                  { value: "", label: "All Sessions" },
                  ...sessions.map((s) => {
                    const statusText = s.status 
                      ? s.status.charAt(0).toUpperCase() + s.status.slice(1)
                      : (s.isActive ? 'Active' : 'Inactive');
                    return { value: s._id, label: `${s.name} (${statusText})` };
                  })
                ]}
                className="w-full md:w-auto md:min-w-[145px]"
                buttonClassName="h-10 w-full flex items-center justify-between gap-2 px-3 border border-gray-200 bg-white rounded-xl text-xs sm:text-sm text-gray-700 font-medium transition-colors cursor-pointer hover:border-gray-400 focus:outline-none shadow-2xs"
              />

              {/* Desktop Reset Button */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="hidden md:inline-flex h-10 px-3 items-center justify-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-xl border border-orange-200/80 transition cursor-pointer active:scale-95"
                  title="Reset all filters"
                >
                  <RotateCcw size={13} />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── DESKTOP & TABLET VIEW: FULL DATA TABLE (>= 768px) ── */}
        <div className="hidden md:block">
          <CommonTable
            data={filteredData}
            columns={columns}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            pagination
            rowsPerPage={10}
            emptyMessage={activeTab === "All" ? "No data found" : `No students in the sub level ${activeTab}`}
            filtersConfig={[
              {
                title: "Status",
                options: ["Active", "Placed", "Dropped", "Completed", "Dummy"],
                selected: selectedStatus,
                setter: setSelectedStatus,
              },
              {
                title: "Session",
                options: sessions.map(s => s.name),
                selected: selectedSessionId ? [sessions.find(s => s._id === selectedSessionId)?.name || selectedSessionId] : [],
                setter: (vals) => {
                  if (vals.length === 0) setSelectedSessionId("");
                  else {
                    const match = sessions.find(s => s.name === vals[0]);
                    setSelectedSessionId(match ? match._id : vals[0]);
                  }
                },
              },
            ]}
            extraColumn={{
              header: "Task Board",
              render: (row) => (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate("/student/task-board", {
                      state: {
                        student: row,
                        level: row.currentLevelId,
                        subdepartment: row.subDepartmentId,
                      },
                    });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-500 transition hover:bg-orange-100"
                >
                  <MdTableChart size={14} /> Task Board
                </button>
              ),
            }}
            onRowClick={(row) => navigate(`/student-profile/${row._id}`)}
          />
        </div>

        {/* ── MOBILE VIEW: MODERN STUDENT CARDS (< 768px) ── */}
        <div className="md:hidden space-y-3">
          {filteredData.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto">
                <Search size={22} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">
                  {activeTab === "All" ? "No students found" : `No students in sub-level ${activeTab}`}
                </p>
                <p className="text-xs text-gray-400 mt-1">Try adjusting your search terms or filters</p>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-50 px-3.5 py-2 rounded-xl border border-orange-200 hover:bg-orange-100 transition cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>Reset All Filters</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {paginatedMobileData.map((row) => (
                <div
                  key={row._id}
                  onClick={() => navigate(`/student-profile/${row._id}`)}
                  className="bg-white border border-gray-200 rounded-2xl p-3.5 shadow-xs hover:shadow-sm hover:border-orange-200 transition-all duration-200 active:scale-[0.99] cursor-pointer space-y-3"
                >
                  {/* Top Row: Avatar, Student Name, PR Key, Status Badge */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <Avatar firstName={row.firstName} lastName={row.lastName} imageUrl={row.image} />
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm text-gray-900 truncate leading-snug">
                          {toTitle(`${row.firstName} ${row.lastName}`)}
                        </h4>
                        <span className="text-[11px] font-mono font-medium text-gray-400 block mt-0.5">
                          {row.prkey || "ID N/A"}
                        </span>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border shrink-0 ${STATUS_COLORS[row.status] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                      {row.status}
                    </span>
                  </div>

                  {/* Middle Details Grid */}
                  <div className="bg-gray-50/80 rounded-xl p-2.5 border border-gray-150 text-xs space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-gray-400 font-medium">Level / Sub-Level:</span>
                      <span className="font-bold text-gray-700 truncate">
                        {row.currentLevelId?.name || "—"} / {row.currentSubLevelId?.name || "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-gray-400 font-medium">Session:</span>
                      <span className="text-[10.5px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 truncate">
                        {row.sessionId?.name || "Session N/A"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-gray-400 font-medium">Course:</span>
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 text-[10.5px] uppercase truncate">
                        {row.course || "N/A"}
                      </span>
                    </div>

                    {row.fatherName && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-400 font-medium">Father's Name:</span>
                        <span className="font-semibold text-gray-700 truncate">
                          {toTitle(row.fatherName)}
                        </span>
                      </div>
                    )}

                    {row.studentMobile && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-400 font-medium">Mobile:</span>
                        <a
                          href={`tel:${row.studentMobile}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-bold text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1"
                        >
                          <Phone size={11} />
                          <span>{row.studentMobile}</span>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Bottom Actions */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate("/student/task-board", {
                          state: {
                            student: row,
                            level: row.currentLevelId,
                            subdepartment: row.subDepartmentId,
                          },
                        });
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-600 hover:bg-orange-100 transition active:scale-95 cursor-pointer shadow-2xs"
                    >
                      <MdTableChart size={15} />
                      <span>Task Board</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/student-profile/${row._id}`)}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition active:scale-95 cursor-pointer shadow-2xs"
                    >
                      <span>Profile</span>
                      <ChevronRight size={14} className="text-gray-400" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Mobile Pagination */}
              {filteredData.length > mobilePageSize && (
                <div className="bg-white rounded-2xl border border-gray-200 p-3 shadow-xs">
                  <Pagination
                    totalItems={filteredData.length}
                    currentPage={mobilePage}
                    pageSize={mobilePageSize}
                    totalPages={Math.max(1, Math.ceil(filteredData.length / mobilePageSize))}
                    onPageChange={setMobilePage}
                    label="students"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default StudentDetailTable;
