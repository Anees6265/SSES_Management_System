import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGetNewStudentsQuery, useGetAllSessionsQuery, useGetSubdepartmentByIdQuery, useGetAllLevelsQuery, useGetAllSubLevelsQuery } from "../../../redux/api/authApi";
import Loader from "../../shared/loader/Loader";
import SelectDropdown from "../../shared/form-fields/SelectDropdown";
import CommonTable from "../../shared/table/CommonTable";
import Header from "../../shared/sidebar/Header";
import Avatar from "../../shared/Avatar";
import { MdTableChart } from "react-icons/md";
import SearchBox from "../../shared/search-export/SearchBox";

const toTitle = (str) =>
  str?.toLowerCase().split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || "";

const STATUS_COLORS = {
  Active: "bg-green-100 text-green-700",
  Placed: "bg-purple-100 text-purple-700",
  Dropped: "bg-red-100 text-red-700",
  Completed: "bg-blue-100 text-blue-700",
  Dummy: "bg-orange-100 text-orange-700",
};

const StudentDetailTable = () => {
  const navigate = useNavigate();
  const { subDepartmentId } = useParams(); // present for admin, absent for faculty

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedTech, setSelectedTech] = useState("All");

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
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[row.status] || "bg-gray-100 text-gray-600"}`}>
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
      <div className="bg-white border-b px-6 flex gap-1 overflow-x-auto">
        {subLevelTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition ${activeTab === tab
              ? "border-orange-500 text-orange-500"
              : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
          >
            {tab}
            <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
              {tab === "All"
                ? students.length
                : students.filter((s) => s.currentSubLevelId?.name === tab).length}
            </span>
          </button>
        ))}
      </div>

      <div className="p-5 space-y-4">
        {/* Search and Filters */}
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex-wrap">
          <SearchBox searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

          <div className="sm:ml-auto flex items-center gap-3 flex-wrap w-full sm:w-auto">
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
              className="min-w-[150px] w-auto"
              buttonClassName="h-10 w-full flex items-center justify-between gap-2 px-3 border border-gray-250 bg-white rounded-lg text-sm text-gray-600 font-medium transition-colors cursor-pointer focus:outline-none hover:border-gray-400"
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
              className="min-w-[140px] w-auto"
              buttonClassName="h-10 w-full flex items-center justify-between gap-2 px-3 border border-gray-250 bg-white rounded-lg text-sm text-gray-600 font-medium transition-colors cursor-pointer focus:outline-none hover:border-gray-400"
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
              className="min-w-[150px] w-auto"
              buttonClassName="h-10 w-full flex items-center justify-between gap-2 px-3 border border-gray-250 bg-white rounded-lg text-sm text-gray-600 font-medium transition-colors cursor-pointer focus:outline-none hover:border-gray-400"
            />
          </div>
        </div>

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
    </>
  );
};

export default StudentDetailTable;
