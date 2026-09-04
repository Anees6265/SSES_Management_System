const fs = require('fs');
const path = require('path');

const filePath = 'c:/Users/himan/Singaji_Management/ITEG_Management_System/frontend/src/components/modules/settings/levels/SyllabusTab.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replacement 1: VersionTopicTable
const newVersionTopicTable = `const VersionTopicTable = ({ versionId, searchTerm, activeSubject }) => {
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
          result.push({ _id: topicIdStr, subject: subject.name, topic: topic.name, subTopic: "\\u2514", topicIdStr });
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
      if (item.subTopic !== "—" && item.subTopic !== "\\u2014" && item.subTopic !== "\\u2514") {
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
      {groupedTopics.map((item) => (
        <div key={item.topicIdStr} className="bg-white border border-gray-150 rounded-2xl p-5 hover:shadow-md hover:border-orange-200/50 transition-all duration-200 flex flex-col justify-between">
          <div>
            {/* Header: Topic Title & Subject Badge */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-xl bg-orange-50 text-orange-500 border border-orange-100 flex-shrink-0 flex items-center justify-center">
                  <MdTopic size={16} />
                </span>
                <div>
                  <span className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-100/60 px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                    {item.subject}
                  </span>
                  <h4 className="text-sm font-bold text-gray-800 mt-1.5 leading-snug">{item.topic}</h4>
                </div>
              </div>
              <span className="text-[10.5px] font-bold text-gray-550 bg-gray-55 px-2.5 py-1 rounded-full border border-gray-200/30 flex-shrink-0">
                {item.subTopics.length} {item.subTopics.length === 1 ? "Subtopic" : "Subtopics"}
              </span>
            </div>

            {/* Subtopics collection */}
            {item.subTopics.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
                {item.subTopics.map((sub, sIdx) => (
                  <span key={sIdx} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200/50 transition-all duration-150 text-xs font-medium">
                    <MdSubject size={12} className="text-gray-400 flex-shrink-0" />
                    <span>{sub}</span>
                  </span>
                ))}
              </div>
            ) : (
              <div className="mt-4 pt-3.5 border-t border-gray-100 flex items-center gap-1.5 text-xs text-gray-400 italic">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                <span>Covers core topic content directly</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};`;

