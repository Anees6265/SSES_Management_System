import { useState, useRef, useMemo, forwardRef, useImperativeHandle, useEffect } from "react";
import SelectDropdown from "../../../shared/form-fields/SelectDropdown";
import * as XLSX from "xlsx";
import {
  MdCloudUpload, MdCheckCircle, MdExpandMore, MdExpandLess, MdFileDownload, MdInfo,
  MdBook, MdTopic, MdSubject, MdDelete, MdSave, MdEdit, MdVisibility,
  MdAssignment, MdAdd, MdSearch, MdChevronRight, MdCalendarToday, MdAccessTime, MdPerson,
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
      <button onClick={() => setOpen((p) => !p)} className="w-full flex items-center justify-between px-4 py-3 bg-orange-50 hover:bg-orange-100 transition">
        <div className="flex items-center gap-2">
          <MdBook size={18} className="text-orange-500 flex-shrink-0" />
          <span className="font-semibold text-sm text-gray-800">{item.subject}</span>
          <span className="text-xs text-gray-400 ml-1">({item.topics.length} topics)</span>
          {taskCount > 0 && (
            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-semibold">
              {taskCount} tasks
            </span>
          )}
        </div>
        {open ? <MdExpandLess size={18} className="text-gray-400" /> : <MdExpandMore size={18} className="text-gray-400" />}
      </button>
      {open && (
        <div className="divide-y divide-gray-100">
          {item.topics.map((t) => (
            <div key={t.topic}>
              <button onClick={() => toggleTopic(t.topic)} className="w-full flex items-center justify-between px-6 py-2.5 bg-white hover:bg-gray-50 transition">
                <div className="flex items-center gap-2">
                  <MdTopic size={15} className="text-blue-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{t.topic}</span>
                  {t.subTopics.length > 0 && <span className="text-xs text-gray-400">({t.subTopics.length} subtopics)</span>}
                </div>
                {t.subTopics.length > 0 && (openTopics[t.topic] ? <MdExpandLess size={15} className="text-gray-300" /> : <MdExpandMore size={15} className="text-gray-300" />)}
              </button>
              {openTopics[t.topic] && t.subTopics.length > 0 && (
                <div className="bg-gray-50 px-10 py-2 space-y-1">
                  {t.subTopics.map((st, i) => {
                    const stName = typeof st === "object" ? st.name : st;
                    const hasTask = typeof st === "object" && st.taskTitle;
                    return (
                      <div key={`${stName}-${i}`} className="py-0.5">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <MdSubject size={13} className="text-gray-400 flex-shrink-0" />
                          <span>{stName}</span>
                          {hasTask && (
                            <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded font-medium">
                              <MdAssignment size={11} />{st.taskTitle}
                            </span>
                          )}
                        </div>
                        {hasTask && (
                          <div className="ml-5 mt-0.5 flex gap-2 flex-wrap">
                            {st.timeDays && <span className="text-xs text-gray-400">⏱ {st.timeDays} days</span>}
                            {st.measurablePoints && <span className="text-xs text-gray-400 italic">📋 {st.measurablePoints}</span>}
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
export const ManualSyllabusForm = forwardRef(({ level, subLevel, onSaved }, ref) => {
  const subLevelId = subLevel?._id;
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [subject,           setSubject]           = useState("");
  const [topics,            setTopics]            = useState([{ name: "", subTopics: [""] }]);
  const [saving,            setSaving]            = useState(false);

  const [createSyllabusVersion] = useCreateSyllabusVersionMutation();
  const { data: sessionsData }  = useGetAllSessionsQuery();
  const sessions = sessionsData?.data || [];

  const ic = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 bg-white";
  const lc = "block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5";

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
    if (!selectedSessionId)  { toast.error("Please select a session"); return; }
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
      reset(); onSaved?.();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to save");
    } finally { setSaving(false); }
  };

  useImperativeHandle(ref, () => ({ reset, save: handleSave }));

  return (
    <div className="space-y-4 px-1 py-2">
      {/* Session */}
      <div>
        <label className={lc}>Session <span className="text-red-400">*</span></label>
        <SelectDropdown
          value={selectedSessionId}
          onChange={(val) => setSelectedSessionId(val)}
          options={[{ value: "", label: "-- Select Session --" }, ...sessions.map((s) => ({ value: s._id, label: s.name }))]}
          placeholder="-- Select Session --"
        />
      </div>

      {/* Subject */}
      <div>
        <label className={lc}><MdBook size={12} className="inline mr-1 text-orange-400" />Subject <span className="text-red-400">*</span></label>
        <input className={ic} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. JavaScript" />
      </div>

      {/* Topics */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className={lc}><MdTopic size={12} className="inline mr-1 text-blue-400" />Topics</label>
          <button type="button" onClick={addTopic} className="text-xs text-orange-500 font-semibold bg-orange-50 px-2.5 py-1 rounded-lg">+ Add Topic</button>
        </div>
        {topics.map((topic, ti) => (
          <div key={ti} className="border border-gray-200 rounded-xl p-3 space-y-2 bg-gray-50">
            <div className="flex items-center gap-2">
              <MdTopic size={14} className="text-blue-400 flex-shrink-0" />
              <input className={`${ic} flex-1`} value={topic.name} onChange={(e) => updateTopicName(ti, e.target.value)} placeholder={`Topic ${ti + 1}`} />
              {topics.length > 1 && (
                <button type="button" onClick={() => removeTopic(ti)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0"><MdDelete size={15} /></button>
              )}
            </div>
            <div className="pl-5 space-y-1.5">
              {topic.subTopics.map((st, si) => (
                <div key={si} className="flex items-center gap-2">
                  <MdSubject size={12} className="text-gray-400 flex-shrink-0" />
                  <input className={`${ic} flex-1`} value={st} onChange={(e) => updateSubTopic(ti, si, e.target.value)} placeholder={`SubTopic ${si + 1}`} />
                  {topic.subTopics.length > 1 && (
                    <button type="button" onClick={() => removeSubTopic(ti, si)} className="p-1 text-gray-300 hover:text-red-400 flex-shrink-0"><MdDelete size={13} /></button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => addSubTopic(ti)} className="text-xs text-blue-500 font-medium mt-1">+ Add SubTopic</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
ManualSyllabusForm.displayName = "ManualSyllabusForm";


export const SyllabusUploadDrawer = forwardRef(({ level, subLevel, onSaved }, ref) => {
  const fileRef = useRef(null);
  const [parsing,          setParsing]          = useState(false);
  const [saving,           setSaving]           = useState(false);
  const [hierarchy,        setHierarchy]        = useState([]);
  const [fileName,         setFileName]         = useState("");
  const [selectedSessionId,setSelectedSessionId]= useState("");
  // Subject metadata modal state
  const [showMetaModal,    setShowMetaModal]    = useState(false);
  const [subjectMeta,      setSubjectMeta]      = useState([]); // [{ name, includeInReportCard, reportCategory }]

  const [uploadCombined]        = useUploadCombinedSyllabusMutation();
  const { data: sessionsData }  = useGetAllSessionsQuery();
  const sessions = sessionsData?.data || [];

  const totalSubjects  = hierarchy.length;
  const totalTopics    = hierarchy.reduce((acc, s) => acc + s.topics.length, 0);
  const totalSubTopics = hierarchy.reduce((acc, s) => acc + s.topics.reduce((a, t) => a + (t.subTopics?.length || 0), 0), 0);
  const totalTasks     = hierarchy.reduce((acc, s) => acc + s.topics.reduce((a, t) => {
    const stTasks = (t.subTopics || []).filter(st => st.taskTitle).length;
    const topicTasks = (t.topicTasks || []).length;
    return a + stTasks + topicTasks;
  }, 0), 0);

  const reset = () => { setHierarchy([]); setFileName(""); setSelectedSessionId(""); setSubjectMeta([]); setShowMetaModal(false); };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) { 
      toast.error("Please upload .xlsx, .xls or .csv file"); 
      return; 
    }
    setParsing(true); 
    setHierarchy([]); 
    setFileName(file.name);
    try {
      const rows = await parseExcel(file);
      if (!rows.length) { 
        toast.error("File is empty or has no data rows"); 
        return; 
      }
      
      // Validate required columns
      const firstRow = rows[0];
      const hasSubject = Object.keys(firstRow).some(key => 
        key.toLowerCase().includes('subject'));
      const hasTopic = Object.keys(firstRow).some(key => 
        key.toLowerCase().includes('topic'));
      
      if (!hasSubject || !hasTopic) {
        toast.error("Excel file must contain 'Subject' and 'Topic' columns");
        return;
      }
      
      const parsed = buildHierarchy(rows);
      if (!parsed.length) { 
        toast.error("No valid data found. Please check your Excel format and column names"); 
        return; 
      }
      setHierarchy(parsed);
      // Initialize subjectMeta with defaults for each parsed subject
      setSubjectMeta(parsed.map(s => ({ name: s.subject, includeInReportCard: false, reportCategory: "" })));
      toast.success(`Parsed ${parsed.length} subject(s) successfully`);
    } catch (error) { 
      console.error('Excel parsing error:', error);
      toast.error("Failed to parse Excel file. Please check the file format"); 
    }
    finally { 
      setParsing(false); 
      e.target.value = ""; 
    }
  };

  // Step 1: validate → open metadata modal
  const handleSaveClick = () => {
    if (!hierarchy.length)   { toast.error("No data to save"); return; }
    if (!subLevel?._id)      { toast.error("SubLevel not found"); return; }
    if (!level?._id)         { toast.error("Level not found"); return; }
    if (!selectedSessionId)  { toast.error("Please select a session"); return; }
    setShowMetaModal(true);
  };

  // Step 2: called from modal after metadata confirmed
  const handleSave = async (confirmedMeta) => {
    setSaving(true);
    try {
      const taskRows = buildTaskRows(hierarchy);
      const res = await uploadCombined({
        sessionId:  selectedSessionId,
        levelId:    level._id,
        subLevelId: subLevel._id,
        tasks:      taskRows,
        subjectMeta: confirmedMeta,
      }).unwrap();
      toast.success(res.message || "Syllabus + Tasks saved!");
      if (res.data?.errors?.length) {
        res.data.errors.forEach(e => toast.warn(e, { autoClose: 8000 }));
      }
      reset();
      onSaved?.();
    } catch (err) {
      const errorMessage = err?.data?.message || err?.message || "Failed to save";
      toast.error(errorMessage);
      if (err?.data?.errors?.length) {
        err.data.errors.forEach(e => toast.warn(e, { autoClose: 8000 }));
      }
    } finally { setSaving(false); }
  };

  useImperativeHandle(ref, () => ({ reset, save: handleSaveClick }));

  return (
    <>
    {/* ── Report Card Metadata Drawer ── */}
    <OrangeButton
      isOpen={showMetaModal}
      onClose={() => setShowMetaModal(false)}
      panelTitle="Report Card Settings"
      panelSubtitle="Configure each subject for report card generation"
      leftBtnText="Back"
      rightBtnText={saving ? "Saving..." : "Confirm & Save"}
      onLeftClick={() => setShowMetaModal(false)}
      onRightClick={() => {
        const invalid = subjectMeta.find(s => s.includeInReportCard && !s.reportCategory);
        if (invalid) { toast.error(`Select category for "${invalid.name}"`); return; }
        setShowMetaModal(false);
        handleSave(subjectMeta);
      }}
      drawerContent={
        <div className="space-y-3">
          {subjectMeta.map((sm, idx) => (
            <div key={sm.name} className="border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <MdBook size={15} className="text-orange-500 flex-shrink-0" />
                <span className="text-sm font-bold text-gray-800">{sm.name}</span>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2">Include this subject in Report Card?</p>
                <div className="flex gap-2">
                  {[true, false].map((val) => (
                    <button
                      key={String(val)}
                      type="button"
                      onClick={() => setSubjectMeta(prev => prev.map((s, i) =>
                        i === idx ? { ...s, includeInReportCard: val, reportCategory: val ? s.reportCategory : "" } : s
                      ))}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition ${
                        sm.includeInReportCard === val
                          ? val ? "bg-green-50 border-green-400 text-green-700" : "bg-gray-100 border-gray-300 text-gray-600"
                          : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"
                      }`}
                    >
                      {val ? "✓ Yes" : "✗ No"}
                    </button>
                  ))}
                </div>
              </div>
              {sm.includeInReportCard && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Category</p>
                  <div className="flex gap-2">
                    {["technical", "softskill"].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSubjectMeta(prev => prev.map((s, i) =>
                          i === idx ? { ...s, reportCategory: cat } : s
                        ))}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition ${
                          sm.reportCategory === cat
                            ? cat === "technical"
                              ? "bg-blue-50 border-blue-400 text-blue-700"
                              : "bg-purple-50 border-purple-400 text-purple-700"
                            : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"
                        }`}
                      >
                        {cat === "technical" ? "💻 Technical" : "🤝 Soft Skill"}
                      </button>
                    ))}
                  </div>
                  {sm.includeInReportCard && !sm.reportCategory && (
                    <p className="text-[11px] text-red-400 mt-1">Please select a category</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      }
    />
    <div className="space-y-6 text-xs font-semibold">
      {/* STEP 1: DOWNLOAD TEMPLATE */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50/20 border border-amber-200/60 rounded-2xl p-5 space-y-4 shadow-sm transition hover:shadow-md duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <h4 className="text-sm font-black text-amber-950 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-[11px] font-black shadow-sm shrink-0">1</span>
              Step 1: Download Excel Template
            </h4>
            <p className="text-xs text-amber-900/80 leading-relaxed font-medium">
              Use this standard sheet format to load your Syllabus and Tasks together in one go.
            </p>
          </div>
          <button
            type="button"
            onClick={downloadSyllabusTemplate}
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-[0.98] text-white px-4 py-2.5 rounded-xl font-extrabold shadow-sm transition duration-150 whitespace-nowrap cursor-pointer text-xs"
          >
            <MdFileDownload size={18} /> Template (.xlsx)
          </button>
        </div>

        <div className="border-t border-amber-200/50 pt-3.5">
          <p className="text-[10px] font-black text-amber-900 uppercase tracking-wider mb-2">Required & Optional Columns:</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white/80 border border-amber-100 rounded-xl p-2.5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              <div>
                <span className="font-bold text-amber-950 block text-[11px]">Subject, Topic</span>
                <span className="text-[10px] text-green-700 font-extrabold uppercase bg-green-50 px-1.5 py-0.5 rounded">Mandatory</span>
              </div>
            </div>
            <div className="bg-white/80 border border-amber-100 rounded-xl p-2.5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
              <div>
                <span className="font-bold text-amber-950 block text-[11px]">SubTopic, Task</span>
                <span className="text-[10px] text-gray-600 font-extrabold uppercase bg-gray-100 px-1.5 py-0.5 rounded">Optional</span>
              </div>
            </div>
            <div className="bg-white/80 border border-amber-100 rounded-xl p-2.5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
              <div>
                <span className="font-bold text-amber-950 block text-[11px]">Time Days</span>
                <span className="text-[10px] text-blue-750 font-extrabold bg-blue-50 px-1.5 py-0.5 rounded">Expected duration</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STEP 2: UPLOAD FILE */}
      <div className="space-y-3">
        <label className="text-sm font-black text-slate-800 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[11px] font-black shadow-sm shrink-0">2</span>
          Step 2: Upload Excel File
        </label>
        <div 
          onClick={() => fileRef.current?.click()} 
          className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition duration-300 shadow-sm hover:shadow active:scale-[0.99] group ${
            fileName 
              ? "border-emerald-400 bg-emerald-50/10 hover:bg-emerald-50/20" 
              : "border-slate-300 bg-slate-50/40 hover:border-orange-500 hover:bg-orange-50/10"
          }`}
        >
          {parsing ? (
            <div className="flex flex-col items-center gap-2.5 py-3">
              <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-500">Reading file, please wait...</p>
            </div>
          ) : (
            <>
              {fileName ? (
                <MdCheckCircle size={36} className="text-emerald-500 mb-2 drop-shadow-sm" />
              ) : (
                <MdCloudUpload size={36} className="text-slate-400 group-hover:text-orange-500 transition duration-300 mb-2" />
              )}
              <p className="text-xs font-extrabold text-slate-700">
                {fileName ? "File loaded successfully" : "Click to select or drop Excel file"}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Supports .xlsx, .xls and .csv</p>
              {fileName && (
                <span className="mt-3 text-xs bg-emerald-100 text-emerald-800 font-black px-3.5 py-1.5 rounded-full border border-emerald-200 shadow-sm/5">
                  📄 {fileName}
                </span>
              )}
            </>
          )}
        </div>
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50/30 border-l-4 border-blue-500 text-blue-900 rounded-r-2xl shadow-sm/5 p-4 flex gap-3 items-start">
          <span className="text-base">💡</span>
          <p className="text-xs font-medium leading-relaxed text-blue-950">
            <strong className="font-bold text-blue-900">Tip:</strong> You can upload subjects, topics, and tasks all at once using a single Excel sheet.
          </p>
        </div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
      </div>

      {/* STEP 3: PREVIEW & SAVE */}
      {hierarchy.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="space-y-1.5">
            <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-[11px] font-black shadow-sm shrink-0">3</span>
              Step 3: Select Session & Save
            </h4>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Review the parsed structures and map them to the target academic session.
            </p>
          </div>

          <div className="bg-white border border-slate-100 rounded-xl p-3.5 space-y-2">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">File summary:</p>
            <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-700">
              <span className="bg-orange-50 border border-orange-100 text-orange-600 px-2.5 py-1 rounded-lg">
                {totalSubjects} Subjects
              </span>
              <span className="bg-blue-50 border border-blue-100 text-blue-600 px-2.5 py-1 rounded-lg">
                {totalTopics} Topics
              </span>
              {totalSubTopics > 0 && (
                <span className="bg-purple-50 border border-purple-100 text-purple-600 px-2.5 py-1 rounded-lg">
                  {totalSubTopics} SubTopics
                </span>
              )}
              {totalTasks > 0 && (
                <span className="bg-emerald-50 border border-emerald-100 text-emerald-600 px-2.5 py-1 rounded-lg">
                  {totalTasks} Tasks detected
                </span>
              )}
            </div>
            
            {/* Subject badges preview */}
            <div className="flex flex-wrap gap-1 mt-2">
              {hierarchy.map((s) => (
                <span key={s.subject} className="text-[10px] bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md font-semibold text-slate-600">
                  {s.subject} ({s.topics.length} topics)
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Syllabus Session</label>
            <SelectDropdown
              value={selectedSessionId}
              onChange={(val) => setSelectedSessionId(val)}
              options={[{ value: "", label: "-- Select Session --" }, ...sessions.map((s) => ({ value: s._id, label: s.name }))]}
              placeholder="-- Select Session --"
            />
          </div>

          <div className="flex gap-2.5 pt-1">
            <button 
              onClick={handleSaveClick} 
              disabled={saving} 
              className="flex-1 flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-xs font-extrabold py-2.5 rounded-xl transition shadow-xs cursor-pointer"
            >
              <MdSave size={16} />{saving ? "Saving..." : "Save Syllabus + Tasks"}
            </button>
            <button 
              onClick={reset} 
              className="px-4 py-2.5 text-xs text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 font-bold transition cursor-pointer"
            >
              Clear
            </button>
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto border-t border-slate-200/50 pt-3">
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Uploaded Data Preview:</p>
            {hierarchy.map((item, i) => (
              <SubjectAccordion key={item.subject} item={item} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
    </>
  );
});
SyllabusUploadDrawer.displayName = "SyllabusUploadDrawer";

/* ─── Topic/SubTopic table for one version ──────────────── */
const VersionTopicTable = ({ versionId, searchTerm, activeSubject }) => {
  const { data, isLoading } = useGetSyllabusVersionWithHierarchyQuery(versionId, { skip: !versionId });

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
          result.push({ _id: topicIdStr, subject: subject.name, topic: topic.name, subTopic: "\u2514", topicIdStr });
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
    <div className="p-4 bg-gray-50/20 grid grid-cols-1 md:grid-cols-2 gap-4">
      {groupedTopics.map((item, idx) => (
        <div key={item.topicIdStr} className="bg-white border border-slate-150 rounded-xl p-5 hover:shadow-lg hover:border-orange-300/40 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between border-l-4 border-l-orange-500/80">
          <div>
            {/* Header: Topic Title & Subject Badge */}
            <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-slate-100/70">
              <div className="flex items-start gap-3">
                <span className="inline-flex w-7 h-7 rounded-lg bg-orange-50 text-orange-600 text-xs font-black items-center justify-center border border-orange-100/50 flex-shrink-0 mt-0.5 shadow-sm/5">
                  {idx + 1}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[9px] font-black text-orange-600 bg-orange-50/70 border border-orange-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {item.subject}
                    </span>
                  </div>
                  <h4 className="text-xs font-extrabold text-slate-800 mt-1.5 leading-snug tracking-tight">{item.topic}</h4>
                </div>
              </div>
              <span className="text-[9.5px] font-black text-slate-500 bg-slate-50 border border-slate-200/60 px-2.5 py-1 rounded-full uppercase tracking-wider flex-shrink-0 shadow-sm/5">
                {item.subTopics.length} {item.subTopics.length === 1 ? "Subtopic" : "Subtopics"}
              </span>
            </div>

            {/* Subtopics collection */}
            {item.subTopics.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-4">
                {item.subTopics.map((sub, sIdx) => (
                  <span key={sIdx} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/50 text-slate-600 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200/40 transition-all duration-150 text-[11px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-350 flex-shrink-0" />
                    <span>{sub}</span>
                  </span>
                ))}
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-400 font-medium italic">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                <span>Covers core topic content directly</span>
              </div>
            )}
          </div>
        </div>
      ))}
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
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-700">Upload Tasks for <span className="text-orange-600">{subjectName} {version}</span></p>
          <p className="text-xs text-gray-400 mt-0.5">Required columns: Subject, Topic, Sub Topic, Task Title, Time Days, Measurable Point</p>
        </div>
        <a
          href="/task_template.csv"
          download="task_template.csv"
          className="flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 font-semibold bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg transition"
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
          <div className="flex gap-2">
            <button
              onClick={handleUpload} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-semibold py-2 rounded-lg transition"
            >
              <MdSave size={15} />{saving ? "Uploading..." : "Upload Tasks"}
            </button>
            <button onClick={reset} className="px-4 py-2 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Clear</button>
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

export const VersionTasksTable = ({ versionId, searchTerm = "", activeSubjectId, activeSubjectName }) => {
  const { data, isLoading } = useGetTasksBySyllabusVersionQuery(versionId, { skip: !versionId });
  const allTasks = data?.tasks || data?.data || [];

  console.log("VersionTasksTable render debug:", {
    versionId,
    activeSubjectId,
    activeSubjectName,
    allTasksLength: allTasks.length,
    allTasks
  });

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
      <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">Add tasks from the button above to populate this syllabus version.</p>
    </div>
  );

  return (
    <div className="p-4 bg-gray-50/20 space-y-4">
      {tasks.map((task, idx) => {
        const measurePoints = splitNumberedPoints(task.measurablePoints);
        const priorityKey   = (task.priority || "medium").toLowerCase();
        const typeKey       = task.type || "assessment";
        
        // Define priority styles for accents
        const priorityStyles = {
          high: {
            border: "border-l-4 border-l-rose-500/80 hover:border-rose-500",
            badge: "bg-rose-50 text-rose-700 border-rose-100",
            dot: "bg-rose-500"
          },
          medium: {
            border: "border-l-4 border-l-amber-500/80 hover:border-amber-500",
            badge: "bg-amber-50 text-amber-700 border-amber-100",
            dot: "bg-amber-500"
          },
          low: {
            border: "border-l-4 border-l-emerald-500/80 hover:border-emerald-500",
            badge: "bg-emerald-50 text-emerald-700 border-emerald-100",
            dot: "bg-emerald-500"
          }
        };
        const style = priorityStyles[priorityKey] || priorityStyles.medium;

        return (
          <div key={task._id} className={`bg-white border border-gray-150 rounded-xl p-5 hover:shadow-md hover:scale-[1.005] transition-all duration-300 flex flex-col md:flex-row md:items-start justify-between gap-5 ${style.border}`}>
            {/* Left side: Task Title, Topic path, badges */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3">
                <span className="inline-flex w-7 h-7 rounded-lg bg-slate-50 text-slate-600 text-xs font-black items-center justify-center border border-slate-200/65 flex-shrink-0 mt-0.5 shadow-sm">
                  {idx + 1}
                </span>
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-gray-800 leading-snug tracking-tight">{task.title}</h4>
                  {task.dueDate && (
                    <span className="inline-flex items-center gap-1.5 mt-2.5 text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-200/50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      <MdCalendarToday size={11} className="text-gray-400" />
                      Due: {new Date(task.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  )}
                </div>
              </div>

              {/* Breadcrumbs for Topic & Subtopic */}
              <div className="flex items-center flex-wrap gap-1.5 mt-3.5 text-[11px] text-gray-600 bg-slate-50 border border-slate-150/40 rounded-xl px-3 py-1.5 w-fit font-semibold font-sans">
                <span className="p-0.5 rounded bg-orange-50 text-orange-500 border border-orange-100/50 flex-shrink-0 flex items-center justify-center">
                  <MdTopic size={12} />
                </span>
                <span className="text-gray-700">{task.topicName || "—"}</span>
                {task.subTopicName && (
                  <>
                    <MdChevronRight size={14} className="text-gray-300" />
                    <span className="p-0.5 rounded bg-white text-gray-400 border border-gray-150 flex items-center justify-center">
                      <MdSubject size={10} />
                    </span>
                    <span className="text-gray-500">{task.subTopicName}</span>
                  </>
                )}
              </div>

              {/* Badges row */}
              <div className="flex flex-wrap gap-2 mt-4">
                <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-sm/5 ${TYPE_BADGE[typeKey] || "bg-gray-100 text-gray-600 border border-gray-200"}`}>
                  {typeKey}
                </span>
                <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-sm/5 ${style.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dot}`} />
                  {priorityKey}
                </span>
                {task.timeDays ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-gray-500 bg-gray-50 border border-gray-200/50 px-2.5 py-0.5 rounded-full">
                    <MdAccessTime size={11} className="text-gray-400" />
                    {task.timeDays} day{task.timeDays > 1 ? "s" : ""}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-200/50 px-2.5 py-0.5 rounded-full">
                  <MdPerson size={11} className="text-gray-400" />
                  By: {task.assignedByName || "System"}
                </span>
                {task.createdAt && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-gray-400 whitespace-nowrap ml-1">
                    {formatTimeAgo(task.createdAt)}
                  </span>
                )}
              </div>
            </div>

            {/* Right side: Measurable Points list (if present) */}
            {measurePoints.length > 0 && measurePoints[0] && (
              <div className="md:w-[38%] w-full md:border-l md:border-t-0 border-t border-gray-100 md:pl-5 md:pt-0 pt-4 flex-shrink-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Measurable Points</p>
                <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 shadow-sm/5">
                  <ul className="space-y-1.5">
                    {measurePoints.map((pt, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-600 leading-relaxed font-medium">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Footer */}
      <div className="p-4 bg-white border border-gray-150 rounded-2xl text-xs text-gray-500 font-semibold shadow-sm/5">
        Total <span className="font-bold text-gray-700">{tasks.length}</span> tasks
        {searchTerm && allTasks.length !== tasks.length && (
          <span className="ml-1 text-gray-400">(filtered from {allTasks.length})</span>
        )}
      </div>
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
        {/* Top bar: search + session filter + Add Task button */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 bg-white">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            {/* Search Input Container */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 z-10">
                <MdSearch size={18} />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search tasks by title, topic..."
                className="w-full pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white placeholder-gray-400 transition-all duration-200"
                style={{ paddingLeft: '2.75rem' }}
              />
            </div>

            {/* Session Select Container */}
            <div className="min-w-[185px]">
              <SelectDropdown
                value={selectedSessionId}
                onChange={(val) => { setSelectedSessionId(val); setActiveVersionId(""); }}
                options={[{ value: "", label: "All Sessions" }, ...sessions.map((s) => ({ value: s._id, label: s.name }))]}
                placeholder="All Sessions"
              />
            </div>
          </div>

          <button
            onClick={() => setShowTaskModal(true)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm shadow-orange-500/10"
          >
            <MdAdd size={18} />
            <span>Add Task</span>
          </button>
        </div>

        {/* Version selector (Pills layout) */}
        {allVersions.length > 1 && (
          <div className="flex gap-2 overflow-x-auto p-2 bg-gray-50/55 rounded-xl border border-gray-150/45 m-4">
            {allVersions.map((v) => (
              <button
                key={v._id}
                onClick={() => setActiveVersionId(v._id)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold whitespace-nowrap rounded-lg border transition-all flex-shrink-0 ${
                  currentVersionId === v._id
                    ? "bg-white text-orange-600 shadow-sm border-orange-200/30"
                    : "border-transparent text-gray-555 hover:text-gray-800 hover:bg-gray-100/50"
                }`}
              >
                <MdBook size={13} className={currentVersionId === v._id ? "text-orange-500" : "text-gray-400"} />
                <span>{v.title || v.version}</span>
              </button>
            ))}
          </div>
        )}

        {/* Subject tabs (Pill selectors) */}
        {subjectsList.length > 0 && (
          <div className="flex gap-2 overflow-x-auto p-2 bg-gray-50/50 rounded-xl border border-gray-150/45 m-4">
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
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      <div className="w-24 h-24 rounded-full bg-orange-50 flex items-center justify-center mb-6">
        <MdCloudUpload size={44} className="text-orange-400" />
      </div>
      <h3 className="text-base font-bold text-gray-800 mb-2">No syllabus uploaded for this level.</h3>
      <p className="text-sm text-gray-400 max-w-sm mb-6 leading-relaxed">
        Upload the academic syllabus to get started. Once uploaded, you can assign lessons to specific weeks and track coverage.
      </p>

      {!showUpload ? (
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition hover:shadow-md"
          >
            <MdCloudUpload size={16} /> Upload Syllabus
          </button>
          <a
            href="/syllabus_template.csv"
            download="syllabus_template.csv"
            className="flex items-center gap-2 text-sm font-semibold text-orange-500 bg-white border border-orange-300 hover:bg-orange-50 px-6 py-2.5 rounded-xl transition"
          >
            ⬇ Browse Template
          </a>
        </div>
      ) : (
        <div className="w-full max-w-md text-left mt-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">Upload Syllabus</span>
            <button
              onClick={() => { setShowUpload(false); drawerRef.current?.reset(); }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              ✕ Cancel
            </button>
          </div>
          <SyllabusUploadDrawer
            ref={drawerRef}
            level={level}
            subLevel={subLevel}
            onSaved={() => { setShowUpload(false); onSaved?.(); }}
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

      {/* Top bar: search + session */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-100">
        {/* Search Container */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 z-10">
            <MdSearch size={18} />
          </span>
          <input
            type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search topic or subtopic..."
            className="w-full pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white placeholder-gray-400 transition-all duration-200"
            style={{ paddingLeft: '2.75rem' }}
          />
        </div>

        {/* Session Container */}
        <div className="min-w-[185px]">
          <SelectDropdown
            value={selectedSessionId}
            onChange={(val) => { setSelectedSessionId(val); setActiveVersionId(""); setSearchTerm(""); }}
            options={[{ value: "", label: "All Sessions" }, ...sessions.map((s) => ({ value: s._id, label: s.name }))]}
            placeholder="All Sessions"
          />
        </div>
      </div>

      {/* Version selector (Pills layout) */}
      {allVersions.length > 1 && (
        <div className="flex gap-2 overflow-x-auto p-2 bg-gray-50/50 rounded-xl border border-gray-150/45 m-4">
          {allVersions.map((v) => (
            <button
              key={v._id}
              onClick={() => { setActiveVersionId(v._id); setSearchTerm(""); }}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold whitespace-nowrap rounded-lg border transition-all flex-shrink-0 ${
                currentVersionId === v._id
                  ? "bg-white text-orange-600 shadow-sm border-orange-200/30"
                  : "border-transparent text-gray-550 hover:text-gray-800 hover:bg-gray-100/50"
              }`}
            >
              <MdBook size={13} className={currentVersionId === v._id ? "text-orange-500" : "text-gray-400"} />
              <span>{v.title || v.version}</span>
            </button>
          ))}
        </div>
      )}

      {/* Version status bar */}
      {currentVersionDoc && (
        <div className="flex items-center gap-3 px-5 py-3 bg-[#F8F7F5] border-b border-gray-100 flex-wrap">
          <StatusBadge status={currentVersionDoc.status} />
          <span className="text-xs text-gray-400 font-medium">Session: {currentVersionDoc.sessionId?.name || "—"}</span>
          <div className="flex items-center gap-2 ml-auto">
            {currentVersionDoc.status === "draft" && (
              <button onClick={() => handleActivate(currentVersionDoc._id)} className="text-xs px-3.5 py-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 font-bold transition border border-green-200">Activate</button>
            )}
            {currentVersionDoc.status !== "active" && (
              <button onClick={() => handleDelete(currentVersionDoc._id)} className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition">
                <MdDelete size={15} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Subject tabs (Pill selectors) */}
      {subjectsList.length > 0 && (
        <div className="flex gap-2 overflow-x-auto p-2 bg-gray-50/50 rounded-xl border border-gray-150/45 m-4">
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
