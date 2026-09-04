import React, { useState } from "react";
import { useGetStudentActivityQuery } from "../../../redux/api/authApi";
import {
  MdCheckCircle, MdSchedule, MdWork, MdSchool,
  MdShare, MdCancel, MdTrendingUp, MdVerified,
  MdAccessTime, MdInfo, MdHistory, MdList
} from "react-icons/md";

const StudentPlacementTimeline = ({ student, placement }) => {
  const [activeTab, setActiveTab] = useState("journey"); // "journey" | "activity"

  const studentId = student?._id || student?.id;
  const { data: activityRes = {}, isLoading: loadingActivity } = useGetStudentActivityQuery(
    { id: studentId, page: 1, limit: 50 },
    { skip: !studentId }
  );

  const activities = activityRes.data || [];

  if (!student) return null;

  const readinessStatus = placement?.readinessStatus || "Not Ready";
  const interviews = placement?.PlacementinterviewRecord || [];
  const placedInfo = placement?.placedInfo;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">Placement Journey & Activity Audit Feed</h3>
          <p className="text-xs text-slate-500">Complete historical placement logs, interview rounds, and audit trails</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setActiveTab("journey")}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === "journey" ? "bg-white text-orange-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <MdWork size={14} /> Journey
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === "activity" ? "bg-white text-orange-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <MdHistory size={14} /> Activity Feed ({activities.length})
            </button>
          </div>

          <span className="bg-orange-50 text-orange-600 border border-orange-200 text-xs font-extrabold px-3 py-1 rounded-full uppercase">
            {readinessStatus}
          </span>
        </div>
      </div>

      {activeTab === "journey" ? (
        <div className="relative border-l-2 border-slate-200 ml-4 space-y-8 pl-6">
          {/* Milestone 1: Level 2A */}
          <div className="relative">
            <div className="absolute -left-[31px] top-0 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold ring-4 ring-white">
              ✓
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-slate-800">Level 2A Completed</h4>
              <p className="text-[11px] text-slate-500">Student cleared Level 2A academic evaluation</p>
              <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                HOD Approval ➔ Ready for Placement
              </div>
            </div>
          </div>

          {/* Milestone 2: Level 2B */}
          <div className="relative">
            <div className={`absolute -left-[31px] top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ring-4 ring-white ${
              ["Ready for Drive", "Interview", "Selected", "Placed"].includes(readinessStatus) ? "bg-emerald-500 text-white" : "bg-slate-300 text-slate-600"
            }`}>
              {["Ready for Drive", "Interview", "Selected", "Placed"].includes(readinessStatus) ? "✓" : "2B"}
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-slate-800">Level 2B Completed</h4>
              <p className="text-[11px] text-slate-500">System automatically triggered transition to Ready for Drive</p>
            </div>
          </div>

          {/* Milestone 3: Company Participation History */}
          {interviews.length > 0 ? (
            interviews.map((interview, idx) => (
              <div key={interview._id || idx} className="relative bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="absolute -left-[37px] top-4 w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold ring-4 ring-white">
                  <MdWork size={12} />
                </div>

                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">{interview.companyName || interview.companyRef?.companyName || "Company Drive"}</h4>
                    <p className="text-xs text-orange-600 font-semibold">{interview.jobProfile}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                    interview.status === "Placed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    interview.status === "Selected" ? "bg-purple-50 text-purple-700 border-purple-200" :
                    interview.status === "Cancelled" ? "bg-rose-50 text-rose-700 border-rose-200" :
                    "bg-amber-50 text-amber-700 border-amber-200"
                  }`}>
                    {interview.status}
                  </span>
                </div>

                {/* Rounds List */}
                {interview.rounds?.length > 0 && (
                  <div className="space-y-1.5 border-t border-slate-200 pt-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Interview Rounds</p>
                    {interview.rounds.map((round, rIdx) => (
                      <div key={rIdx} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-100">
                        <span className="font-bold text-slate-800">{round.roundName} ({round.mode})</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          round.result === "Cleared" || round.result === "Passed" ? "bg-emerald-50 text-emerald-600" :
                          round.result === "Failed" || round.result === "Rejected" ? "bg-rose-50 text-rose-600" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {round.status || round.result}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reschedule History if any */}
                {interview.rescheduleHistory?.length > 0 && (
                  <div className="text-[11px] text-amber-700 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200 space-y-1">
                    <p className="font-bold flex items-center gap-1"><MdAccessTime size={14} /> Reschedule History ({interview.rescheduleHistory.length}):</p>
                    {interview.rescheduleHistory.map((item, rIdx) => (
                      <div key={rIdx} className="pl-3 border-l-2 border-amber-300 text-[10px]">
                        <span>From: <strong>{new Date(item.originalDate).toLocaleDateString()} {item.originalTime}</strong></span> ➔ <span>To: <strong>{new Date(item.newDate).toLocaleDateString()} {item.newTime}</strong></span>
                        <p className="italic text-amber-800">Reason: "{item.reason || "Rescheduled"}" • By: {item.rescheduledBy}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Cancellation Reason if any */}
                {interview.status === "Cancelled" && (
                  <div className="text-[11px] text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200">
                    Cancelled: {interview.cancellationReason || "Cancelled by Placement Officer"}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-xs text-slate-400 italic">No company drive interviews scheduled yet.</div>
          )}

          {/* Milestone 4: Final Placed Confirmation */}
          {placedInfo && (
            <div className="relative bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
              <div className="absolute -left-[37px] top-4 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold ring-4 ring-white">
                ✓
              </div>
              <h4 className="text-sm font-extrabold text-emerald-900">🎉 PLACED AT {placedInfo.companyName}</h4>
              <p className="text-xs text-emerald-800 font-semibold">{placedInfo.jobProfile} • Package: {placedInfo.salary} LPA</p>
              <p className="text-[11px] text-emerald-700">Joined on: {placedInfo.joiningDate ? new Date(placedInfo.joiningDate).toLocaleDateString() : "Confirmed"}</p>
            </div>
          )}
        </div>
      ) : (
        /* Activity Audit Feed Tab */
        <div className="space-y-3">
          {loadingActivity ? (
            <p className="text-xs text-slate-400 py-4 text-center">Loading audit log feed...</p>
          ) : activities.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center italic">No placement activity audit events logged yet.</p>
          ) : (
            activities.map((act) => (
              <div key={act._id} className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-orange-100 border border-orange-200 text-orange-600 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  <MdHistory size={16} />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-extrabold text-slate-900">{act.title || act.action}</h5>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {new Date(act.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{act.description}</p>
                  {act.createdByName && (
                    <p className="text-[10px] text-slate-400 font-medium">Performed By: <strong>{act.createdByName}</strong> ({act.createdByRole || "Officer"})</p>
                  )}
                  {act.meta && Object.keys(act.meta).length > 0 && (
                    <div className="bg-white p-2 rounded-lg border border-slate-100 text-[10px] text-slate-500 font-mono flex flex-wrap gap-x-4 gap-y-1 mt-1">
                      {act.meta.company && <span>Company: <strong className="text-slate-800">{act.meta.company}</strong></span>}
                      {act.meta.round && <span>Round: <strong className="text-slate-800">{act.meta.round}</strong></span>}
                      {act.meta.result && <span>Result: <strong className="text-emerald-700">{act.meta.result}</strong></span>}
                      {act.meta.reason && <span>Reason: <strong className="text-amber-700">{act.meta.reason}</strong></span>}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default StudentPlacementTimeline;
