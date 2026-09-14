/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import { Formik, Form, useFormikContext } from "formik";
import * as Yup from "yup";
import { toast } from "react-toastify";
import {
  MdDeleteOutline,
  MdInsertDriveFile,
  MdMoreVert,
  MdOutlineUploadFile,
  MdVisibility,
  MdSearch,
  MdRefresh,
  MdPictureAsPdf,
  MdCheckCircle,
  MdClose,
  MdFilterList,
  MdExpandMore,
} from "react-icons/md";
import { HiOutlineBookOpen } from "react-icons/hi";
import Header from "../../../shared/sidebar/Header";
import OrangeButton from "../../../shared/sidebar/OrangeButton";
import InputField from "../../../shared/form-fields/InputField";
import SelectDropdown from "../../../shared/form-fields/SelectDropdown";
import CustomDropdown from "../../../shared/form-fields/CustomDropdown";
import RadioGroup from "../../../shared/form-fields/RadioGroup";
import {
  useCreateSyllabusVersionMutation,
  useDeleteSyllabusVersionMutation,
  useGetAllDepartmentsQuery,
  useGetAllLevelsQuery,
  useGetAllSessionsQuery,
  useGetAllSubLevelsQuery,
  useGetAllSubdepartmentsQuery,
  useGetAllSyllabusVersionsQuery,
  useGetAllTasksQuery,
} from "../../../../redux/api/authApi";

const curriculumSchema = Yup.object({
  sessionId: Yup.string().required("Session is required"),
  departmentId: Yup.string().required("Department is required"),
  subDepartmentId: Yup.string().required("Sub-department is required"),
  levelId: Yup.string().required("Level is required"),
  subLevelId: Yup.string().required("Sub-level is required"),
  title: Yup.string().required("Curriculum title is required"),
  version: Yup.string(),
  syllabusFile: Yup.mixed().nullable(),
  taskList: Yup.mixed().nullable(),
  isActive: Yup.boolean(),
});

const INITIAL_VALUES = {
  sessionId: "",
  departmentId: "",
  subDepartmentId: "",
  levelId: "",
  subLevelId: "",
  title: "",
  version: "",
  syllabusFile: null,
  taskList: null,
  isActive: true,
};

const getId = (value) => (typeof value === "object" ? value?._id : value);

const formatAcademicYear = (session) => {
  if (!session?.startDate || !session?.endDate) return "-";
  const startYear = new Date(session.startDate).getFullYear();
  const endYear = new Date(session.endDate).getFullYear();
  if (!startYear || !endYear) return "-";
  return `${startYear}-${String(endYear).slice(-2)}`;
};

const toOptions = (items, getLabel = (item) => item.name) => (
  items
    .filter(Boolean)
    .map((item) => ({ value: item._id, label: getLabel(item) }))
);

const getOptionValues = (items, key) => (
  [...new Set(items.map((item) => item[key]).filter((value) => value && value !== "-"))]
    .sort((a, b) => String(a).localeCompare(String(b)))
);

const FileUploadField = ({ label, name, accept }) => {
  const { setFieldValue, values } = useFormikContext();
  const fileName = values[name]?.name || "";

  return (
    <div className="w-full">
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>
      <label className="flex items-center gap-3 w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:border-orange-400 hover:bg-white transition group shadow-2xs">
        <MdOutlineUploadFile size={18} className="text-orange-500 flex-shrink-0" />
        <span className={`text-xs truncate flex-1 ${fileName ? "text-slate-800 font-semibold" : "text-slate-400"}`}>
          {fileName || `Select ${label.toLowerCase()}`}
        </span>
        {fileName && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setFieldValue(name, null);
            }}
            className="text-slate-400 hover:text-rose-500 transition text-sm leading-none font-bold p-1"
          >
            x
          </button>
        )}
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files[0] || null;
            setFieldValue(name, file);
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
};

