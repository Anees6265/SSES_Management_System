
const SyllabusTab = ({ level, subLevel }) => {
  const subLevelId = subLevel?._id;

  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [activeVersionId,   setActiveVersionId]   = useState("");
  const [searchTerm,        setSearchTerm]        = useState("");

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

  const [deleteSyllabusVersion]   = useDeleteSyllabusVersionMutation();
  const [activateSyllabusVersion] = useActivateSyllabusVersionMutation();

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this version?")) return;
    try { await deleteSyllabusVersion(id).unwrap(); toast.success("Deleted"); refetch(); }
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
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
        <input
          type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search topic or subtopic..."
          className="flex-1 min-w-[180px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
        />
        <select
          value={selectedSessionId}
          onChange={(e) => { setSelectedSessionId(e.target.value); setActiveVersionId(""); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 bg-white min-w-[160px]"
        >
          <option value="">All Sessions</option>
          {sessions.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
      </div>

      {allVersions.length === 0 && selectedSessionId && (
        <div className="bg-white border border-gray-200 rounded-2xl py-12 text-center text-gray-400 text-sm">
          No syllabus found for this session
        </div>
      )}

      {allVersions.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex gap-0 overflow-x-auto border-b border-gray-100">
            {allVersions.map((v) => (
              <button
                key={v._id}
                onClick={() => { setActiveVersionId(v._id); setSearchTerm(""); }}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                  currentVersionId === v._id
                    ? "border-orange-500 text-orange-600 bg-orange-50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <MdBook size={14} className={currentVersionId === v._id ? "text-orange-500" : "text-gray-400"} />
                <span>{v.title || v.version}</span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                  v.status === "active"   ? "bg-green-100 text-green-600" :
                  v.status === "archived" ? "bg-gray-100 text-gray-500"  :
                  "bg-yellow-100 text-yellow-600"
                }`}>
                  {v.version}
                </span>
              </button>
            ))}
          </div>

          {currentVersionDoc && (
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100 flex-wrap">
              <StatusBadge status={currentVersionDoc.status} />
              <span className="text-xs text-gray-400">Session: {currentVersionDoc.sessionId?.name || "—"}</span>
              <div className="flex items-center gap-2 ml-auto">
                {currentVersionDoc.status === "draft" && (
                  <button onClick={() => handleActivate(currentVersionDoc._id)} className="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 font-semibold transition">Activate</button>
                )}
                {currentVersionDoc.status !== "active" && (
                  <button onClick={() => handleDelete(currentVersionDoc._id)} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition">
                    <MdDelete size={15} />
                  </button>
                )}
              </div>
            </div>
          )}

          <VersionTopicTable versionId={currentVersionId} searchTerm={searchTerm} />
        </div>
      )}
    </div>
  );
};

export default SyllabusTab;
