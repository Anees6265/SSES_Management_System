/* eslint-disable react/prop-types */
import { useMemo, useState, useRef } from "react";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";
import { confirmToast } from "../../../../utils/confirmToast";
import {
  MdDeleteOutline,
  MdInsertDriveFile,
  MdMoreVert,
  MdVisibility,
  MdSearch,
  MdCheckCircle,
  MdClose,
  MdFilterList,
  MdExpandMore,
  MdExpandLess,
  MdCloudUpload,
  MdFileDownload,
  MdBook,
  MdSave,
  MdAssignment,
} from "react-icons/md";
import Header from "../../../shared/sidebar/Header";
import OrangeButton from "../../../shared/sidebar/OrangeButton";
import EmptyState from "../../../shared/empty-state/EmptyState";
import Pagination from "../../../shared/pagination/Pagination";
import SelectDropdown from "../../../shared/form-fields/SelectDropdown";
import {
  useUploadCombinedSyllabusMutation,
  useDeleteSyllabusVersionMutation,
  useGetAllDepartmentsQuery,
  useGetAllLevelsQuery,
  useGetAllSessionsQuery,
  useGetAllSubLevelsQuery,
  useGetAllSubdepartmentsQuery,
  useGetAllSyllabusVersionsQuery,
  useGetAllTasksQuery,
  useGetSyllabusVersionWithHierarchyQuery,
  useGetTasksBySyllabusVersionQuery,
} from "../../../../redux/api/authApi";
import { filterSessionsByDepartment, formatSessionLabel } from "../../../../utils/sessionDurationHelpers";
import { getDomainsForDepartment } from "../../../../utils/ftpConfig";

/* ─── Helpers ─────────────────────────────────────────── */
const getId = (value) => (typeof value === "object" ? value?._id : value);
const normalize = (v) => (v === undefined || v === null ? "" : String(v).trim());

const isSoftSkillSubject = (name = "") => {
  if (!name || typeof name !== "string") return false;
  const clean = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  return (
    clean.includes("softskill") ||
    clean.includes("communicationskill") ||
    clean.includes("personalitydevelopment") ||
    clean.includes("softskills") ||
    clean.includes("communication") ||
    clean.includes("personality")
  );
};

const formatAcademicYear = (session) => {
  if (!session?.startDate || !session?.endDate) return "-";
  const startYear = new Date(session.startDate).getFullYear();
  const endYear = new Date(session.endDate).getFullYear();
  if (!startYear || !endYear) return "-";
  return `${startYear}-${String(endYear).slice(-2)}`;
};

const getOptionValues = (items, key) => (
  [...new Set(items.map((item) => item[key]).filter((value) => value && value !== "-"))]
    .sort((a, b) => String(a).localeCompare(String(b)))
);

