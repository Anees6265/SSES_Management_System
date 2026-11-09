import React, { useState, useMemo } from "react";
import { MdSearch, MdCheck, MdPerson, MdGroups, MdOutlineCheckBox, MdOutlineCheckBoxOutlineBlank } from "react-icons/md";
import { useGetSubLevelProgressQuery } from "../../../redux/api/authApi";

const StudentAssignPicker = ({
  subLevelId,
  selectedCourses = ["All"],
  assignTarget = "all", // "all" | "specific"
  onAssignTargetChange,
  selectedStudentIds = [],
  onSelectedStudentIdsChange,
  label = "Assign Tasks To",
  className = ""
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: progressData, isLoading: isStudentsLoading } = useGetSubLevelProgressQuery(
    subLevelId,
    { skip: !subLevelId }
  );

  const rawStudents = useMemo(() => {
    return Array.isArray(progressData?.data) ? progressData.data : [];
  }, [progressData]);

  // Filter students by selected course(s) if applicable
  const eligibleStudents = useMemo(() => {
    if (!rawStudents.length) return [];
    if (!selectedCourses || selectedCourses.includes("All")) {
      return rawStudents;
    }
    const lowerCourses = selectedCourses.map(c => String(c).trim().toLowerCase());
    return rawStudents.filter(s => {
      const stdCourse = String(s.course || "").trim().toLowerCase();
      return lowerCourses.some(lc => stdCourse.includes(lc) || lc.includes(stdCourse));
    });
  }, [rawStudents, selectedCourses]);

  // Filter by search query
  const filteredStudents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return eligibleStudents;
    return eligibleStudents.filter(s => {
      const name = `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase();
      const prkey = String(s.prkey || "").toLowerCase();
      const studentId = String(s.studentId || "").toLowerCase();
      const course = String(s.course || "").toLowerCase();
      return name.includes(q) || prkey.includes(q) || studentId.includes(q) || course.includes(q);
    });
  }, [eligibleStudents, searchTerm]);

  const allFilteredSelected = useMemo(() => {
    if (!filteredStudents.length) return false;
    return filteredStudents.every(s => selectedStudentIds.includes(String(s._id)));
  }, [filteredStudents, selectedStudentIds]);

  const handleToggleStudent = (id) => {
    const idStr = String(id);
    if (selectedStudentIds.includes(idStr)) {
      onSelectedStudentIdsChange(selectedStudentIds.filter(item => item !== idStr));
    } else {
      onSelectedStudentIdsChange([...selectedStudentIds, idStr]);
    }
  };

  const handleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      const filteredIdSet = new Set(filteredStudents.map(s => String(s._id)));
      onSelectedStudentIdsChange(selectedStudentIds.filter(id => !filteredIdSet.has(id)));
    } else {
      const newIds = new Set(selectedStudentIds);
      filteredStudents.forEach(s => newIds.add(String(s._id)));
      onSelectedStudentIdsChange(Array.from(newIds));
    }
  };

  const handleClearAll = () => {
    onSelectedStudentIdsChange([]);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
        <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <span>{label}</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 normal-case tracking-normal">
            {assignTarget === "all" ? "Whole Level" : `${selectedStudentIds.length} Selected`}
          </span>
        </label>
      </div>

      {/* Target Audience Tabs */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100/80 rounded-xl border border-slate-200/80">
        <button
          type="button"
          onClick={() => {
            onAssignTargetChange("all");
          }}
          className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            assignTarget === "all"
              ? "bg-white text-orange-600 shadow-2xs border border-orange-100"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <MdGroups size={16} />
          <span>All Students</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onAssignTargetChange("specific");
          }}
          className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            assignTarget === "specific"
              ? "bg-white text-orange-600 shadow-2xs border border-orange-100"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <MdPerson size={16} />
          <span>Specific Students</span>
        </button>
      </div>

      {/* Specific Students Selection Panel */}
      {assignTarget === "specific" && (
        <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-3 sm:p-4 space-y-3 animate-in fade-in duration-200">
          {!subLevelId ? (
            <div className="text-center py-4 text-xs font-semibold text-slate-500">
              Please select a Level & Sub-Level above to view students.
            </div>
          ) : isStudentsLoading ? (
            <div className="flex items-center justify-center py-6 gap-2 text-xs font-bold text-slate-500">
              <span className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></span>
              <span>Loading students...</span>
            </div>
          ) : eligibleStudents.length === 0 ? (
            <div className="text-center py-4 text-xs font-semibold text-slate-500">
              No active students found in this sub-level matching the selected course(s).
            </div>
          ) : (
            <>
              {/* Search & Bulk Select Controls */}
              <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
                <div className="relative w-full sm:flex-1">
                  <MdSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by student name, ID, or course..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-700"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  >
                    {allFilteredSelected ? "Deselect Filtered" : "Select All"}
                  </button>

                  {selectedStudentIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {/* Status Header */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 font-semibold">
                <span>
                  Showing <strong className="text-slate-800">{filteredStudents.length}</strong> student{filteredStudents.length !== 1 ? "s" : ""}
                </span>
                <span className={selectedStudentIds.length > 0 ? "text-orange-600 font-bold" : "text-slate-400"}>
                  {selectedStudentIds.length} of {eligibleStudents.length} selected
                </span>
              </div>

              {/* Students Checkbox List */}
              <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white shadow-2xs">
                {filteredStudents.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 font-medium">
                    No students matching "{searchTerm}"
                  </div>
                ) : (
                  filteredStudents.map((student) => {
                    const isSelected = selectedStudentIds.includes(String(student._id));
                    const fullName = `${student.firstName || ""} ${student.lastName || ""}`.trim() || "Student";
                    const identifier = student.prkey || student.studentId || "";

                    return (
                      <div
                        key={student._id}
                        onClick={() => handleToggleStudent(student._id)}
                        className={`px-3 py-2 flex items-center justify-between gap-3 cursor-pointer transition select-none ${
                          isSelected ? "bg-orange-50/60 hover:bg-orange-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            className={`p-0.5 rounded transition ${isSelected ? "text-orange-600" : "text-slate-400"}`}
                          >
                            {isSelected ? (
                              <MdOutlineCheckBox size={18} />
                            ) : (
                              <MdOutlineCheckBoxOutlineBlank size={18} />
                            )}
                          </button>

                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                            {fullName.charAt(0).toUpperCase()}
                          </div>

                          <div className="min-w-0 flex flex-col">
                            <span className={`text-xs font-bold truncate ${isSelected ? "text-orange-950" : "text-slate-800"}`}>
                              {fullName}
                            </span>
                            {identifier && (
                              <span className="text-[10px] text-slate-400 font-mono truncate">
                                {identifier}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {student.course && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {student.course}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {selectedStudentIds.length === 0 && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 font-medium">
                  ⚠️ Please select at least one student, or switch back to <strong>All Students</strong> above.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentAssignPicker;