const CurriculumDrawerForm = ({ sessions, departments, subDepartments, levels, subLevels }) => {
  const { values, setFieldValue } = useFormikContext();

  const sessionOptions = toOptions(sessions, (item) => `${item.name}${item.status ? ` (${item.status})` : ""}`);
  const departmentOptions = toOptions(departments);
  const subDepartmentOptions = toOptions(
    subDepartments.filter((item) => getId(item.departmentId) === values.departmentId)
  );
  const levelOptions = toOptions(
    levels.filter((item) => getId(item.subDepartmentId) === values.subDepartmentId),
    (item) => `${item.name}${item.order ? ` (${item.order})` : ""}`
  );
  const subLevelOptions = toOptions(
    subLevels.filter((item) => getId(item.levelId) === values.levelId),
    (item) => `${item.name}${item.order ? ` (${item.order})` : ""}`
  );

  return (
    <Form className="space-y-4 text-xs font-semibold">
      <InputField label="Curriculum Title" name="title" placeholder="Enter curriculum title..." />
      <InputField label="Version" name="version" placeholder="Auto if blank, e.g. v1.0" />

      <CustomDropdown label="Session" name="sessionId" variant="card" options={sessionOptions} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CustomDropdown
          label="Department"
          name="departmentId"
          variant="card"
          options={departmentOptions}
        />
        <CustomDropdown
          label="Sub-Department"
          name="subDepartmentId"
          variant="card"
          disabled={!values.departmentId}
          options={subDepartmentOptions}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CustomDropdown
          label="Level"
          name="levelId"
          variant="card"
          disabled={!values.subDepartmentId}
          options={levelOptions}
        />
        <CustomDropdown
          label="Sub-Level"
          name="subLevelId"
          variant="card"
          disabled={!values.levelId}
          options={subLevelOptions}
        />
      </div>

      <FileUploadField label="Syllabus File Reference" name="syllabusFile" accept=".pdf,.doc,.docx,.xlsx,.xls,.csv" />
      <FileUploadField label="Task List File Reference" name="taskList" accept=".xlsx,.xls,.csv" />

      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
        <div>
          <p className="text-xs font-bold text-slate-800">Active Status</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Create this curriculum as active</p>
        </div>
        <RadioGroup label="" name="isActive" required={false} />
      </div>

      <SyncDependentFields setFieldValue={setFieldValue} values={values} />
    </Form>
  );
};

const SyncDependentFields = ({ values, setFieldValue }) => {
  useEffect(() => {
    if (!values.departmentId) setFieldValue("subDepartmentId", "");
    if (!values.subDepartmentId) setFieldValue("levelId", "");
    if (!values.levelId) setFieldValue("subLevelId", "");
  }, [values.departmentId, values.subDepartmentId, values.levelId, setFieldValue]);
  return null;
};

const FileCell = ({ fileName }) => {
  if (!fileName) return <span className="text-xs font-medium text-slate-400 italic">Not Uploaded</span>;
  return (
    <div className="flex items-center gap-1.5 cursor-pointer group">
      <MdInsertDriveFile size={16} className="text-orange-500 flex-shrink-0 group-hover:scale-110 transition" />
      <span className="text-xs font-extrabold text-orange-600 truncate max-w-[170px] group-hover:underline">{fileName}</span>
    </div>
  );
};

