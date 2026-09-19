import { useState, useRef, useMemo, forwardRef, useImperativeHandle, useEffect } from "react";
import SelectDropdown from "../../../shared/form-fields/SelectDropdown";
import * as XLSX from "xlsx";
import {
  MdCloudUpload, MdCheckCircle, MdExpandMore, MdExpandLess, MdFileDownload, MdInfo,
  MdBook, MdTopic, MdSubject, MdDelete, MdSave, MdEdit, MdVisibility,
  MdAssignment, MdAdd, MdSearch, MdChevronRight, MdCalendarToday, MdAccessTime, MdPerson, MdClose,
} from "react-icons/md";
import { toast } from "react-toastify";
import {
  useCreateSyllabusVersionMutation,
  useUploadCombinedSyllabusMutation,
  useGetSyllabusVersionsBySubLevelQuery,
  useGetSyllabusVersionWithHierarchyQuery,
  useDeleteSyllabusVersionMutation,
  useApproveSyllabusVersionMutation,
  useActivateSyllabusVersionMutation,
  useGetAllSessionsQuery,
  useGetTasksBySyllabusVersionQuery,
  useBulkUploadTasksMutation,
  useGetSubjectsByVersionQuery,
  useGetTopicsBySubjectQuery,
  useGetSubTopicsByTopicQuery,
  useCreateTaskManualMutation,
  useAddSubjectToVersionMutation,
} from "../../../../redux/api/authApi";
import TaskManagementModal from "./TaskManagementModal";
import SmartSyllabusUpdate from "./SmartSyllabusUpdate";
import OrangeButton from "../../../shared/sidebar/OrangeButton";
import CommonTable from "../../../shared/table/CommonTable";

/* ─── helpers ─────────────────────────────────────────── */
const normalize = (v) => (v === undefined || v === null ? "" : String(v).trim());