// Replacement 2: VersionTasksTable
const newVersionTasksTable = `export const VersionTasksTable = ({ versionId, searchTerm = "" }) => {
  const { data, isLoading } = useGetTasksBySyllabusVersionQuery(versionId, { skip: !versionId });
  const allTasks = data?.tasks || data?.data || [];

  const tasks = useMemo(() => {
    if (!searchTerm.trim()) return allTasks;
    const q = searchTerm.toLowerCase();
    return allTasks.filter((t) =>
      t.title?.toLowerCase().includes(q) ||
      t.topicName?.toLowerCase().includes(q) ||
      t.subTopicName?.toLowerCase().includes(q)
    );
  }, [allTasks, searchTerm]);

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
    <div className="p-4 bg-gray-50/20 space-y-3.5">
      {tasks.map((task, idx) => {
        const measurePoints = splitNumberedPoints(task.measurablePoints);
        const priorityKey   = (task.priority || "medium").toLowerCase();
        const typeKey       = task.type || "assessment";
        const pBadge        = PRIORITY_BADGE[priorityKey] || PRIORITY_BADGE.medium;
        return (
          <div key={task._id} className="bg-white border border-gray-150 rounded-2xl p-5 hover:shadow-md hover:border-orange-200/50 transition-all duration-200 flex flex-col md:flex-row md:items-start justify-between gap-5">
            {/* Left side: Task Title, Topic path, badges */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3">
                <span className="inline-flex w-7 h-7 rounded-xl bg-gray-50 text-gray-555 text-xs font-bold items-center justify-center border border-gray-200 flex-shrink-0 mt-0.5 shadow-sm">
                  {idx + 1}
                </span>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-gray-855 leading-snug">{task.title}</h4>
                  {task.dueDate && (
                    <span className="inline-flex items-center gap-1.5 mt-2.5 text-[10.5px] font-medium text-gray-455 bg-gray-50 border border-gray-200/50 px-2.5 py-0.5 rounded-full">
                      <MdCalendarToday size={11} className="text-gray-400" />
                      {new Date(task.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  )}
                </div>
              </div>

              {/* Breadcrumbs for Topic & Subtopic */}
              <div className="flex items-center flex-wrap gap-1.5 mt-3 text-xs text-gray-655 bg-gray-50 border border-gray-150/40 rounded-xl px-3 py-2 w-fit">
                <span className="p-0.5 rounded bg-orange-55 text-orange-500 border border-orange-100 flex-shrink-0 flex items-center justify-center">
                  <MdTopic size={12} />
                </span>
                <span className="font-semibold text-gray-800">{task.topicName || "—"}</span>
                {task.subTopicName && (
                  <>
                    <MdChevronRight size={14} className="text-gray-305" />
                    <span className="p-0.5 rounded bg-white text-gray-400 border border-gray-150 flex items-center justify-center">
                      <MdSubject size={10} />
                    </span>
                    <span className="text-gray-655 text-xs">{task.subTopicName}</span>
                  </>
                )}
              </div>

              {/* Badges row */}
              <div className="flex flex-wrap gap-2 mt-3.5">
                <span className={\`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-sm/5 \${TYPE_BADGE[typeKey] || "bg-gray-100 text-gray-600 border border-gray-200"}\`}>
                  {typeKey}
                </span>
                <span className={\`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-sm/5 \${pBadge.cls}\`}>
                  <span className={\`w-1.5 h-1.5 rounded-full flex-shrink-0 \${pBadge.dot}\`} />
                  {priorityKey}
                </span>
                {task.timeDays ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-600 bg-gray-55 border border-gray-200/50 px-2.5 py-0.5 rounded-full">
                    <MdAccessTime size={12} className="text-gray-450" />
                    {task.timeDays} day{task.timeDays > 1 ? "s" : ""}
                  </span>
                ) : null}
              </div>
            </div>

            {/* Right side: Measurable Points list (if present) */}
            {measurePoints.length > 0 && measurePoints[0] && (
              <div className="md:w-[38%] w-full md:border-l md:border-t-0 border-t border-gray-105 md:pl-5 md:pt-0 pt-3.5 flex-shrink-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Measurable Points</p>
                <ul className="space-y-1.5">
                  {measurePoints.map((pt, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-500 leading-relaxed">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-400/80 flex-shrink-0" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
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
};`;

// Replacement 3: TasksTab
const newTasksTab = `export const TasksTab = ({ level, subLevel, onVersionChange }) => {
  const subLevelId = subLevel?._id;
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [activeVersionId,   setActiveVersionId]   = useState("");
  const [searchTerm,        setSearchTerm]        = useState("");
  const [showTaskModal,     setShowTaskModal]     = useState(false);

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

  useEffect(() => { onVersionChange?.(currentVersionId); }, [currentVersionId]);

  if (!subLevelId) return <div className="py-16 text-center text-gray-450 text-sm">SubLevel not found</div>;

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
            <div className="relative min-w-[180px]">
              <select
                value={selectedSessionId}
                onChange={(e) => { setSelectedSessionId(e.target.value); setActiveVersionId(""); }}
                className="w-full pl-3.5 pr-8 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white text-gray-750 transition-all duration-200 appearance-none cursor-pointer"
              >
                <option value="">All Sessions</option>
                {sessions.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                <MdExpandMore size={18} />
              </div>
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
                className={\`flex items-center gap-2 px-4 py-2 text-xs font-bold whitespace-nowrap rounded-lg border transition-all flex-shrink-0 \${
                  currentVersionId === v._id
                    ? "bg-white text-orange-600 shadow-sm border-orange-200/30"
                    : "border-transparent text-gray-555 hover:text-gray-800 hover:bg-gray-100/50"
                }\`}
              >
                <MdBook size={13} className={currentVersionId === v._id ? "text-orange-500" : "text-gray-400"} />
                <span>{v.title || v.version}</span>
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
          <VersionTasksTable versionId={currentVersionId} searchTerm={searchTerm} />
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
};`;