const ActionMenu = ({ row, onDelete }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex justify-end">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((p) => !p);
        }}
        className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
      >
        <MdMoreVert size={18} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 bg-white border border-slate-100 rounded-2xl shadow-xl w-36 py-1.5 overflow-hidden text-xs font-semibold text-slate-700">
            <button
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 w-full px-4 py-2 text-left transition text-slate-300 cursor-not-allowed"
              disabled
            >
              <MdVisibility size={15} /> View Record
            </button>
            <button
              onClick={() => {
                setOpen(false);
                onDelete?.(row);
              }}
              className="flex items-center gap-2 w-full px-4 py-2 text-left transition text-rose-600 hover:bg-rose-50 font-bold"
            >
              <MdDeleteOutline size={15} /> Delete Record
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const CurriculumManagement = () => {
  const role = (
    localStorage.getItem("role") ||
    (() => {
      try {
        return JSON.parse(localStorage.getItem("user") || "{}")?.role;
      } catch {
        return "";
      }
    })() ||
    ""
  ).toLowerCase();
  const isFaculty = role === "faculty";

  const [searchTerm, setSearchTerm] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterSession, setFilterSession] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterSub, setFilterSub] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const { data: versionsData, isLoading, isFetching, isError, refetch } = useGetAllSyllabusVersionsQuery();
  const { data: sessionsData } = useGetAllSessionsQuery(true);
  const { data: departmentsData } = useGetAllDepartmentsQuery();
  const { data: subDepartmentsData } = useGetAllSubdepartmentsQuery();
  const { data: levelsData } = useGetAllLevelsQuery();
  const { data: subLevelsData } = useGetAllSubLevelsQuery();
  const { data: tasksData } = useGetAllTasksQuery({ status: "all" });
  const [createSyllabusVersion] = useCreateSyllabusVersionMutation();
  const [deleteSyllabusVersion] = useDeleteSyllabusVersionMutation();

  const sessions = sessionsData?.data || [];
  const departments = departmentsData?.data || [];
  const subDepartments = subDepartmentsData?.data || [];
  const levels = levelsData?.data || [];
  const subLevels = subLevelsData?.data || [];
  const tasks = tasksData?.data || [];

  const taskCountByVersion = useMemo(() => {
    return tasks.reduce((acc, task) => {
      const versionId = getId(task.syllabusVersionId);
      if (versionId) acc[versionId] = (acc[versionId] || 0) + 1;
      return acc;
    }, {});
  }, [tasks]);

  const curriculumRows = useMemo(() => {
    return (versionsData?.data || []).map((version) => {
      const level = version.levelId || {};
      const subDepartment = level.subDepartmentId || {};
      const department = subDepartment.departmentId || {};
      const taskCount = taskCountByVersion[version._id] || 0;

      return {
        id: version._id,
        academicYear: formatAcademicYear(version.sessionId),
        session: version.sessionId?.name || "-",
        department: department.name || "-",
        subDept: subDepartment.name || "-",
        level: level.name || "-",
        subLevel: version.subLevelId?.name || "-",
        syllabusFile: version.title || version.version || "Syllabus Version",
        taskList: taskCount ? `${taskCount} task${taskCount > 1 ? "s" : ""}` : null,
        status: version.status || "active",
        raw: version,
      };
    });
  }, [versionsData, taskCountByVersion]);

  const filtered = useMemo(() => curriculumRows.filter((row) => {
    const q = searchTerm.trim().toLowerCase();
    const searchable = [
      row.syllabusFile,
      row.department,
      row.subDept,
      row.level,
      row.subLevel,
      row.session,
      row.id,
    ].join(" ").toLowerCase();

    return (
      (!q || searchable.includes(q)) &&
      (!filterYear || row.academicYear === filterYear) &&
      (!filterSession || row.session === filterSession) &&
      (!filterDept || row.department === filterDept) &&
      (!filterSub || row.subDept === filterSub) &&
      (!filterLevel || row.level === filterLevel) &&
      (!filterStatus || row.status === filterStatus)
    );
  }), [curriculumRows, searchTerm, filterYear, filterSession, filterDept, filterSub, filterLevel, filterStatus]);

  const resetFilters = () => {
    setSearchTerm("");
    setFilterYear("");
    setFilterSession("");
    setFilterDept("");
    setFilterSub("");
    setFilterLevel("");
    setFilterStatus("");
    setCurrentPage(1);
  };

  const handleDelete = async (row) => {
    if (!row?.id) return;
    if (!window.confirm(`Delete curriculum "${row.syllabusFile}"?`)) return;

    try {
      await deleteSyllabusVersion(row.id).unwrap();
      toast.success("Curriculum deleted successfully");
      refetch();
    } catch (error) {
      toast.error(error?.data?.message || "Failed to delete curriculum");
    }
  };

  const handleUpload = async (values, { setSubmitting, resetForm }) => {
    try {
      const subjectName = values.syllabusFile?.name
        ? values.syllabusFile.name.replace(/\.[^.]+$/, "")
        : values.title;

      await createSyllabusVersion({
        sessionId: values.sessionId,
        levelId: values.levelId,
        subLevelId: values.subLevelId,
        title: values.title,
        version: values.version || undefined,
        subjects: [{ name: subjectName, topics: [] }],
      }).unwrap();

      toast.success("Curriculum created successfully");
      resetForm();
      refetch();
    } catch (error) {
      toast.error(error?.data?.message || "Failed to create curriculum");
    } finally {
      setSubmitting(false);
    }
  };

  const years = getOptionValues(curriculumRows, "academicYear");
  const sessionNames = getOptionValues(curriculumRows, "session");
  const depts = getOptionValues(curriculumRows, "department");
  const subs = getOptionValues(curriculumRows, "subDept");
  const levelNames = getOptionValues(curriculumRows, "level");
  const statuses = getOptionValues(curriculumRows, "status");

  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const activeFilterCount = [
    Boolean(filterYear),
    Boolean(filterSession),
    Boolean(filterDept),
    Boolean(filterSub),
    Boolean(filterLevel),
    Boolean(filterStatus),
  ].filter(Boolean).length;

  const hasActiveFilters = Boolean(
    searchTerm || activeFilterCount > 0
  );

  const totalPages = Math.ceil(filtered.length / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedData = filtered.slice(startIndex, startIndex + rowsPerPage);

  return (
    <Formik initialValues={INITIAL_VALUES} validationSchema={curriculumSchema} onSubmit={handleUpload}>
      {({ isSubmitting, submitForm, resetForm }) => (
        <>
          <Header
            title="Curriculum Management"
            subtitle="Manage syllabus and task lists across departments, sessions, and levels"
            badge={`${curriculumRows.length} curricula`}
            breadcrumbs={[{ label: "Settings" }, { label: "Curriculum", path: "/curriculum-management" }]}
          />

          <div className="p-3 sm:p-5 lg:p-6 w-full min-h-screen bg-gray-50/40 space-y-4 sm:space-y-6">

            {/* Top Action & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-2xs">
              {!isFaculty && (
                <OrangeButton
                  buttonTitle="+ Upload Curriculum"
                  panelTitle="Upload Curriculum"
                  panelSubtitle="Create a syllabus-version record for a department, session, level, and sub-level"
                  customButtonClass="w-full sm:w-auto flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs active:scale-95 cursor-pointer"
                  drawerContent={
                    <CurriculumDrawerForm
                      sessions={sessions}
                      departments={departments}
                      subDepartments={subDepartments}
                      levels={levels}
                      subLevels={subLevels}
                    />
                  }
                  leftBtnText="Cancel"
                  rightBtnText={isSubmitting ? "Uploading..." : "Upload"}
                  onLeftClick={resetForm}
                  onRightClick={submitForm}
                />
              )}

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-72 md:w-80">
                  <MdSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search file, dept, level..."
                    className="w-full pl-9 pr-8 h-10 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-slate-50/50 hover:bg-white text-slate-800 placeholder-slate-400 transition shadow-2xs"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm("");
                        setCurrentPage(1);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      aria-label="Clear search"
                    >
                      <MdClose size={16} />
                    </button>
                  )}
                </div>

                {/* Mobile Filters Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowMobileFilters((p) => !p)}
                  className={`md:hidden h-10 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                    showMobileFilters || activeFilterCount > 0
                      ? "bg-orange-50 border-orange-200 text-orange-600"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <MdFilterList size={17} />
                  <span>Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-orange-500 text-white text-[9px] font-extrabold flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                  <MdExpandMore
                    size={16}
                    className={`transition-transform duration-200 ${showMobileFilters ? "rotate-180" : ""}`}
                  />
                </button>
              </div>
            </div>

            {/* Filter Section - Desktop: Grid */}
            <div className="hidden md:block bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Filter by Parameters
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-xs font-bold text-orange-500 hover:text-orange-600 transition flex items-center gap-1 cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
              <div className="grid grid-cols-6 gap-3">
                <SelectDropdown
                  value={filterYear}
                  onChange={(val) => { setFilterYear(val); setCurrentPage(1); }}
                  options={[{ value: "", label: "Academic Year" }, ...years.map((y) => ({ value: y, label: y }))]}
                  buttonClassName="h-9 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold transition-colors cursor-pointer hover:border-orange-400 shadow-2xs"
                />
                <SelectDropdown
                  value={filterSession}
                  onChange={(val) => { setFilterSession(val); setCurrentPage(1); }}
                  options={[{ value: "", label: "Session" }, ...sessionNames.map((s) => ({ value: s, label: s }))]}
                  buttonClassName="h-9 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold transition-colors cursor-pointer hover:border-orange-400 shadow-2xs"
                />
                <SelectDropdown
                  value={filterDept}
                  onChange={(val) => { setFilterDept(val); setCurrentPage(1); }}
                  options={[{ value: "", label: "Department" }, ...depts.map((d) => ({ value: d, label: d }))]}
                  buttonClassName="h-9 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold transition-colors cursor-pointer hover:border-orange-400 shadow-2xs"
                />
                <SelectDropdown
                  value={filterSub}
                  onChange={(val) => { setFilterSub(val); setCurrentPage(1); }}
                  options={[{ value: "", label: "Sub-Dept" }, ...subs.map((sd) => ({ value: sd, label: sd }))]}
                  buttonClassName="h-9 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold transition-colors cursor-pointer hover:border-orange-400 shadow-2xs"
                />
                <SelectDropdown
                  value={filterLevel}
                  onChange={(val) => { setFilterLevel(val); setCurrentPage(1); }}
                  options={[{ value: "", label: "Level" }, ...levelNames.map((l) => ({ value: l, label: l }))]}
                  buttonClassName="h-9 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold transition-colors cursor-pointer hover:border-orange-400 shadow-2xs"
                />
                <SelectDropdown
                  value={filterStatus}
                  onChange={(val) => { setFilterStatus(val); setCurrentPage(1); }}
                  options={[{ value: "", label: "Status" }, ...statuses.map((st) => ({ value: st, label: st }))]}
                  buttonClassName="h-9 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold transition-colors cursor-pointer hover:border-orange-400 shadow-2xs"
                />
              </div>
            </div>

            {/* Mobile Filters: Collapsible card */}
            {showMobileFilters && (
              <div className="md:hidden bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Filter Options {activeFilterCount > 0 && `(${activeFilterCount} active)`}
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="text-xs font-bold text-orange-500 hover:text-orange-600 transition cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <SelectDropdown
                    value={filterYear}
                    onChange={(val) => { setFilterYear(val); setCurrentPage(1); }}
                    options={[{ value: "", label: "Academic Year" }, ...years.map((y) => ({ value: y, label: y }))]}
                    buttonClassName="h-9 w-full flex items-center justify-between gap-1.5 px-2.5 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold shadow-2xs"
                  />
                  <SelectDropdown
                    value={filterSession}
                    onChange={(val) => { setFilterSession(val); setCurrentPage(1); }}
                    options={[{ value: "", label: "Session" }, ...sessionNames.map((s) => ({ value: s, label: s }))]}
                    buttonClassName="h-9 w-full flex items-center justify-between gap-1.5 px-2.5 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold shadow-2xs"
                  />
                  <SelectDropdown
                    value={filterDept}
                    onChange={(val) => { setFilterDept(val); setCurrentPage(1); }}
                    options={[{ value: "", label: "Department" }, ...depts.map((d) => ({ value: d, label: d }))]}
                    buttonClassName="h-9 w-full flex items-center justify-between gap-1.5 px-2.5 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold shadow-2xs"
                  />
                  <SelectDropdown
                    value={filterSub}
                    onChange={(val) => { setFilterSub(val); setCurrentPage(1); }}
                    options={[{ value: "", label: "Sub-Dept" }, ...subs.map((sd) => ({ value: sd, label: sd }))]}
                    buttonClassName="h-9 w-full flex items-center justify-between gap-1.5 px-2.5 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold shadow-2xs"
                  />
                  <SelectDropdown
                    value={filterLevel}
                    onChange={(val) => { setFilterLevel(val); setCurrentPage(1); }}
                    options={[{ value: "", label: "Level" }, ...levelNames.map((l) => ({ value: l, label: l }))]}
                    buttonClassName="h-9 w-full flex items-center justify-between gap-1.5 px-2.5 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold shadow-2xs"
                  />
                  <SelectDropdown
                    value={filterStatus}
                    onChange={(val) => { setFilterStatus(val); setCurrentPage(1); }}
                    options={[{ value: "", label: "Status" }, ...statuses.map((st) => ({ value: st, label: st }))]}
                    buttonClassName="h-9 w-full flex items-center justify-between gap-1.5 px-2.5 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold shadow-2xs"
                  />
                </div>
              </div>
            )}

            {/* DATA CONTAINER */}
            <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl shadow-2xs overflow-hidden">
              {isLoading ? (
                <div className="py-20 text-center text-xs font-semibold text-slate-400">Loading curriculum database...</div>
              ) : isError ? (
                <div className="py-20 text-center space-y-3">
                  <p className="text-xs font-bold text-rose-500">Failed to load curriculum records</p>
                  <button onClick={refetch} className="px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer">
                    Retry Loading
                  </button>
                </div>
              ) : paginatedData.length === 0 ? (
                <div className="py-16 text-center text-slate-400 px-4 space-y-2">
                  <HiOutlineBookOpen size={32} className="mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-700">No curriculum records matching selected filters</p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">Try clearing your search query or reset filter selections to see more records.</p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="mt-2 text-xs font-bold text-orange-500 hover:text-orange-600 cursor-pointer"
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Mobile Cards Layout (block md:hidden) */}
                  <div className="block md:hidden divide-y divide-slate-100">
                    {paginatedData.map((row) => (
                      <div key={row.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition">
                        {/* Top Row: Year/Session Chip + Status + Action Menu */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-extrabold text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-md">
                              {row.academicYear} • {row.session}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              row.status === "active"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}>
                              {row.status}
                            </span>
                          </div>
                          <ActionMenu row={row} onDelete={handleDelete} />
                        </div>

                        {/* Title & Department Hierarchy */}
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-900 leading-snug">
                            {row.syllabusFile}
                          </h4>
                          <p className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1 flex-wrap">
                            <span className="font-bold text-slate-700">{row.department}</span>
                            <span className="text-slate-300">/</span>
                            <span>{row.subDept}</span>
                          </p>
                          <div className="mt-1.5">
                            <span className="inline-block text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                              {row.level} ({row.subLevel})
                            </span>
                          </div>
                        </div>

                        {/* File Reference & Task Count Chips */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                          <div className="bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Syllabus File</p>
                            <FileCell fileName={row.syllabusFile} />
                          </div>
                          <div className="bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Task List</p>
                            <FileCell fileName={row.taskList} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table Layout (hidden md:block) */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          <th className="py-4 px-6">ACADEMIC YEAR</th>
                          <th className="py-4 px-4">SESSION</th>
                          <th className="py-4 px-6">DEPARTMENT</th>
                          <th className="py-4 px-6">SUB-DEPARTMENT</th>
                          <th className="py-4 px-4">LEVEL</th>
                          <th className="py-4 px-6">SYLLABUS FILE</th>
                          <th className="py-4 px-6">TASK LIST</th>
                          <th className="py-4 px-6 text-right">ACTION</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                        {paginatedData.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-4 px-6 font-extrabold text-slate-900">{row.academicYear}</td>
                            <td className="py-4 px-4 text-slate-600 font-medium">{row.session}</td>
                            <td className="py-4 px-6 font-bold text-slate-900">{row.department}</td>
                            <td className="py-4 px-6 text-slate-600 font-medium">{row.subDept}</td>
                            <td className="py-4 px-4 text-slate-700 font-bold">{row.level} ({row.subLevel})</td>
                            <td className="py-4 px-6"><FileCell fileName={row.syllabusFile} /></td>
                            <td className="py-4 px-6"><FileCell fileName={row.taskList} /></td>
                            <td className="py-4 px-6 text-right"><ActionMenu row={row} onDelete={handleDelete} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Responsive Pagination Row */}
                  <div className="px-4 sm:px-6 py-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-semibold text-slate-500">
                    <div className="text-center sm:text-left text-[11px] sm:text-xs">
                      Showing <span className="font-bold text-slate-700">{filtered.length > 0 ? startIndex + 1 : 0}</span> to{" "}
                      <span className="font-bold text-slate-700">{Math.min(startIndex + rowsPerPage, filtered.length)}</span> of{" "}
                      <span className="font-bold text-slate-700">{filtered.length}</span> results
                    </div>

                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition text-slate-700 font-bold text-xs cursor-pointer shadow-2xs"
                      >
                        Previous
                      </button>

                      {/* Mobile: Condensed page text */}
                      <div className="sm:hidden px-2 text-xs font-bold text-slate-700">
                        {currentPage} / {totalPages}
                      </div>

                      {/* Desktop: Numbered buttons */}
                      <div className="hidden sm:flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                          <button
                            type="button"
                            key={pg}
                            onClick={() => setCurrentPage(pg)}
                            className={`w-8 h-8 rounded-xl font-bold transition text-xs cursor-pointer ${
                              currentPage === pg
                                ? "bg-orange-500 text-white shadow-2xs"
                                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs"
                            }`}
                          >
                            {pg}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition text-slate-700 font-bold text-xs cursor-pointer shadow-2xs"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>
        </>
      )}
    </Formik>
  );
};

export default CurriculumManagement;