/* ─── Download Standard Template ──────────────────────── */
const downloadSyllabusTemplate = () => {
  const data = [
    ["Subject", "Topic", "SubTopic", "Task", "Time Days", "Measurable Points"],
    ["JavaScript", "Basics", "Variables", "Q1 - Explain var/let/const", "2", "Student should explain difference between var, let and const"],
    ["JavaScript", "Basics", "Variables", "Q2 - Implement examples", "3", "Student should write 5 examples using each"],
    ["JavaScript", "Basics", "Operators", "Q1 - Operator quiz", "1", "Student should solve 10 operator problems"],
    ["JavaScript", "Functions", "", "Q1 - Write 3 functions", "2", "Student should write declaration, expression and arrow function"],
    ["JavaScript", "DOM", "", "", "", ""],
    ["React", "Hooks", "useState", "Q1 - Build counter", "5", "Student should build a counter app using useState"],
    ["React", "Hooks", "useEffect", "Q1 - Fetch API", "7", "Student should fetch data from an API using useEffect"],
    ["React", "Components", "", "", "", ""],
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = [{ wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 12 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws, "Syllabus+Tasks");

  const instructions = [
    ["INSTRUCTIONS"],
    [""],
    ["COLUMNS:"],
    ["Subject          -> Subject name (e.g. JavaScript, React)"],
    ["Topic            -> Topic name (e.g. Basics, Functions)"],
    ["SubTopic         -> SubTopic name - leave empty if topic has no subtopic"],
    ["Task             -> Task title (e.g. Q1 - Explain...) - leave empty for syllabus-only rows"],
    ["Time Days        -> Expected days to complete the task (number)"],
    ["Measurable Points-> What the student should be able to do"],
    [""],
    ["RULES:"],
    ["1. Subject + Topic are REQUIRED in every row"],
    ["2. SubTopic is optional - leave empty if topic has no subtopic"],
    ["3. Task is optional - leave empty for syllabus-only rows (no task)"],
    ["4. Multiple tasks for same topic/subtopic = multiple rows with same Subject/Topic/SubTopic"],
    ["5. One upload creates both Syllabus structure AND Tasks together in system"],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(instructions);
  ws2["!cols"] = [{ wch: 70 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Instructions");

  XLSX.writeFile(wb, "curriculum_syllabus_tasks_template.xlsx");
};

/* ─── Excel Parser ────────────────────────────────────── */
const parseExcel = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        resolve(XLSX.utils.sheet_to_json(ws, { defval: "" }));
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });

/* ─── Build Hierarchy from Excel Rows ─────────────────── */
const buildHierarchy = (rows) => {
  const subjectMap = new Map();
  rows.forEach((row) => {
    const subject      = normalize(row["Subject"]    || row["subject"] || row["SUBJECT"]);
    const topic        = normalize(row["Topic"]      || row["Topic Name"] || row["topic"] || row["TOPIC"]);
    const subTopicName = normalize(row["SubTopic"]   || row["Sub Topic"]  || row["subtopic"] || row["sub_topic"] || row["SUBTOPIC"]);
    const taskTitle    = normalize(row["Task"]       || row["Task Title"] || row["taskTitle"] || row["Tasks"] || row["TASK"] || "");
    const timeDays     = row["Time Days"] || row["timeDays"] || row["Time"] || row["TIME DAYS"] || null;
    const measurablePoints = normalize(row["Measurable Points"] || row["Measurable Point"] || row["measurablePoints"] || row["MEASURABLE POINTS"] || "");
    if (!subject || !topic) return;
    if (!subjectMap.has(subject)) subjectMap.set(subject, new Map());
    const topicMap = subjectMap.get(subject);
    if (!topicMap.has(topic)) topicMap.set(topic, []);
    const stList = topicMap.get(topic);
    if (subTopicName) {
      const existing = stList.find(st => (typeof st === "object" ? st.name : st) === subTopicName && !taskTitle);
      if (!existing || taskTitle) {
        stList.push(taskTitle ? { name: subTopicName, taskTitle, timeDays, measurablePoints } : { name: subTopicName });
      }
    } else if (taskTitle) {
      stList.push({ name: "__topic_task__", taskTitle, timeDays, measurablePoints, isTopicTask: true });
    }
  });
  return Array.from(subjectMap.entries()).map(([subjectName, topicMap]) => ({
    subject: subjectName,
    topics: Array.from(topicMap.entries()).map(([topicName, stList]) => ({
      topic: topicName,
      subTopics: stList.filter(st => !st.isTopicTask),
      topicTasks: stList.filter(st => st.isTopicTask),
    })),
  }));
};

const buildTaskRows = (hierarchy) => {
  const rows = [];
  hierarchy.forEach(({ subject, topics }) => {
    topics.forEach(({ topic, subTopics, topicTasks }) => {
      (topicTasks || []).forEach(t => {
        rows.push({ subject, topic, subTopic: "", taskTitle: t.taskTitle, timeDays: t.timeDays, measurablePoints: t.measurablePoints });
      });
      (subTopics || []).forEach(st => {
        rows.push({
          subject, topic,
          subTopic: st.name,
          taskTitle: st.taskTitle || "",
          timeDays: st.timeDays || null,
          measurablePoints: st.measurablePoints || ""
        });
      });
      if (!topicTasks?.length && !subTopics?.length) {
        rows.push({ subject, topic, subTopic: "", taskTitle: "", timeDays: null, measurablePoints: "" });
      }
    });
  });
  return rows;
};

/* ─── Preview Accordion Component ─────────────────────── */
const SubjectAccordion = ({ item, index }) => {
  const [open, setOpen] = useState(index === 0);
  const [openTopics, setOpenTopics] = useState({});
  const toggleTopic = (t) => setOpenTopics((p) => ({ ...p, [t]: !p[t] }));

  const taskCount = item.topics.reduce(
    (acc, t) =>
      acc +
      t.subTopics.filter((st) => typeof st === "object" && st.taskTitle).length +
      (t.topicTasks || []).length,
    0
  );

  return (
    <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-2xs">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 bg-slate-50/70 hover:bg-slate-100/60 transition cursor-pointer text-left"
      >
        <div className="flex items-center gap-2">
          <MdBook size={16} className="text-orange-500" />
          <span className="font-extrabold text-xs text-slate-800">{item.subject}</span>
          <span className="text-[10px] text-slate-400 font-semibold">
            ({item.topics.length} topics • {taskCount} tasks)
          </span>
        </div>
        {open ? <MdExpandLess size={17} /> : <MdExpandMore size={17} />}
      </button>

      {open && (
        <div className="p-3 space-y-2 border-t border-slate-100 bg-white">
          {item.topics.map((t) => (
            <div key={t.topic} className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 space-y-1.5">
              <div
                onClick={() => toggleTopic(t.topic)}
                className="flex items-center justify-between cursor-pointer select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs text-slate-700">{t.topic}</span>
                  <span className="text-[10px] text-slate-400">
                    ({t.subTopics.length} subtopics • {(t.topicTasks?.length || 0) + t.subTopics.filter(st => st.taskTitle).length} tasks)
                  </span>
                </div>
                {openTopics[t.topic] ? <MdExpandLess size={15} /> : <MdExpandMore size={15} />}
              </div>

              {openTopics[t.topic] && (
                <div className="pt-1.5 pl-3 space-y-1 border-t border-slate-100">
                  {/* Topic level tasks */}
                  {(t.topicTasks || []).map((task, ki) => (
                    <div key={ki} className="flex items-center justify-between text-[11px] bg-white p-1.5 rounded border border-slate-100">
                      <span className="font-semibold text-slate-800">🎯 Task: {task.taskTitle}</span>
                      {task.timeDays && <span className="text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded font-bold">{task.timeDays}d</span>}
                    </div>
                  ))}

                  {/* Subtopics and their tasks */}
                  {t.subTopics.map((st, si) => (
                    <div key={si} className="text-[11px] bg-white p-1.5 rounded border border-slate-100 space-y-0.5">
                      <div className="font-semibold text-slate-700">📌 {st.name}</div>
                      {st.taskTitle && (
                        <div className="pl-3 text-[10px] text-slate-500 flex items-center justify-between">
                          <span>🎯 {st.taskTitle}</span>
                          {st.timeDays && <span className="text-orange-600 font-bold bg-orange-50 px-1 py-0.2 rounded">{st.timeDays}d</span>}
                        </div>
                      )}
                    </div>
                  ))}
                  {t.subTopics.length === 0 && (!t.topicTasks || t.topicTasks.length === 0) && (
                    <p className="text-[10px] text-slate-400 italic">No subtopics or tasks</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Curriculum Upload Drawer Content ───────────────── */
const CurriculumUploadDrawerContent = ({
  sessions,
  departments,
  subDepartments,
  levels,
  subLevels,
  onSuccess,
  onClose,
}) => {
  const fileRef = useRef(null);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedSubDeptId, setSelectedSubDeptId] = useState("");
  const [selectedLevelId, setSelectedLevelId] = useState("");
  const [selectedSubLevelId, setSelectedSubLevelId] = useState("");
  const [title, setTitle] = useState("");
  const [version, setVersion] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("");

  const [isDragging, setIsDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hierarchy, setHierarchy] = useState([]);
  const [fileName, setFileName] = useState("");
  const [subjectMeta, setSubjectMeta] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

  const [uploadCombined] = useUploadCombinedSyllabusMutation();

  const selectedDept = departments.find((d) => getId(d) === selectedDeptId);
  const selectedLevel = levels.find((l) => getId(l) === selectedLevelId);
  const selectedSubLevel = subLevels.find((sl) => getId(sl) === selectedSubLevelId);

  const isLevel2B = useMemo(() => {
    const sName = String(selectedSubLevel?.name || "").trim().toUpperCase();
    const lName = String(selectedLevel?.name || "").trim().toUpperCase();
    return sName === "2B" || sName.includes("2B") || lName === "2B" || lName.includes("2B");
  }, [selectedLevel, selectedSubLevel]);

  const departmentDomains = useMemo(() => {
    return getDomainsForDepartment(selectedDept?.name || "");
  }, [selectedDept]);

  const filteredSessions = useMemo(() => {
    return filterSessionsByDepartment(sessions, selectedDept?.name || selectedDept);
  }, [sessions, selectedDept]);

  useEffect(() => {
    if (selectedSessionId && filteredSessions.length > 0) {
      const exists = filteredSessions.some((s) => s._id === selectedSessionId);
      if (!exists) setSelectedSessionId("");
    }
  }, [selectedDeptId, filteredSessions]);

  // Dropdown options
  const sessionOptions = [
    { value: "", label: "-- Select Session --" },
    ...filteredSessions.map((s) => ({ value: s._id, label: `${formatSessionLabel(s)}${s.status ? ` (${s.status})` : ""}` })),
  ];
  const deptOptions = [
    { value: "", label: "-- Select Department --" },
    ...departments.map((d) => ({ value: d._id, label: d.name })),
  ];
  const subDeptOptions = [
    { value: "", label: "-- Select Sub-Department --" },
    ...subDepartments
      .filter((sd) => getId(sd.departmentId) === selectedDeptId)
      .map((sd) => ({ value: sd._id, label: sd.name })),
  ];
  const levelOptions = [
    { value: "", label: "-- Select Level --" },
    ...levels
      .filter((lvl) => getId(lvl.subDepartmentId) === selectedSubDeptId)
      .map((lvl) => ({ value: lvl._id, label: `${lvl.name}${lvl.order ? ` (${lvl.order})` : ""}` })),
  ];
  const subLevelOptions = [
    { value: "", label: "-- Select Sub-Level --" },
    ...subLevels
      .filter((sl) => getId(sl.levelId) === selectedLevelId)
      .map((sl) => ({ value: sl._id, label: `${sl.name}${sl.order ? ` (${sl.order})` : ""}` })),
  ];

  // Cascading resets
  const handleDeptChange = (val) => {
    setSelectedDeptId(val);
    setSelectedSubDeptId("");
    setSelectedLevelId("");
    setSelectedSubLevelId("");
    setSelectedDomain("");
  };

  const handleSubDeptChange = (val) => {
    setSelectedSubDeptId(val);
    setSelectedLevelId("");
    setSelectedSubLevelId("");
    setSelectedDomain("");
  };

  const handleLevelChange = (val) => {
    setSelectedLevelId(val);
    setSelectedSubLevelId("");
    setSelectedDomain("");
  };

  const totalSubjects = hierarchy.length;
  const totalTopics = hierarchy.reduce((acc, s) => acc + s.topics.length, 0);
  const totalSubTopics = hierarchy.reduce(
    (acc, s) => acc + s.topics.reduce((a, t) => a + (t.subTopics?.length || 0), 0),
    0
  );
  const totalTasks = hierarchy.reduce(
    (acc, s) =>
      acc +
      s.topics.reduce((a, t) => {
        const stTasks = (t.subTopics || []).filter((st) => st.taskTitle).length;
        const topicTasks = (t.topicTasks || []).length;
        return a + stTasks + topicTasks;
      }, 0),
    0
  );

  const resetFile = () => {
    setHierarchy([]);
    setFileName("");
    setSubjectMeta([]);
    setShowPreview(false);
  };

  const processFile = async (file) => {
    if (!file) return;
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      toast.error("Please upload an Excel (.xlsx, .xls) or .csv file");
      return;
    }
    setParsing(true);
    setHierarchy([]);
    setFileName(file.name);
    try {
      const rows = await parseExcel(file);
      if (!rows.length) {
        toast.error("File is empty or contains no data rows");
        return;
      }
      const firstRow = rows[0];
      const hasSubject = Object.keys(firstRow).some((k) => k.toLowerCase().includes("subject"));
      const hasTopic = Object.keys(firstRow).some((k) => k.toLowerCase().includes("topic"));
      if (!hasSubject || !hasTopic) {
        toast.error("Excel file must contain 'Subject' and 'Topic' columns");
        return;
      }
      const parsed = buildHierarchy(rows);
      if (!parsed.length) {
        toast.error("No valid hierarchy found. Please check column names");
        return;
      }
      setHierarchy(parsed);
      setSubjectMeta(
        parsed.map((s) => ({
          name: s.subject,
          includeInReportCard: true,
          reportCategory: isSoftSkillSubject(s.subject) ? "softskill" : "technical",
        }))
      );
      toast.success(
        `Parsed ${parsed.length} subject(s) with ${parsed.reduce((a, s) => a + s.topics.length, 0)} topics and tasks`
      );
    } catch (err) {
      console.error("Excel parse error:", err);
      toast.error("Failed to parse Excel file. Please ensure valid format");
    } finally {
      setParsing(false);
    }
  };

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    processFile(file);
    e.target.value = "";
  };

  const handleSubmit = async () => {
    if (!selectedSessionId) {
      toast.error("Please select an academic session");
      return;
    }
    if (!selectedDeptId) {
      toast.error("Please select a department");
      return;
    }
    if (!selectedSubDeptId) {
      toast.error("Please select a sub-department");
      return;
    }
    if (!selectedLevelId) {
      toast.error("Please select a level");
      return;
    }
    if (!selectedSubLevelId) {
      toast.error("Please select a sub-level");
      return;
    }
    if (!hierarchy.length) {
      toast.error("Please upload and verify a valid Excel file");
      return;
    }

    const finalMeta = (subjectMeta?.length ? subjectMeta : hierarchy.map(s => ({
      name: s.subject,
      includeInReportCard: true,
      reportCategory: isSoftSkillSubject(s.subject) ? "softskill" : "technical",
    }))).map(s => ({
      ...s,
      includeInReportCard: true,
      reportCategory: s.reportCategory || (isSoftSkillSubject(s.name) ? "softskill" : "technical"),
    }));

    setSaving(true);
    try {
      const taskRows = buildTaskRows(hierarchy).map(r => ({
        ...r,
        domain: isLevel2B ? (selectedDomain || r.domain || "") : (r.domain || ""),
      }));
      const res = await uploadCombined({
        sessionId: selectedSessionId,
        levelId: selectedLevelId,
        subLevelId: selectedSubLevelId,
        title: title.trim(),
        version: version.trim() || undefined,
        domain: isLevel2B ? (selectedDomain || "") : "",
        tasks: taskRows,
        subjectMeta: finalMeta,
      }).unwrap();

      toast.success(res.message || "Curriculum & Tasks uploaded successfully!");
      if (res.data?.errors?.length) {
        res.data.errors.forEach((e) => toast.warn(e, { autoClose: 8000 }));
      }
      onSuccess?.();
    } catch (err) {
      const msg = err?.data?.message || err?.message || "Failed to upload curriculum";
      toast.error(msg);
      if (err?.data?.errors?.length) {
        err.data.errors.forEach((e) => toast.warn(e, { autoClose: 8000 }));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 text-xs font-semibold">
      {/* 1. SELECTION FIELDS */}
      <div className="space-y-3 bg-slate-50/70 p-3 sm:p-4 rounded-2xl border border-slate-100">
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
          Target Academic & Hierarchy Selection
        </p>

        {/* Academic Session */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Academic Session <span className="text-red-500">*</span>
          </label>
          <SelectDropdown
            value={selectedSessionId}
            onChange={(val) => setSelectedSessionId(val)}
            options={sessionOptions}
            buttonClassName="h-10 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold cursor-pointer shadow-2xs hover:border-orange-400"
          />
        </div>

        {/* Department & Sub-Department */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Department <span className="text-red-500">*</span>
            </label>
            <SelectDropdown
              value={selectedDeptId}
              onChange={handleDeptChange}
              options={deptOptions}
              buttonClassName="h-10 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold cursor-pointer shadow-2xs hover:border-orange-400"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Sub-Department <span className="text-red-500">*</span>
            </label>
            <SelectDropdown
              value={selectedSubDeptId}
              onChange={handleSubDeptChange}
              disabled={!selectedDeptId}
              options={subDeptOptions}
              buttonClassName={`h-10 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold shadow-2xs ${
                !selectedDeptId ? "opacity-50 cursor-not-allowed bg-slate-100" : "cursor-pointer hover:border-orange-400"
              }`}
            />
          </div>
        </div>

        {/* Level & Sub-Level */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Level <span className="text-red-500">*</span>
            </label>
            <SelectDropdown
              value={selectedLevelId}
              onChange={handleLevelChange}
              disabled={!selectedSubDeptId}
              options={levelOptions}
              buttonClassName={`h-10 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold shadow-2xs ${
                !selectedSubDeptId ? "opacity-50 cursor-not-allowed bg-slate-100" : "cursor-pointer hover:border-orange-400"
              }`}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Sub-Level <span className="text-red-500">*</span>
            </label>
            <SelectDropdown
              value={selectedSubLevelId}
              onChange={(val) => {
                setSelectedSubLevelId(val);
                setSelectedDomain("");
              }}
              disabled={!selectedLevelId}
              options={subLevelOptions}
              buttonClassName={`h-10 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold shadow-2xs ${
                !selectedLevelId ? "opacity-50 cursor-not-allowed bg-slate-100" : "cursor-pointer hover:border-orange-400"
              }`}
            />
          </div>
        </div>

        {/* Optional Domain for Level 2B */}
        {isLevel2B && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Domain <span className="text-slate-400 font-normal lowercase">(optional)</span>
              </label>
              <span className="text-[10px] bg-blue-50 text-blue-600 font-semibold px-2 py-0.5 rounded-full border border-blue-100">
                Level 2B Specialization
              </span>
            </div>
            <SelectDropdown
              value={selectedDomain}
              onChange={(val) => setSelectedDomain(val)}
              options={[
                { value: "", label: "-- Select Domain (Optional) --" },
                ...departmentDomains.map((d) => ({ value: d, label: d }))
              ]}
              buttonClassName="h-10 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-semibold shadow-2xs hover:border-orange-400 cursor-pointer"
            />
          </div>
        )}

        {/* Optional Title & Version */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Curriculum Title (Optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. MERN Full Stack Curriculum"
              className="w-full h-10 px-3 text-xs font-semibold border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-slate-800 shadow-2xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Version Code (Optional)</label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="Auto e.g. v1.0"
              className="w-full h-10 px-3 text-xs font-semibold border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-slate-800 shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* 2. TEMPLATE DOWNLOAD BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 bg-orange-50/70 border border-orange-200/80 rounded-2xl gap-3">
        <div className="flex items-start gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0">
            <MdFileDownload size={20} />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900">Standard Curriculum & Tasks Template</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed font-medium">
              One upload creates both Syllabus hierarchy and associated Tasks together.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={downloadSyllabusTemplate}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-orange-50 text-orange-600 border border-orange-200 font-extrabold text-xs rounded-xl shadow-xs transition shrink-0 cursor-pointer w-full sm:w-auto"
        >
          <MdFileDownload size={16} />
          <span>Download Template (.xlsx)</span>
        </button>
      </div>

      {/* 3. UPLOAD DROPZONE */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Upload Excel File <span className="text-red-500">*</span>
        </label>

        {parsing ? (
          <div className="border-2 border-dashed border-orange-300 bg-orange-50/30 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-slate-700">Reading & validating Excel columns...</p>
            <p className="text-[10px] text-slate-400">Parsing subjects, topics, and tasks</p>
          </div>
        ) : !fileName ? (
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) processFile(file);
            }}
            className={`border-2 border-dashed rounded-2xl p-5 sm:p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 text-center ${
              isDragging
                ? "border-orange-500 bg-orange-50/30 scale-[1.01]"
                : "border-slate-200 bg-slate-50/50 hover:border-orange-400 hover:bg-orange-50/10"
            }`}
          >
            <div className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-500 border border-orange-100 flex items-center justify-center mb-2">
              <MdCloudUpload size={24} />
            </div>
            <p className="text-xs font-black text-slate-800">
              Click to choose Excel file or drag & drop here
            </p>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">
              Supported formats: .xlsx, .xls, .csv
            </p>
            <div className="mt-2.5 flex items-center gap-1.5 flex-wrap justify-center text-[10px] font-bold text-slate-500">
              <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md">Subject *</span>
              <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md">Topic *</span>
              <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-400 font-medium">SubTopic (opt)</span>
              <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-400 font-medium">Task (opt)</span>
              <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-400 font-medium">Time Days (opt)</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl gap-2.5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs shrink-0">
                <MdCheckCircle size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-900 truncate max-w-[200px] sm:max-w-xs">{fileName}</p>
                <p className="text-[11px] text-emerald-700 font-semibold">File parsed and verified</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                resetFile();
                setTimeout(() => fileRef.current?.click(), 100);
              }}
              className="text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl font-bold transition hover:bg-slate-50 cursor-pointer shadow-2xs self-end sm:self-auto shrink-0"
            >
              Change File
            </button>
          </div>
        )}

        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileInput} />
      </div>

      {/* 4. PARSED STATS & PREVIEW */}
      {hierarchy.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 text-center shadow-2xs">
              <p className="text-base font-black text-slate-900">{totalSubjects}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subjects</p>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 text-center shadow-2xs">
              <p className="text-base font-black text-slate-900">{totalTopics}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Topics</p>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 text-center shadow-2xs">
              <p className="text-base font-black text-slate-900">{totalSubTopics}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SubTopics</p>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 text-center shadow-2xs">
              <p className="text-base font-black text-orange-600">{totalTasks}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tasks</p>
            </div>
          </div>


          {/* Topics & Tasks Collapsible Preview */}
          <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-2xs">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 transition text-xs font-bold text-slate-700 cursor-pointer text-left gap-2"
            >
              <span>View Topics & Tasks Details ({totalTopics} topics, {totalTasks} tasks)</span>
              {showPreview ? <MdExpandLess size={18} className="shrink-0" /> : <MdExpandMore size={18} className="shrink-0" />}
            </button>
            {showPreview && (
              <div className="p-3 max-h-56 overflow-y-auto space-y-2 bg-slate-50/40">
                {hierarchy.map((item, i) => (
                  <SubjectAccordion key={item.subject} item={item} index={i} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* 5. ACTION BUTTONS */}
      <div className="pt-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-bold text-xs rounded-xl transition cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || !hierarchy.length || !selectedSessionId || !selectedDeptId || !selectedSubDeptId || !selectedLevelId || !selectedSubLevelId}
          className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-extrabold rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
        >
          {saving ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Importing Curriculum & Tasks...</span>
            </>
          ) : (
            <>
              <MdSave size={16} />
              <span>Upload Curriculum & Tasks</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

/* ─── Details Modal ───────────────────────────────────── */
const CurriculumDetailsModal = ({ curriculumId, onClose }) => {
  const { data: detailData, isLoading } = useGetSyllabusVersionWithHierarchyQuery(curriculumId, {
    skip: !curriculumId,
  });
  const { data: tasksData, isLoading: isLoadingTasks } = useGetTasksBySyllabusVersionQuery(curriculumId, {
    skip: !curriculumId,
  });

  const version = detailData?.data;
  const tasks = tasksData?.data || [];
  const subjects = version?.subjects || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/60">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              {version?.title || version?.version || "Curriculum Details"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {version?.levelId?.name || "Level"} • {version?.subLevelId?.name || "SubLevel"} • {version?.sessionId?.name || "Session"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <MdClose size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {isLoading || isLoadingTasks ? (
            <div className="py-12 text-center text-xs font-semibold text-slate-400">Loading details...</div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-center">
                  <p className="text-lg font-black text-slate-900">{subjects.length}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subjects</p>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-center">
                  <p className="text-lg font-black text-slate-900">
                    {subjects.reduce((acc, s) => acc + (s.topics?.length || 0), 0)}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Topics</p>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-center">
                  <p className="text-lg font-black text-orange-600">{tasks.length}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Tasks</p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Subjects & Topics</h4>
                {subjects.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No subjects configured for this curriculum version.</p>
                ) : (
                  subjects.map((sub) => (
                    <div key={sub._id || sub.name} className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MdBook className="text-orange-500" size={17} />
                          <span className="text-xs font-black text-slate-800">{sub.name}</span>
                          {sub.reportCategory && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">
                              {sub.reportCategory === "technical" ? "💻 Tech" : "🤝 Soft Skill"}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold">
                          {sub.topics?.length || 0} topics
                        </span>
                      </div>

                      <div className="pl-3 space-y-1.5 border-l-2 border-orange-200 mt-2">
                        {(sub.topics || []).map((t) => (
                          <div key={t._id || t.name} className="bg-white p-2.5 rounded-lg border border-slate-100 text-xs space-y-1">
                            <span className="font-bold text-slate-700">{t.name}</span>
                            {t.subTopics?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1 pl-2">
                                {t.subTopics.map((st) => (
                                  <span key={st._id || st.name} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                                    • {st.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-white flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── File & Action Cell Components ───────────────────── */
const FileCell = ({ fileName, isTask }) => {
  if (!fileName) return <span className="text-xs font-medium text-slate-400 italic">None</span>;
  return (
    <div className="flex items-center gap-1.5">
      {isTask ? (
        <MdAssignment size={16} className="text-emerald-500 shrink-0" />
      ) : (
        <MdInsertDriveFile size={16} className="text-orange-500 shrink-0" />
      )}
      <span className={`text-xs font-bold truncate max-w-[170px] ${isTask ? "text-emerald-700" : "text-slate-800"}`}>
        {fileName}
      </span>
    </div>
  );
};

const ActionMenu = ({ row, onDelete, onView }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex justify-end">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((p) => !p);
        }}
        className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
      >
        <MdMoreVert size={18} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 bg-white border border-slate-100 rounded-2xl shadow-xl w-36 py-1.5 overflow-hidden text-xs font-semibold text-slate-700">
            <button
              onClick={() => {
                setOpen(false);
                onView?.(row);
              }}
              className="flex items-center gap-2 w-full px-4 py-2 text-left transition text-slate-700 hover:bg-slate-50 cursor-pointer font-bold"
            >
              <MdVisibility size={15} /> View Details
            </button>
            <button
              onClick={() => {
                setOpen(false);
                onDelete?.(row);
              }}
              className="flex items-center gap-2 w-full px-4 py-2 text-left transition text-rose-600 hover:bg-rose-50 font-bold cursor-pointer"
            >
              <MdDeleteOutline size={15} /> Delete Record
            </button>
          </div>
        </>
      )}
    </div>
  );
};

/* ─── Main Curriculum Management Page ─────────────────── */
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

  const [selectedCurriculumId, setSelectedCurriculumId] = useState(null);

  const { data: versionsData, isLoading, isError, refetch } = useGetAllSyllabusVersionsQuery();
  const { data: sessionsData } = useGetAllSessionsQuery(true);
  const { data: departmentsData } = useGetAllDepartmentsQuery();
  const { data: subDepartmentsData } = useGetAllSubdepartmentsQuery();
  const { data: levelsData } = useGetAllLevelsQuery();
  const { data: subLevelsData } = useGetAllSubLevelsQuery();
  const { data: tasksData } = useGetAllTasksQuery({ status: "all" });
  const [deleteSyllabusVersion] = useDeleteSyllabusVersionMutation();

  const sessions = useMemo(() => sessionsData?.data || [], [sessionsData]);
  const departments = useMemo(() => departmentsData?.data || [], [departmentsData]);
  const subDepartments = useMemo(() => subDepartmentsData?.data || [], [subDepartmentsData]);
  const levels = useMemo(() => levelsData?.data || [], [levelsData]);
  const subLevels = useMemo(() => subLevelsData?.data || [], [subLevelsData]);
  const tasks = useMemo(() => tasksData?.data || [], [tasksData]);

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
      const subjectCount = version.subjects?.length || 0;

      const titleText = version.title
        ? `${version.title} (${subjectCount} subjects)`
        : `${version.version || "Syllabus Version"} (${subjectCount} subjects)`;

      return {
        id: version._id,
        academicYear: formatAcademicYear(version.sessionId),
        session: version.sessionId?.name || "-",
        department: department.name || "-",
        subDept: subDepartment.name || "-",
        level: level.name || "-",
        subLevel: version.subLevelId?.name || "-",
        syllabusFile: titleText,
        taskList: taskCount ? `${taskCount} task${taskCount > 1 ? "s" : ""}` : null,
        status: version.status
          ? version.status.charAt(0).toUpperCase() + version.status.slice(1).toLowerCase()
          : "Active",
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
      (!filterStatus || row.status?.toLowerCase() === filterStatus.toLowerCase())
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
    if (!(await confirmToast(`Delete curriculum "${row.syllabusFile}"?`, { confirmButtonClass: "bg-red-500 hover:bg-red-600 text-white" }))) return;

    try {
      await deleteSyllabusVersion(row.id).unwrap();
      toast.success("Curriculum deleted successfully");
      refetch();
    } catch (error) {
      toast.error(error?.data?.message || "Failed to delete curriculum");
    }
  };

  const years = getOptionValues(curriculumRows, "academicYear");
  const sessionNames = useMemo(() => {
    const fromApi = sessions.map((s) => s.name).filter(Boolean);
    const fromRows = getOptionValues(curriculumRows, "session");
    return [...new Set([...fromApi, ...fromRows])].sort((a, b) => a.localeCompare(b));
  }, [sessions, curriculumRows]);

  const depts = useMemo(() => {
    const fromApi = departments.map((d) => d.name).filter(Boolean);
    const fromRows = getOptionValues(curriculumRows, "department");
    return [...new Set([...fromApi, ...fromRows])].sort((a, b) => a.localeCompare(b));
  }, [departments, curriculumRows]);

  const subs = useMemo(() => {
    let activeSubs = subDepartments;
    if (filterDept) {
      const selectedDept = departments.find((d) => d.name === filterDept);
      if (selectedDept) {
        activeSubs = subDepartments.filter((sd) => getId(sd.departmentId) === selectedDept._id);
      }
    }
    const fromApi = activeSubs.map((sd) => sd.name).filter(Boolean);
    const fromRows = getOptionValues(curriculumRows, "subDept");
    return [...new Set([...fromApi, ...fromRows])].sort((a, b) => a.localeCompare(b));
  }, [subDepartments, departments, filterDept, curriculumRows]);

  const levelNames = useMemo(() => {
    const fromApi = levels.map((l) => l.name).filter(Boolean);
    const fromRows = getOptionValues(curriculumRows, "level");
    return [...new Set([...fromApi, ...fromRows])].sort((a, b) => a.localeCompare(b));
  }, [levels, curriculumRows]);

  const statuses = useMemo(() => {
    const fromRows = getOptionValues(curriculumRows, "status").map(
      (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
    );
    return [...new Set(["Active", "Draft", "Archived", ...fromRows])].filter(Boolean);
  }, [curriculumRows]);

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
    <>
      <Header
        title="Curriculum Management"
        badge={`${curriculumRows.length} curricula`}
        breadcrumbs={[{ label: "Academics" }, { label: "Curriculum Management" }]}
      />

      <div className="p-3 sm:p-5 lg:p-6 w-full min-h-screen bg-gray-50/40 space-y-4 sm:space-y-6">

        {/* Top Action & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-2xs">
          {!isFaculty && (
            <OrangeButton
              buttonTitle="+ Upload Curriculum"
              panelTitle="Upload Curriculum & Tasks"
              panelSubtitle="Upload syllabus hierarchy and tasks together using the official Excel template"
              maxWidth="sm:max-w-2xl"
              showFooter={false}
              customButtonClass="w-full sm:w-auto flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs active:scale-95 cursor-pointer"
              drawerContent={({ closeDrawer }) => (
                <CurriculumUploadDrawerContent
                  sessions={sessions}
                  departments={departments}
                  subDepartments={subDepartments}
                  levels={levels}
                  subLevels={subLevels}
                  onSuccess={() => {
                    refetch();
                    closeDrawer();
                  }}
                  onClose={closeDrawer}
                />
              )}
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
                placeholder="Search curriculum..."
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
            <div className="p-4 sm:p-6">
              <EmptyState
                title="No Curriculum Records Found"
                subtitle={
                  searchTerm
                    ? `No curriculum files matched "${searchTerm}". Try a different keyword or reset filters.`
                    : "No curriculum or syllabus records match the selected session and department filters."
                }
                actionText={hasActiveFilters ? "Clear All Filters" : undefined}
                onAction={hasActiveFilters ? resetFilters : undefined}
              />
            </div>
          ) : (
            <>
              {/* Mobile Cards Layout (block md:hidden) */}
              <div className="block md:hidden p-3 space-y-3">
                {paginatedData.map((row) => (
                  <div key={row.id} className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-2xs space-y-3 hover:border-orange-200 transition">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-extrabold text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-md">
                          {row.academicYear} • {row.session}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          row.status === "Active"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}>
                          {row.status}
                        </span>
                      </div>
                      <ActionMenu
                        row={row}
                        onDelete={handleDelete}
                        onView={(r) => setSelectedCurriculumId(r.id)}
                      />
                    </div>

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

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                      <div className="bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Syllabus</p>
                        <FileCell fileName={row.syllabusFile} />
                      </div>
                      <div className="bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Task List</p>
                        <FileCell fileName={row.taskList} isTask={Boolean(row.taskList)} />
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
                      <th className="py-4 px-6">SYLLABUS DETAILS</th>
                      <th className="py-4 px-6">TASKS</th>
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
                        <td className="py-4 px-6"><FileCell fileName={row.taskList} isTask={Boolean(row.taskList)} /></td>
                        <td className="py-4 px-6 text-right">
                          <ActionMenu
                            row={row}
                            onDelete={handleDelete}
                            onView={(r) => setSelectedCurriculumId(r.id)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              <div className="border-t border-gray-200 px-3 sm:px-6 py-3 sm:py-4 bg-gray-100 rounded-b-2xl">
                <Pagination
                  totalItems={filtered.length}
                  currentPage={currentPage}
                  pageSize={rowsPerPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  label="entries"
                />
              </div>
            </>
          )}
        </div>

      </div>

      {/* Curriculum Details Modal */}
      {selectedCurriculumId && (
        <CurriculumDetailsModal
          curriculumId={selectedCurriculumId}
          onClose={() => setSelectedCurriculumId(null)}
        />
      )}
    </>
  );
};

export default CurriculumManagement;
