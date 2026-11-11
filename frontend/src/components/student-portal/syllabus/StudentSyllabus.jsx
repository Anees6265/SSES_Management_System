import { useState, useMemo } from "react";
import { useGetMyStudentSyllabusQuery } from "../../../redux/api/studentApi";
import {
    MdMenuBook, MdSearch, MdSchool, MdLayers, MdHistory,
    MdArrowForward, MdCheckCircle,
    MdClear, MdAutoStories,
    MdTableChart, MdViewAgenda, MdPrint, MdTopic,
    MdPictureAsPdf, MdDownload, MdVerified
} from "react-icons/md";
import collegeLogo from "../../../assets/images/logo-ssism.png";
import EmptyState from "../../shared/empty-state/EmptyState";
import ActiveFilterChips from "../../shared/search-export/ActiveFilterChips";
import { usePersistentState } from "../../../hooks/usePersistentFilters";

export default function StudentSyllabus() {
    const { data: syllabusData, isLoading, error } = useGetMyStudentSyllabusQuery();

    const [activeTab, setActiveTab] = usePersistentState("student_syllabus_tab", "current");
    const [viewMode, setViewMode] = useState("table"); // "table" | "cards"
    const [searchQuery, setSearchQuery] = usePersistentState("student_syllabus_search", "");
    const [selectedSubjectFilter, setSelectedSubjectFilter] = usePersistentState("student_syllabus_subject", "All");
    const [selectedPrevIndex, setSelectedPrevIndex] = useState(0);

    const activeSyllabusChips = useMemo(() => {
        const chips = [];
        if (selectedSubjectFilter !== "All") {
            chips.push({
                key: "subject",
                label: "Subject",
                value: selectedSubjectFilter,
                displayValue: selectedSubjectFilter,
                onRemove: () => setSelectedSubjectFilter("All"),
            });
        }
        if (searchQuery.trim()) {
            chips.push({
                key: "search",
                label: "Search",
                value: searchQuery,
                displayValue: `"${searchQuery}"`,
                onRemove: () => setSearchQuery(""),
            });
        }
        return chips;
    }, [selectedSubjectFilter, searchQuery, setSelectedSubjectFilter, setSearchQuery]);

    const currentLevel = syllabusData?.data?.currentLevel || null;
    const previousLevels = syllabusData?.data?.previousLevels || [];
    const roadmap = syllabusData?.data?.roadmap || [];
    const student = syllabusData?.data?.student || {};

    // Filter current level subjects by search & subject filter
    const filteredCurrentSubjects = useMemo(() => {
        if (!currentLevel?.subjects) return [];
        let list = currentLevel.subjects;

        // Auto-reset stale filter if it doesn't exist in current level
        const effectiveFilter = selectedSubjectFilter !== "All" && list.some(s => s.name === selectedSubjectFilter)
            ? selectedSubjectFilter
            : "All";

        if (effectiveFilter !== "All") {
            list = list.filter((s) => s.name === effectiveFilter);
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

    const currentSubjectsCount = currentLevel?.summary?.totalSubjects || currentLevel?.subjects?.length || 0;
    const currentTopicsCount = currentLevel?.summary?.totalTopics || 0;
    const currentSubTopicsCount = currentLevel?.summary?.totalSubTopics || 0;

    return (
        <div className="flex flex-col gap-3.5 sm:gap-4 pb-10 w-full print:p-0 print:m-0 print:max-w-none print:space-y-4 print:pb-0 print:block">

            {/* ═════════════════════════════════════════════════════════════════════ */}
            {/* OFFICIAL INSTITUTIONAL PRINT HEADER (Visible ONLY When Printing/PDF)  */}
            {/* ═════════════════════════════════════════════════════════════════════ */}
            <div className="hidden print:block print:w-full print:mb-4 border-b-2 border-gray-900 pb-3">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <img 
                            src={collegeLogo} 
                            alt="SSISM Logo" 
                            className="w-14 h-14 object-contain shrink-0" 
                        />
                        <div>
                            <h1 className="text-lg font-black text-gray-900 uppercase tracking-wide leading-tight">
                                Sant Singaji Institute of Science and Management
                            </h1>
                            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mt-0.5">
                                Approved by Dept. of Higher Education, Govt. of M.P. · Affiliated to Vikram University, Ujjain
                            </p>
                            <div className="inline-block mt-1 px-2.5 py-0.5 rounded bg-orange-100 text-orange-900 text-[10px] font-black tracking-wide uppercase border border-orange-200">
                                Official Academic Syllabus & Curriculum Specification
                            </div>
                        </div>
                    </div>

                    <div className="text-right text-[10px] text-gray-700 leading-snug shrink-0">
                        <p className="font-black text-gray-900 text-xs">
                            {student.name || student.fullName || "Student Record"}
                        </p>
                        {student.prkey && (
                            <p className="font-bold text-gray-800">Scholar No: <span className="font-mono">{student.prkey}</span></p>
                        )}
                        <p className="text-gray-600 font-medium">
                            {student.course || "Curriculum"} {student.subDepartmentName ? `(${student.subDepartmentName})` : ""}
                        </p>
                        <p className="text-gray-500">Session: {student.sessionName || "Academic Year"}</p>
                    </div>
                </div>

                {/* Metadata & Scope Table */}
                <div className="mt-3 pt-2.5 border-t border-gray-300 grid grid-cols-4 gap-2 text-[10px] bg-gray-50/80 p-2.5 rounded-lg border border-gray-200">
                    <div>
                        <span className="text-gray-500 font-bold block uppercase text-[8.5px]">Academic Level:</span>
                        <span className="font-extrabold text-gray-900">
                            {activeTab === 'current'
                                ? `${currentLevel?.levelName || 'Current Level'} · SubLevel ${currentLevel?.subLevelName || ''}`
                                : `${activePrevLevel?.levelName || 'Archived Level'} · SubLevel ${activePrevLevel?.subLevelName || ''}`}
                        </span>
                    </div>
                    <div>
                        <span className="text-gray-500 font-bold block uppercase text-[8.5px]">Syllabus Version:</span>
                        <span className="font-extrabold text-gray-900">
                            {currentLevel?.syllabusVersion?.version ? `Version ${currentLevel.syllabusVersion.version}` : (currentLevel?.syllabusVersion?.title || "Active Version")}
                        </span>
                    </div>
                    <div>
                        <span className="text-gray-500 font-bold block uppercase text-[8.5px]">Curriculum Scope:</span>
                        <span className="font-extrabold text-gray-900">
                            {activeTab === 'current' 
                                ? `${currentSubjectsCount} Subjects · ${currentTopicsCount} Units · ${currentSubTopicsCount} Concepts` 
                                : `${activePrevLevel?.totalSubjects || 0} Subjects · ${activePrevLevel?.totalTopics || 0} Units`}
                        </span>
                    </div>
                    <div>
                        <span className="text-gray-500 font-bold block uppercase text-[8.5px]">Date Printed:</span>
                        <span className="font-extrabold text-gray-900">
                            {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                    </div>
                </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════════════ */}
            {/* WEB HEADER CARD (Visible on Screen, Hidden in Print)                  */}
            {/* ═════════════════════════════════════════════════════════════════════ */}
            <div className="bg-white border border-gray-100 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs print:hidden">
                <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400" />
                <div className="p-3.5 sm:p-5 lg:p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Title & Metadata */}
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1.5">
                                <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-bold bg-orange-500 text-white shadow-2xs">
                                    <MdSchool size={14} className="shrink-0" />
                                    <span>{currentLevel?.levelName || "Current Level"} · SubLevel {currentLevel?.subLevelName || ""}</span>
                                </span>
                                {currentLevel?.syllabusVersion && (
                                    <span className="text-[10px] sm:text-[11px] font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-lg border border-gray-200">
                                        Version {currentLevel.syllabusVersion.version}
                                    </span>
                                )}
                                <span className="text-[11px] sm:text-xs font-semibold text-gray-400">
                                    {student.sessionName || ""} · {student.course || "Curriculum"} {student.subDepartmentName ? `(${student.subDepartmentName})` : ""}
                                </span>
                            </div>

                            <h1 className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight">
                                Academic Syllabus & Curriculum
                            </h1>
                            <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">
                                Complete module breakdown of subjects, units, topics and covered concepts
                            </p>
                        </div>

                        {/* Top-Right Metrics & Download Action */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between lg:justify-end gap-2.5 sm:gap-3 shrink-0">
                            {/* 3 Metric Summary Tiles */}
                            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                                <div className="px-2 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-orange-50/80 border border-orange-100/90 text-center">
                                    <p className="text-[9px] sm:text-[10px] font-bold uppercase text-orange-600 tracking-wider">Subjects</p>
                                    <p className="text-sm sm:text-base font-black text-orange-950 leading-tight mt-0.5">
                                        {currentSubjectsCount}
                                    </p>
                                </div>
                                <div className="px-2 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-blue-50/80 border border-blue-100/90 text-center">
                                    <p className="text-[9px] sm:text-[10px] font-bold uppercase text-blue-600 tracking-wider">Units / Topics</p>
                                    <p className="text-sm sm:text-base font-black text-blue-950 leading-tight mt-0.5">
                                        {currentTopicsCount}
                                    </p>
                                </div>
                                <div className="px-2 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-emerald-50/80 border border-emerald-100/90 text-center">
                                    <p className="text-[9px] sm:text-[10px] font-bold uppercase text-emerald-600 tracking-wider">Concepts</p>
                                    <p className="text-sm sm:text-base font-black text-emerald-950 leading-tight mt-0.5">
                                        {currentSubTopicsCount}
                                    </p>
                                </div>
                            </div>

                            {/* Download PDF / Print Button */}
                            <button
                                onClick={handlePrint}
                                title="Download Syllabus as PDF or Print"
                                className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                            >
                                <MdPictureAsPdf size={16} className="shrink-0" />
                                <span>Download PDF / Print</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════════════ */}
            {/* TAB NAVIGATION & CONTROLS (Hidden in Print)                           */}
            {/* ═════════════════════════════════════════════════════════════════════ */}
            <div className="space-y-3 border-b border-gray-200 pb-3.5 print:hidden">
                {/* Horizontal scrollable tab buttons on mobile */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    <button
                        onClick={() => setActiveTab("current")}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 shrink-0 cursor-pointer ${
                            activeTab === "current"
                                ? "bg-orange-500 text-white shadow-xs"
                                : "text-gray-600 bg-white border border-gray-200 hover:bg-orange-50 hover:text-orange-600"
                        }`}
                    >
                        <MdAutoStories size={16} />
                        <span>Current Syllabus ({currentLevel?.subLevelName || "Current"})</span>
                    </button>

                    <button
                        onClick={() => setActiveTab("previous")}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 shrink-0 cursor-pointer ${
                            activeTab === "previous"
                                ? "bg-orange-500 text-white shadow-xs"
                                : "text-gray-600 bg-white border border-gray-200 hover:bg-orange-50 hover:text-orange-600"
                        }`}
                    >
                        <MdHistory size={16} />
                        <span>Previous Syllabus ({previousLevels.length})</span>
                    </button>

                    <button
                        onClick={() => setActiveTab("roadmap")}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 shrink-0 cursor-pointer ${
                            activeTab === "roadmap"
                                ? "bg-orange-500 text-white shadow-xs"
                                : "text-gray-600 bg-white border border-gray-200 hover:bg-orange-50 hover:text-orange-600"
                        }`}
                    >
                        <MdLayers size={16} />
                        <span>Curriculum Track</span>
                    </button>
                </div>

                {/* Sub-controls (ViewMode Switcher + Search) */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                    {/* View Mode Switcher (Table vs Card) */}
                    <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 self-start sm:self-auto shrink-0">
                        <button
                            onClick={() => setViewMode("table")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                viewMode === "table"
                                    ? "bg-white text-gray-900 shadow-2xs"
                                    : "text-gray-500 hover:text-gray-800"
                            }`}
                        >
                            <MdTableChart size={14} className={viewMode === "table" ? "text-orange-500" : ""} />
                            <span>Table Form</span>
                        </button>
                        <button
                            onClick={() => setViewMode("cards")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                viewMode === "cards"
                                    ? "bg-white text-gray-900 shadow-2xs"
                                    : "text-gray-500 hover:text-gray-800"
                            }`}
                        >
                            <MdViewAgenda size={14} className={viewMode === "cards" ? "text-orange-500" : ""} />
                            <span>Cards</span>
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
                                placeholder="Search units or concepts..."
                                className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 transition-colors shadow-2xs"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
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
                                <span className="text-[11px] font-bold text-gray-400 shrink-0 ml-1">Filter Subject:</span>
                                <button
                                    onClick={() => setSelectedSubjectFilter("All")}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
                                        selectedSubjectFilter === "All"
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
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
                                            selectedSubjectFilter === s.name
                                                ? "bg-orange-500 text-white shadow-xs"
                                                : "bg-gray-50 text-gray-600 border border-gray-200/80 hover:bg-orange-50 hover:text-orange-600"
                                        }`}
                                    >
                                        <span className="truncate max-w-[130px] sm:max-w-none">{s.name}</span>
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                                            selectedSubjectFilter === s.name ? "bg-orange-600 text-white" : "bg-gray-200 text-gray-600"
                                        }`}>
                                            {s.topics?.length || 0}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeSyllabusChips.length > 0 && (
                        <ActiveFilterChips
                            chips={activeSyllabusChips}
                            onClearAll={() => {
                                setSelectedSubjectFilter("All");
                                setSearchQuery("");
                            }}
                        />
                    )}

                    {/* Subjects Container */}
                    {(!currentLevel?.subjects || currentLevel.subjects.length === 0) ? (
                        <EmptyState
                            icon={MdMenuBook}
                            title={`No syllabus published for ${currentLevel?.levelName || "Current Level"} yet`}
                            subtitle={`The curriculum for ${currentLevel?.levelName || "this level"}${currentLevel?.subLevelName ? ` (SubLevel ${currentLevel.subLevelName})` : ""} has not been published yet or is being updated by the department.`}
                        />
                    ) : filteredCurrentSubjects.length === 0 ? (
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
                                        className="bg-white border border-gray-200/90 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs print:rounded-none print:border print:border-gray-300 print:shadow-none print:overflow-visible print:mb-6 print:break-inside-auto syllabus-print-section"
                                    >
                                        {/* Subject Title Bar */}
                                        <div className="px-3.5 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-orange-50/70 via-gray-50/50 to-white border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 print:bg-gray-100 print:py-2 print:px-3 print:border-gray-300">
                                            <div className="flex items-center gap-2.5 sm:gap-3">
                                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs print:bg-gray-900">
                                                    {sIdx + 1}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                                        <h2 className="text-sm sm:text-base font-black text-gray-900">
                                                            {subject.name}
                                                        </h2>
                                                        {subject.code && (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white text-gray-700 border border-gray-200 print:border-gray-400">
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

                                            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 print:text-[11px] print:text-gray-800">
                                                <span className="text-[10px] sm:text-xs font-bold text-gray-700 bg-white px-2 sm:px-2.5 py-1 rounded-lg border border-gray-200 shadow-2xs print:border-gray-300 print:shadow-none">
                                                    {subject.topics?.length || 0} Units
                                                </span>
                                                {totalSubtopics > 0 && (
                                                    <span className="text-[10px] sm:text-xs font-semibold text-gray-500 bg-white px-2 sm:px-2.5 py-1 rounded-lg border border-gray-200 shadow-2xs print:border-gray-300 print:shadow-none">
                                                        {totalSubtopics} Concepts
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* ── Table Form Presentation (Desktop Table + Mobile Cards) ── */}
                                        {viewMode === "table" && (
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
                                                                                className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-gray-50 text-gray-700 px-2.5 py-1 rounded-lg border border-gray-200/90"
                                                                            >
                                                                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
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

                                                {/* Desktop Institutional Table View (Hidden on mobile screen, Visible on sm+ & Always in Print) */}
                                                <div className="hidden sm:block overflow-x-auto print:block print:overflow-visible">
                                                    <table className="w-full text-left border-collapse print:w-full syllabus-print-table">
                                                        <thead className="print:table-header-group">
                                                            <tr className="bg-gray-50/90 border-b border-gray-200 text-[11px] font-extrabold uppercase tracking-wider text-gray-600 print:bg-gray-100 print:text-gray-900 print:border-gray-300">
                                                                <th className="py-3 px-4 w-16 text-center border-r border-gray-100 print:border-gray-300 print:py-2">
                                                                    Unit #
                                                                </th>
                                                                <th className="py-3 px-4 w-1/4 border-r border-gray-100 print:border-gray-300 print:py-2">
                                                                    Topic / Unit Title
                                                                </th>
                                                                <th className="py-3 px-4 print:border-gray-300 print:py-2">
                                                                    Detailed Concepts & Covered Subtopics
                                                                </th>
                                                                <th className="py-3 px-4 w-32 text-center print:py-2">
                                                                    Total Concepts
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100 text-xs print:divide-gray-300">
                                                            {(subject.topics || []).map((topic, tIdx) => {
                                                                const subCount = topic.subTopics?.length || 0;

                                                                return (
                                                                    <tr
                                                                        key={topic._id || tIdx}
                                                                        className="hover:bg-orange-50/25 transition-colors print:break-inside-avoid print:page-break-inside-avoid print:hover:bg-transparent"
                                                                    >
                                                                        {/* Unit Number */}
                                                                        <td className="py-3.5 px-4 text-center border-r border-gray-100 font-bold text-gray-500 bg-gray-50/30 print:text-gray-900 print:bg-transparent print:border-gray-300 print:py-2">
                                                                            <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-mono text-xs print:bg-transparent print:p-0">
                                                                                {String(tIdx + 1).padStart(2, "0")}
                                                                            </span>
                                                                        </td>

                                                                        {/* Topic Title */}
                                                                        <td className="py-3.5 px-4 border-r border-gray-100 align-top print:border-gray-300 print:py-2">
                                                                            <p className="font-bold text-gray-900 text-xs sm:text-sm">
                                                                                {topic.name}
                                                                            </p>
                                                                            {topic.description && (
                                                                                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed print:text-gray-700">
                                                                                    {topic.description}
                                                                                </p>
                                                                            )}
                                                                        </td>

                                                                        {/* Subtopics Chips List */}
                                                                        <td className="py-3.5 px-4 align-top print:border-gray-300 print:py-2">
                                                                            {subCount > 0 ? (
                                                                                <div className="flex flex-wrap gap-1.5 print:gap-1">
                                                                                    {topic.subTopics.map((st, sti) => (
                                                                                        <span
                                                                                            key={st._id || sti}
                                                                                            className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-gray-50 text-gray-700 px-2.5 py-1 rounded-lg border border-gray-200/80 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-900 transition print:bg-white print:border-gray-300 print:text-gray-900 print:py-0.5"
                                                                                        >
                                                                                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 print:bg-gray-900" />
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
                                        )}

                                        {/* ── Cards Form Presentation ── */}
                                        {viewMode === "cards" && (
                                            <>
                                                {/* On Screen: Clean Grid of Unit Cards */}
                                                <div className="p-3.5 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 print:hidden">
                                                    {(subject.topics || []).map((topic, tIdx) => (
                                                        <div
                                                            key={topic._id || tIdx}
                                                            className="p-3.5 sm:p-4 bg-gray-50/70 border border-gray-200/80 rounded-xl sm:rounded-2xl space-y-2 hover:border-orange-200 transition shadow-2xs"
                                                        >
                                                            <div className="flex items-center justify-between gap-2 border-b border-gray-200/60 pb-2">
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <span className="w-5 h-5 rounded-md bg-white border border-gray-200 text-gray-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                                                                        {tIdx + 1}
                                                                    </span>
                                                                    <h3 className="text-xs font-bold text-gray-900 truncate">
                                                                        {topic.name}
                                                                    </h3>
                                                                </div>
                                                                {topic.subTopics?.length > 0 && (
                                                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-orange-100 text-orange-700 shrink-0">
                                                                        {topic.subTopics.length}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {topic.subTopics?.length > 0 ? (
                                                                <div className="flex flex-wrap gap-1 pt-1">
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

                                                {/* In Print: Fallback to Table Format so PDF is ALWAYS Crisp & Official */}
                                                <div className="hidden print:block print:overflow-visible">
                                                    <table className="w-full text-left border-collapse print:w-full syllabus-print-table">
                                                        <thead className="print:table-header-group">
                                                            <tr className="bg-gray-100 border-b border-gray-300 text-[10px] font-black uppercase text-gray-900">
                                                                <th className="py-2 px-3 w-14 text-center border-r border-gray-300">Unit #</th>
                                                                <th className="py-2 px-3 w-1/4 border-r border-gray-300">Unit / Topic Title</th>
                                                                <th className="py-2 px-3 border-r border-gray-300">Detailed Subtopics & Concepts</th>
                                                                <th className="py-2 px-3 w-24 text-center">Concepts</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-300 text-xs">
                                                            {(subject.topics || []).map((topic, tIdx) => (
                                                                <tr key={topic._id || tIdx} className="print:break-inside-avoid">
                                                                    <td className="py-2 px-3 text-center border-r border-gray-300 font-bold text-gray-900">
                                                                        {String(tIdx + 1).padStart(2, "0")}
                                                                    </td>
                                                                    <td className="py-2 px-3 border-r border-gray-300 align-top">
                                                                        <p className="font-bold text-gray-900 text-xs">{topic.name}</p>
                                                                        {topic.description && (
                                                                            <p className="text-[10px] text-gray-600 mt-0.5">{topic.description}</p>
                                                                        )}
                                                                    </td>
                                                                    <td className="py-2 px-3 border-r border-gray-300 align-top">
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {(topic.subTopics || []).map((st, sti) => (
                                                                                <span key={st._id || sti} className="inline-flex items-center gap-1 text-[10px] text-gray-900 bg-white border border-gray-300 px-1.5 py-0.5 rounded">
                                                                                    <span className="w-1 h-1 rounded-full bg-gray-900 shrink-0" />
                                                                                    {st.name}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-2 px-3 text-center align-top font-bold text-gray-800 text-[11px]">
                                                                        {topic.subTopics?.length || 0}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </>
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
                            <div className="bg-white border border-gray-100 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 shadow-xs print:hidden">
                                <p className="text-xs font-bold text-gray-700 mb-2.5 sm:mb-3 flex items-center gap-1.5">
                                    <MdHistory size={16} className="text-orange-500" />
                                    <span>Select Completed Level to View Syllabus:</span>
                                </p>
                                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                                    {previousLevels.map((lvl, idx) => {
                                        const isSelected = selectedPrevIndex === idx;
                                        return (
                                            <button
                                                key={lvl.subLevelId || idx}
                                                onClick={() => setSelectedPrevIndex(idx)}
                                                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                                                    isSelected
                                                        ? "bg-gray-900 text-white shadow-xs ring-2 ring-gray-300"
                                                        : "bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100"
                                                }`}
                                            >
                                                <MdCheckCircle size={14} className={isSelected ? "text-emerald-400" : "text-emerald-600"} />
                                                <span>{lvl.levelName} · SubLevel {lvl.subLevelName}</span>
                                                <span
                                                    className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                                                        isSelected ? "bg-gray-800 text-gray-300" : "bg-gray-200 text-gray-700"
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
                                    <div className="bg-white border border-gray-100 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-xs print:border-none print:shadow-none print:p-0">
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
                                                        className="border border-gray-200 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xs print:rounded-none print:border print:border-gray-300 print:shadow-none print:overflow-visible print:mb-6 print:break-inside-auto syllabus-print-section"
                                                    >
                                                        {/* Subject Header Bar */}
                                                        <div className="px-3.5 sm:px-4 py-2.5 sm:py-3 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between gap-2 print:bg-gray-100 print:border-gray-300 print:py-2 print:px-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-6 h-6 rounded-md bg-emerald-600 text-white font-bold text-xs flex items-center justify-center print:bg-gray-850">
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

                                                        {/* ── Mobile View for Previous Level ── */}
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
                                                                                        className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-gray-50 text-gray-700 px-2.5 py-1 rounded-lg border border-gray-200/90"
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

                                                        {/* ── Desktop Institutional Table View (sm+ & Print) ── */}
                                                        <div className="hidden sm:block overflow-x-auto print:block print:overflow-visible">
                                                            <table className="w-full text-left border-collapse print:w-full syllabus-print-table">
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
                                                                <tbody className="divide-y divide-gray-100 text-xs print:divide-gray-300">
                                                                    {(subj.topics || []).map((topic, ti) => {
                                                                        const prevSubCount = topic.subTopics?.length || 0;
                                                                        return (
                                                                            <tr key={topic.name || ti} className="hover:bg-emerald-50/25 transition-colors print:break-inside-avoid print:page-break-inside-avoid print:hover:bg-transparent">
                                                                                <td className="py-3.5 px-4 text-center border-r border-gray-100 font-bold text-gray-400 bg-gray-50/30 print:text-gray-900 print:bg-transparent print:border-gray-300 print:py-2">
                                                                                    <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-mono text-xs print:bg-transparent print:p-0">
                                                                                        {String(ti + 1).padStart(2, "0")}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="py-3.5 px-4 border-r border-gray-100 align-top print:border-gray-300 print:py-2">
                                                                                    <p className="font-bold text-gray-900 text-xs sm:text-sm">
                                                                                        {topic.name}
                                                                                    </p>
                                                                                    {topic.description && (
                                                                                        <p className="text-[11px] text-gray-500 mt-1 leading-relaxed print:text-gray-700">
                                                                                            {topic.description}
                                                                                        </p>
                                                                                    )}
                                                                                </td>
                                                                                <td className="py-3.5 px-4 align-top print:border-gray-300 print:py-2">
                                                                                    {prevSubCount > 0 ? (
                                                                                        <div className="flex flex-wrap gap-1.5 print:gap-1">
                                                                                            {topic.subTopics.map((st, sti) => (
                                                                                                <span
                                                                                                    key={st.name || sti}
                                                                                                    className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-gray-50 text-gray-700 px-2.5 py-1 rounded-lg border border-gray-200/80 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-900 transition print:bg-white print:border-gray-300 print:text-gray-900 print:py-0.5"
                                                                                                >
                                                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 print:bg-gray-900" />
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
                <div className="bg-white border border-gray-100 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs animate-in fade-in duration-200 print:hidden">
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
                                        className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all ${
                                            isCurrent
                                                ? "bg-orange-50/70 border-orange-200 shadow-xs"
                                                : isCompleted
                                                    ? "bg-emerald-50/50 border-emerald-200"
                                                    : "bg-gray-50/50 border-gray-200 opacity-65"
                                        }`}
                                    >
                                        <div
                                            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                                isCurrent
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
                                                className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold text-orange-600 hover:text-orange-700 shrink-0 cursor-pointer"
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

            {/* ═════════════════════════════════════════════════════════════════════ */}
            {/* OFFICIAL PRINT DOCUMENT FOOTER & SIGNATURES (Print / PDF ONLY)        */}
            {/* ═════════════════════════════════════════════════════════════════════ */}
            <div className="hidden print:block print:mt-8 print:pt-4 border-t-2 border-gray-800 syllabus-avoid-break">
                <div className="grid grid-cols-3 gap-6 text-center text-[10px] text-gray-700 pt-6">
                    <div className="border-t border-dashed border-gray-400 pt-1.5">
                        <p className="font-bold text-gray-900 uppercase">Student Signature</p>
                        <p className="text-[9px] text-gray-500 mt-0.5">Acknowledgement of Syllabus</p>
                    </div>
                    <div className="border-t border-dashed border-gray-400 pt-1.5">
                        <p className="font-bold text-gray-900 uppercase">Course Faculty / Evaluator</p>
                        <p className="text-[9px] text-gray-500 mt-0.5">Course In-charge Verification</p>
                    </div>
                    <div className="border-t border-dashed border-gray-400 pt-1.5">
                        <p className="font-bold text-gray-900 uppercase">Dean Academics / HOD</p>
                        <p className="text-[9px] text-gray-500 mt-0.5">SSISM Academic Affairs</p>
                    </div>
                </div>
                <div className="flex items-center justify-between text-[9px] text-gray-500 mt-6 pt-2 border-t border-gray-200">
                    <span>Sant Singaji Institute of Science and Management (SSISM) · Sandalpur, M.P.</span>
                    <span>Official Academic Curriculum Record · Authorized Student Copy</span>
                </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════════════ */}
            {/* PRINT OPTIMIZATION STYLESHEET                                         */}
            {/* ═════════════════════════════════════════════════════════════════════ */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 10mm 10mm 12mm 10mm;
                    }
                    .syllabus-print-table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                    }
                    .syllabus-print-table th, .syllabus-print-table td {
                        border: 1px solid #d1d5db !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    .syllabus-print-table thead {
                        display: table-header-group !important;
                    }
                    .syllabus-print-section {
                        page-break-inside: auto !important;
                        break-inside: auto !important;
                        margin-bottom: 20px !important;
                    }
                    .syllabus-avoid-break {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                }
            `}} />
        </div>
    );
}
