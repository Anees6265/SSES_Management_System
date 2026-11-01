import React from "react";
import { MdCheck, MdInfoOutline } from "react-icons/md";
import { getDepartmentCourses } from "../../../utils/sessionDurationHelpers";

/**
 * Reusable Course Multi-Select Pill Component.
 * Restricts courses strictly to the target department matching DB values:
 * - ITEG: BCA, ITEG Diploma
 * - MEG: BBA, B.com(CA)
 * - BEG: BSC(BT), BSC(Micro)
 * - B.Tech / SSEC: B.Tech(CS), B.Tech(AIML), B.Tech(IT)
 *
 * Supports multi-course selection or "All Courses (Common)".
 */
const CourseMultiSelect = ({
  department,
  selectedCourses = ["All"],
  onChange,
  label = "Target Course(s)",
  hint = "Select 'All Courses' to assign to everyone, or click specific course(s) (1 ya 1 se jyada).",
  disabled = false,
  className = "",
  size = "md"
}) => {
  const availableCourses = React.useMemo(() => {
    return getDepartmentCourses(department);
  }, [department]);

  const isAll = !selectedCourses || selectedCourses.length === 0 || selectedCourses.includes("All");

  const handleToggle = (course) => {
    if (disabled) return;
    if (course === "All") {
      onChange?.(["All"]);
      return;
    }

    let next;
    if (isAll) {
      next = [course];
    } else if (selectedCourses.includes(course)) {
      next = selectedCourses.filter((c) => c !== course);
      if (next.length === 0) {
        next = ["All"];
      }
    } else {
      next = [...selectedCourses, course];
    }
    onChange?.(next);
  };

  const currentSummary = isAll
    ? "All Courses (Common)"
    : selectedCourses.join(", ");

  const pyClass = size === "sm" ? "py-1 px-3 text-[11px]" : "py-1.5 px-3.5 text-xs";

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <span>{label}</span>
          <span className="text-[11px] font-semibold text-orange-600 normal-case">
            *(Kis course ke students ko assign karna hai?)*
          </span>
        </label>
        {department ? (
          <span className="text-[11px] font-bold text-orange-700 bg-orange-50 px-2.5 py-0.5 rounded-lg border border-orange-200 shadow-2xs">
            Target: <span className="font-extrabold">{currentSummary}</span>
          </span>
        ) : (
          <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 font-semibold">
            (Pehle Department Select Karein)
          </span>
        )}
      </div>

      {!department ? (
        <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-800 text-xs flex items-center gap-2">
          <MdInfoOutline size={16} className="text-amber-600 shrink-0" />
          <span>Kripya pehle <strong>Department</strong> chunein taaki us department ke courses (jaise BBA, BCA, B.Tech) yaha dikhe.</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleToggle("All")}
            className={`${pyClass} rounded-xl font-bold transition-all border flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              isAll
                ? "bg-orange-500 text-white border-orange-500 shadow-xs ring-2 ring-orange-500/20"
                : "bg-white text-slate-700 border-slate-200 hover:border-orange-300 hover:bg-orange-50/20"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isAll && <MdCheck size={14} className="shrink-0" />}
            <span>All Courses (Sabhi Students)</span>
          </button>

          {availableCourses.map((c) => {
            const isSelected = !isAll && selectedCourses.includes(c);
            return (
              <button
                key={c}
                type="button"
                disabled={disabled}
                onClick={() => handleToggle(c)}
                className={`${pyClass} rounded-xl font-bold transition-all border flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                  isSelected
                    ? "bg-orange-500 text-white border-orange-500 shadow-xs ring-2 ring-orange-500/20"
                    : "bg-white text-slate-700 border-slate-200 hover:border-orange-300 hover:bg-orange-50/20"
                } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {isSelected && <MdCheck size={14} className="shrink-0" />}
                <span>{c}</span>
              </button>
            );
          })}
        </div>
      )}

      {hint && department && (
        <p className="text-[11px] text-slate-500 font-medium">
          {hint}
        </p>
      )}
    </div>
  );
};

export default CourseMultiSelect;
