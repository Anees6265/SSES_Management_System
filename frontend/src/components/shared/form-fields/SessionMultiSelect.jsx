import React, { useMemo } from "react";
import { MdCheck, MdLayers } from "react-icons/md";
import { formatSessionLabel, getCurrentSession } from "../../../utils/sessionDurationHelpers";

/**
 * Reusable Session Multi-Select Pill Component.
 * Allows faculty/admin to select one or multiple academic sessions simultaneously
 * when uploading syllabus or adding tasks.
 */
const SessionMultiSelect = ({
  sessions = [],
  selectedSessionIds = [],
  onChange,
  label = "Academic Session(s)",
  hint = "Select one or multiple sessions to apply to students of those sessions.",
  disabled = false,
  className = "",
  size = "md",
  required = true
}) => {
  const currentSession = useMemo(() => getCurrentSession(sessions), [sessions]);

  // Ensure selectedSessionIds is an array
  const selectedList = useMemo(() => {
    if (Array.isArray(selectedSessionIds)) {
      return selectedSessionIds.filter(Boolean);
    }
    if (selectedSessionIds) {
      return [selectedSessionIds];
    }
    return currentSession?._id ? [currentSession._id] : [];
  }, [selectedSessionIds, currentSession]);

  const allSelected = useMemo(() => {
    if (!sessions.length || !selectedList.length) return false;
    return sessions.every((s) => selectedList.includes(s._id));
  }, [sessions, selectedList]);

  const handleToggle = (sessionId) => {
    if (disabled) return;
    let next;
    if (selectedList.includes(sessionId)) {
      // Don't allow deselecting the only remaining session if required
      if (required && selectedList.length === 1) {
        return;
      }
      next = selectedList.filter((id) => id !== sessionId);
    } else {
      next = [...selectedList, sessionId];
    }
    onChange?.(next);
  };

  const handleSelectAllToggle = () => {
    if (disabled || !sessions.length) return;
    if (allSelected) {
      // Revert to current session only (or first session)
      const fallbackId = currentSession?._id || sessions[0]?._id;
      onChange?.(fallbackId ? [fallbackId] : []);
    } else {
      // Select all sessions
      onChange?.(sessions.map((s) => s._id));
    }
  };

  const pyClass = size === "sm" ? "py-1 px-3 text-[11px]" : "py-1.5 px-3.5 text-xs";

  const selectedLabels = useMemo(() => {
    return selectedList
      .map((id) => {
        const match = sessions.find((s) => s._id === id);
        return match ? formatSessionLabel(match) : null;
      })
      .filter(Boolean);
  }, [selectedList, sessions]);

  const summaryText = useMemo(() => {
    if (selectedLabels.length === 0) return "None selected";
    if (allSelected && sessions.length > 1) return `All Sessions (${sessions.length})`;
    if (selectedLabels.length === 1) return selectedLabels[0];
    return `${selectedLabels.length} Sessions (${selectedLabels.join(", ")})`;
  }, [selectedLabels, allSelected, sessions.length]);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <MdLayers className="text-orange-500" size={14} />
          <span>{label}</span>
          {required && <span className="text-red-500">*</span>}
          <span className="text-[11px] font-semibold text-orange-600 normal-case hidden sm:inline">
            *(Multiple session select kar sakte hain)*
          </span>
        </label>

        {sessions.length > 0 && (
          <span className="text-[11px] font-bold text-orange-700 bg-orange-50 px-2.5 py-0.5 rounded-lg border border-orange-200 shadow-2xs">
            Target: <span className="font-extrabold">{summaryText}</span>
          </span>
        )}
      </div>

      {hint && (
        <p className="text-[11px] text-slate-400 font-medium">
          {hint}
        </p>
      )}

      {sessions.length === 0 ? (
        <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-800 text-xs">
          No sessions available for this department.
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-wrap pt-0.5">
          {/* Quick Toggle: All Sessions */}
          {sessions.length > 1 && (
            <button
              type="button"
              disabled={disabled}
              onClick={handleSelectAllToggle}
              className={`${pyClass} rounded-xl font-bold transition-all border flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                allSelected
                  ? "bg-slate-800 text-white border-slate-800 shadow-xs ring-2 ring-slate-800/20"
                  : "bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-slate-200/60"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {allSelected && <MdCheck size={14} className="shrink-0" />}
              <span>{allSelected ? "All Sessions Selected" : "Select All Sessions"}</span>
            </button>
          )}

          {/* Session Pills */}
          {sessions.map((session) => {
            const isSelected = selectedList.includes(session._id);
            const isCurrent = currentSession?._id === session._id;
            const formattedName = formatSessionLabel(session);

            return (
              <button
                key={session._id}
                type="button"
                disabled={disabled}
                onClick={() => handleToggle(session._id)}
                className={`${pyClass} rounded-xl font-bold transition-all border flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                  isSelected
                    ? "bg-orange-500 text-white border-orange-500 shadow-xs ring-2 ring-orange-500/20"
                    : "bg-white text-slate-700 border-slate-200 hover:border-orange-300 hover:bg-orange-50/30"
                } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {isSelected ? (
                  <MdCheck size={14} className="shrink-0" />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block shrink-0" />
                )}
                <span>{formattedName}</span>
                {isCurrent && (
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase tracking-wider ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-orange-100 text-orange-700 border border-orange-200"
                    }`}
                  >
                    Current
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SessionMultiSelect;
