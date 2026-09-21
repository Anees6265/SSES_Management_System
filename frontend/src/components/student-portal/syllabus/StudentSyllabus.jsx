import { useState, useMemo } from "react";
import { useGetMyStudentSyllabusQuery } from "../../../redux/api/studentApi";
import {
    MdMenuBook, MdSearch, MdSchool, MdLayers, MdHistory,
    MdBookmark, MdArrowForward, MdCheckCircle,
    MdOutlineDescription, MdClear, MdAutoStories,
    MdTableChart, MdViewAgenda, MdPrint, MdTopic
} from "react-icons/md";
import EmptyState from "../../shared/empty-state/EmptyState";

export default function StudentSyllabus() {
    const { data: syllabusData, isLoading, error } = useGetMyStudentSyllabusQuery();

    const [activeTab, setActiveTab] = useState("current"); // "current" | "previous" | "roadmap"
    const [viewMode, setViewMode] = useState("table"); // "table" | "cards"
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("All");
    const [selectedPrevIndex, setSelectedPrevIndex] = useState(0);

    const currentLevel = syllabusData?.data?.currentLevel || null;
    const previousLevels = syllabusData?.data?.previousLevels || [];
    const roadmap = syllabusData?.data?.roadmap || [];
    const student = syllabusData?.data?.student || {};

    // Filter current level subjects by search & subject filter
    const filteredCurrentSubjects = useMemo(() => {
        if (!currentLevel?.subjects) return [];
        let list = currentLevel.subjects;

        if (selectedSubjectFilter !== "All") {
            list = list.filter((s) => s.name === selectedSubjectFilter);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter((s) => {
                const nameMatch = s.name.toLowerCase().includes(q);
                const descMatch = (s.description || "").toLowerCase().includes(q);
                const topicMatch = (s.topics || []).some(
                    (t) =>
                        t.name.toLowerCase().includes(q) ||
                        (t.description || "").toLowerCase().includes(q) ||
                        (t.subTopics || []).some((st) => st.name.toLowerCase().includes(q))
                );
                return nameMatch || descMatch || topicMatch;
            });
        }
        return list;
    }, [currentLevel, selectedSubjectFilter, searchQuery]);

    const activePrevLevel = previousLevels[selectedPrevIndex] || previousLevels[0] || null;

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center pt-24 pb-12">
                <div className="w-9 h-9 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-semibold text-gray-500 mt-3">Loading academic syllabus...</p>
            </div>
        );
    }

    if (error || !syllabusData?.success) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-lg mx-auto mt-10">
                <p className="text-sm font-bold text-red-700">Failed to load syllabus</p>
                <p className="text-xs text-red-500 mt-1">
                    {error?.data?.message || "Could not retrieve syllabus. Please contact administrator."}
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3.5 sm:gap-4 pb-10 w-full print:p-0 print:m-0 print:max-w-none print:space-y-4 print:pb-0 print:block">

            {/* ── Official Institutional Print Header (Visible ONLY when Printing/PDF) ── */}
            <div hidden className="hidden print:block border-b-2 border-gray-900 pb-3 mb-4">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-xl font-black text-gray-900 uppercase tracking-wide">
                            Sant Singaji Institute of Science and Management
                        </h1>
                        <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mt-0.5">
                            Academic Curriculum & Course Syllabus
                        </p>
                    </div>
                    <div className="text-right text-[11px] text-gray-700 leading-tight">
                        <p className="font-bold text-gray-900">
                            {student.fullName || (student.firstName ? `${student.firstName} ${student.lastName || ""}`.trim() : student.name || "Student")}
                        </p>
                        <p>PR Key: <span className="font-mono font-semibold">{student.prKey || ""}</span></p>
                        <p>{student.course || ""} · {student.sessionName || ""}</p>
                    </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-gray-200 flex items-center justify-between text-[10px] text-gray-600 font-medium">
                    <span>
                        Curriculum Level: <strong>{activeTab === 'current' ? `${currentLevel?.levelName || ''} · SubLevel ${currentLevel?.subLevelName || ''}` : `${activePrevLevel?.levelName || ''} · SubLevel ${activePrevLevel?.subLevelName || ''}`}</strong>
                    </span>
                    {currentLevel?.syllabusVersion && (
                        <span>Version: <strong>{currentLevel.syllabusVersion.version}</strong></span>
                    )}
                    <span>Printed on: <strong>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></span>
                </div>
            </div>

            {/* ── Web Header Card (Hidden in Print) ─────────────────────────────────── */}
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-xs print:hidden">
                <div className="h-1.5 w-full bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500" />
                <div className="p-3.5 sm:p-5 lg:p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1.5">
                                <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-bold bg-orange-500 text-white shadow-xs">
                                    <MdSchool size={14} />
                                    {currentLevel?.levelName || "Current Level"} · SubLevel {currentLevel?.subLevelName || ""}
                                </span>
                                {currentLevel?.syllabusVersion && (
                                    <span className="text-[10px] sm:text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-lg border border-gray-200">
                                        Version {currentLevel.syllabusVersion.version}
                                    </span>
                                )}
                                <span className="text-[11px] sm:text-xs font-semibold text-gray-400">
                                    {student.sessionName || ""} · {student.course || "Curriculum"}
                                </span>
                            </div>

                            <h1 className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight">
                                Academic Syllabus & Curriculum
                            </h1>
                            <p className="text-[11px] sm:text-xs text-gray-500 mt-1">
                                Complete table and module breakdown of subjects, units, topics and subtopics
                            </p>
                        </div>

                        {/* Top-Right Action & Stats */}
                        <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
                            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 flex-1 sm:flex-initial">
                                <div className="px-2 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-orange-50 border border-orange-100/80 text-center">
                                    <p className="text-[9px] sm:text-[10px] font-bold uppercase text-orange-600 tracking-wider">Subjects</p>
                                    <p className="text-sm sm:text-base font-black text-orange-900 leading-tight mt-0.5">
                                        {currentLevel?.summary?.totalSubjects || 0}
                                    </p>
                                </div>
                                <div className="px-2 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-blue-50 border border-blue-100/80 text-center">
                                    <p className="text-[9px] sm:text-[10px] font-bold uppercase text-blue-600 tracking-wider">Units / Topics</p>
                                    <p className="text-sm sm:text-base font-black text-blue-900 leading-tight mt-0.5">
                                        {currentLevel?.summary?.totalTopics || 0}
                                    </p>
                                </div>
                                <div className="px-2 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-emerald-50 border border-emerald-100/80 text-center">
                                    <p className="text-[9px] sm:text-[10px] font-bold uppercase text-emerald-600 tracking-wider">Subtopics</p>
                                    <p className="text-sm sm:text-base font-black text-emerald-900 leading-tight mt-0.5">
                                        {currentLevel?.summary?.totalSubTopics || 0}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={handlePrint}
                                title="Print Syllabus Table"
                                className="px-3 py-2 sm:py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition shadow-xs flex items-center justify-center gap-1.5 text-xs font-bold shrink-0"
                            >
                                <MdPrint size={16} />
                                <span className="inline">Print / PDF</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Main Tab Navigation Bar ───────────────────────────────────────── */}
            <div className="space-y-3 border-b border-gray-200 pb-3.5 print:hidden">
                {/* Horizontal scrollable tab buttons on mobile */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    <button
                        onClick={() => setActiveTab("current")}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 shrink-0 ${activeTab === "current"
                                ? "bg-orange-500 text-white shadow-xs"
                                : "text-gray-600 bg-white border border-gray-200 hover:bg-orange-50 hover:text-orange-600"
                            }`}
                    >
                        <MdAutoStories size={16} />
                        Current Syllabus ({currentLevel?.subLevelName || "Current"})
                    </button>

                    <button
                        onClick={() => setActiveTab("previous")}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 shrink-0 ${activeTab === "previous"
                                ? "bg-orange-500 text-white shadow-xs"
                                : "text-gray-600 bg-white border border-gray-200 hover:bg-orange-50 hover:text-orange-600"
                            }`}
                    >
                        <MdHistory size={16} />
                        Previous Syllabus ({previousLevels.length})
                    </button>

                    <button
                        onClick={() => setActiveTab("roadmap")}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 shrink-0 ${activeTab === "roadmap"
                                ? "bg-orange-500 text-white shadow-xs"
                                : "text-gray-600 bg-white border border-gray-200 hover:bg-orange-50 hover:text-orange-600"
                            }`}
                    >
                        <MdLayers size={16} />
                        Curriculum Track
                    </button>
                </div>

                {/* Sub-controls (ViewMode Switcher + Search) */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                    {/* View Mode Switcher (Table vs Card) */}
                    <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 self-start sm:self-auto shrink-0">
                        <button
                            onClick={() => setViewMode("table")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === "table"
                                    ? "bg-white text-gray-900 shadow-2xs"
                                    : "text-gray-500 hover:text-gray-800"
                                }`}
                        >
                            <MdTableChart size={14} className={viewMode === "table" ? "text-orange-500" : ""} />
                            Table Form
                        </button>
                        <button
                            onClick={() => setViewMode("cards")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === "cards"
                                    ? "bg-white text-gray-900 shadow-2xs"
                                    : "text-gray-500 hover:text-gray-800"
                                }`}
                        >
                            <MdViewAgenda size={14} className={viewMode === "cards" ? "text-orange-500" : ""} />
                            Cards
                        </button>
                    </div>

                    {/* Search Input */}
                    {activeTab === "current" && (
                        <div className="relative w-full sm:w-64">
                            <MdSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search topic or unit..."
                                className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 transition-colors shadow-2xs"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <MdClear size={14} />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════════════ */}
            {/* TAB 1: CURRENT LEVEL SYLLABUS                                         */}
            {/* ═════════════════════════════════════════════════════════════════════ */}
            {activeTab === "current" && (
                <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">

                    {/* Subject Filter Bar */}
                    {currentLevel?.subjects?.length > 1 && (
                        <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-gray-100 shadow-2xs print:hidden">
                            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none">
                                <span className="text-[11px] font-bold text-gray-400 shrink-0 ml-1">Subject Filter:</span>
                                <button
                                    onClick={() => setSelectedSubjectFilter("All")}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${selectedSubjectFilter === "All"
                                            ? "bg-gray-800 text-white"
                                            : "bg-gray-50 text-gray-600 border border-gray-200/80 hover:bg-gray-100"
                                        }`}
                                >
                                    All ({currentLevel.subjects.length})
                                </button>
                                {currentLevel.subjects.map((s) => (
                                    <button
                                        key={s.name}
                                        onClick={() => setSelectedSubjectFilter(s.name)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition flex items-center gap-1.5 ${selectedSubjectFilter === s.name
                                                ? "bg-orange-500 text-white shadow-xs"
                                                : "bg-gray-50 text-gray-600 border border-gray-200/80 hover:bg-orange-50 hover:text-orange-600"
                                            }`}
                                    >
                                        <span className="truncate max-w-[130px] sm:max-w-none">{s.name}</span>
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${selectedSubjectFilter === s.name ? "bg-orange-600 text-white" : "bg-gray-200 text-gray-600"
                                            }`}>
                                            {s.topics?.length || 0}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Subjects Container */}
                    {filteredCurrentSubjects.length === 0 ? (
                        <EmptyState
                            icon={MdSearch}
                            title="No matching subjects or topics found"
                            subtitle="Try clearing your search query or subject filter."
                            actionText={searchQuery || selectedSubjectFilter !== "All" ? "Clear Filters" : undefined}
                            onAction={searchQuery || selectedSubjectFilter !== "All" ? () => { setSearchQuery(""); setSelectedSubjectFilter("All"); } : undefined}
                        />
                    ) : (
                        <div className="space-y-4 sm:space-y-6">
                            {filteredCurrentSubjects.map((subject, sIdx) => {
                                const totalSubtopics = (subject.topics || []).reduce(
                                    (acc, t) => acc + (t.subTopics?.length || 0),
                                    0
                                );

                                return (
                                    <div
                                        key={subject._id || sIdx}
                                        className="bg-white border border-gray-200/90 rounded-2xl overflow-hidden shadow-xs print:rounded-none print:border print:border-gray-300 print:shadow-none print:overflow-visible print:mb-6 print:break-inside-auto"
                                    >
                                        {/* Subject Title Bar */}
                                        <div className="px-3.5 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-orange-50/80 via-gray-50/50 to-white border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 print:bg-gray-100 print:py-2.5 print:px-4 print:border-gray-300">
                                            <div className="flex items-center gap-2.5 sm:gap-3">
                                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs print:bg-gray-800">
                                                    {sIdx + 1}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                                        <h2 className="text-sm sm:text-base font-black text-gray-900">
                                                            {subject.name}
                                                        </h2>
                                                        {subject.code && (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white text-gray-600 border border-gray-200 print:border-gray-400">
                                                                {subject.code}
                                                            </span>
                                                        )}
                                                        {subject.reportCategory && (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-100 capitalize print:hidden">
                                                                {subject.reportCategory}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {subject.description ? (
                                                        <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5 print:text-gray-700">
                                                            {subject.description}
                                                        </p>
                                                    ) : (
                                                        <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5 print:hidden">
                                                            Core curriculum module
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 print:text-[11px] print:text-gray-700">
                                                <span className="text-[10px] sm:text-xs font-bold text-gray-700 bg-white px-2 sm:px-2.5 py-1 rounded-lg border border-gray-200 shadow-2xs print:border-gray-300 print:shadow-none">
                                                    {subject.topics?.length || 0} Units
                                                </span>
                                                {totalSubtopics > 0 && (
                                                    <span className="text-[10px] sm:text-xs font-semibold text-gray-500 bg-white px-2 sm:px-2.5 py-1 rounded-lg border border-gray-200 shadow-2xs print:border-gray-300 print:shadow-none">
                                                        {totalSubtopics} Subtopics
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* ── Table Form Presentation ─────────────────────────────────── */}
                                        {viewMode === "table" ? (
                                            <>
                                                {/* Mobile Native Unit Cards View (Zero horizontal scroll needed!) */}
                                                <div className="sm:hidden divide-y divide-gray-100 print:hidden">
                                                    {(subject.topics || []).map((topic, tIdx) => {
                                                        const subCount = topic.subTopics?.length || 0;
                                                        return (
                                                            <div key={topic._id || tIdx} className="p-3.5 space-y-2.5 bg-white">
                                                                {/* Unit badge + Topic Title + Count badge */}
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <div className="flex items-start gap-2 min-w-0">
                                                                        <span className="shrink-0 px-2 py-0.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-200/80 font-black text-xs">
                                                                            Unit {String(tIdx + 1).padStart(2, "0")}
                                                                        </span>
                                                                        <div className="min-w-0">
                                                                            <h3 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug">
                                                                                {topic.name}
                                                                            </h3>
                                                                            {topic.description && (
                                                                                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                                                                                    {topic.description}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 border border-gray-200">
                                                                        {subCount > 0 ? `${subCount} concepts` : "Core"}
                                                                    </span>
                                                                </div>

                                                                {/* Subtopics chips list - fully visible without side-scroll */}
                                                                {subCount > 0 ? (
                                                                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                                                                        {topic.subTopics.map((st, sti) => (
                                                                            <span
                                                                                key={st._id || sti}
                                                                                className="inline-flex items-center gap-1 text-[11px] font-medium bg-gray-50 text-gray-700 px-2.5 py-1 rounded-lg border border-gray-200/90"
                                                                            >
                                                                                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                                                                                {st.name}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-[10px] text-gray-400 italic pt-0.5">
                                                                        Core module concepts & fundamentals
                                                                    </p>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Desktop Institutional Table View (Hidden on mobile, Visible on sm+ & Print) */}
                                                <div className="hidden sm:block overflow-x-auto print:block print:overflow-visible">
                                                    <table className="w-full text-left border-collapse print:w-full">
                                                        <thead className="print:table-header-group">
                                                            <tr className="bg-gray-50/90 border-b border-gray-200 text-[11px] font-extrabold uppercase tracking-wider text-gray-500 print:bg-gray-100 print:text-gray-900 print:border-gray-300">
                                                                <th className="py-3 px-4 w-16 text-center border-r border-gray-100 print:border-gray-300 print:py-2">
                                                                    Unit #
                                                                </th>
                                                                <th className="py-3 px-4 w-1/4 border-r border-gray-100 print:border-gray-300 print:py-2">
                                                                    Topic / Unit Title
                                                                </th>
                                                                <th className="py-3 px-4 print:border-gray-300 print:py-2">
                                                                    Subtopics & Covered Concepts
                                                                </th>
                                                                <th className="py-3 px-4 w-32 text-center print:py-2">
                                                                    Total Concepts
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100 text-xs print:divide-gray-200">
                                                            {(subject.topics || []).map((topic, tIdx) => {
                                                                const subCount = topic.subTopics?.length || 0;

                                                                return (
                                                                    <tr
                                                                        key={topic._id || tIdx}
                                                                        className="hover:bg-orange-50/30 transition-colors print:break-inside-avoid print:page-break-inside-avoid print:hover:bg-transparent"
                                                                    >
                                                                        {/* Unit Number */}
                                                                        <td className="py-3.5 px-4 text-center border-r border-gray-100 font-bold text-gray-400 bg-gray-50/30 print:text-gray-900 print:bg-transparent print:border-gray-300 print:py-2">
                                                                            {String(tIdx + 1).padStart(2, "0")}
                                                                        </td>

                                                                        {/* Topic Title */}
                                                                        <td className="py-3.5 px-4 border-r border-gray-100 align-top print:border-gray-300 print:py-2">
                                                                            <p className="font-bold text-gray-900 text-xs sm:text-sm">
                                                                                {topic.name}
                                                                            </p>
                                                                            {topic.description && (
                                                                                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed print:text-gray-600">
                                                                                    {topic.description}
                                                                                </p>
                                                                            )}
                                                                        </td>

                                                                        {/* Subtopics Chips List */}
                                                                        <td className="py-3.5 px-4 align-top print:border-gray-300 print:py-2">
                                                                            {subCount > 0 ? (
                                                                                <div className="flex flex-wrap gap-1.5">
                                                                                    {topic.subTopics.map((st, sti) => (
                                                                                        <span
                                                                                            key={st._id || sti}
                                                                                            className="inline-flex items-center gap-1 text-[11px] font-medium bg-gray-50 text-gray-700 px-2.5 py-1 rounded-lg border border-gray-200/80 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-900 transition print:bg-white print:border-gray-300 print:text-gray-900 print:py-0.5"
                                                                                        >
                                                                                            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0 print:bg-gray-800" />
                                                                                            {st.name}
                                                                                        </span>
                                                                                    ))}
                                                                                </div>
                                                                            ) : (
                                                                                <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 italic print:text-gray-500">
                                                                                    <MdTopic size={14} className="text-gray-300 print:hidden" />
                                                                                    Core module concepts & fundamentals
                                                                                </span>
                                                                            )}
                                                                        </td>

                                                                        {/* Subtopics Count */}
                                                                        <td className="py-3.5 px-4 text-center align-top print:py-2">
                                                                            {subCount > 0 ? (
                                                                                <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 border border-gray-200 print:border-gray-300">
                                                                                    {subCount} {subCount === 1 ? "concept" : "concepts"}
                                                                                </span>
                                                                            ) : (
                                                                                <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-md bg-gray-50 text-gray-400 border border-gray-100 print:border-gray-300">
                                                                                    Core Unit
                                                                                </span>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </>
                                        ) : (
                                            /* ── Cards Presentation ─────────────────────────────────────── */
                                            <div className="p-3.5 sm:p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                {(subject.topics || []).map((topic, tIdx) => (
                                                    <div
                                                        key={topic._id || tIdx}
                                                        className="p-4 bg-gray-50/70 border border-gray-200/80 rounded-xl space-y-2 hover:border-orange-200 transition shadow-2xs"
                                                    >
                                                        <div className="flex items-center justify-between gap-2 border-b border-gray-200/60 pb-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-5 h-5 rounded-md bg-white border border-gray-200 text-gray-600 flex items-center justify-center font-bold text-[10px]">
                                                                    {tIdx + 1}
                                                                </span>
                                                                <h3 className="text-xs font-bold text-gray-900 truncate">
                                                                    {topic.name}
                                                                </h3>
                                                            </div>
                                                            {topic.subTopics?.length > 0 && (
                                                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-orange-100 text-orange-700">
                                                                    {topic.subTopics.length}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {topic.subTopics?.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {topic.subTopics.map((st, sti) => (
                                                                    <span
                                                                        key={st._id || sti}
                                                                        className="text-[10px] px-2 py-0.5 bg-white text-gray-700 rounded-md border border-gray-200/70"
                                                                    >
                                                                        • {st.name}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-[10px] text-gray-400 italic">Core Unit</p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════════ */}
            {/* TAB 2: PREVIOUS LEVELS SYLLABI (ARCHIVED TABLE VIEW)                  */}
            {/* ═════════════════════════════════════════════════════════════════════ */}
            {activeTab === "previous" && (
                <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">

                    {previousLevels.length === 0 ? (
                        <EmptyState
                            icon={MdSchool}
                            title="You are in your Foundation Level"
                            subtitle={`You are currently studying in your initial level (${currentLevel?.levelName || "Level"} · SubLevel ${currentLevel?.subLevelName || "1"}). Once you advance to subsequent levels, previous syllabus tables will be accessible right here.`}
                            actionText="View Current Syllabus"
                            onAction={() => setActiveTab("current")}
                        />
                    ) : (
                        <div className="space-y-4 sm:space-y-5">
                            {/* Previous Level Selector Bar */}
                            <div className="bg-white border border-gray-100 rounded-2xl p-3.5 sm:p-4 shadow-xs print:hidden">
                                <p className="text-xs font-bold text-gray-700 mb-2.5 sm:mb-3 flex items-center gap-1.5">
                                    <MdHistory size={16} className="text-orange-500" />
                                    Select Completed Level to View Syllabus Table:
                                </p>
                                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                                    {previousLevels.map((lvl, idx) => {
                                        const isSelected = selectedPrevIndex === idx;
                                        return (
                                            <button
                                                key={lvl.subLevelId || idx}
                                                onClick={() => setSelectedPrevIndex(idx)}
                                                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${isSelected
                                                        ? "bg-gray-900 text-white shadow-xs ring-2 ring-gray-300"
                                                        : "bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100"
                                                    }`}
                                            >
                                                <MdCheckCircle size={14} className={isSelected ? "text-emerald-400" : "text-emerald-600"} />
                                                {lvl.levelName} · SubLevel {lvl.subLevelName}
                                                <span
                                                    className={`text-[10px] px-1.5 py-0.5 rounded-md ${isSelected ? "bg-gray-800 text-gray-300" : "bg-gray-200 text-gray-700"
                                                        }`}
                                                >
                                                    {lvl.totalSubjects} subjects
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Active Previous Level Detail in Table Form */}
                            {activePrevLevel && (
                                <div className="space-y-4 sm:space-y-5">
                                    {/* Level Overview Card */}
                                    <div className="bg-white border border-gray-100 rounded-2xl p-3.5 sm:p-5 shadow-xs print:border-none print:shadow-none print:p-0">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3 sm:pb-4 print:border-b-2 print:border-gray-300 print:pb-2">
                                            <div>
                                                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                                    <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 print:border-gray-400 print:text-gray-900">
                                                        <MdCheckCircle size={12} className="print:hidden" />
                                                        Archived Level Syllabus
                                                    </span>
                                                    <span className="text-[11px] sm:text-xs text-gray-400 print:text-gray-600">
                                                        {activePrevLevel.syllabusVersionTitle} ({activePrevLevel.syllabusVersionCode})
                                                    </span>
                                                </div>
                                                <h2 className="text-base sm:text-lg font-black text-gray-900 mt-1 print:text-base">
                                                    {activePrevLevel.levelName} — SubLevel {activePrevLevel.subLevelName} Syllabus
                                                </h2>
                                                <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5 print:text-gray-600">
                                                    Complete curriculum table of subjects and topics covered during this level
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-3 sm:flex sm:items-center gap-1.5 sm:gap-2 shrink-0 print:text-xs print:text-gray-700">
                                                <div className="px-2.5 sm:px-3 py-1.5 bg-gray-50 rounded-xl text-center border border-gray-100 print:border-gray-300">
                                                    <p className="text-[9px] sm:text-[10px] font-bold uppercase text-gray-400 print:text-gray-600">Subjects</p>
                                                    <p className="text-xs sm:text-sm font-extrabold text-gray-800">{activePrevLevel.totalSubjects}</p>
                                                </div>
                                                <div className="px-2.5 sm:px-3 py-1.5 bg-gray-50 rounded-xl text-center border border-gray-100 print:border-gray-300">
                                                    <p className="text-[9px] sm:text-[10px] font-bold uppercase text-gray-400 print:text-gray-600">Topics</p>
                                                    <p className="text-xs sm:text-sm font-extrabold text-gray-800">{activePrevLevel.totalTopics}</p>
                                                </div>
                                                <div className="px-2.5 sm:px-3 py-1.5 bg-gray-50 rounded-xl text-center border border-gray-100 print:border-gray-300">
                                                    <p className="text-[9px] sm:text-[10px] font-bold uppercase text-gray-400 print:text-gray-600">Subtopics</p>
                                                    <p className="text-xs sm:text-sm font-extrabold text-gray-800">{activePrevLevel.totalSubTopics}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Tables for each subject in previous level */}
                                        <div className="mt-4 sm:mt-5 space-y-4 sm:space-y-6 print:space-y-4">
                                            {activePrevLevel.subjects?.length === 0 ? (
                                                <p className="text-xs text-gray-400 italic py-3">
                                                    No detailed syllabus records found for this level.
                                                </p>
                                            ) : (
                                                activePrevLevel.subjects.map((subj, si) => (
                                                    <div
                                                        key={subj.name || si}
                                                        className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs print:rounded-none print:border print:border-gray-300 print:shadow-none print:overflow-visible print:mb-6 print:break-inside-auto"
                                                    >
                                                        {/* Subject Header Bar */}
                                                        <div className="px-3.5 sm:px-4 py-2.5 sm:py-3 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between gap-2 print:bg-gray-100 print:border-gray-300 print:py-2 print:px-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-6 h-6 rounded-md bg-emerald-600 text-white font-bold text-xs flex items-center justify-center print:bg-gray-800">
                                                                    {si + 1}
                                                                </span>
                                                                <h4 className="text-xs sm:text-sm font-bold text-gray-900">
                                                                    {subj.name}
                                                                </h4>
                                                                {subj.code && (
                                                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white text-gray-500 border border-gray-200 print:border-gray-400 print:text-gray-700">
                                                                        {subj.code}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-[11px] sm:text-xs font-semibold text-gray-500 bg-white px-2 py-0.5 rounded-md border border-gray-200 print:border-gray-300 print:text-gray-700 shrink-0">
                                                                {subj.topics?.length || 0} Units
                                                            </span>
                                                        </div>

                                                        {/* ── Table Form Presentation (Previous Levels) ── */}
                                                        {/* Mobile Native Unit Cards View (Zero horizontal scroll needed!) */}
                                                        <div className="sm:hidden divide-y divide-gray-100 print:hidden">
                                                            {(subj.topics || []).map((topic, ti) => {
                                                                const prevSubCount = topic.subTopics?.length || 0;
                                                                return (
                                                                    <div key={topic.name || ti} className="p-3.5 space-y-2.5 bg-white">
                                                                        <div className="flex items-start justify-between gap-2">
                                                                            <div className="flex items-start gap-2 min-w-0">
                                                                                <span className="shrink-0 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-black text-xs">
                                                                                    Unit {String(ti + 1).padStart(2, "0")}
                                                                                </span>
                                                                                <div className="min-w-0">
                                                                                    <h3 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug">
                                                                                        {topic.name}
                                                                                    </h3>
                                                                                    {topic.description && (
                                                                                        <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                                                                                            {topic.description}
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 border border-gray-200">
                                                                                {prevSubCount > 0 ? `${prevSubCount} concepts` : "Core"}
                                                                            </span>
                                                                        </div>

                                                                        {prevSubCount > 0 ? (
                                                                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                                                                                {topic.subTopics.map((st, sti) => (
                                                                                    <span
                                                                                        key={st.name || sti}
                                                                                        className="inline-flex items-center gap-1 text-[11px] font-medium bg-gray-50 text-gray-700 px-2.5 py-1 rounded-lg border border-gray-200/90"
                                                                                    >
                                                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                                                                        {st.name}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        ) : (
                                                                            <p className="text-[10px] text-gray-400 italic pt-0.5">
                                                                                Core module concepts & fundamentals
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* Desktop Institutional Table View (Hidden on mobile, Visible on sm+ & Print) */}
                                                        <div className="hidden sm:block overflow-x-auto print:block print:overflow-visible">
                                                            <table className="w-full text-left border-collapse print:w-full">
                                                                <thead className="print:table-header-group">
                                                                    <tr className="bg-gray-50/90 border-b border-gray-200 text-[11px] font-extrabold uppercase tracking-wider text-gray-500 print:bg-gray-100 print:text-gray-900 print:border-gray-300">
                                                                        <th className="py-3 px-4 w-16 text-center border-r border-gray-100 print:border-gray-300 print:py-2">
                                                                            Unit #
                                                                        </th>
                                                                        <th className="py-3 px-4 w-1/4 border-r border-gray-100 print:border-gray-300 print:py-2">
                                                                            Topic / Unit Title
                                                                        </th>
                                                                        <th className="py-3 px-4 print:border-gray-300 print:py-2">
                                                                            Subtopics & Covered Concepts
                                                                        </th>
                                                                        <th className="py-3 px-4 w-32 text-center print:py-2">
                                                                            Total Concepts
                                                                        </th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-100 text-xs print:divide-gray-200">
                                                                    {(subj.topics || []).map((topic, ti) => {
                                                                        const prevSubCount = topic.subTopics?.length || 0;
                                                                        return (
                                                                            <tr key={topic.name || ti} className="hover:bg-emerald-50/30 transition-colors print:break-inside-avoid print:page-break-inside-avoid print:hover:bg-transparent">
                                                                                <td className="py-3.5 px-4 text-center border-r border-gray-100 font-bold text-gray-400 bg-gray-50/30 print:text-gray-900 print:bg-transparent print:border-gray-300 print:py-2">
                                                                                    {String(ti + 1).padStart(2, "0")}
                                                                                </td>
                                                                                <td className="py-3.5 px-4 border-r border-gray-100 align-top print:border-gray-300 print:py-2">
                                                                                    <p className="font-bold text-gray-900 text-xs sm:text-sm">
                                                                                        {topic.name}
                                                                                    </p>
                                                                                    {topic.description && (
                                                                                        <p className="text-[11px] text-gray-400 mt-1 leading-relaxed print:text-gray-600">
                                                                                            {topic.description}
                                                                                        </p>
                                                                                    )}
                                                                                </td>
                                                                                <td className="py-3.5 px-4 align-top print:border-gray-300 print:py-2">
                                                                                    {prevSubCount > 0 ? (
                                                                                        <div className="flex flex-wrap gap-1.5">
                                                                                            {topic.subTopics.map((st, sti) => (
                                                                                                <span
                                                                                                    key={st.name || sti}
                                                                                                    className="inline-flex items-center gap-1 text-[11px] font-medium bg-gray-50 text-gray-700 px-2.5 py-1 rounded-lg border border-gray-200/80 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-900 transition print:bg-white print:border-gray-300 print:text-gray-900 print:py-0.5"
                                                                                                >
                                                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 print:bg-gray-800" />
                                                                                                    {st.name}
                                                                                                </span>
                                                                                            ))}
                                                                                        </div>
                                                                                    ) : (
                                                                                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 italic print:text-gray-500">
                                                                                            <MdTopic size={14} className="text-gray-300 print:hidden" />
                                                                                            Core module concepts & fundamentals
                                                                                        </span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="py-3.5 px-4 text-center align-top print:py-2">
                                                                                    {prevSubCount > 0 ? (
                                                                                        <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 print:border-gray-300">
                                                                                            {prevSubCount} {prevSubCount === 1 ? "concept" : "concepts"}
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-md bg-gray-50 text-gray-400 border border-gray-100 print:border-gray-300">
                                                                                            Core Unit
                                                                                        </span>
                                                                                    )}
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════════ */}
            {/* TAB 3: CURRICULUM ROADMAP                                             */}
            {/* ═════════════════════════════════════════════════════════════════════ */}
            {activeTab === "roadmap" && (
                <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-6 shadow-xs animate-in fade-in duration-200 print:hidden">
                    <div className="mb-4 sm:mb-5">
                        <h3 className="text-sm sm:text-base font-bold text-gray-900">Academic Curriculum Pathway</h3>
                        <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">
                            Your sequential curriculum journey from foundation to graduation
                        </p>
                    </div>

                    <div className="relative">
                        <div className="space-y-3 sm:space-y-3.5">
                            {roadmap.map((step, idx) => {
                                const isCurrent = step.status === "current";
                                const isCompleted = step.status === "completed";

                                return (
                                    <div
                                        key={step.subLevelId || idx}
                                        className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border transition-all ${isCurrent
                                                ? "bg-orange-50/70 border-orange-200 shadow-xs"
                                                : isCompleted
                                                    ? "bg-emerald-50/50 border-emerald-200"
                                                    : "bg-gray-50/50 border-gray-200 opacity-65"
                                            }`}
                                    >
                                        <div
                                            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${isCurrent
                                                    ? "bg-orange-500 text-white shadow-xs"
                                                    : isCompleted
                                                        ? "bg-emerald-600 text-white"
                                                        : "bg-gray-200 text-gray-500"
                                                }`}
                                        >
                                            {isCompleted ? <MdCheckCircle size={18} /> : <span>{step.subLevelName}</span>}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                                <h4 className="text-xs sm:text-sm font-bold text-gray-800 truncate">
                                                    {step.levelName} — SubLevel {step.subLevelName}
                                                </h4>
                                                {isCurrent && (
                                                    <span className="text-[9.5px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 border border-orange-200">
                                                        Current Position
                                                    </span>
                                                )}
                                                {isCompleted && (
                                                    <span className="text-[9.5px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                                                        Passed Level
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">
                                                {isCompleted
                                                    ? "Curriculum modules completed and archived."
                                                    : isCurrent
                                                        ? "Currently enrolled in this syllabus."
                                                        : "Upcoming curriculum level."}
                                            </p>
                                        </div>

                                        {isCurrent && (
                                            <button
                                                onClick={() => setActiveTab("current")}
                                                className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold text-orange-600 hover:text-orange-700 shrink-0"
                                            >
                                                <span>View</span> <MdArrowForward size={14} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Official Print Document Footer ───────────────────────────────── */}
            <div className="hidden print:flex items-center justify-between border-t border-gray-400 pt-2.5 mt-8 text-[10px] text-gray-600 font-medium">
                <span>Sant Singaji Institute of Science and Management (SSISM) · Academic Management System</span>
                <span>Page Curriculum Record · Student Copy</span>
            </div>
        </div>
    );
}