/* Download combined syllabus+task template */
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
    ["Subject         → Subject name (e.g. JavaScript, React)"],
    ["Topic           → Topic name (e.g. Basics, Functions)"],
    ["SubTopic        → SubTopic name — leave empty if topic has no subtopic"],
    ["Task            → Task title (e.g. Q1 - Explain...) — leave empty for syllabus-only rows"],
    ["Time Days       → Expected days to complete the task (number)"],
    ["Measurable Points → What the student should be able to do"],
    [""],
    ["RULES:"],
    ["1. Subject + Topic are REQUIRED in every row"],
    ["2. SubTopic is optional — leave empty if topic has no subtopic"],
    ["3. Task is optional — leave empty for syllabus-only rows (no task)"],
    ["4. Multiple tasks for same topic/subtopic = multiple rows with same Subject/Topic/SubTopic"],
    ["5. One upload creates both Syllabus structure AND Tasks together"],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(instructions);
  ws2["!cols"] = [{ wch: 70 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Instructions");

  XLSX.writeFile(wb, "syllabus_tasks_template.xlsx");
};

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
    // Store subtopic with optional task info
    if (subTopicName) {
      const existing = stList.find(st => (typeof st === "object" ? st.name : st) === subTopicName && !taskTitle);
      if (!existing || taskTitle) {
        stList.push(taskTitle ? { name: subTopicName, taskTitle, timeDays, measurablePoints } : { name: subTopicName });
      }
    } else if (taskTitle) {
      // Topic-level task (no subtopic)
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

// Build flat task rows from hierarchy for combined upload
const buildTaskRows = (hierarchy) => {
  const rows = [];
  hierarchy.forEach(({ subject, topics }) => {
    topics.forEach(({ topic, subTopics, topicTasks }) => {
      // Topic-level tasks
      (topicTasks || []).forEach(t => {
        rows.push({ subject, topic, subTopic: "", taskTitle: t.taskTitle, timeDays: t.timeDays, measurablePoints: t.measurablePoints });
      });
      // SubTopic rows (with or without tasks)
      (subTopics || []).forEach(st => {
        rows.push({
          subject, topic,
          subTopic: st.name,
          taskTitle: st.taskTitle || "",
          timeDays: st.timeDays || null,
          measurablePoints: st.measurablePoints || ""
        });
      });
      // If no subtopics and no topic tasks, still register the topic
      if (!topicTasks?.length && !subTopics?.length) {
        rows.push({ subject, topic, subTopic: "", taskTitle: "", timeDays: null, measurablePoints: "" });
      }
    });
  });
  return rows;
};

/* ─── Status badge ─────────────────────────────────────── */
const STATUS_STYLE = {
  draft:    "bg-yellow-100 text-yellow-700",
  approved: "bg-blue-100 text-blue-700",
  active:   "bg-green-100 text-green-700",
  archived: "bg-gray-100 text-gray-500",
};
const StatusBadge = ({ status }) => (
  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[status] || "bg-gray-100 text-gray-500"}`}>
    {status?.toUpperCase()}
  </span>
);

/* ─── Accordion (drawer preview) ───────────────────────── */
const SubjectAccordion = ({ item, index }) => {
  const [open, setOpen] = useState(index === 0);
  const [openTopics, setOpenTopics] = useState({});
  const toggleTopic = (t) => setOpenTopics((p) => ({ ...p, [t]: !p[t] }));

  const taskCount = item.topics.reduce(
    (acc, t) => acc + t.subTopics.filter((st) => typeof st === "object" && st.taskTitle).length,
    0
  );

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen((p) => !p)} className="w-full flex items-center justify-between px-3.5 sm:px-4 py-2.5 sm:py-3 bg-orange-50 hover:bg-orange-100 transition gap-2 text-left">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
          <MdBook size={18} className="text-orange-500 shrink-0" />
          <span className="font-semibold text-xs sm:text-sm text-gray-800 break-words">{item.subject}</span>
          <span className="text-[11px] sm:text-xs text-gray-400">({item.topics.length} topics)</span>
          {taskCount > 0 && (
            <span className="text-[10px] sm:text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-semibold">
              {taskCount} tasks
            </span>
          )}
        </div>
        {open ? <MdExpandLess size={18} className="text-gray-400 shrink-0" /> : <MdExpandMore size={18} className="text-gray-400 shrink-0" />}
      </button>
      {open && (
        <div className="divide-y divide-gray-100">
          {item.topics.map((t) => (
            <div key={t.topic}>
              <button onClick={() => toggleTopic(t.topic)} className="w-full flex items-center justify-between px-4 sm:px-6 py-2 sm:py-2.5 bg-white hover:bg-gray-50 transition gap-2 text-left">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                  <MdTopic size={15} className="text-blue-400 shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-700 break-words">{t.topic}</span>
                  {t.subTopics.length > 0 && <span className="text-[11px] sm:text-xs text-gray-400">({t.subTopics.length} subtopics)</span>}
                </div>
                {t.subTopics.length > 0 && (openTopics[t.topic] ? <MdExpandLess size={15} className="text-gray-300 shrink-0" /> : <MdExpandMore size={15} className="text-gray-300 shrink-0" />)}
              </button>
              {openTopics[t.topic] && t.subTopics.length > 0 && (
                <div className="bg-gray-50 px-4 sm:px-10 py-2 space-y-1.5">
                  {t.subTopics.map((st, i) => {
                    const stName = typeof st === "object" ? st.name : st;
                    const hasTask = typeof st === "object" && st.taskTitle;
                    return (
                      <div key={`${stName}-${i}`} className="py-1">
                        <div className="flex items-start sm:items-center gap-1.5 sm:gap-2 text-xs text-gray-700 min-w-0">
                          <MdSubject size={13} className="text-gray-400 shrink-0 mt-0.5 sm:mt-0" />
                          <span className="break-words font-medium">{stName}</span>
                        </div>
                        {hasTask && (
                          <div className="ml-5 mt-1 flex flex-col gap-1 min-w-0 max-w-full">
                            <span
                              className="inline-flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-lg font-medium line-clamp-2 w-fit max-w-full break-words"
                              title={st.taskTitle}
                            >
                              <MdAssignment size={12} className="text-blue-500 shrink-0" />
                              <span className="line-clamp-2 break-words">{st.taskTitle}</span>
                            </span>
                            <div className="flex gap-2 flex-wrap text-[11px] text-gray-400">
                              {st.timeDays && <span>⏱ {st.timeDays} days</span>}
                              {st.measurablePoints && <span className="italic line-clamp-1">📋 {st.measurablePoints}</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   MANUAL SYLLABUS FORM (single subject → topics → subtopics)
══════════════════════════════════════════════════════════ */
export const ManualSyllabusForm = forwardRef(({ level, subLevel, onSaved, onClose }, ref) => {
  const subLevelId = subLevel?._id;
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [subject,           setSubject]           = useState("");
  const [topics,            setTopics]            = useState([{ name: "", subTopics: [""] }]);
  const [saving,            setSaving]            = useState(false);

  const [createSyllabusVersion] = useCreateSyllabusVersionMutation();
  const { data: sessionsData }  = useGetAllSessionsQuery();
  const sessions = sessionsData?.data || [];

  const reset = () => {
    setSubject(""); setSelectedSessionId("");
    setTopics([{ name: "", subTopics: [""] }]);
  };

  const addTopic        = () => setTopics((p) => [...p, { name: "", subTopics: [""] }]);
  const removeTopic     = (ti) => setTopics((p) => p.filter((_, i) => i !== ti));
  const updateTopicName = (ti, val) => setTopics((p) => p.map((t, i) => i === ti ? { ...t, name: val } : t));
  const addSubTopic     = (ti) => setTopics((p) => p.map((t, i) => i === ti ? { ...t, subTopics: [...t.subTopics, ""] } : t));
  const removeSubTopic  = (ti, si) => setTopics((p) => p.map((t, i) => i === ti ? { ...t, subTopics: t.subTopics.filter((_, j) => j !== si) } : t));
  const updateSubTopic  = (ti, si, val) => setTopics((p) => p.map((t, i) => i === ti ? { ...t, subTopics: t.subTopics.map((s, j) => j === si ? val : s) } : t));

  const buildSubjectPayload = () => ({
    name: subject.trim(),
    topics: topics.filter((t) => t.name.trim()).map((t, ti) => ({
      name: t.name.trim(),
      order: ti + 1,
      subTopics: t.subTopics.filter((s) => s.trim()).map((s, si) => ({ name: s.trim(), order: si + 1 })),
    })),
  });

  const handleSave = async () => {
    if (!subject.trim())     { toast.error("Subject name required"); return; }
    const validTopics = topics.filter((t) => t.name.trim());
    if (!validTopics.length) { toast.error("At least one topic required"); return; }
    if (!selectedSessionId)  { toast.error("Please select an academic session"); return; }
    if (!subLevel?._id)      { toast.error("SubLevel not found"); return; }
    if (!level?._id)         { toast.error("Level not found"); return; }
    setSaving(true);
    try {
      await createSyllabusVersion({
        sessionId: selectedSessionId, levelId: level._id,
        subLevelId: subLevel._id,
        subjects: [buildSubjectPayload()],
      }).unwrap();
      toast.success("Subject saved to syllabus!");
      reset(); 
      onSaved?.();
      onClose?.();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to save");
    } finally { setSaving(false); }
  };

  useImperativeHandle(ref, () => ({ reset, save: handleSave }));

  return (
    <div className="space-y-5">
      {/* Session */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Academic Session <span className="text-red-500">*</span>
        </label>
        <SelectDropdown
          value={selectedSessionId}
          onChange={(val) => setSelectedSessionId(val)}
          options={[{ value: "", label: "-- Select Session --" }, ...sessions.map((s) => ({ value: s._id, label: s.name }))]}
          placeholder="-- Select Session --"
        />
      </div>

      {/* Subject */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <MdBook size={14} className="text-orange-500" /> Subject Name <span className="text-red-500">*</span>
        </label>
        <input
          className="w-full h-10 border border-slate-200 rounded-xl px-3.5 text-xs font-semibold focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 bg-white shadow-xs placeholder-slate-400"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. JavaScript Programming, Web Development"
        />
      </div>

      {/* Topics & Subtopics */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <MdTopic size={14} className="text-blue-500" /> Topics & Sub-Topics
            </label>
            <p className="text-[11px] text-slate-400">Add learning topics and their lesson milestones</p>
          </div>
          <button
            type="button"
            onClick={addTopic}
            className="text-xs text-orange-600 font-extrabold bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 shrink-0 self-start sm:self-auto"
          >
            <MdAdd size={15} /> Add Topic
          </button>
        </div>

        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
          {topics.map((topic, ti) => (
            <div key={ti} className="border border-slate-200/80 rounded-2xl p-3 sm:p-4 space-y-3 bg-white shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 font-black text-[11px] flex items-center justify-center shrink-0 border border-blue-100">
                  {ti + 1}
                </span>
                <input
                  className="flex-1 h-9 border border-slate-200 rounded-xl px-2.5 sm:px-3 text-xs font-bold focus:outline-none focus:border-orange-400 bg-white"
                  value={topic.name}
                  onChange={(e) => updateTopicName(ti, e.target.value)}
                  placeholder={`Topic ${ti + 1} Name`}
                />
                {topics.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTopic(ti)}
                    className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition cursor-pointer shrink-0"
                    title="Delete Topic"
                  >
                    <MdDelete size={16} />
                  </button>
                )}
              </div>

              {/* Subtopics */}
              <div className="pl-3 sm:pl-8 space-y-2 border-l-2 border-slate-100 ml-1.5 sm:ml-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sub-Topics</p>
                {topic.subTopics.map((st, si) => (
                  <div key={si} className="flex items-center gap-1.5 sm:gap-2">
                    <MdSubject size={14} className="text-slate-400 flex-shrink-0" />
                    <input
                      className="flex-1 h-8 border border-slate-200/70 rounded-lg px-2 sm:px-2.5 text-xs font-medium focus:outline-none focus:border-orange-400 bg-slate-50/50"
                      value={st}
                      onChange={(e) => updateSubTopic(ti, si, e.target.value)}
                      placeholder={`SubTopic ${si + 1} (optional)`}
                    />
                    {topic.subTopics.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSubTopic(ti, si)}
                        className="p-1 text-slate-300 hover:text-rose-400 rounded transition cursor-pointer shrink-0"
                      >
                        <MdDelete size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addSubTopic(ti)}
                  className="text-[11px] text-blue-600 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer pt-1"
                >
                  + Add SubTopic
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={() => { reset(); onClose?.(); }}
          className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer text-center w-full sm:w-auto"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !subject.trim() || !selectedSessionId}
          className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
        >
          {saving ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Saving Subject...</span>
            </>
          ) : (
            <>
              <MdSave size={16} />
              <span>Save Subject</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
});
ManualSyllabusForm.displayName = "ManualSyllabusForm";

/* ══════════════════════════════════════════════════════════
   EXCEL SYLLABUS UPLOAD (High-UX Drag & Drop + Subject Mapping)
══════════════════════════════════════════════════════════ */
export const SyllabusUploadDrawer = forwardRef(({ level, subLevel, onSaved, onClose }, ref) => {
  const fileRef = useRef(null);
  const [isDragging,       setIsDragging]       = useState(false);
  const [parsing,          setParsing]          = useState(false);
  const [saving,           setSaving]           = useState(false);
  const [hierarchy,        setHierarchy]        = useState([]);
  const [fileName,         setFileName]         = useState("");
  const [selectedSessionId,setSelectedSessionId]= useState("");
  const [subjectMeta,      setSubjectMeta]      = useState([]); // [{ name, includeInReportCard, reportCategory }]
  const [showPreview,      setShowPreview]      = useState(false);

  const [uploadCombined]       = useUploadCombinedSyllabusMutation();
  const { data: sessionsData } = useGetAllSessionsQuery();
  const sessions = sessionsData?.data || [];

  const totalSubjects  = hierarchy.length;
  const totalTopics    = hierarchy.reduce((acc, s) => acc + s.topics.length, 0);
  const totalSubTopics = hierarchy.reduce((acc, s) => acc + s.topics.reduce((a, t) => a + (t.subTopics?.length || 0), 0), 0);
  const totalTasks     = hierarchy.reduce((acc, s) => acc + s.topics.reduce((a, t) => {
    const stTasks = (t.subTopics || []).filter(st => st.taskTitle).length;
    const topicTasks = (t.topicTasks || []).length;
    return a + stTasks + topicTasks;
  }, 0), 0);

  const reset = () => {
    setHierarchy([]);
    setFileName("");
    setSelectedSessionId("");
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
      const hasSubject = Object.keys(firstRow).some(k => k.toLowerCase().includes("subject"));
      const hasTopic = Object.keys(firstRow).some(k => k.toLowerCase().includes("topic"));
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
      setSubjectMeta(parsed.map(s => ({ name: s.subject, includeInReportCard: true, reportCategory: "technical" })));
      toast.success(`Successfully parsed ${parsed.length} subject(s) with ${parsed.reduce((a, s) => a + s.topics.length, 0)} topics`);
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

  const handleSave = async (confirmedMeta = subjectMeta) => {
    if (!hierarchy.length)  { toast.error("Please upload a valid Excel file first"); return; }
    if (!selectedSessionId) { toast.error("Please select an academic session"); return; }
    if (!subLevel?._id)     { toast.error("SubLevel not found"); return; }
    if (!level?._id)        { toast.error("Level not found"); return; }

    const invalid = confirmedMeta.find(s => s.includeInReportCard && !s.reportCategory);
    if (invalid) {
      toast.error(`Please select a category for "${invalid.name}" in Report Card Settings`);
      return;
    }

    setSaving(true);
    try {
      const taskRows = buildTaskRows(hierarchy);
      const res = await uploadCombined({
        sessionId:   selectedSessionId,
        levelId:     level._id,
        subLevelId:  subLevel._id,
        tasks:       taskRows,
        subjectMeta: confirmedMeta,
      }).unwrap();

      toast.success(res.message || "Syllabus & Tasks uploaded successfully!");
      if (res.data?.errors?.length) {
        res.data.errors.forEach(e => toast.warn(e, { autoClose: 8000 }));
      }
      reset();
      onSaved?.();
      onClose?.();
    } catch (err) {
      const msg = err?.data?.message || err?.message || "Failed to save syllabus";
      toast.error(msg);
      if (err?.data?.errors?.length) {
        err.data.errors.forEach(e => toast.warn(e, { autoClose: 8000 }));
      }
    } finally {
      setSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({ reset, save: () => handleSave(subjectMeta) }));

  return (
    <div className="space-y-5 text-xs font-semibold">
      {/* 1. SESSION SELECTION */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Target Academic Session <span className="text-red-500">*</span>
        </label>
        <SelectDropdown
          value={selectedSessionId}
          onChange={(val) => setSelectedSessionId(val)}
          options={[{ value: "", label: "-- Select Session --" }, ...sessions.map((s) => ({ value: s._id, label: s.name }))]}
          placeholder="-- Select Session --"
        />
      </div>

      {/* 2. TEMPLATE DOWNLOAD BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 bg-orange-50/60 border border-orange-200/70 rounded-2xl gap-3">
        <div className="flex items-start gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0">
            <MdFileDownload size={20} />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900">Standard Syllabus & Tasks Template</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed font-medium">
              Download the official Excel template with column headers and sample data.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={downloadSyllabusTemplate}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-orange-50 text-orange-600 border border-orange-200 font-extrabold text-xs rounded-xl shadow-xs transition hover:shadow-sm shrink-0 cursor-pointer w-full sm:w-auto"
        >
          <MdFileDownload size={16} />
          <span>Template (.xlsx)</span>
        </button>
      </div>

      {/* 3. UPLOAD DROPZONE */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Upload Excel File <span className="text-red-500">*</span>
        </label>
        
        {parsing ? (
          <div className="border-2 border-dashed border-orange-300 bg-orange-50/30 rounded-2xl p-6 sm:p-10 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-slate-700 text-center">Reading and validating Excel columns...</p>
            <p className="text-[10px] text-slate-400 text-center">Parsing subjects, topics, and sub-topics</p>
          </div>
        ) : !fileName ? (
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
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
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-orange-50 text-orange-500 border border-orange-100 flex items-center justify-center mb-2 sm:mb-2.5">
              <MdCloudUpload size={24} />
            </div>
            <p className="text-xs font-black text-slate-800">
              Click to choose Excel file or drag & drop here
            </p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 font-medium">
              Supported formats: .xlsx, .xls, .csv
            </p>
            <div className="mt-2.5 sm:mt-3 flex items-center gap-1 sm:gap-1.5 flex-wrap justify-center text-[10px] font-bold text-slate-500">
              <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md">Subject *</span>
              <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md">Topic *</span>
              <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-400 font-medium">SubTopic (opt)</span>
              <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-400 font-medium">Task (opt)</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-2xl gap-2.5 sm:gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs shrink-0">
                <MdCheckCircle size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-900 truncate max-w-[180px] sm:max-w-xs">{fileName}</p>
                <p className="text-[10px] sm:text-[11px] text-emerald-700 font-semibold">File loaded & verified</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { reset(); setTimeout(() => fileRef.current?.click(), 100); }}
              className="text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl font-bold transition hover:bg-slate-50 cursor-pointer shadow-2xs self-end sm:self-auto shrink-0"
            >
              Change File
            </button>
          </div>
        )}

        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileInput} />
      </div>

      {hierarchy.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
            <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 sm:p-3 text-center shadow-2xs">
              <p className="text-base sm:text-lg font-black text-slate-900">{totalSubjects}</p>
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subjects</p>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 sm:p-3 text-center shadow-2xs">
              <p className="text-base sm:text-lg font-black text-slate-900">{totalTopics}</p>
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Topics</p>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 sm:p-3 text-center shadow-2xs">
              <p className="text-base sm:text-lg font-black text-slate-900">{totalSubTopics}</p>
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">SubTopics</p>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 sm:p-3 text-center shadow-2xs">
              <p className="text-base sm:text-lg font-black text-slate-900">{totalTasks}</p>
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tasks</p>
            </div>
          </div>

          {/* 5. INLINE REPORT CARD SETTINGS */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <MdBook className="text-orange-500" size={16} /> Report Card Settings
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                  Configure which subjects appear on student report cards & their evaluation category
                </p>
              </div>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {subjectMeta.map((sm, idx) => (
                <div key={sm.name} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 sm:p-3 rounded-xl border border-slate-100 bg-slate-50/50 gap-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <MdBook size={15} className="text-orange-400 shrink-0" />
                    <span className="text-xs font-extrabold text-slate-800 truncate">{sm.name}</span>
                    <span className="text-[10px] text-slate-400 font-medium shrink-0">({hierarchy[idx]?.topics?.length || 0} topics)</span>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-between sm:justify-end w-full sm:w-auto">
                    {/* Include Toggle */}
                    <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setSubjectMeta(prev => prev.map((s, i) => i === idx ? { ...s, includeInReportCard: true, reportCategory: s.reportCategory || "technical" } : s))}
                        className={`px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-bold rounded-md transition ${sm.includeInReportCard ? "bg-emerald-500 text-white shadow-2xs" : "text-slate-500 hover:bg-slate-50"}`}
                      >
                        ✓ Report Card
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubjectMeta(prev => prev.map((s, i) => i === idx ? { ...s, includeInReportCard: false, reportCategory: "" } : s))}
                        className={`px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-bold rounded-md transition ${!sm.includeInReportCard ? "bg-slate-200 text-slate-700" : "text-slate-500 hover:bg-slate-50"}`}
                      >
                        Exclude
                      </button>
                    </div>

                    {/* Category Selector */}
                    {sm.includeInReportCard && (
                      <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white p-0.5 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setSubjectMeta(prev => prev.map((s, i) => i === idx ? { ...s, reportCategory: "technical" } : s))}
                          className={`px-2 sm:px-2.5 py-1 text-[9px] sm:text-[10px] font-bold rounded-md transition ${sm.reportCategory === "technical" ? "bg-blue-600 text-white shadow-2xs" : "text-slate-500 hover:bg-slate-50"}`}
                        >
                          💻 Tech
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubjectMeta(prev => prev.map((s, i) => i === idx ? { ...s, reportCategory: "softskill" } : s))}
                          className={`px-2 sm:px-2.5 py-1 text-[9px] sm:text-[10px] font-bold rounded-md transition ${sm.reportCategory === "softskill" ? "bg-purple-600 text-white shadow-2xs" : "text-slate-500 hover:bg-slate-50"}`}
                        >
                          🤝 Soft Skill
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 6. COLLAPSIBLE HIERARCHY PREVIEW */}
          <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-2xs">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="w-full flex items-center justify-between px-3.5 sm:px-4 py-2.5 sm:py-3 bg-slate-50 hover:bg-slate-100 transition text-xs font-bold text-slate-700 cursor-pointer text-left gap-2"
            >
              <span>View Topics & Tasks Details ({totalTopics} topics)</span>
              {showPreview ? <MdExpandLess size={18} className="shrink-0" /> : <MdExpandMore size={18} className="shrink-0" />}
            </button>
            {showPreview && (
              <div className="p-2.5 sm:p-3 max-h-56 overflow-y-auto space-y-2 bg-slate-50/40">
                {hierarchy.map((item, i) => (
                  <SubjectAccordion key={item.subject} item={item} index={i} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* 7. UNIFIED ACTION FOOTER */}
      <div className="pt-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={() => { reset(); onClose?.(); }}
          className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer text-center"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => handleSave(subjectMeta)}
          disabled={saving || !hierarchy.length || !selectedSessionId}
          className="w-full sm:w-auto px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-extrabold rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer text-center"
        >
          {saving ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Importing Syllabus...</span>
            </>
          ) : (
            <>
              <MdSave size={16} />
              <span>Save & Upload Syllabus</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
});
SyllabusUploadDrawer.displayName = "SyllabusUploadDrawer";

/* ══════════════════════════════════════════════════════════
   UNIFIED MODAL CONTENT (Tabs for Excel & Manual + Responsive Width)
══════════════════════════════════════════════════════════ */
export const SyllabusUploadModalContent = ({ level, subLevel, onSaved, onClose }) => {
  const [mode, setMode] = useState("excel");

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Segmented Mode Switcher */}
      <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
        <button
          type="button"
          onClick={() => setMode("excel")}
          className={`flex-1 py-2 sm:py-2.5 px-2 rounded-xl text-xs font-black transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
            mode === "excel"
              ? "bg-white text-orange-600 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <MdCloudUpload size={16} className="shrink-0" />
          <span className="hidden sm:inline">Excel Upload (Recommended)</span>
          <span className="sm:hidden">Excel Upload</span>
        </button>
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`flex-1 py-2 sm:py-2.5 px-2 rounded-xl text-xs font-black transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
            mode === "manual"
              ? "bg-white text-orange-600 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <MdBook size={16} className="shrink-0" />
          <span>Manual Entry</span>
        </button>
      </div>

      {mode === "excel" ? (
        <SyllabusUploadDrawer level={level} subLevel={subLevel} onSaved={onSaved} onClose={onClose} />
      ) : (
        <ManualSyllabusForm level={level} subLevel={subLevel} onSaved={onSaved} onClose={onClose} />
      )}
    </div>
  );
};

/* ─── Topic/SubTopic table for one version ──────────────── */
const VersionTopicTable = ({ versionId, searchTerm = "", activeSubject }) => {
  const { data, isLoading } = useGetSyllabusVersionWithHierarchyQuery(versionId, { skip: !versionId });
  const [viewMode, setViewMode] = useState("topics"); // "topics" | "detailed"

  const rows = useMemo(() => {
    if (!data?.data?.subjects) return [];
    const result = [];
    data.data.subjects.forEach((subject) => {
      if (activeSubject && subject.name !== activeSubject) return;
      (subject.topics || []).forEach((topic) => {
        const topicIdStr = String(topic._id);
        if (topic.subTopics && topic.subTopics.length > 0) {
          topic.subTopics.forEach((st) => {
            result.push({ _id: String(st._id), subject: subject.name, topic: topic.name, subTopic: st.name, topicIdStr });
          });
        } else {
          result.push({ _id: topicIdStr, subject: subject.name, topic: topic.name, subTopic: "—", topicIdStr });
        }
      });
    });
    return result;
  }, [data, activeSubject]);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const q = searchTerm.toLowerCase();
    return rows.filter((r) =>
      r.subject.toLowerCase().includes(q) ||
      r.topic.toLowerCase().includes(q) ||
      r.subTopic.toLowerCase().includes(q)
    );
  }, [rows, searchTerm]);

  const groupedTopics = useMemo(() => {
    const groups = {};
    filtered.forEach((item) => {
      const key = item.topicIdStr;
      if (!groups[key]) {
        groups[key] = {
          topicIdStr: key,
          topic: item.topic,
          subject: item.subject,
          subTopics: []
        };
      }
      if (item.subTopic !== "—" && item.subTopic !== "\u2014" && item.subTopic !== "\u2514") {
        groups[key].subTopics.push(item.subTopic);
      }
    });
    return Object.values(groups);
  }, [filtered]);

  const topicColumns = useMemo(() => [
    {
      key: "sno",
      label: "S.NO",
      align: "center",
      render: (row) => (
        <span className="inline-flex w-7 h-7 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold items-center justify-center">
          {row.sno}
        </span>
      ),
    },
    {
      key: "subject",
      label: "SUBJECT",
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50/90 border border-orange-200/70 px-2.5 py-1 rounded-full uppercase tracking-wider">
          {row.subject}
        </span>
      ),
    },
    {
      key: "topic",
      label: "TOPIC NAME",
      render: (row) => (
        <div className="flex items-center gap-2.5 py-1">
          <span className="p-1.5 rounded-lg bg-orange-50 text-orange-500 border border-orange-100 flex-shrink-0">
            <MdTopic size={15} />
          </span>
          <span className="font-bold text-sm text-slate-800">
            {row.topic}
          </span>
        </div>
      ),
    },
    {
      key: "subTopics",
      label: "SUBTOPICS",
      render: (row) => {
        const subs = row.subTopics || [];
        if (!subs.length) {
          return (
            <span className="text-xs text-slate-400 italic">
              Covers core topic directly (No subtopics)
            </span>
          );
        }
        return (
          <div className="flex flex-wrap items-center gap-1.5 py-1 max-w-xl">
            {subs.map((sub, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/70 text-slate-700 text-xs font-medium hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                <span>{sub}</span>
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: "subTopicCount",
      label: "TOTAL SUBTOPICS",
      align: "center",
      render: (row) => (
        <span className="inline-block text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-full whitespace-nowrap">
          {row.subTopics?.length || 0} {row.subTopics?.length === 1 ? "Subtopic" : "Subtopics"}
        </span>
      ),
    },
  ], []);

  const detailedColumns = useMemo(() => [
    {
      key: "sno",
      label: "S.NO",
      align: "center",
      render: (row) => (
        <span className="inline-flex w-7 h-7 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold items-center justify-center">
          {row.sno}
        </span>
      ),
    },
    {
      key: "subject",
      label: "SUBJECT",
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50/90 border border-orange-200/70 px-2.5 py-1 rounded-full uppercase tracking-wider">
          {row.subject}
        </span>
      ),
    },
    {
      key: "topic",
      label: "TOPIC",
      render: (row) => (
        <div className="flex items-center gap-2 py-1">
          <MdTopic size={15} className="text-orange-500 flex-shrink-0" />
          <span className="font-bold text-sm text-slate-800">{row.topic}</span>
        </div>
      ),
    },
    {
      key: "subTopic",
      label: "SUBTOPIC",
      render: (row) => (
        <div className="flex items-center gap-2 py-1">
          <MdSubject size={15} className="text-slate-400 flex-shrink-0" />
          <span className={`text-sm font-medium ${row.subTopic === "—" ? "text-slate-400 italic" : "text-slate-800"}`}>
            {row.subTopic === "—" ? "Direct Topic" : row.subTopic}
          </span>
        </div>
      ),
    },
  ], []);

  const tableData = useMemo(() => {
    if (viewMode === "topics") {
      return groupedTopics.map((g, idx) => ({
        ...g,
        sno: idx + 1,
        subTopicCount: g.subTopics?.length || 0,
      }));
    }
    return filtered.map((r, idx) => ({
      ...r,
      sno: idx + 1,
    }));
  }, [viewMode, groupedTopics, filtered]);

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <div className="w-9 h-9 border-[3.5px] border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!groupedTopics.length) return (
    <div className="py-20 text-center px-4">
      <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-3 border border-orange-100/50">
        <MdBook size={28} className="text-orange-400" />
      </div>
      <h4 className="text-sm font-bold text-gray-800">No topics found</h4>
      <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto leading-relaxed">
        Try entering a different keyword or selecting another subject.
      </p>
    </div>
  );

  return (
    <div className="p-4 space-y-3">
      {/* View Mode Toggle Bar */}
      <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode("topics")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "topics"
                ? "bg-white text-orange-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Topic View ({groupedTopics.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode("detailed")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "detailed"
                ? "bg-white text-orange-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Detailed Subtopics ({filtered.length})
          </button>
        </div>
        <span className="text-xs text-slate-400 font-medium">
          Total {viewMode === "topics" ? groupedTopics.length : filtered.length} records
        </span>
      </div>

      {/* CommonTable */}
      <CommonTable
        columns={viewMode === "topics" ? topicColumns : detailedColumns}
        data={tableData}
        pagination={true}
        rowsPerPage={10}
        emptyMessage="No syllabus topics found"
      />
    </div>
  );
};

/* helper: subjects list from version */
export const useSubjectsList = (versionId) => {
  const { data } = useGetSyllabusVersionWithHierarchyQuery(versionId, { skip: !versionId });
  return useMemo(() => (data?.data?.subjects || []).map((s) => ({ _id: s._id, name: s.name, topicCount: s.topics?.length || 0 })), [data]);
};

/* ─── Task Excel Upload Drawer ─────────────────────────── */
const parseTaskExcel = (file) =>
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

export const TaskUploadDrawer = ({ syllabusVersionId, subjectName, version, onSaved }) => {
  const fileRef = useRef(null);
  const [rows,     setRows]     = useState([]);
  const [fileName, setFileName] = useState("");
  const [saving,   setSaving]   = useState(false);
  const [parsing,  setParsing]  = useState(false);

  const [bulkUploadTasks] = useBulkUploadTasksMutation();

  const reset = () => { setRows([]); setFileName(""); };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) { 
      toast.error("Please upload .xlsx, .xls or .csv file"); 
      return; 
    }
    setParsing(true); 
    setRows([]); 
    setFileName(file.name);
    try {
      const parsed = await parseTaskExcel(file);
      if (!parsed.length) { 
        toast.error("Excel file is empty or has no data rows"); 
        return; 
      }
      
      // Validate required columns
      const firstRow = parsed[0];
      const hasTopic = Object.keys(firstRow).some(key => 
        key.toLowerCase().includes('topic'));
      const hasTask = Object.keys(firstRow).some(key => 
        key.toLowerCase().includes('task'));
      
      if (!hasTopic || !hasTask) {
        toast.error("Excel file must contain 'Topic' and 'Task Title' columns");
        return;
      }
      
      // Map column headers (case-insensitive)
      const mapped = parsed.map((r) => ({
        subject:           String(r["Subject"]          || r["subject"]          || r["SUBJECT"] || "").trim(),
        topic:             String(r["Topic"]            || r["topic"]            || r["Topic Name"] || r["TOPIC"] || "").trim(),
        subTopic:          String(r["Sub Topic"]        || r["subTopic"]         || r["SubTopic"]   || r["sub_topic"] || r["SUBTOPIC"] || "").trim(),
        taskTitle:         String(r["Task Title"]       || r["taskTitle"]        || r["TaskTitle"]  || r["Tasks"] || r["TASK"] || "").trim(),
        taskType:          String(r["taskType"]         || r["TaskType"]         || r["Task Type"]  || r["TASK TYPE"] || "assessment").trim(),
        priority:          String(r["priority"]         || r["Priority"]         || r["PRIORITY"] || "medium").trim(),
        maxMarks:          Number(r["maxMarks"]         || r["MaxMarks"]         || r["Max Marks"]  || r["MAX MARKS"] || 5),
        timeDays:          r["Time Days"] || r["timeDays"] || r["TimeDays"] || r["Time"] || r["TIME DAYS"] || null,
        measurablePoints:  String(r["Measurable Point"] || r["measurablePoints"] || r["MeasurablePoints"] || r["Measurable Points"] || r["MEASURABLE POINTS"] || "").trim(),
      })).filter((r) => r.topic && r.taskTitle);

      if (!mapped.length) { 
        toast.error("No valid task rows found. Check column names and ensure Topic and Task Title are filled."); 
        return; 
      }
      setRows(mapped);
      toast.success(`${mapped.length} task rows parsed successfully`);
    } catch (error) { 
      console.error('Task Excel parsing error:', error);
      toast.error("Failed to parse Excel file. Please check the file format"); 
    }
    finally { 
      setParsing(false); 
      e.target.value = ""; 
    }
  };

  const handleUpload = async () => {
    if (!rows.length) { toast.error("No data to upload"); return; }
    setSaving(true);
    try {
      const res = await bulkUploadTasks({ syllabusVersionId, tasks: rows }).unwrap();
      toast.success(`${res.inserted} task(s) uploaded!`);
      if (res.errors?.length) {
        console.warn('Task upload warnings:', res.errors);
        res.errors.forEach((e) => toast.warn(e, { autoClose: 8000 }));
      }
      reset();
      onSaved?.();
    } catch (err) {
      console.error('Task upload error:', err);
      const errData = err?.data;
      const errorMessage = errData?.message || err?.message || "Upload failed";
      toast.error(errorMessage);
      if (errData?.errors?.length) {
        errData.errors.forEach((e) => toast.warn(e, { autoClose: 8000 }));
      }
    } finally { setSaving(false); }
  };

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <p className="text-sm font-semibold text-gray-700">Upload Tasks for <span className="text-orange-600">{subjectName} {version}</span></p>
          <p className="text-xs text-gray-400 mt-0.5">Required columns: Subject, Topic, Sub Topic, Task Title, Time Days, Measurable Point</p>
        </div>
        <a
          href="/task_template.csv"
          download="task_template.csv"
          className="flex items-center justify-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 font-semibold bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg transition w-full sm:w-auto"
        >
          ⬇ Download Template
        </a>
      </div>

      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-orange-200 rounded-xl p-5 flex flex-col items-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition group"
      >
        {parsing ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-500">Parsing...</span>
          </div>
        ) : (
          <>
            <MdAssignment size={28} className="text-orange-300 group-hover:text-orange-400 mb-1" />
            <p className="text-sm font-semibold text-gray-700">Click to upload Task Excel</p>
            {fileName && <p className="text-xs text-orange-500 mt-1">📄 {fileName}</p>}
          </>
        )}
      </div>
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />

      {rows.length > 0 && (
        <>
          <div className="bg-white border border-gray-100 rounded-lg px-3 py-2 text-xs text-gray-600">
            <span className="font-semibold text-green-600">{rows.length} rows</span> ready to upload
            <span className="ml-3 text-gray-400">Preview: {rows.slice(0, 2).map((r) => r.taskTitle).join(", ")}{rows.length > 2 ? "..." : ""}</span>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <button onClick={reset} className="w-full sm:w-auto px-4 py-2 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-center">Clear</button>
            <button
              onClick={handleUpload} disabled={saving}
              className="w-full sm:flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-semibold py-2 rounded-lg transition text-center"
            >
              <MdSave size={15} />{saving ? "Uploading..." : "Upload Tasks"}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

/* ─── helper: numbered points ko split karo ──────────── */
const splitNumberedPoints = (text) => {
  if (!text) return [];
  // "1. abc\n2. def" ya "1. abc 2. def" dono handle karo
  const parts = text.split(/\n/).flatMap((line) =>
    line.split(/(?=\d+\.\s)/).map((s) => s.trim()).filter(Boolean)
  );
  return parts.length > 1 ? parts : [text.trim()];
};

/* ─── Tasks table for one version ──────────────────────── */
const PRIORITY_BADGE = {
  high:   { cls: "bg-red-100 text-red-600 border border-red-200",       dot: "bg-red-400" },
  medium: { cls: "bg-yellow-100 text-yellow-700 border border-yellow-200", dot: "bg-yellow-400" },
  low:    { cls: "bg-green-100 text-green-700 border border-green-200",   dot: "bg-green-400" },
};
const TYPE_BADGE = {
  writtenExam:  "bg-purple-50 text-purple-700 border border-purple-200",
  interview:    "bg-blue-50 text-blue-700 border border-blue-200",
  project:      "bg-orange-50 text-orange-600 border border-orange-200",
  presentation: "bg-pink-50 text-pink-700 border border-pink-200",
  learning:     "bg-teal-50 text-teal-700 border border-teal-200",
  assessment:   "bg-gray-100 text-gray-600 border border-gray-200",
};

function formatTimeAgo(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (isNaN(seconds)) return "";
  if (seconds < 0) return "Just now";

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
        minute: 60,
        second: 1
      };

      for (const [unit, value] of Object.entries(intervals)) {
        const count = Math.floor(seconds / value);
        if (count >= 1) {
          return `${count} ${unit}${count > 1 ? "s" : ""} ago`;
        }
      }
      return "Just now";
    }

/* ─── Task Detail Modal for viewing full task info ────────────────── */
const TaskDetailModal = ({ task, onClose }) => {
  if (!task) return null;
  const measurePoints = splitNumberedPoints(task.measurablePoints);
  const typeKey = task.type || "assessment";
  const priorityKey = (task.priority || "medium").toLowerCase();

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100 bg-gray-50/50 gap-3">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full">
              Task Details
            </span>
            <h3
              className="text-base font-black text-slate-850 mt-1.5 leading-snug break-words"
              style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
            >
              {task.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
          >
            <MdClose size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Badges row */}
          <div className="flex flex-wrap gap-2">
            <span className={`inline-block text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${TYPE_BADGE[typeKey] || "bg-gray-100 text-gray-600 border border-gray-200"}`}>
              {typeKey}
            </span>
            <span className="inline-block text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
              Priority: {priorityKey}
            </span>
            {task.timeDays && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full">
                <MdAccessTime size={13} /> {task.timeDays} Day{task.timeDays > 1 ? "s" : ""}
              </span>
            )}
            {task.dueDate && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full">
                <MdCalendarToday size={13} /> Due: {new Date(task.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            )}
          </div>

          {/* Subject & Topic path */}
          <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3.5 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Curriculum Mapping</p>
            <div className="flex items-center flex-wrap gap-2 text-xs font-semibold text-slate-700">
              <span className="text-orange-600 font-bold">{task.subjectName || "Subject"}</span>
              <MdChevronRight size={14} className="text-slate-300" />
              <span>{task.topicName || "Topic"}</span>
              {task.subTopicName && (
                <>
                  <MdChevronRight size={14} className="text-slate-300" />
                  <span className="text-slate-500">{task.subTopicName}</span>
                </>
              )}
            </div>
          </div>

          {/* Measurable Points */}
          <div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Measurable Points</p>
            {measurePoints.length > 0 && measurePoints[0] ? (
              <div className="bg-orange-50/30 border border-orange-100/60 rounded-xl p-4">
                <ul className="space-y-2">
                  {measurePoints.map((pt, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed font-medium break-words">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                      <span style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No specific measurable points provided for this task.</p>
            )}
          </div>

          {/* Metadata */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <span>Assigned By: <strong className="text-gray-600">{task.assignedByName || "System"}</strong></span>
            {task.createdAt && <span>Created: {formatTimeAgo(task.createdAt)}</span>}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Tasks Table for a Syllabus Version ────────────────────────── */
export const VersionTasksTable = ({ versionId, searchTerm = "", activeSubjectId, activeSubjectName }) => {
  const { data, isLoading } = useGetTasksBySyllabusVersionQuery(versionId, { skip: !versionId });
  const allTasks = data?.tasks || data?.data || [];
  const [selectedTask, setSelectedTask] = useState(null);

  const tasks = useMemo(() => {
    let filteredTasks = allTasks;
    if (activeSubjectId) {
      const activeNameClean = (activeSubjectName || "").trim().toLowerCase();
      filteredTasks = allTasks.filter((t) => {
        const idMatches = t.subjectId && String(t.subjectId) === String(activeSubjectId);
        const tNameClean = (t.subjectName || "").trim().toLowerCase();
        const nameMatches = activeNameClean && tNameClean === activeNameClean;
        return idMatches || nameMatches;
      });
    }
    if (!searchTerm.trim()) return filteredTasks;
    const q = searchTerm.toLowerCase();
    return filteredTasks.filter((t) =>
      t.title?.toLowerCase().includes(q) ||
      t.topicName?.toLowerCase().includes(q) ||
      t.subTopicName?.toLowerCase().includes(q)
    );
  }, [allTasks, searchTerm, activeSubjectId, activeSubjectName]);

  const taskColumns = useMemo(() => [
    {
      key: "sno",
      label: "S.NO",
      align: "center",
      render: (row) => (
        <span className="inline-flex w-7 h-7 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold items-center justify-center">
          {row.sno}
        </span>
      ),
    },
    {
      key: "title",
      label: "TASK & CURRICULUM",
      wrap: true,
      cellClassName: "whitespace-normal min-w-[280px] max-w-lg",
      render: (row) => (
        <div className="flex flex-col gap-1.5 py-0.5 min-w-0 max-w-full">
          {/* Main Title (line-clamp-2, bold, hover effect) */}
          <span
            onClick={() => setSelectedTask(row)}
            className="font-bold text-sm text-slate-800 hover:text-orange-600 transition-colors cursor-pointer leading-snug line-clamp-2 break-words"
            style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
            title={row.title}
          >
            {row.title}
          </span>

          {/* Subtitle: Subject Tag + Topic & SubTopic Breadcrumb */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-500">
            {row.subjectName && (
              <span className="inline-flex items-center font-bold text-[10px] text-orange-600 bg-orange-50 border border-orange-200/60 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                {row.subjectName}
              </span>
            )}
            {row.topicName && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-700 font-semibold shrink-0">
                <MdTopic size={13} className="text-orange-500 shrink-0" />
                <span className="truncate max-w-[150px]" title={row.topicName}>{row.topicName}</span>
              </span>
            )}
            {row.subTopicName && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-normal shrink-0">
                <span className="text-slate-300">›</span>
                <span className="truncate max-w-[130px]" title={row.subTopicName}>{row.subTopicName}</span>
              </span>
            )}
          </div>

          {/* Due date & Created date */}
          {(row.dueDate || row.createdAt) && (
            <div className="flex items-center gap-2 flex-wrap text-[10px] text-gray-400">
              {row.dueDate && (
                <span className="inline-flex items-center gap-1 font-semibold text-gray-500 bg-gray-50 border border-gray-200/60 px-2 py-0.5 rounded-full shrink-0">
                  <MdCalendarToday size={10} className="text-gray-400" />
                  Due: {new Date(row.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              )}
              {row.createdAt && (
                <span className="shrink-0">{formatTimeAgo(row.createdAt)}</span>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "type",
      label: "TYPE",
      align: "center",
      render: (row) => {
        const typeKey = row.type || "assessment";
        return (
          <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-sm/5 ${TYPE_BADGE[typeKey] || "bg-gray-100 text-gray-600 border border-gray-200"}`}>
            {typeKey}
          </span>
        );
      },
    },
    {
      key: "priority",
      label: "PRIORITY",
      align: "center",
      render: (row) => {
        const pKey = (row.priority || "medium").toLowerCase();
        const priorityStyles = {
          high: { badge: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
          medium: { badge: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
          low: { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
        };
        const st = priorityStyles[pKey] || priorityStyles.medium;
        return (
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-sm/5 ${st.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
            {pKey}
          </span>
        );
      },
    },
    {
      key: "timeDays",
      label: "DURATION",
      align: "center",
      render: (row) => (
        <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
          {row.timeDays ? (
            <span className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-md">
              <MdAccessTime size={12} className="text-gray-400" />
              {row.timeDays}d
            </span>
          ) : "—"}
        </span>
      ),
    },
    {
      key: "measurablePoints",
      label: "MEASURABLE POINTS",
      wrap: true,
      cellClassName: "whitespace-normal min-w-[180px] max-w-xs",
      render: (row) => {
        const points = splitNumberedPoints(row.measurablePoints);
        if (!points.length || !points[0]) return <span className="text-xs text-slate-300">—</span>;
        return (
          <div className="max-w-xs space-y-1 py-1 whitespace-normal break-words">
            {points.slice(0, 2).map((pt, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs text-slate-600 leading-snug">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                <span className="line-clamp-2">{pt}</span>
              </div>
            ))}
            {points.length > 2 && (
              <button
                type="button"
                onClick={() => setSelectedTask(row)}
                className="text-[10px] text-orange-500 font-bold hover:underline cursor-pointer"
              >
                +{points.length - 2} more points
              </button>
            )}
          </div>
        );
      },
    },
    {
      key: "actions",
      label: "ACTION",
      align: "center",
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelectedTask(row)}
          className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
          title="View Details"
        >
          <MdVisibility size={16} />
        </button>
      ),
    },
  ], []);

  const tableData = useMemo(() => {
    return tasks.map((t, idx) => ({
      ...t,
      sno: idx + 1,
    }));
  }, [tasks]);

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <div className="w-9 h-9 border-[3.5px] border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!tasks.length) return (
    <div className="py-20 text-center px-4">
      <div className="w-20 h-20 rounded-full bg-orange-50/50 flex items-center justify-center mx-auto mb-4 border border-orange-100/50 shadow-sm">
        <MdAssignment size={36} className="text-orange-400" />
      </div>
      <h3 className="text-base font-bold text-gray-800 mb-1">No tasks added yet</h3>
      <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
        {searchTerm ? "No tasks matching your search." : "Add tasks from the button above to populate this syllabus version."}
      </p>
    </div>
  );

  return (
    <div className="p-3 sm:p-4 space-y-3">
      {/* Desktop Table View */}
      <div className="hidden md:block">
        <CommonTable
          columns={taskColumns}
          data={tableData}
          pagination={true}
          rowsPerPage={10}
          emptyMessage="No tasks found"
        />
      </div>

      {/* Mobile Task Cards View */}
      <div className="md:hidden space-y-3">
        {tableData.map((t) => {
          const pKey = (t.priority || "medium").toLowerCase();
          const priorityBadge =
            pKey === "high" ? "bg-rose-50 text-rose-700 border-rose-200" :
            pKey === "low" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
            "bg-amber-50 text-amber-700 border-amber-200";
          const typeKey = t.type || "assessment";

          return (
            <div
              key={t._id || t.sno}
              onClick={() => setSelectedTask(t)}
              className="bg-white border border-gray-200 rounded-2xl p-3.5 shadow-2xs hover:border-orange-200 transition-all active:scale-[0.99] cursor-pointer space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {t.sno}
                  </span>
                  <h4
                    className="font-bold text-sm text-slate-900 leading-snug line-clamp-2 break-words min-w-0 flex-1"
                    title={t.title}
                  >
                    {t.title}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSelectedTask(t); }}
                  className="p-1 text-gray-400 hover:text-orange-600 rounded-lg hover:bg-orange-50 shrink-0 cursor-pointer"
                >
                  <MdVisibility size={16} />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-[10.5px]">
                {t.subjectName && (
                  <span className="font-bold text-orange-600 bg-orange-50 border border-orange-200/60 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {t.subjectName}
                  </span>
                )}
                <span className={`font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${priorityBadge}`}>
                  {pKey}
                </span>
                <span className="font-bold px-2 py-0.5 rounded-full border bg-gray-100 text-gray-600 border-gray-200 uppercase tracking-wider">
                  {typeKey}
                </span>
                {t.timeDays && (
                  <span className="text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-md font-semibold">
                    {t.timeDays}d
                  </span>
                )}
              </div>

              {(t.topicName || t.subTopicName) && (
                <div className="text-xs text-slate-600 bg-slate-50/80 p-2 rounded-xl border border-slate-100 flex items-center gap-1.5 truncate">
                  <MdTopic size={13} className="text-orange-500 shrink-0" />
                  <span className="font-semibold truncate">{t.topicName}</span>
                  {t.subTopicName && (
                    <>
                      <span className="text-slate-300">/</span>
                      <span className="text-slate-500 truncate">{t.subTopicName}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 px-2 py-1">
        <span>
          Total <strong className="text-gray-700 font-bold">{tasks.length}</strong> tasks
          {allTasks.length !== tasks.length && (
            <span className="ml-1 text-gray-400">(filtered from {allTasks.length})</span>
          )}
        </span>
      </div>

      {selectedTask && (
        <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
    </div>
  );
};

/* ─── Manual Task Creation Form ────────────────────────── */
const TASK_TYPES = ["writtenExam", "interview", "project", "presentation", "learning", "assessment"];
const EMPTY_FORM = { title: "", measurablePoints: "", timeDays: "", type: "assessment", dueDate: "" };

export const ManualTaskForm = ({ subLevel, versionId, onSaved, formId = "manual-task-form", showSubmitButton = true }) => {
  const subLevelId = subLevel?._id;
  const [syllabusVersionId, setSyllabusVersionId] = useState(versionId || "");
  const [subjectId,  setSubjectId]  = useState("");
  const [topicId,    setTopicId]    = useState("");
  const [taskTarget, setTaskTarget] = useState("");
  const [subTopicId, setSubTopicId] = useState("");
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);

  const { data: versionsData } = useGetSyllabusVersionsBySubLevelQuery(
    { subLevelId, sessionId: "" },
    { skip: !subLevelId && !versionId }
  );
  const versions = versionsData?.data || [];

  useEffect(() => {
    if (!versionId) {
      if (versions.length > 0) {
        if (!syllabusVersionId || !versions.some(v => v._id === syllabusVersionId)) {
          const active = versions.find((v) => v.status === "active") || versions[0];
          setSyllabusVersionId(active._id);
        }
      } else {
        setSyllabusVersionId("");
      }
    }
  }, [versions, versionId, syllabusVersionId]);

  useEffect(() => {
    setSubjectId("");
    setTopicId("");
    setSubTopicId("");
  }, [syllabusVersionId]);

  const { data: versionDetail } = useGetSyllabusVersionWithHierarchyQuery(syllabusVersionId, { skip: !syllabusVersionId });
  const subjects  = versionDetail?.data?.subjects || [];
  const topics    = subjects.find((s) => s._id === subjectId)?.topics || [];
  const subTopics = topics.find((t) => t._id === topicId)?.subTopics || [];

  const [createTask] = useCreateTaskManualMutation();
  const resetForm = () => { setSubjectId(""); setTopicId(""); setTaskTarget(""); setSubTopicId(""); setForm(EMPTY_FORM); };
  const canSubmit = taskTarget === "topic" || (taskTarget === "subtopic" && subTopicId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Task title is required"); return; }
    setSaving(true);
    try {
      const payload = {
        syllabusVersionId, subjectId, topicId,
        ...(taskTarget === "subtopic" && subTopicId ? { subTopicId } : {}),
        ...form,
        title:    form.title.trim(),
        timeDays: form.timeDays ? Number(form.timeDays) : null,
      };
      await createTask(payload).unwrap();
      toast.success("Task created successfully!");
      setForm(EMPTY_FORM); setSubTopicId(""); setTaskTarget("");
      onSaved?.();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to create task");
    } finally { setSaving(false); }
  };

  const ic = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 bg-white transition";
  const lc = "block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5";

  return (
    <form id={formId} onSubmit={handleSubmit} className="divide-y divide-gray-100">

      {/* Section 1 */}
      <div className="px-5 py-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">1</span>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Select Location</span>
        </div>

        <div>
          <label className={lc}>Subject</label>
          <select className={ic} value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setTopicId(""); setTaskTarget(""); setSubTopicId(""); }}>
            <option value="">-- Select Subject --</option>
            {subjects.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>

        {subjectId && (
          <div>
            <label className={lc}>Topic</label>
            <select className={ic} value={topicId} onChange={(e) => { setTopicId(e.target.value); setTaskTarget(""); setSubTopicId(""); }}>
              <option value="">-- Select Topic --</option>
              {topics.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
          </div>
        )}

        {topicId && (
          <div>
            <label className={lc}>Assign Task To</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button"
                onClick={() => { setTaskTarget("topic"); setSubTopicId(""); }}
                className={`flex items-center gap-2.5 border rounded-xl px-3 py-2.5 transition text-left ${taskTarget === "topic" ? "border-orange-500 bg-orange-50 text-orange-600" : "border-gray-200 bg-white text-gray-500 hover:border-orange-300"}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${taskTarget === "topic" ? "bg-orange-100" : "bg-gray-100"}`}>
                  <MdTopic size={16} className={taskTarget === "topic" ? "text-orange-500" : "text-gray-400"} />
                </div>
                <div>
                  <p className="text-xs font-semibold">Topic Level</p>
                  <p className="text-[10px] opacity-60">No subtopic</p>
                </div>
              </button>
              <button type="button"
                onClick={() => setTaskTarget("subtopic")}
                className={`flex items-center gap-2.5 border rounded-xl px-3 py-2.5 transition text-left ${taskTarget === "subtopic" ? "border-blue-500 bg-blue-50 text-blue-600" : "border-gray-200 bg-white text-gray-500 hover:border-blue-300"}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${taskTarget === "subtopic" ? "bg-blue-100" : "bg-gray-100"}`}>
                  <MdSubject size={16} className={taskTarget === "subtopic" ? "text-blue-500" : "text-gray-400"} />
                </div>
                <div>
                  <p className="text-xs font-semibold">SubTopic Level</p>
                  <p className="text-[10px] opacity-60">Select subtopic</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {taskTarget === "subtopic" && (
          <div>
            <label className={lc}>SubTopic</label>
            {subTopics.length === 0 ? (
              <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                No subtopics found in this topic. Select Topic Level instead.
              </div>
            ) : (
              <select className={ic} value={subTopicId} onChange={(e) => setSubTopicId(e.target.value)}>
                <option value="">-- Select SubTopic --</option>
                {subTopics.map((st) => <option key={st._id} value={st._id}>{st.name}</option>)}
              </select>
            )}
          </div>
        )}

        {canSubmit && (
          <div className="flex items-center gap-1.5 flex-wrap bg-[#F8F7F5] border border-gray-100 rounded-xl px-3 py-2.5">
            <MdBook size={12} className="text-orange-400" />
            <span className="text-xs font-medium text-gray-600">{subjects.find(s => s._id === subjectId)?.name}</span>
            <span className="text-gray-300 text-xs">â€º</span>
            <MdTopic size={12} className="text-orange-400" />
            <span className="text-xs font-medium text-gray-600">{topics.find(t => t._id === topicId)?.name}</span>
            {subTopicId && (<><span className="text-gray-300 text-xs">â€º</span><MdSubject size={12} className="text-gray-400" /><span className="text-xs text-gray-500">{subTopics.find(s => s._id === subTopicId)?.name}</span></>)}
            <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${taskTarget === "subtopic" ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600"}`}>
              {taskTarget === "subtopic" ? "SubTopic" : "Topic"}
            </span>
          </div>
        )}
      </div>

      {/* Section 2 */}
      {canSubmit && (
        <div className="px-5 py-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">2</span>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Task Details</span>
          </div>

          <div>
            <label className={lc}>Task Title <span className="text-red-400 normal-case font-normal">*</span></label>
            <input className={ic} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Build a REST API" />
          </div>

          <div>
            <label className={lc}>Measurable Points</label>
            <textarea className={ic} rows={3} value={form.measurablePoints} onChange={(e) => setForm((p) => ({ ...p, measurablePoints: e.target.value }))} placeholder="e.g. Student should be able to explain and implement..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lc}>Type</label>
              <select className={ic} value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
                {TASK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={lc}>Time (Days)</label>
              <input type="number" className={ic} value={form.timeDays} onChange={(e) => setForm((p) => ({ ...p, timeDays: e.target.value }))} placeholder="e.g. 7" />
            </div>
            <div className="col-span-2">
              <label className={lc}>Due Date <span className="text-gray-300 normal-case font-normal">(optional)</span></label>
              <input type="date" className={ic} value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      {canSubmit && (
        <div className="px-5 py-4 flex gap-2 bg-[#F8F7F5]">
          {showSubmitButton && (
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-semibold py-2.5 rounded-xl transition shadow-sm shadow-orange-100">
              <MdAssignment size={15} />
              {saving ? "Saving..." : "Add Task"}
            </button>
          )}
          <button type="button" onClick={resetForm}
            className="px-4 py-2.5 text-sm text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">
            Reset
          </button>
        </div>
      )}
    </form>
  );
};

/* --- Tasks Tab ----------------------------------------- */
export const TasksTab = ({ level, subLevel, onVersionChange }) => {
  const subLevelId = subLevel?._id;
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [activeVersionId,   setActiveVersionId]   = useState("");
  const [searchTerm,        setSearchTerm]        = useState("");
  const [showTaskModal,     setShowTaskModal]     = useState(false);
  const [activeSubjectId,   setActiveSubjectId]   = useState("");

  const { data: sessionsData } = useGetAllSessionsQuery();
  const sessions = sessionsData?.data || [];

  const { data: versionsData, refetch } = useGetSyllabusVersionsBySubLevelQuery(
    { subLevelId, sessionId: selectedSessionId },
    { skip: !subLevelId, refetchOnMountOrArgChange: true }
  );
  const allVersions = versionsData?.data || [];

  const currentVersionId = activeVersionId
    || allVersions.find((v) => v.status === "active")?._id
    || allVersions[0]?._id
    || "";

  // Get subjects list for current tasks version
  const subjectsList = useSubjectsList(currentVersionId);

  // Auto-select first subject when version/subjects change
  useEffect(() => {
    if (subjectsList.length > 0) {
      if (!activeSubjectId || !subjectsList.some(s => s._id === activeSubjectId)) {
        setActiveSubjectId(subjectsList[0]._id);
      }
    } else {
      setActiveSubjectId("");
    }
  }, [currentVersionId, subjectsList.length]);

  // Get active subject name for robust fallback matching
  const activeSubjectName = subjectsList.find(s => s._id === activeSubjectId)?.name || "";

  console.log("TasksTab render debug:", {
    currentVersionId,
    subjectsList,
    activeSubjectId,
    activeSubjectName
  });

  useEffect(() => {
    if (allVersions.length > 0) {
      if (!activeVersionId || !allVersions.some(v => v._id === activeVersionId)) {
        const active = allVersions.find((v) => v.status === "active") || allVersions[0];
        setActiveVersionId(active._id);
      }
    } else {
      setActiveVersionId("");
    }
  }, [allVersions, subLevelId]);

  useEffect(() => { onVersionChange?.(currentVersionId); }, [currentVersionId]);

  if (!subLevelId) return <div className="py-16 text-center text-gray-450 text-sm">SubLevel not found</div>;

  if (allVersions.length === 0 && !selectedSessionId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mb-4 border border-orange-100/50">
          <MdAssignment size={26} className="text-orange-400" />
        </div>
        <h3 className="text-base font-bold text-gray-755 mb-1">No syllabus found</h3>
        <p className="text-xs text-gray-400 max-w-xs mx-auto">Upload syllabus first from the Syllabus tab.</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Top bar: search + session filter + version filter + Add Task button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3.5 sm:px-5 py-3 sm:py-4 border-b border-gray-100 bg-white">
          <div className="flex flex-col sm:flex-row flex-1 items-stretch sm:items-center gap-2.5 sm:gap-3 w-full">
            {/* Search Input Container */}
            <div className="relative w-full sm:flex-1 sm:max-w-sm">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 z-10">
                <MdSearch size={18} />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search tasks by title, topic..."
                className="w-full pr-4 py-2 text-xs sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white placeholder-gray-400 transition-all duration-200"
                style={{ paddingLeft: '2.75rem' }}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              {/* Session Select Container */}
              <div className="flex-1 sm:flex-initial min-w-[135px]">
                <SelectDropdown
                  value={selectedSessionId}
                  onChange={(val) => { setSelectedSessionId(val); setActiveVersionId(""); }}
                  options={[{ value: "", label: "All Sessions" }, ...sessions.map((s) => ({ value: s._id, label: s.name }))]}
                  placeholder="All Sessions"
                />
              </div>

              {/* Version Select Container */}
              {allVersions.length > 1 && (
                <div className="flex-1 sm:flex-initial min-w-[130px]">
                  <SelectDropdown
                    value={currentVersionId}
                    onChange={(val) => setActiveVersionId(val)}
                    options={allVersions.map((v) => ({
                      value: v._id,
                      label: `${v.title || v.version}${v.status === "active" ? " (Active)" : ""}`,
                    }))}
                    placeholder="Select Version"
                  />
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowTaskModal(true)}
            className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white text-xs sm:text-sm font-bold px-4 sm:px-5 py-2.5 rounded-xl transition-all shadow-sm shadow-orange-500/10 cursor-pointer w-full sm:w-auto shrink-0"
          >
            <MdAdd size={18} />
            <span>Add Task</span>
          </button>
        </div>

        {/* Subject tabs (Pill selectors) */}
        {subjectsList.length > 0 && (
          <div className="flex gap-2 overflow-x-auto p-2 bg-gray-50/50 rounded-xl border border-gray-150/45 mx-3 my-3 sm:m-4 no-scrollbar scrollbar-none">
            {subjectsList.map((s) => (
              <button
                key={s._id}
                onClick={() => { setActiveSubjectId(s._id); setSearchTerm(""); }}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold whitespace-nowrap rounded-lg border transition-all flex-shrink-0 ${
                  activeSubjectId === s._id
                    ? "bg-white text-orange-600 shadow-sm border-orange-200/30"
                    : "border-transparent text-gray-555 hover:text-gray-855 hover:bg-gray-100/50"
                }`}
              >
                <MdBook size={13} className={activeSubjectId === s._id ? "text-orange-500" : "text-gray-400"} />
                <span>{s.name}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all ${
                  activeSubjectId === s._id ? "bg-orange-50 text-orange-600 border border-orange-100" : "bg-gray-100 text-gray-500"
                }`}>
                  {s.topicCount}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Table or empty state */}
        {allVersions.length === 0 ? (
          <div className="py-20 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-3 border border-orange-100/40">
              <MdAssignment size={26} className="text-orange-400" />
            </div>
            <h4 className="text-sm font-bold text-gray-800">No syllabus found</h4>
            <p className="text-xs text-gray-450 mt-1 max-w-xs mx-auto leading-relaxed">
              {selectedSessionId ? "Try selecting a different session or create one." : "Upload syllabus first from the Syllabus tab."}
            </p>
          </div>
        ) : (
          <VersionTasksTable versionId={currentVersionId} searchTerm={searchTerm} activeSubjectId={activeSubjectId} activeSubjectName={activeSubjectName} />
        )}
      </div>

      {/* Task Management Modal */}
      <TaskManagementModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        level={level}
        subLevel={subLevel}
        onSuccess={() => {
          setShowTaskModal(false);
          refetch();
        }}
      />
    </>
  );
};

const EmptyUploadState = ({ level, subLevel, onSaved }) => {
  const [showUpload, setShowUpload] = useState(false);
  const drawerRef = useRef(null);

  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-20 px-4 sm:px-8 text-center">
      <div className="w-20 sm:w-24 h-20 sm:h-24 rounded-full bg-orange-50 flex items-center justify-center mb-5 sm:mb-6">
        <MdCloudUpload size={40} className="text-orange-400" />
      </div>
      <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-2">No syllabus uploaded for this level.</h3>
      <p className="text-xs sm:text-sm text-gray-400 max-w-sm mb-6 leading-relaxed">
        Upload the academic syllabus to get started. Once uploaded, you can assign lessons to specific weeks and track coverage.
      </p>

      {!showUpload ? (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-semibold px-5 sm:px-6 py-2.5 rounded-xl transition hover:shadow-md cursor-pointer"
          >
            <MdCloudUpload size={16} /> Upload Syllabus
          </button>
          <button
            type="button"
            onClick={downloadSyllabusTemplate}
            className="flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold text-orange-500 bg-white border border-orange-300 hover:bg-orange-50 px-5 sm:px-6 py-2.5 rounded-xl transition cursor-pointer"
          >
            <MdFileDownload size={16} /> Download Template
          </button>
        </div>
      ) : (
        <div className="w-full max-w-3xl text-left mt-4 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-3.5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900">Upload Syllabus Curriculum</h3>
              <p className="text-xs text-slate-400 mt-0.5">Import Excel syllabus or add manual subjects</p>
            </div>
            <button
              onClick={() => setShowUpload(false)}
              className="text-xs text-slate-400 hover:text-slate-700 font-bold px-3 py-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              ✕ Close
            </button>
          </div>
          <SyllabusUploadModalContent
            level={level}
            subLevel={subLevel}
            onSaved={() => { setShowUpload(false); onSaved?.(); }}
            onClose={() => setShowUpload(false)}
          />
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   MAIN SYLLABUS TAB
══════════════════════════════════════════════════════════ */
const SyllabusTab = ({ level, subLevel }) => {
  const subLevelId = subLevel?._id;

  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [activeVersionId,   setActiveVersionId]   = useState("");
  const [searchTerm,        setSearchTerm]        = useState("");
  const [activeSubject,     setActiveSubject]     = useState("");

  const { data: sessionsData } = useGetAllSessionsQuery();
  const sessions = sessionsData?.data || [];

  const { data: versionsData, refetch } = useGetSyllabusVersionsBySubLevelQuery(
    { subLevelId, sessionId: selectedSessionId },
    { skip: !subLevelId, refetchOnMountOrArgChange: true }
  );
  const allVersions = versionsData?.data || [];

  const currentVersionId = activeVersionId
    || allVersions.find((v) => v.status === "active")?._id
    || allVersions[0]?._id
    || "";

  useEffect(() => {
    if (allVersions.length > 0) {
      if (!activeVersionId || !allVersions.some(v => v._id === activeVersionId)) {
        const active = allVersions.find((v) => v.status === "active") || allVersions[0];
        setActiveVersionId(active._id);
      }
    } else {
      setActiveVersionId("");
    }
  }, [allVersions, subLevelId]);

  const currentVersionDoc = allVersions.find((v) => v._id === currentVersionId);

  // subjects list for current version
  const subjectsList = useSubjectsList(currentVersionId);

  // auto-select first subject when version changes
  useEffect(() => {
    if (subjectsList.length > 0) setActiveSubject(subjectsList[0].name);
    else setActiveSubject("");
  }, [currentVersionId, subjectsList.length]);

  const [deleteSyllabusVersion]   = useDeleteSyllabusVersionMutation();
  const [activateSyllabusVersion] = useActivateSyllabusVersionMutation();

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this version?")) return;
    try { await deleteSyllabusVersion(id).unwrap(); refetch(); }
    catch (err) { toast.error(err?.data?.message || "Delete failed"); }
  };

  const handleActivate = async (id) => {
    try { await activateSyllabusVersion(id).unwrap(); toast.success("Activated!"); refetch(); }
    catch (err) { toast.error(err?.data?.message || "Activate failed"); }
  };

  if (allVersions.length === 0 && !selectedSessionId) {
    return <EmptyUploadState level={level} subLevel={subLevel} onSaved={refetch} />;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

      {/* Top bar: search + session dropdown + version + session info + actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3.5 sm:px-5 py-3 sm:py-3.5 border-b border-gray-100 bg-white">
        {/* Search Container */}
        <div className="relative w-full sm:flex-1 sm:max-w-xs">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 z-10">
            <MdSearch size={18} />
          </span>
          <input
            type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search topic or subtopic..."
            className="w-full pr-4 py-2 text-xs sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white placeholder-gray-400 transition-all duration-200"
            style={{ paddingLeft: '2.75rem' }}
          />
        </div>

        {/* Right side controls: All Sessions dropdown + Version selector + Session badge + Status + Actions */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
          {/* Session Dropdown */}
          <div className="flex-1 sm:flex-initial min-w-[130px]">
            <SelectDropdown
              value={selectedSessionId}
              onChange={(val) => { setSelectedSessionId(val); setActiveVersionId(""); setSearchTerm(""); }}
              options={[{ value: "", label: "All Sessions" }, ...sessions.map((s) => ({ value: s._id, label: s.name }))]}
              placeholder="All Sessions"
            />
          </div>

          {/* Version Selector (Dropdown if multiple, or badge if single) */}
          {allVersions.length > 1 ? (
            <div className="flex-1 sm:flex-initial min-w-[130px]">
              <SelectDropdown
                value={currentVersionId}
                onChange={(val) => { setActiveVersionId(val); setSearchTerm(""); }}
                options={allVersions.map((v) => ({
                  value: v._id,
                  label: `${v.title || v.version}${v.status === "active" ? " (Active)" : ""}`,
                }))}
                placeholder="Select Version"
              />
            </div>
          ) : currentVersionDoc ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700">
              <MdBook size={14} className="text-orange-500" />
              <span>{currentVersionDoc.title || currentVersionDoc.version || "v1.0"}</span>
            </div>
          ) : null}

          {/* Session Info (kis session ka syllabus hai) */}
          {currentVersionDoc?.sessionId?.name && (
            <span className="text-[11px] sm:text-xs font-semibold text-gray-600 bg-gray-100 border border-gray-200/70 px-2.5 py-1.5 rounded-xl whitespace-nowrap">
              Session: <strong className="text-gray-800 font-bold">{currentVersionDoc.sessionId.name}</strong>
            </span>
          )}

          {/* Version Status Badge */}
          {currentVersionDoc && (
            <StatusBadge status={currentVersionDoc.status} />
          )}

          {/* Activate button if draft */}
          {currentVersionDoc?.status === "draft" && (
            <button
              type="button"
              onClick={() => handleActivate(currentVersionDoc._id)}
              className="text-xs px-3 py-1.5 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 font-bold transition border border-green-200 cursor-pointer"
            >
              Activate
            </button>
          )}

          {/* Delete button if not active */}
          {currentVersionDoc && currentVersionDoc.status !== "active" && (
            <button
              type="button"
              onClick={() => handleDelete(currentVersionDoc._id)}
              className="p-1.5 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition cursor-pointer"
              title="Delete version"
            >
              <MdDelete size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Subject tabs (Pill selectors) */}
      {subjectsList.length > 0 && (
        <div className="flex gap-2 overflow-x-auto p-2 bg-gray-50/50 rounded-xl border border-gray-150/45 mx-3 my-3 sm:m-4 no-scrollbar scrollbar-none">
          {subjectsList.map((s) => (
            <button
              key={s.name}
              onClick={() => { setActiveSubject(s.name); setSearchTerm(""); }}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold whitespace-nowrap rounded-lg border transition-all flex-shrink-0 ${
                activeSubject === s.name
                  ? "bg-white text-orange-600 shadow-sm border-orange-200/30"
                  : "border-transparent text-gray-550 hover:text-gray-805 hover:bg-gray-100/50"
              }`}
            >
              <MdBook size={13} className={activeSubject === s.name ? "text-orange-500" : "text-gray-400"} />
              <span>{s.name}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all ${
                activeSubject === s.name ? "bg-orange-50 text-orange-600 border border-orange-100" : "bg-gray-100 text-gray-500"
              }`}>
                {s.topicCount}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {allVersions.length === 0 ? (
        <div className="py-20 text-center px-4">
          <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-3 border border-orange-100/40">
            <MdBook size={26} className="text-orange-400" />
          </div>
          <h4 className="text-sm font-bold text-gray-800">No syllabus found</h4>
          <p className="text-xs text-gray-455 mt-1 max-w-xs mx-auto leading-relaxed">
            {selectedSessionId ? "Try selecting a different session" : "Upload syllabus first"}
          </p>
        </div>
      ) : (
        <VersionTopicTable versionId={currentVersionId} searchTerm={searchTerm} activeSubject={activeSubject} />
      )}

    </div>
  );
};

export default SyllabusTab;