// Replacement 4: SyllabusTab
const newSyllabusTab = `const SyllabusTab = ({ level, subLevel }) => {
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
        <div className="relative min-w-[185px]">
          <select
            value={selectedSessionId}
            onChange={(e) => { setSelectedSessionId(e.target.value); setActiveVersionId(""); setSearchTerm(""); }}
            className="w-full pl-3.5 pr-8 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white text-gray-750 transition-all duration-200 appearance-none cursor-pointer"
          >
            <option value="">All Sessions</option>
            {sessions.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
            <MdExpandMore size={18} />
          </div>
        </div>
      </div>

      {/* Version selector (Pills layout) */}
      {allVersions.length > 1 && (
        <div className="flex gap-2 overflow-x-auto p-2 bg-gray-50/50 rounded-xl border border-gray-150/45 m-4">
          {allVersions.map((v) => (
            <button
              key={v._id}
              onClick={() => { setActiveVersionId(v._id); setSearchTerm(""); }}
              className={\`flex items-center gap-2 px-4 py-2 text-xs font-bold whitespace-nowrap rounded-lg border transition-all flex-shrink-0 \${
                currentVersionId === v._id
                  ? "bg-white text-orange-600 shadow-sm border-orange-200/30"
                  : "border-transparent text-gray-550 hover:text-gray-800 hover:bg-gray-100/50"
              }\`}
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
              className={\`flex items-center gap-2 px-4 py-2 text-xs font-bold whitespace-nowrap rounded-lg border transition-all flex-shrink-0 \${
                activeSubject === s.name
                  ? "bg-white text-orange-600 shadow-sm border-orange-200/30"
                  : "border-transparent text-gray-550 hover:text-gray-805 hover:bg-gray-100/50"
              }\`}
            >
              <MdBook size={13} className={activeSubject === s.name ? "text-orange-500" : "text-gray-400"} />
              <span>{s.name}</span>
              <span className={\`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all \${
                activeSubject === s.name ? "bg-orange-50 text-orange-600 border border-orange-100" : "bg-gray-100 text-gray-500"
              }\`}>
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
};`;

// Replace component 1
const topicRegex = /const VersionTopicTable = \(\{ versionId, searchTerm, activeSubject \}\) => \{[\s\S]*?\}\;\s*(?=\/\* helper\: subjects)/;
if (!topicRegex.test(content)) {
  console.error("Error: Could not match VersionTopicTable regex!");
  process.exit(1);
}
content = content.replace(topicRegex, newVersionTopicTable + '\n\n');

// Replace component 2
const tasksRegex = /export const VersionTasksTable = \(\{ versionId, searchTerm = "" \}\) => \{[\s\S]*?\}\;\s*(?=\/\* ─── Manual Task)/;
if (!tasksRegex.test(content)) {
  console.error("Error: Could not match VersionTasksTable regex!");
  process.exit(1);
}
content = content.replace(tasksRegex, newVersionTasksTable + '\n\n');

// Replace component 3
const tasksTabRegex = /export const TasksTab = \(\{ level, subLevel, onVersionChange \}\) => \{[\s\S]*?\}\;\s*(?=const EmptyUploadState)/;
if (!tasksTabRegex.test(content)) {
  console.error("Error: Could not match TasksTab regex!");
  process.exit(1);
}
content = content.replace(tasksTabRegex, newTasksTab + '\n\n');

// Replace component 4
const syllabusTabRegex = /const SyllabusTab = \(\{ level, subLevel \}\) => \{[\s\S]*?\}\;\s*(?=export default SyllabusTab)/;
if (!syllabusTabRegex.test(content)) {
  console.error("Error: Could not match SyllabusTab regex!");
  process.exit(1);
}
content = content.replace(syllabusTabRegex, newSyllabusTab + '\n\n');

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully replaced all 4 components in SyllabusTab.jsx!");
