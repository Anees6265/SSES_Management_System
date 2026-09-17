import { useState, useRef, useEffect, useMemo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { toast } from "react-toastify";
import { MdFilterList, MdCloudUpload, MdTableChart, MdSearch, MdDelete, MdWarning, MdLayers } from "react-icons/md";
import Header from "../../../shared/sidebar/Header";
import OrangeButton from "../../../shared/sidebar/OrangeButton";
import { 
    useGetSubLevelsByLevelQuery, 
    useAddSubLevelMutation, 
    useUpdateSubLevelMutation,
    useDeleteSubLevelMutation,
    useGetLevelByIdQuery,
    useGetSyllabusVersionsBySubLevelQuery, 
    useGetNewStudentsQuery, 
    useGetSubLevelProgressQuery 
} from "../../../../redux/api/authApi";
import { usePermissions } from "../../../../hooks/usePermissions";
import SearchBox from "../../../shared/search-export/SearchBox";
import ExportDropdown from "../../../shared/search-export/ExportDropdown";
import CommonTable from "../../../shared/table/CommonTable";
import InputField from "../../../shared/form-fields/InputField";
import RadioGroup from "../../../shared/form-fields/RadioGroup";
import SyllabusTab, { TasksTab, ManualTaskForm, TaskUploadDrawer, SyllabusUploadModalContent } from "./SyllabusTab";
import Loader from "../../../shared/loader/Loader";
import Avatar from "../../../shared/Avatar";

import SessionSelector from "../../../shared/SessionSelector";

const validationSchema = Yup.object({
    name: Yup.string().required("SubLevel name is required"),
    order: Yup.number().required("Order is required").positive("Must be positive"),
    isActive: Yup.boolean(),
});

const STUDENT_COLUMNS = [
    { label: "S.No",        key: "sno" },
    { 
        label: "Student",   
        key: "fullName",
        render: (row) => (
            <div className="flex items-center gap-3">
                <Avatar firstName={row.raw.firstName} lastName={row.raw.lastName} imageUrl={row.raw.image} size="sm" />
                <div>
                    <span className="font-semibold text-sm text-gray-805">{row.fullName}</span>
                    <span className="block text-[10px] text-gray-400 font-medium">PR Key: {row.prkey}</span>
                </div>
            </div>
        )
    },
    { label: "Father Name", key: "fatherName" },
    { label: "Mobile No.",  key: "mobile" },
    { label: "Course",      key: "course", render: (row) => <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">{row.course}</span> },
    { label: "Session",     key: "session", render: (row) => <span className="bg-orange-50 text-orange-600 text-xs font-semibold px-2.5 py-1 rounded-full">{row.raw.sessionId?.name || "N/A"}</span> },
    { label: "Status",      key: "status", render: (row) => (
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            row.status === "Active"    ? "bg-green-100 text-green-700" :
            row.status === "Dropped"   ? "bg-red-100 text-red-700" :
            row.status === "Placed"    ? "bg-purple-100 text-purple-700" :
            "bg-gray-100 text-gray-600"
        }`}>{row.status}</span>
    )},
];

const StudentsTab = ({ subLevel, searchTerm, setSearchTerm, onRowClick, onTaskBoard }) => {
    const [selectedSessionId, setSelectedSessionId] = useState("");
    const params = subLevel?._id 
        ? `currentSubLevelId=${subLevel._id}${selectedSessionId ? `&sessionId=${selectedSessionId}` : ''}`
        : "";
    const { data, isLoading } = useGetNewStudentsQuery(params, { skip: !subLevel?._id });

    const rawStudents = data?.data || [];
    const filteredStudents = selectedSessionId
        ? rawStudents.filter(s => (s.sessionId?._id || s.sessionId) === selectedSessionId)
        : rawStudents;

    const students = filteredStudents.map((s, i) => ({
        _id: s._id,
        sno: i + 1,
        fullName: `${s.firstName} ${s.lastName}`,
        fatherName: s.fatherName,
        mobile: s.studentMobile,
        course: s.course,
        status: s.status,
        prkey: s.prkey,
        raw: s,
    }));

    const [mobilePage, setMobilePage] = useState(1);
    const mobilePageSize = 10;

    const searchedStudents = useMemo(() => {
        if (!searchTerm.trim()) return students;
        const q = searchTerm.toLowerCase();
        return students.filter(s =>
            s.fullName?.toLowerCase().includes(q) ||
            s.fatherName?.toLowerCase().includes(q) ||
            s.mobile?.toLowerCase().includes(q) ||
            s.course?.toLowerCase().includes(q) ||
            s.prkey?.toLowerCase().includes(q)
        );
    }, [students, searchTerm]);

    const totalMobilePages = Math.max(1, Math.ceil(searchedStudents.length / mobilePageSize));
    const paginatedMobileStudents = useMemo(() => {
        const start = (mobilePage - 1) * mobilePageSize;
        return searchedStudents.slice(start, start + mobilePageSize);
    }, [searchedStudents, mobilePage]);

    useEffect(() => {
        setMobilePage(1);
    }, [searchTerm, selectedSessionId, subLevel?._id]);

    const columns = [
        ...STUDENT_COLUMNS,
        { label: "Task Board", key: "taskboard", render: (row) => (
            <button
                onClick={(e) => { e.stopPropagation(); onTaskBoard(row); }}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-orange-50 text-orange-500 hover:bg-orange-100 border border-orange-200 transition"
            >
                <MdTableChart size={14} /> Task Board
            </button>
        )},
    ];

    if (isLoading) return <Loader />;

    return (
        <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
                <div className="w-full sm:flex-1">
                    <SearchBox searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
                </div>
                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
                    <div className="flex-1 sm:flex-initial min-w-[130px]">
                        <SessionSelector
                            selectedSessionId={selectedSessionId}
                            onSessionChange={setSelectedSessionId}
                            showLabel={false}
                            required={false}
                            showAll={true}
                            includeAllOption={true}
                            allOptionLabel="All Sessions"
                        />
                    </div>
                    <ExportDropdown data={students} sectionName="students" />
                </div>
            </div>
            {searchedStudents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center bg-white border border-gray-200 rounded-xl">
                    <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center mb-3 border border-orange-100/50">
                        <MdCloudUpload size={28} className="text-orange-400" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-700 mb-1">No students found</h3>
                    <p className="text-xs text-gray-400 max-w-xs mx-auto">No students found matching the selected session or sub-level filters.</p>
                </div>
            ) : (
                <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block">
                        <CommonTable
                            key={`students-${subLevel?._id}-${selectedSessionId}`}
                            columns={columns}
                            data={students}
                            editable={false}
                            pagination={true}
                            rowsPerPage={10}
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            onRowClick={onRowClick}
                        />
                    </div>

                    {/* Mobile Cards View */}
                    <div className="md:hidden space-y-3">
                        {paginatedMobileStudents.map((st) => (
                            <div
                                key={st._id}
                                onClick={() => onRowClick?.(st)}
                                className="bg-white border border-gray-200 rounded-2xl p-3.5 shadow-2xs hover:border-orange-200 transition-all active:scale-[0.99] cursor-pointer space-y-3"
                            >
                                <div className="flex items-start justify-between gap-2.5">
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                        <Avatar firstName={st.raw.firstName} lastName={st.raw.lastName} imageUrl={st.raw.image} size="sm" />
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-bold text-sm text-gray-900 truncate leading-snug">{st.fullName}</h4>
                                            <span className="text-[10.5px] text-gray-400 font-medium block mt-0.5">
                                                PR Key: <strong className="text-gray-700 font-semibold">{st.prkey}</strong>
                                            </span>
                                        </div>
                                    </div>
                                    <span className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
                                        st.status === "Active" ? "bg-green-100 text-green-700" :
                                        st.status === "Dropped" ? "bg-red-100 text-red-700" :
                                        st.status === "Placed" ? "bg-purple-100 text-purple-700" :
                                        "bg-gray-100 text-gray-600"
                                    }`}>
                                        {st.status}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50/80 p-2.5 rounded-xl border border-gray-100">
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider block">Course</span>
                                        <span className="font-semibold text-blue-700 mt-0.5 inline-block">{st.course || "N/A"}</span>
                                    </div>
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider block">Session</span>
                                        <span className="font-semibold text-orange-600 mt-0.5 inline-block truncate">{st.raw?.sessionId?.name || "N/A"}</span>
                                    </div>
                                    {st.fatherName && (
                                        <div>
                                            <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider block">Father Name</span>
                                            <span className="font-medium text-gray-700 mt-0.5 inline-block truncate">{st.fatherName}</span>
                                        </div>
                                    )}
                                    {st.mobile && (
                                        <div>
                                            <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider block">Mobile</span>
                                            <span className="font-medium text-gray-700 mt-0.5 inline-block">{st.mobile}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs">
                                    <span className="text-[11px] font-medium text-gray-400">View details →</span>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onTaskBoard(st); }}
                                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200 transition cursor-pointer"
                                    >
                                        <MdTableChart size={13} /> Task Board
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Mobile Pagination */}
                        {totalMobilePages > 1 && (
                            <div className="flex items-center justify-between pt-3 pb-1 px-1 text-xs">
                                <span className="text-gray-500 font-medium">Page {mobilePage} of {totalMobilePages}</span>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setMobilePage(p => Math.max(1, p - 1))}
                                        disabled={mobilePage === 1}
                                        className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                                    >
                                        Prev
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMobilePage(p => Math.min(totalMobilePages, p + 1))}
                                        disabled={mobilePage === totalMobilePages}
                                        className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

const ProgressTab = ({ subLevel, onRowClick }) => {
    const [progressSearch, setProgressSearch] = useState("");
    const [mobilePage, setMobilePage] = useState(1);
    const mobilePageSize = 10;

    const { data, isLoading } = useGetSubLevelProgressQuery(subLevel?._id, { skip: !subLevel?._id });
    const progressList = data?.data || [];

    const filteredProgress = useMemo(() => {
        if (!progressSearch.trim()) return progressList;
        const q = progressSearch.toLowerCase();
        return progressList.filter(s =>
            s.name.toLowerCase().includes(q) ||
            s.prkey.toLowerCase().includes(q)
        );
    }, [progressList, progressSearch]);

    const totalMobilePages = Math.max(1, Math.ceil(filteredProgress.length / mobilePageSize));
    const paginatedMobileProgress = useMemo(() => {
        const start = (mobilePage - 1) * mobilePageSize;
        return filteredProgress.slice(start, start + mobilePageSize);
    }, [filteredProgress, mobilePage]);

    useEffect(() => {
        setMobilePage(1);
    }, [progressSearch, subLevel?._id]);

    const PROGRESS_COLUMNS = [
        {
            key: "name",
            label: "STUDENT NAME",
            render: (row) => (
                <div className="flex items-center gap-3">
                    <Avatar firstName={row.firstName} lastName={row.lastName} imageUrl={row.image} size="sm" />
                    <div className="flex flex-col">
                        <span 
                            onClick={(e) => { e.stopPropagation(); onRowClick?.(row); }}
                            className="font-bold text-sm text-orange-500 hover:text-orange-600 transition-colors cursor-pointer"
                        >
                            {row.name}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium tracking-wide uppercase mt-0.5">
                            PR Key: {row.prkey}
                        </span>
                    </div>
                </div>
            )
        },
        {
            key: "attendance",
            label: "ATTENDANCE",
            render: (row) => (
                <span className="text-sm font-semibold text-gray-700">
                    {row.attendanceRate ?? 100}%
                </span>
            )
        },
        {
            key: "taskProgress",
            label: "TASK PROGRESS",
            render: (row) => {
                const { completed = 0, total = 0, percentage = 0 } = row.taskProgress || {};
                return (
                    <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden flex-shrink-0 border border-gray-250/20">
                            <div
                                className="h-full bg-orange-500 rounded-full transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                            <strong className="text-gray-700 font-bold">{completed}/{total}</strong> ({percentage}%)
                        </span>
                    </div>
                );
            }
        },
        {
            key: "subjectProgress",
            label: "SUBJECT PROGRESS",
            render: (row) => {
                const subjects = row.subjectProgress || [];
                if (subjects.length === 0) {
                    return <span className="text-xs text-gray-400 italic">No active syllabus</span>;
                }
                return (
                    <div className="flex items-center gap-1">
                        {subjects.map((sub, sIdx) => {
                            const colorClass =
                                sub.status === "completed" ? "bg-emerald-500" :
                                sub.status === "inProgress" ? "bg-orange-500" :
                                "bg-gray-200";
                            return (
                                <div
                                    key={sIdx}
                                    className={`w-7 h-1.5 rounded-full ${colorClass} transition-all`}
                                    title={`${sub.subjectName}: ${sub.status}`}
                                />
                            );
                        })}
                    </div>
                );
            }
        },
        {
            key: "statusCounters",
            label: "STATUS COUNTERS",
            render: (row) => {
                const { pending = 0, inProgress = 0, completed = 0 } = row.statusCounters || {};
                return (
                    <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-1 text-[10.5px] font-bold rounded-lg bg-amber-50 text-amber-800 border border-amber-100/60 flex items-center justify-center">
                            {pending} Pending
                        </span>
                        <span className="px-2.5 py-1 text-[10.5px] font-bold rounded-lg bg-blue-50 text-blue-800 border border-blue-100/60 flex items-center justify-center">
                            {inProgress} In Progress
                        </span>
                        <span className="px-2.5 py-1 text-[10.5px] font-bold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100/60 flex items-center justify-center">
                            {completed} Done
                        </span>
                    </div>
                );
            }
        },
        {
            key: "currentStatus",
            label: "CURRENT STATUS",
            render: (row) => {
                const status = row.currentStatus || "Active";
                const statusCls =
                    status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    status === "Placed" ? "bg-purple-50 text-purple-700 border-purple-200" :
                    status === "Dropped" ? "bg-rose-50 text-rose-700 border-rose-200" :
                    "bg-amber-50 text-amber-700 border-amber-200";
                return (
                    <span className={`inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${statusCls}`}>
                        {status}
                    </span>
                );
            }
        }
    ];

    if (isLoading) return <Loader />;

    if (progressList.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mb-4 border border-orange-100/50">
                    <MdCloudUpload size={32} className="text-orange-400" />
                </div>
                <h3 className="text-base font-bold text-gray-705 mb-1">No progress data found</h3>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">No student progress data is available for this sub-level.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 bg-white border border-gray-150 rounded-2xl p-3 sm:p-4 shadow-2xs">
                {/* Search Box */}
                <div className="relative w-full sm:flex-1 sm:max-w-md">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 z-10">
                        <MdSearch size={18} />
                    </span>
                    <input
                        type="text"
                        value={progressSearch}
                        onChange={(e) => setProgressSearch(e.target.value)}
                        placeholder="Search by name or ID..."
                        className="w-full pr-4 py-2 text-xs sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white placeholder-gray-400 transition-all duration-200"
                        style={{ paddingLeft: '2.75rem' }}
                    />
                </div>

                {/* Filter and Export Actions */}
                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <button className="flex items-center gap-1.5 h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm font-semibold border border-gray-200 rounded-xl bg-white text-gray-600 hover:bg-gray-50 active:scale-[0.98] transition-all cursor-pointer">
                        <MdFilterList size={16} className="text-gray-400" />
                        <span>Filter</span>
                    </button>
                    <ExportDropdown data={filteredProgress} sectionName="progress" />
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block">
                <CommonTable
                    key={`progress-${subLevel?._id}`}
                    columns={PROGRESS_COLUMNS}
                    data={filteredProgress}
                    editable={false}
                    pagination={true}
                    rowsPerPage={10}
                    searchTerm={progressSearch}
                    onRowClick={onRowClick}
                />
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden space-y-3">
                {paginatedMobileProgress.map((row) => {
                    const status = row.currentStatus || "Active";
                    const statusCls =
                        status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        status === "Placed" ? "bg-purple-50 text-purple-700 border-purple-200" :
                        status === "Dropped" ? "bg-rose-50 text-rose-700 border-rose-200" :
                        "bg-amber-50 text-amber-700 border-amber-200";

                    const { completed = 0, total = 0, percentage = 0 } = row.taskProgress || {};
                    const { pending = 0, inProgress = 0 } = row.statusCounters || {};
                    const subjects = row.subjectProgress || [];

                    return (
                        <div
                            key={row._id}
                            onClick={() => onRowClick?.(row)}
                            className="bg-white border border-gray-200 rounded-2xl p-3.5 shadow-2xs hover:border-orange-200 transition-all active:scale-[0.99] cursor-pointer space-y-3"
                        >
                            <div className="flex items-start justify-between gap-2.5">
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <Avatar firstName={row.firstName} lastName={row.lastName} imageUrl={row.image} size="sm" />
                                    <div className="min-w-0 flex-1">
                                        <h4 className="font-bold text-sm text-gray-900 truncate leading-snug">{row.name}</h4>
                                        <span className="text-[10.5px] text-gray-400 font-medium block mt-0.5">
                                            PR Key: <strong className="text-gray-700 font-semibold">{row.prkey}</strong>
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusCls}`}>
                                        {status}
                                    </span>
                                    <span className="text-[10.5px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
                                        {row.attendanceRate ?? 100}% Att.
                                    </span>
                                </div>
                            </div>

                            {/* Task progress bar */}
                            <div className="space-y-1.5 bg-gray-50/80 p-2.5 rounded-xl border border-gray-100">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-[9.5px] font-bold text-gray-500 uppercase tracking-wider">Task Progress</span>
                                    <span className="text-xs font-bold text-gray-700">{completed}/{total} ({percentage}%)</span>
                                </div>
                                <div className="w-full h-2 bg-gray-200/80 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-orange-500 rounded-full transition-all duration-300"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                            </div>

                            {/* Status counters & Subjects */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-100 text-xs">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-amber-50 text-amber-800 border border-amber-100">
                                        {pending} Pending
                                    </span>
                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-blue-50 text-blue-800 border border-blue-100">
                                        {inProgress} In Prog
                                    </span>
                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100">
                                        {completed} Done
                                    </span>
                                </div>

                                {subjects.length > 0 && (
                                    <div className="flex items-center gap-1">
                                        {subjects.map((sub, sIdx) => {
                                            const colorClass =
                                                sub.status === "completed" ? "bg-emerald-500" :
                                                sub.status === "inProgress" ? "bg-orange-500" :
                                                "bg-gray-200";
                                            return (
                                                <div
                                                    key={sIdx}
                                                    className={`w-3.5 h-1.5 rounded-full ${colorClass}`}
                                                    title={`${sub.subjectName}: ${sub.status}`}
                                                />
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Mobile Pagination */}
                {totalMobilePages > 1 && (
                    <div className="flex items-center justify-between pt-3 pb-1 px-1 text-xs">
                        <span className="text-gray-500 font-medium">Page {mobilePage} of {totalMobilePages}</span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setMobilePage(p => Math.max(1, p - 1))}
                                disabled={mobilePage === 1}
                                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                            >
                                Prev
                            </button>
                            <button
                                type="button"
                                onClick={() => setMobilePage(p => Math.min(totalMobilePages, p + 1))}
                                disabled={mobilePage === totalMobilePages}
                                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const SECTION_TABS = ["Students", "Tasks", "Syllabus", "Progress"];

const TaskDrawerContent = ({ activeTab }) => {
    const [mode, setMode] = useState("manual");
    const { data: versionsData } = useGetSyllabusVersionsBySubLevelQuery(
        { subLevelId: activeTab?._id, sessionId: "" },
        { skip: !activeTab?._id }
    );
    const versions = versionsData?.data || [];
    const activeVersion = versions.find((v) => v.status === "active") || versions[0];
    const syllabusVersionId = activeVersion?._id || "";

    return (
        <div className="divide-y divide-gray-100">
            <div className="px-5 py-4">
                <div className="flex gap-1 bg-[#F8F7F5] border border-gray-200 p-1 rounded-xl">
                    <button onClick={() => setMode("manual")} className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${mode === "manual" ? "bg-white text-orange-500 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Single Task</button>
                    <button onClick={() => setMode("bulk")}   className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${mode === "bulk"   ? "bg-white text-orange-500 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Bulk Upload</button>
                </div>
                {mode === "bulk" && !syllabusVersionId && (
                    <p className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">No syllabus version found. Please upload syllabus first from Syllabus tab.</p>
                )}
            </div>
            {mode === "manual" ? (
                <ManualTaskForm subLevel={activeTab} onSaved={() => {}} showSubmitButton={false} formId="manual-task-form" />
            ) : syllabusVersionId ? (
                <div className="px-5 py-4">
                    <TaskUploadDrawer syllabusVersionId={syllabusVersionId} subjectName={activeTab?.name || ""} version={activeVersion?.version || ""} onSaved={() => {}} />
                </div>
            ) : null}
        </div>
    );
};

const ShowSubLevelTablesData = () => {
    const { hasPermission } = usePermissions();
    const location       = useLocation();
    const navigate       = useNavigate();
    const [searchParams] = useSearchParams();

    const queryLevelId   = searchParams.get("levelId");
    const querySubdeptId = searchParams.get("subdeptId");
    const queryDeptId    = searchParams.get("deptId");

    // Cache fallback
    const cachedData = (() => {
        try {
            const raw = sessionStorage.getItem("currentSublevelViewData");
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    })();

    const effectiveLevelId = 
        location.state?.level?._id || 
        queryLevelId || 
        cachedData?.level?._id;

    const { data: fetchedLevelRes, isLoading: isLevelLoading } = useGetLevelByIdQuery(effectiveLevelId, { 
        skip: !effectiveLevelId 
    });
    const fetchedLevel = fetchedLevelRes?.data;

    const level = location.state?.level || fetchedLevel || (cachedData?.level?._id === effectiveLevelId ? cachedData.level : null);

    const rawSubdept = location.state?.subdepartment || (level?.subDepartmentId && typeof level.subDepartmentId === "object" ? level.subDepartmentId : null) || (fetchedLevel?.subDepartmentId && typeof fetchedLevel.subDepartmentId === "object" ? fetchedLevel.subDepartmentId : null) || cachedData?.subdepartment;
    const subdepartment = rawSubdept;

    const departmentId   = location.state?.departmentId || queryDeptId || subdepartment?.departmentId?._id || (typeof subdepartment?.departmentId === "string" ? subdepartment?.departmentId : "") || cachedData?.departmentId || "";
    const departmentName = location.state?.departmentName || subdepartment?.departmentId?.name || cachedData?.departmentName || "Department";
    const session        = location.state?.session || location.state?.sessionName || cachedData?.session;

    useEffect(() => {
        if (level?._id) {
            try {
                sessionStorage.setItem("currentSublevelViewData", JSON.stringify({
                    level,
                    subdepartment,
                    departmentId,
                    departmentName,
                    session
                }));
            } catch {
                // ignore storage failures
            }
        }
    }, [level, subdepartment, departmentId, departmentName, session]);

    const [activeTab,           setActiveTab]           = useState(null);
    const [activeSection,       setActiveSection]       = useState("Students");
    const [searchTerm,          setSearchTerm]          = useState("");
    const [activeTaskVersionId, setActiveTaskVersionId] = useState("");
    const [subLevelToDelete,    setSubLevelToDelete]    = useState(null);

    const { data: subLevelsData, isLoading: isSubLevelsLoading } = useGetSubLevelsByLevelQuery(level?._id, { skip: !level?._id });
    const subLevels = subLevelsData?.data || [];

    const [addSubLevel] = useAddSubLevelMutation();
    const [updateSubLevel] = useUpdateSubLevelMutation();
    const [deleteSubLevel, { isLoading: isDeletingSubLevel }] = useDeleteSubLevelMutation();

    const handleTabChange = (sl) => {
        setActiveTab(sl);
        if (level?._id) {
            localStorage.setItem(`activeSubLevelId_${level._id}`, sl._id);
        }
    };

    const handleSectionChange = (tab) => {
        setActiveSection(tab);
        setSearchTerm("");
        if (level?._id) {
            localStorage.setItem(`activeSection_${level._id}`, tab);
        }
    };

    useEffect(() => {
        if (subLevels.length > 0 && level?._id) {
            const savedSubLevelId = localStorage.getItem(`activeSubLevelId_${level._id}`);
            const foundSubLevel = subLevels.find(sl => sl._id === savedSubLevelId);
            if (foundSubLevel) {
                setActiveTab(foundSubLevel);
            } else if (!activeTab || !subLevels.some(s => s._id === activeTab?._id)) {
                setActiveTab(subLevels[0]);
            }

            const savedSection = localStorage.getItem(`activeSection_${level._id}`);
            if (savedSection && ["Students", "Tasks", "Syllabus", "Progress"].includes(savedSection)) {
                setActiveSection(savedSection);
            }
        }
    }, [subLevels, level?._id]);

    const prevLen = useRef(0);
    useEffect(() => {
        if (subLevels.length > prevLen.current && prevLen.current > 0) {
            handleTabChange(subLevels[subLevels.length - 1]);
        }
        prevLen.current = subLevels.length;
    }, [subLevels.length]);

    const handleDeleteSubLevel = async () => {
        if (!subLevelToDelete) return;
        try {
            await deleteSubLevel(subLevelToDelete._id).unwrap();
            toast.success("SubLevel deleted successfully!");
            setSubLevelToDelete(null);
            const remaining = subLevels.filter(s => s._id !== subLevelToDelete._id);
            setActiveTab(remaining.length > 0 ? remaining[0] : null);
        } catch (error) {
            toast.error(error?.data?.message || "Error deleting sublevel");
        }
    };

    if (isLevelLoading && !level) return <Loader />;

    if (!effectiveLevelId || !level) {
        return (
            <div className="p-8 max-w-lg mx-auto text-center mt-12 bg-white rounded-3xl border border-gray-150 shadow-xs">
                <MdLayers size={48} className="mx-auto text-gray-300 mb-3" />
                <h2 className="text-lg font-bold text-gray-800">No Level Selected</h2>
                <p className="text-xs text-gray-500 mt-1 mb-5">Please choose a level from Department or Subdepartment management.</p>
                <button
                    onClick={() => navigate("/department-management")}
                    className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                    Go to Departments
                </button>
            </div>
        );
    }

    const breadcrumbs = [
        { label: "Departments", path: "/department-management" },
        ...(departmentId ? [{ 
            label: departmentName || "Department", 
            path: `/department-details/${departmentId}`, 
            state: { department: subdepartment?.departmentId } 
        }] : []),
        ...(subdepartment?._id ? [{ 
            label: subdepartment?.name || "Subdepartment", 
            path: `/subdepartment/${subdepartment._id}/levels`, 
            state: { subdepartment, departmentId, departmentName } 
        }] : []),
        { label: level?.name || "Level" },
    ];

    return (
        <>
            <Header
                title={level?.name || "Level"}
                badge={session || undefined}
                subtitle={subdepartment?.name ? `Sub-Department: ${subdepartment.name}` : undefined}
                showBack={true}
                breadcrumbs={breadcrumbs}
                bottomRow={
                    subLevels.length > 0 ? (
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none scroll-smooth py-1.5 px-0.5">
                            {subLevels.map((sl) => (
                                <button
                                    key={sl._id}
                                    onClick={() => handleTabChange(sl)}
                                    className={`px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 rounded-xl flex-shrink-0 cursor-pointer ${
                                        activeTab?._id === sl._id 
                                            ? "bg-orange-50 text-orange-600 border border-orange-200/90 shadow-2xs font-bold" 
                                            : "text-gray-500 hover:text-gray-800 hover:bg-gray-100/60"
                                    }`}
                                >
                                    {sl.name}
                                </button>
                            ))}
                        </div>
                    ) : null
                }
            >
                <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-start sm:justify-end">
                    {/* Action buttons — only when sublevels exist */}
                    {subLevels.length > 0 && activeSection === "Progress" && (
                        <button onClick={() => {}} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-orange-500 bg-white border border-orange-500 rounded-xl hover:bg-orange-50 active:scale-[0.98] transition flex-shrink-0 cursor-pointer">
                            <MdTableChart size={16} /> Upload Excel
                        </button>
                    )}
                    {subLevels.length > 0 && activeSection === "Syllabus" && (
                        <OrangeButton
                            buttonTitle="+ Upload Syllabus"
                            panelTitle="Upload Syllabus"
                            panelSubtitle={`Configure syllabus and tasks for ${level?.name || "Level"} · ${activeTab?.name || "SubLevel"}`}
                            maxWidth="sm:max-w-2xl lg:max-w-3xl"
                            showFooter={false}
                            drawerContent={({ closeDrawer }) => (
                                <SyllabusUploadModalContent
                                    level={level}
                                    subLevel={activeTab}
                                    onClose={closeDrawer}
                                    onSaved={() => {
                                        closeDrawer();
                                    }}
                                />
                            )}
                        />
                    )}

                    {/* Edit Active SubLevel (when sublevels exist) */}
                    {subLevels.length > 0 && activeTab && hasPermission('Page_SubLevel', 'update') && (
                        <Formik
                            key={`edit_${activeTab._id}`}
                            initialValues={{ name: activeTab.name, order: activeTab.order, isActive: activeTab.isActive }}
                            validationSchema={validationSchema}
                            onSubmit={async (values, { setSubmitting, resetForm }) => {
                                try {
                                    await updateSubLevel({
                                        subLevelId: activeTab._id,
                                        name: values.name,
                                        order: Number(values.order),
                                        levelId: level?._id,
                                        isActive: values.isActive
                                    }).unwrap();
                                    toast.success("SubLevel updated successfully!");
                                    resetForm();
                                } catch (error) {
                                    toast.error(error?.data?.message || "Error updating sublevel");
                                } finally {
                                    setSubmitting(false);
                                }
                            }}
                        >
                            {({ isSubmitting, submitForm, resetForm }) => (
                                <OrangeButton
                                    buttonTitle="Edit Sub Level"
                                    panelTitle="Edit Sub Level"
                                    customButtonClass="px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] rounded-xl transition cursor-pointer"
                                    drawerContent={
                                        <Form className="space-y-4">
                                            <InputField label="SubLevel Name" name="name" placeholder="Enter sublevel name" />
                                            <InputField label="Order" name="order" type="number" placeholder="Enter order number" />
                                            <RadioGroup label="Status" name="isActive" required={false} />
                                        </Form>
                                    }
                                    leftBtnText="Cancel"
                                    rightBtnText={isSubmitting ? "Updating..." : "Update Sub Level"}
                                    onLeftClick={resetForm}
                                    onRightClick={submitForm}
                                />
                            )}
                        </Formik>
                    )}

                    {/* Delete Active SubLevel (when sublevels exist) */}
                    {subLevels.length > 0 && activeTab && hasPermission('Page_SubLevel', 'delete') && (
                        <button
                            type="button"
                            onClick={() => setSubLevelToDelete(activeTab)}
                            title="Delete Sub Level"
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 border border-slate-200/80 hover:border-red-200 rounded-xl transition-colors cursor-pointer"
                        >
                            <MdDelete size={18} />
                        </button>
                    )}

                    {/* Add SubLevel button */}
                    {hasPermission('Page_SubLevel', 'create') && (
                        <Formik
                            initialValues={{ name: "", order: "", isActive: true }}
                            validationSchema={validationSchema}
                            onSubmit={async (values, { setSubmitting, resetForm }) => {
                                try {
                                    await addSubLevel({ name: values.name, order: Number(values.order), levelId: level?._id, isActive: values.isActive }).unwrap();
                                    toast.success("SubLevel added successfully!");
                                    resetForm();
                                } catch (error) {
                                    toast.error(error?.data?.message || "Error adding sublevel");
                                } finally {
                                    setSubmitting(false);
                                }
                            }}
                        >
                            {({ isSubmitting, submitForm, resetForm }) => (
                                <OrangeButton
                                    buttonTitle="+ Add Sub Level"
                                    panelTitle="Add New Sub Level"
                                    drawerContent={
                                        <Form className="space-y-4">
                                            <InputField label="SubLevel Name" name="name" placeholder="Enter sublevel name" />
                                            <InputField label="Order" name="order" type="number" placeholder="Enter order number" />
                                            <RadioGroup label="Status" name="isActive" required={false} />
                                        </Form>
                                    }
                                    leftBtnText="Cancel"
                                    rightBtnText={isSubmitting ? "Adding..." : "Add Sub Level"}
                                    onLeftClick={resetForm}
                                    onRightClick={submitForm}
                                />
                            )}
                        </Formik>
                    )}
                </div>
            </Header>

            <div className="px-3 sm:px-6 pb-10">

                {/* No sublevels — show prompt */}
                {subLevels.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mb-4">
                            <MdCloudUpload size={32} className="text-orange-300" />
                        </div>
                        <h3 className="text-base font-bold text-gray-700 mb-1">No Sub-Levels yet</h3>
                        <p className="text-sm text-gray-400 max-w-xs">Create at least one Sub-Level first. Students, Syllabus, and Tasks will be available after that.</p>
                    </div>
                )}

                {/* Section Tabs — only when sublevels exist */}
                {subLevels.length > 0 && (
                    <div className="w-full sm:w-fit overflow-x-auto no-scrollbar scrollbar-none bg-slate-100/90 border border-slate-200/80 p-1 sm:p-1.5 rounded-xl mt-3 sm:mt-5">
                        <div className="grid grid-cols-4 sm:flex gap-1 sm:gap-2 min-w-[280px]">
                            {SECTION_TABS.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => handleSectionChange(tab)}
                                    className={`px-2 sm:px-5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 text-center cursor-pointer ${activeSection === tab ? "bg-white text-orange-500 shadow-2xs font-semibold" : "text-gray-600 hover:text-gray-900 hover:bg-white/50"}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tab Content — only when sublevels exist */}
                {subLevels.length > 0 && (
                    <div className="py-4 sm:py-6">
                        {activeSection === "Students" && (
                            <StudentsTab
                                subLevel={activeTab}
                                searchTerm={searchTerm}
                                setSearchTerm={setSearchTerm}
                                onRowClick={(row) => navigate("/setting/student-profile", { state: { student: row.raw, level, subdepartment } })}
                                onTaskBoard={(row) => navigate("/student/task-board", { state: { student: row.raw, level, subdepartment } })}
                            />
                        )}
                        {activeSection === "Tasks" && (
                            <TasksTab level={level} subLevel={activeTab} onVersionChange={setActiveTaskVersionId} />
                        )}
                        {activeSection === "Syllabus" && (
                            <SyllabusTab level={level} subLevel={activeTab} />
                        )}
                        {activeSection === "Progress" && (
                            <ProgressTab 
                                subLevel={activeTab} 
                                onRowClick={(row) => navigate("/setting/student-profile", { state: { student: { _id: row._id }, level, subdepartment } })}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Delete SubLevel Confirmation Modal */}
            {subLevelToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl border border-gray-100 flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0 border border-red-100">
                                <MdWarning size={24} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-900">Delete Sub-Level</h3>
                                <p className="text-xs text-gray-500">This action will deactivate the sub-level.</p>
                            </div>
                        </div>

                        <p className="text-xs sm:text-sm text-gray-600 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 leading-relaxed">
                            Are you sure you want to delete <strong className="text-gray-900 uppercase">"{subLevelToDelete.name}"</strong>? Students and tasks assigned to this sub-level may be affected.
                        </p>

                        <div className="flex items-center justify-end gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={() => setSubLevelToDelete(null)}
                                disabled={isDeletingSubLevel}
                                className="px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteSubLevel}
                                disabled={isDeletingSubLevel}
                                className="px-5 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-[0.98] rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                            >
                                {isDeletingSubLevel ? "Deleting..." : "Delete Sub-Level"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ShowSubLevelTablesData;
