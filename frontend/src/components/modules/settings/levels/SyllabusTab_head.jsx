import { useState, useRef, useMemo, forwardRef, useImperativeHandle, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  MdCloudUpload, MdCheckCircle, MdExpandMore, MdExpandLess,
  MdBook, MdTopic, MdSubject, MdDelete, MdSave, MdEdit, MdVisibility,
  MdAssignment, MdPriorityHigh,
} from "react-icons/md";
import { toast } from "react-toastify";
import {
  useCreateSyllabusVersionMutation,
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
} from "../../../../redux/api/authApi";

/* ─── helpers ─────────────────────────────────────────── */
const normalize = (v) => (v === undefined || v === null ? "" : String(v).trim());

/* Download syllabus template as XLSX */
const downloadSyllabusTemplate = () => {
  const instructions = [
    ["SYLLABUS TEMPLATE - INSTRUCTIONS"],
    [""],
    ["REQUIRED COLUMNS:"],
    ["Subject     → Subject ka naam (e.g. JavaScript, React, Node.js)"],
    ["Topic Name  → Topic ka naam (e.g. Basics, Functions, Hooks)"],
    ["SubTopic    → SubTopic ka naam (e.g. Variables, Arrow Functions, useState)"],
    [""],
    ["RULES:"],
    ["1. Ek Subject ke andar multiple Topics ho sakte hain"],
    ["2. Ek Topic ke andar multiple SubTopics ho sakte hain"],
    ["3. Agar Topic ke andar koi SubTopic nahi hai to SubTopic column khali chhod do"],
    ["4. Subject aur Topic Name columns REQUIRED hain"],
    ["5. Tasks baad mein manually ya alag se add kar sakte ho"],
    [""],
    ["NOTE: Pehle sirf syllabus structure upload karo (Subject, Topic, SubTopic)"],
    ["      Tasks baad mein 'Tasks Tab' se add karo"],
  ];

  const data = [
    ["Subject", "Topic Name", "SubTopic"],
    // JavaScript
    ["JavaScript", "Basics", "Variables & Data Types"],
    ["JavaScript", "Basics", "Operators"],
    ["JavaScript", "Basics", "Conditionals"],
    ["JavaScript", "Functions", "Function Declaration"],
    ["JavaScript", "Functions", "Arrow Functions"],
    ["JavaScript", "Functions", "Callbacks"],
    ["JavaScript", "Arrays", "Array Methods"],
    ["JavaScript", "Arrays", "Destructuring"],
    ["JavaScript", "DOM", ""],  // Topic without subtopic
    // React
    ["React", "Components", "Functional Components"],
    ["React", "Components", "Props"],
    ["React", "Hooks", "useState"],
    ["React", "Hooks", "useEffect"],
    ["React", "Hooks", "useContext"],
    ["React", "Routing", "React Router"],
    ["React", "Routing", "Protected Routes"],
    // Node.js
    ["Node.js", "Basics", "Modules"],
    ["Node.js", "Basics", "File System"],
    ["Node.js", "Express", "Routing"],
    ["Node.js", "Express", "Middleware"],
    ["Node.js", "Database", "MongoDB Connection"],
    ["Node.js", "Database", "CRUD Operations"],
  ];

  const wb = XLSX.utils.book_new();

  // Sheet 1: Actual data
  const ws1 = XLSX.utils.aoa_to_sheet(data);
  ws1["!cols"] = [{ wch: 20 }, { wch: 25 }, { wch: 30 }];
  // Header row bold styling
  ["A1", "B1", "C1"].forEach((cell) => {
    if (ws1[cell]) ws1[cell].s = { font: { bold: true }, fill: { fgColor: { rgb: "FF6B00" } } };
  });
  XLSX.utils.book_append_sheet(wb, ws1, "Syllabus");

  // Sheet 2: Instructions
  const ws2 = XLSX.utils.aoa_to_sheet(instructions);
  ws2["!cols"] = [{ wch: 70 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Instructions");

  XLSX.writeFile(wb, "syllabus_template.xlsx");
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
    const subject      = normalize(row["Subject"]    || row["subject"]);
    const topic        = normalize(row["Topic Name"] || row["Topic"] || row["topic"]);
    const subTopicName = normalize(row["SubTopic"]   || row["subtopic"] || row["sub_topic"]);
    if (!subject || !topic) return;
    if (!subjectMap.has(subject)) subjectMap.set(subject, new Map());
    const topicMap = subjectMap.get(subject);
    if (!topicMap.has(topic)) topicMap.set(topic, []);
    // agar subtopic khali hai to topic register ho gaya, bas skip karo subtopic push
    if (!subTopicName) return;
    const stList = topicMap.get(topic);
    stList.push({ name: subTopicName });
  });
  return Array.from(subjectMap.entries()).map(([subjectName, topicMap]) => ({
    subject: subjectName,
    topics: Array.from(topicMap.entries()).map(([topicName, stList]) => ({
      topic: topicName,
      subTopics: stList,
    })),
  }));
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
   UPLOAD DRAWER
══════════════════════════════════════════════════════════ */
export const SyllabusUploadDrawer = forwardRef(({ level, subLevel, onSaved }, ref) => {
  const fileRef = useRef(null);
  const [parsing,          setParsing]          = useState(false);
  const [saving,           setSaving]           = useState(false);
  const [hierarchy,        setHierarchy]        = useState([]);
  const [fileName,         setFileName]         = useState("");
  const [version,          setVersion]          = useState("");
  const [selectedSessionId,setSelectedSessionId]= useState("");

  const [createSyllabusVersion] = useCreateSyllabusVersionMutation();
  const { data: sessionsData }  = useGetAllSessionsQuery();
  const sessions = sessionsData?.data || [];

  const totalSubjects  = hierarchy.length;
  const totalTopics    = hierarchy.reduce((acc, s) => acc + s.topics.length, 0);
  const totalSubTopics = hierarchy.reduce((acc, s) => acc + s.topics.reduce((a, t) => a + t.subTopics.length, 0), 0);

  const reset = () => { setHierarchy([]); setFileName(""); setVersion(""); };
  useImperativeHandle(ref, () => ({ reset }));

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) { toast.error("Please upload .xlsx, .xls or .csv file"); return; }
    setParsing(true); setHierarchy([]); setFileName(file.name);
    try {
      const rows = await parseExcel(file);
      if (!rows.length) { toast.error("File is empty"); return; }
      const parsed = buildHierarchy(rows);
      if (!parsed.length) { toast.error("No valid data. Columns needed: Subject, Topic Name, SubTopic"); return; }
      setHierarchy(parsed);
      toast.success(`Parsed ${parsed.length} subject(s)`);
    } catch { toast.error("Failed to parse Excel file"); }
    finally { setParsing(false); e.target.value = ""; }
  };

  const handleSave = async () => {
    if (!hierarchy.length)   { toast.error("No data to save"); return; }
    if (!version.trim())     { toast.error("Please enter a version name (e.g. v1.0)"); return; }
    if (!subLevel?._id)      { toast.error("SubLevel not found"); return; }
    if (!level?._id)         { toast.error("Level not found"); return; }
    if (!selectedSessionId)  { toast.error("Please select a session"); return; }
    setSaving(true);
    try {
      await createSyllabusVersion({
        sessionId: selectedSessionId,
        levelId: level._id,
        subLevelId: subLevel._id,
        version: version.trim(),
        hierarchy,
      }).unwrap();
      const taskCount = hierarchy.reduce((a, s) => a + s.topics.reduce((b, t) => b + t.subTopics.filter((st) => typeof st === "object" && st.taskTitle).length, 0), 0);
      toast.success(`${hierarchy.length} subject(s) syllabus saved!${taskCount > 0 ? ` + ${taskCount} task(s) bhi save ho gaye!` : ""}`);
      reset();
      onSaved?.();
    } catch (err) {
      const msg = err?.data?.message || err?.message || "Failed to save syllabus";
      toast.error(msg);
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-orange-200 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition group">
        {parsing ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Parsing...</p>
          </div>
        ) : (
          <>
            <MdCloudUpload size={36} className="text-orange-300 group-hover:text-orange-400 transition mb-1" />
            <p className="text-sm font-semibold text-gray-700">Click to upload Excel file</p>
            <p className="text-xs text-gray-400 mt-0.5">Supports .xlsx, .xls and .csv</p>
            {fileName && <p className="mt-1.5 text-xs text-orange-500 font-medium">📄 {fileName}</p>}
          </>
        )}
      </div>
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />

      <div className="p-3 bg-blue-50 rounded-lg space-y-2">
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-blue-600 font-semibold">Required columns:</p>
            <button
              type="button"
              onClick={() => downloadSyllabusTemplate()}
              className="text-xs text-orange-600 hover:text-orange-700 font-semibold bg-orange-50 hover:bg-orange-100 px-2.5 py-1 rounded-lg transition"
            >
              ⬇ Download Template
            </button>
          </div>
          <div className="flex gap-2 flex-wrap text-xs">
            {["Subject", "Topic Name", "SubTopic"].map((c) => (
              <span key={c} className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded">{c}</span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Pehle sirf syllabus structure upload karo. Tasks baad mein <span className="font-semibold text-orange-500">Tasks Tab</span> se add kar sakte ho — topic pe directly ya subtopic select karke.
          </p>
        </div>
      </div>

      {hierarchy.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <MdCheckCircle size={16} className="text-green-500" />
            <span className="text-xs font-semibold text-gray-700">Parsed</span>
            <span className="text-xs text-gray-500">{totalSubjects} Subjects • {totalTopics} Topics • {totalSubTopics} SubTopics</span>
            {(() => {
              const tc = hierarchy.reduce((a, s) => a + s.topics.reduce((b, t) => b + t.subTopics.filter((st) => typeof st === "object" && st.taskTitle).length, 0), 0);
              return tc > 0 ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">{tc} Tasks detected</span> : null;
            })()}
          </div>
          {/* Subject preview chips */}
          <div className="flex flex-wrap gap-1.5">
            {hierarchy.map((s) => (
              <span key={s.subject} className="text-xs bg-white border border-gray-200 px-2.5 py-1 rounded-full text-gray-600">
                {s.subject} <span className="text-gray-400">({s.topics.length})</span>
              </span>
            ))}
          </div>
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 bg-white"
          >
            <option value="">-- Select Session --</option>
            {sessions.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <input
            type="text" value={version} onChange={(e) => setVersion(e.target.value)}
            placeholder="Version name (e.g. v1.0)"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 bg-white"
          />
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-semibold py-2 rounded-lg transition">
              <MdSave size={15} />{saving ? "Saving..." : "Save Syllabus + Tasks"}
            </button>
            <button onClick={reset} className="px-4 py-2 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition">Clear</button>
          </div>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {hierarchy.map((item, i) => <SubjectAccordion key={item.subject} item={item} index={i} />)}
          </div>
        </div>
      )}
    </div>
  );
});
SyllabusUploadDrawer.displayName = "SyllabusUploadDrawer";

/* ─── Topic/SubTopic table for one version ──────────────── */
const VersionTopicTable = ({ versionId, searchTerm }) => {
  const { data, isLoading } = useGetSyllabusVersionWithHierarchyQuery(versionId, { skip: !versionId });

  const rows = useMemo(() => {
    if (!data?.data?.subjects) return [];
    const result = [];
    data.data.subjects.forEach((subject) => {
      (subject.topics || []).forEach((topic) => {
        const topicIdStr = String(topic._id);
        if (topic.subTopics && topic.subTopics.length > 0) {
          topic.subTopics.forEach((st) => {
            result.push({ _id: String(st._id), subject: subject.name, topic: topic.name, subTopic: st.name, topicIdStr });
          });
        } else {
          result.push({ _id: topicIdStr, subject: subject.name, topic: topic.name, subTopic: "\u2014", topicIdStr });
        }
      });
    });
    return result;
  }, [data]);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const q = searchTerm.toLowerCase();
    return rows.filter((r) =>
      r.subject.toLowerCase().includes(q) ||
      r.topic.toLowerCase().includes(q) ||
      r.subTopic.toLowerCase().includes(q)
    );
  }, [rows, searchTerm]);

  if (isLoading) return (
    <div className="flex justify-center py-10">
      <div className="w-7 h-7 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!filtered.length) return <div className="py-10 text-center text-gray-400 text-sm">No subtopics found</div>;

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-100">
          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-8">#</th>
          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Subject</th>
          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Topic</th>
          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">SubTopic</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {filtered.map((row, idx) => {
          const showSubject = idx === 0 || filtered[idx - 1].subject !== row.subject;
          const showTopic   = idx === 0 || filtered[idx - 1].topicIdStr !== row.topicIdStr;
          return (
            <tr key={`${row._id}-${idx}`} className="hover:bg-gray-50 transition">
              <td className="px-4 py-2.5 text-xs text-gray-400">{idx + 1}</td>
              <td className="px-4 py-2.5">
                {showSubject ? (
                  <span className="flex items-center gap-1.5">
                    <MdBook size={13} className="text-orange-400 flex-shrink-0" />
                    <span className="font-semibold text-gray-800 text-xs">{row.subject}</span>
                  </span>
                ) : <span className="text-gray-200 text-xs pl-5">│</span>}
              </td>
              <td className="px-4 py-2.5">
                {showTopic ? (
                  <span className="flex items-center gap-1.5">
                    <MdTopic size={13} className="text-blue-400 flex-shrink-0" />
                    <span className="font-medium text-gray-700 text-xs">{row.topic}</span>
                  </span>
                ) : <span className="text-gray-300 text-xs pl-5">↳</span>}
              </td>
              <td className="px-4 py-2.5">
                <span className="flex items-center gap-1.5">
                  {row.subTopic !== "—" && <MdSubject size={12} className="text-gray-300 flex-shrink-0" />}
                  <span className="text-gray-600 text-xs">{row.subTopic}</span>
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr className="border-t border-gray-100 bg-gray-50">
          <td colSpan={4} className="px-4 py-2 text-xs text-gray-400">{filtered.length} entries</td>
        </tr>
      </tfoot>
    </table>
  );
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
    if (!/\.(xlsx|xls)$/i.test(file.name)) { toast.error("Please upload .xlsx or .xls file"); return; }
    setParsing(true); setRows([]); setFileName(file.name);
    try {
      const parsed = await parseTaskExcel(file);
      if (!parsed.length) { toast.error("Excel file is empty"); return; }
      // Map column headers (case-insensitive)
      const mapped = parsed.map((r) => ({
        subject:     String(r["Subject"]     || r["subject"]     || "").trim(),
        topic:       String(r["Topic"]       || r["topic"]       || "").trim(),
        subTopic:    String(r["SubTopic"]    || r["subtopic"]    || r["sub_topic"] || "").trim(),
        taskTitle:   String(r["TaskTitle"]   || r["Task Title"]  || r["taskTitle"] || "").trim(),
        taskType:    String(r["TaskType"]    || r["Task Type"]   || r["taskType"]  || "assessment").trim(),
        maxMarks:    r["MaxMarks"]   || r["Max Marks"]  || r["maxMarks"]  || 100,
        cutoff:      r["Cutoff"]     || r["cutoff"]     || 40,
        priority:    String(r["Priority"]    || r["priority"]    || "medium").trim(),
        mandatory:   String(r["Mandatory"]   || r["mandatory"]   || "true").trim(),
        description: String(r["Description"] || r["description"] || "").trim(),
      })).filter((r) => r.topic && r.subTopic && r.taskTitle);

      if (!mapped.length) { toast.error("No valid rows found. Check column names."); return; }
      setRows(mapped);
      toast.success(`${mapped.length} task rows parsed`);
    } catch { toast.error("Failed to parse Excel"); }
    finally { setParsing(false); e.target.value = ""; }
  };

  const handleUpload = async () => {
    if (!rows.length) { toast.error("No data to upload"); return; }
    setSaving(true);
    try {
      const res = await bulkUploadTasks({ syllabusVersionId, tasks: rows }).unwrap();
      toast.success(`${res.inserted} task(s) uploaded!`);
      if (res.errors?.length) {
        res.errors.forEach((e) => toast.warn(e, { autoClose: 8000 }));
      }
      reset();
      onSaved?.();
    } catch (err) {
      const errData = err?.data;
      toast.error(errData?.message || "Upload failed");
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
          <p className="text-xs text-gray-400 mt-0.5">Required columns: Topic, SubTopic, TaskTitle</p>
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
      <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />

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
const PRIORITY_STYLE = {
  low:    "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  high:   "bg-red-100 text-red-700",
};
const TYPE_STYLE = {
  writtenExam:  "bg-purple-100 text-purple-700",
  interview:    "bg-blue-100 text-blue-700",
  project:      "bg-orange-100 text-orange-700",
  presentation: "bg-pink-100 text-pink-700",
  learning:     "bg-teal-100 text-teal-700",
  assessment:   "bg-gray-100 text-gray-700",
};

export const VersionTasksTable = ({ versionId }) => {
  const { data, isLoading } = useGetTasksBySyllabusVersionQuery(versionId, { skip: !versionId });
  const tasks = data?.tasks || data?.data || [];

  if (isLoading) return (
    <div className="flex justify-center py-10">
      <div className="w-7 h-7 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!tasks.length) return (
    <div className="py-12 text-center">
      <MdAssignment size={36} className="text-gray-200 mx-auto mb-2" />
      <p className="text-sm text-gray-400">No tasks found for this version</p>
    </div>
  );

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-100">
          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-8">#</th>
          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Task</th>
          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Topic / SubTopic</th>
          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Time</th>
          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Measurable Point</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {tasks.map((task, idx) => {
          const titlePoints = splitNumberedPoints(task.title);
          const measurePoints = splitNumberedPoints(task.measurablePoints);
          return (
          <tr key={task._id} className="hover:bg-gray-50 transition align-top">
            <td className="px-4 py-2.5 text-xs text-gray-400">{idx + 1}</td>
            <td className="px-4 py-2.5">
              <ol className="space-y-0.5 list-none">
                {titlePoints.map((point, i) => (
                  <li key={i} className="text-xs text-gray-800">{point}</li>
                ))}
              </ol>
            </td>
            <td className="px-4 py-2.5">
              <p className="text-xs text-gray-600">{task.topicId?.name || "—"}</p>
              <p className="text-xs text-gray-400">{task.subTopicId?.name || ""}</p>
            </td>
            <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-nowrap">
              {task.timeDays ? `${task.timeDays} Day${task.timeDays > 1 ? "s" : ""}` : "—"}
            </td>
            <td className="px-4 py-2.5 max-w-[240px]">
              <ol className="space-y-0.5 list-none">
                {measurePoints.map((point, i) => (
                  <li key={i} className="text-xs text-gray-500">{point}</li>
                ))}
              </ol>
            </td>
          </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr className="border-t border-gray-100 bg-gray-50">
          <td colSpan={5} className="px-4 py-2 text-xs text-gray-400">{tasks.length} tasks</td>
        </tr>
      </tfoot>
    </table>
  );
};

/* ─── Manual Task Creation Form ────────────────────────── */
const TASK_TYPES    = ["writtenExam", "interview", "project", "presentation", "learning", "assessment"];
const TASK_PRIORITY = ["low", "medium", "high"];
const EMPTY_FORM    = { title: "", measurablePoints: "", timeDays: "", type: "assessment", priority: "medium", maxMarks: 100, cutoff: 40, dueDate: "" };

export const ManualTaskForm = ({ subLevel, versionId, onSaved, formId = "manual-task-form", showSubmitButton = true }) => {
  const subLevelId = subLevel?._id;
  const [syllabusVersionId, setSyllabusVersionId] = useState(versionId || "");
  const [subjectId,  setSubjectId]  = useState("");
  const [topicId,    setTopicId]    = useState("");
  const [taskTarget, setTaskTarget] = useState("");
  const [subTopicId, setSubTopicId] = useState("");
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);

  // Load versions for this subLevel to get syllabusVersionId
  const { data: versionsData } = useGetSyllabusVersionsBySubLevelQuery(
    { subLevelId, sessionId: "" },
    { skip: !subLevelId && !versionId }
  );
  const versions = versionsData?.data || [];

  // Auto-pick active version or first
  useEffect(() => {
    if (!versionId && versions.length > 0) {
      const active = versions.find((v) => v.status === "active") || versions[0];
      setSyllabusVersionId(active._id);
    }
  }, [versions, versionId]);

  const { data: subjectsData, isLoading: loadSub } = useGetSubjectsByVersionQuery(syllabusVersionId, { skip: !syllabusVersionId });
  const { data: topicsData,   isLoading: loadTop } = useGetTopicsBySubjectQuery(subjectId,          { skip: !subjectId });
  const { data: subTopicsData }                     = useGetSubTopicsByTopicQuery(topicId,           { skip: !topicId || taskTarget !== "subtopic" });

  const subjects  = subjectsData?.data  || [];
  const topics    = topicsData?.data    || [];
  const subTopics = subTopicsData?.data || [];

  const [createTask] = useCreateTaskManualMutation();

  const resetForm = () => { setSubjectId(""); setTopicId(""); setTaskTarget(""); setSubTopicId(""); setForm(EMPTY_FORM); };

  const canSubmit = taskTarget === "topic" || (taskTarget === "subtopic" && subTopicId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Task title required hai"); return; }
    setSaving(true);
    try {
      const payload = {
        syllabusVersionId,
        subjectId,
        topicId,
        ...(taskTarget === "subtopic" && subTopicId ? { subTopicId } : {}),
        ...form,
        title:    form.title.trim(),
        maxMarks: Number(form.maxMarks),
        cutoff:   Number(form.cutoff),
        timeDays: form.timeDays ? Number(form.timeDays) : null,
      };
      await createTask(payload).unwrap();
      toast.success("Task created successfully!");
      setForm(EMPTY_FORM); setSubTopicId(""); setTaskTarget("");
      onSaved?.();
    } catch (err) {
      toast.error(err?.data?.message || "Task create failed");
    } finally { setSaving(false); }
  };

  const ic = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 bg-white disabled:bg-gray-50 disabled:text-gray-400";
  const lc = "block text-xs font-semibold text-gray-500 mb-1";

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4 p-4 bg-orange-50/30">

      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Step 1 Subject & Topic</p>

      <div>
        <label className={lc}>Subject {loadSub && <span className="text-orange-400 font-normal">Loading...</span>}</label>
        <select className={ic} value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setTopicId(""); setTaskTarget(""); setSubTopicId(""); }}>
          <option value="">-- Select Subject --</option>
          {subjects.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
      </div>

      {subjectId && (
        <div>
          <label className={lc}>Topic {loadTop && <span className="text-orange-400 font-normal">Loading...</span>}</label>
          <select className={ic} value={topicId} onChange={(e) => { setTopicId(e.target.value); setTaskTarget(""); setSubTopicId(""); }}>
            <option value="">-- Select Topic --</option>
            {topics.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
        </div>
      )}

      {topicId && (
        <>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider pt-1">Step 2 Task Kahan Add Karna Hai?</p>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => { setTaskTarget("topic"); setSubTopicId(""); }}
              className={`flex flex-col items-center gap-1.5 border-2 rounded-xl py-4 px-3 transition ${taskTarget === "topic" ? "border-orange-500 bg-orange-50 text-orange-600" : "border-gray-200 bg-white text-gray-500 hover:border-orange-300"}`}>
              <MdTopic size={22} />
              <span className="text-xs font-semibold">Topic pe directly</span>
              <span className="text-[10px] text-center leading-tight opacity-70">Koi subtopic nahi, topic level ka task</span>
            </button>
            <button type="button" onClick={() => setTaskTarget("subtopic")}
              className={`flex flex-col items-center gap-1.5 border-2 rounded-xl py-4 px-3 transition ${taskTarget === "subtopic" ? "border-blue-500 bg-blue-50 text-blue-600" : "border-gray-200 bg-white text-gray-500 hover:border-blue-300"}`}>
              <MdSubject size={22} />
              <span className="text-xs font-semibold">SubTopic select karke</span>
              <span className="text-[10px] text-center leading-tight opacity-70">Task kisi subtopic se related hai</span>
            </button>
          </div>
        </>
      )}

      {taskTarget === "subtopic" && (
        <div>
          <label className={lc}>SubTopic</label>
          {subTopics.length === 0 ? (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              Is topic mein koi subtopic nahi Topic pe directly add karo.
            </p>
          ) : (
            <select className={ic} value={subTopicId} onChange={(e) => setSubTopicId(e.target.value)}>
              <option value="">-- Select SubTopic --</option>
              {subTopics.map((st) => <option key={st._id} value={st._id}>{st.name}</option>)}
            </select>
          )}
        </div>
      )}

      {canSubmit && (
        <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg ${taskTarget === "subtopic" ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600"}`}>
          <MdBook size={13}/><span>{subjects.find(s=>s._id===subjectId)?.name}</span>
          <span className="opacity-40">â€º</span>
          <MdTopic size={13}/><span>{topics.find(t=>t._id===topicId)?.name}</span>
          {subTopicId && <><span className="opacity-40">â€º</span><MdSubject size={13}/><span>{subTopics.find(s=>s._id===subTopicId)?.name}</span></>}
          <span className="ml-auto bg-white px-2 py-0.5 rounded-full border">Task â†’ {taskTarget === "subtopic" ? "SubTopic" : "Topic"}</span>
        </div>
      )}

      {canSubmit && (
        <>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider pt-1">Step 3 â€” Task Details</p>
          <div>
            <label className={lc}>Task Title *</label>
            <input className={ic} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Enter task title" />
          </div>
          <div>
            <label className={lc}>Measurable Points</label>
            <textarea className={ic} rows={2} value={form.measurablePoints} onChange={(e) => setForm((p) => ({ ...p, measurablePoints: e.target.value }))} placeholder="e.g. Student should explain var/let/const" />
          </div>
          <div>
            <label className={lc}>Time (Days)</label>
            <input type="number" className={ic} value={form.timeDays} onChange={(e) => setForm((p) => ({ ...p, timeDays: e.target.value }))} placeholder="e.g. 7" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lc}>Type</label>
              <select className={ic} value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
                {TASK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={lc}>Priority</label>
              <select className={ic} value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}>
                {TASK_PRIORITY.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={lc}>Max Marks</label>
              <input type="number" className={ic} value={form.maxMarks} onChange={(e) => setForm((p) => ({ ...p, maxMarks: e.target.value }))} />
            </div>
            <div>
              <label className={lc}>Cutoff</label>
              <input type="number" className={ic} value={form.cutoff} onChange={(e) => setForm((p) => ({ ...p, cutoff: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className={lc}>Due Date (optional)</label>
            <input type="date" className={ic} value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-1">
            {showSubmitButton && (
              <button type="submit" disabled={saving} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-semibold py-2.5 rounded-lg transition">
                {saving ? "Saving..." : "Add Task"}
              </button>
            )}
            <button type="button" onClick={resetForm} className="px-4 py-2 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Reset</button>
          </div>
        </>
      )}
    </form>
  );
};

/* ─── Tasks Tab with session+subject selector ──────────── */
export const TasksTab = ({ level, subLevel, onVersionChange }) => {
  const subLevelId = subLevel?._id;
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [activeSubject,     setActiveSubject]     = useState("");
  const [selectedVersionId, setSelectedVersionId] = useState({});

  const { data: sessionsData } = useGetAllSessionsQuery();
  const sessions = sessionsData?.data || [];

  const { data: versionsData, refetch } = useGetSyllabusVersionsBySubLevelQuery(
    { subLevelId, sessionId: selectedSessionId },
    { skip: !subLevelId, refetchOnMountOrArgChange: true }
  );
  const allVersions = versionsData?.data || [];

  const grouped = useMemo(() => {
    const g = {};
    allVersions.forEach((v) => {
      if (!g[v.subjectName]) g[v.subjectName] = [];
      g[v.subjectName].push(v);
    });
    return g;
  }, [allVersions]);

  const subjectNames = Object.keys(grouped).sort();
  const currentSubject = activeSubject && grouped[activeSubject] ? activeSubject : subjectNames[0] || "";
  const subjectVersions = grouped[currentSubject] || [];
  const activeVersionId = selectedVersionId[currentSubject]
    || subjectVersions.find((v) => v.status === "active")?._id
    || subjectVersions[0]?._id
    || "";

  useEffect(() => { onVersionChange?.(activeVersionId); }, [activeVersionId]);

  if (!subLevelId) return <div className="py-16 text-center text-gray-400 text-sm">SubLevel not found</div>;

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
        <select
          value={selectedSessionId}
          onChange={(e) => { setSelectedSessionId(e.target.value); setActiveSubject(""); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 bg-white min-w-[160px]"
        >
          <option value="">All Sessions</option>
          {sessions.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
      </div>

      {allVersions.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl py-12 text-center text-gray-400 text-sm">
          No syllabus found{selectedSessionId ? " for this session" : ". Upload syllabus first."}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

          {/* Subject tabs with inline version badge */}
          <div className="flex gap-0 overflow-x-auto border-b border-gray-100">
            {subjectNames.map((name) => {
              const vers   = grouped[name];
              const selVer = vers.find((v) => v._id === (selectedVersionId[name] || "")) || vers.find((v) => v.status === "active") || vers[0];
              return (
                <button
                  key={name}
                  onClick={() => setActiveSubject(name)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                    currentSubject === name
                      ? "border-orange-500 text-orange-600 bg-orange-50"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <MdBook size={14} className={currentSubject === name ? "text-orange-500" : "text-gray-400"} />
                  <span>{name}</span>
                  {selVer && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      selVer.status === "active"   ? "bg-green-100 text-green-600" :
                      selVer.status === "approved" ? "bg-blue-100 text-blue-600"  :
                      "bg-gray-100 text-gray-500"
                    }`}>
                      {selVer.version}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Version pills â€” only if multiple versions */}
          {subjectVersions.length > 1 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100">
              <span className="text-xs text-gray-400">Version:</span>
              {subjectVersions.map((v) => (
                <button
                  key={v._id}
                  onClick={() => setSelectedVersionId((p) => ({ ...p, [currentSubject]: v._id }))}
                  className={`text-xs px-2.5 py-1 rounded-full font-semibold transition ${
                    activeVersionId === v._id ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {v.version}
                </button>
              ))}
            </div>
          )}

          <VersionTasksTable versionId={activeVersionId} />
        </div>
      )}
    </div>
  );
};

const EmptyUploadState = ({ level, subLevel, onSaved }) => {
  const [showUpload, setShowUpload] = useState(false);
  const drawerRef = useRef(null);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col items-center justify-center py-16 px-8 text-center">
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
          <button
            type="button"
            onClick={() => downloadSyllabusTemplate()}
            className="flex items-center gap-2 text-sm font-semibold text-orange-500 bg-white border border-orange-300 hover:bg-orange-50 px-6 py-2.5 rounded-xl transition"
          >
            ⬇ Browse Template
          </button>
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

