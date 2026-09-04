import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  useGetInterviewHistoryQuery,
  useUpdatePlacedInfoMutation,
  useRescheduleInterviewMutation,
  useAddInterviewRoundMutation,
  useMarkInterviewConductedMutation,
  useUpdateFinalResultMutation
} from "../../../redux/api/authApi";
import Loader from "../../shared/loader/Loader";
import { toast } from "react-toastify";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { FaCalendarAlt } from "react-icons/fa";
import PageNavbar from "../../shared/navbar/PageNavbar";
import { buttonStyles } from "../../../styles/buttonStyles";
import OrangeButton from "../../shared/sidebar/OrangeButton";

const InterviewHistory = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: historyData, isLoading, isError, error, refetch: refetchHistory } = useGetInterviewHistoryQuery(id, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const interviews = historyData?.data?.interviews || [];
  const studentName = historyData?.data?.studentName || "";

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isUpdateRoundModalOpen, setIsUpdateRoundModalOpen] = useState(false);
  const [isAddNextRoundModalOpen, setIsAddNextRoundModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isConductedModalOpen, setIsConductedModalOpen] = useState(false);

  const [nextRoundData, setNextRoundData] = useState({});
  const [nextRoundDate, setNextRoundDate] = useState("");
  const [nextRoundTime, setNextRoundTime] = useState("");
  const [nextRoundFeedback, setNextRoundFeedback] = useState("");
  const [nextRoundResult, setNextRoundResult] = useState("Pending");
  const [nextRoundMode, setNextRoundMode] = useState("Online");
  const [showNextRoundDatePicker, setShowNextRoundDatePicker] = useState(false);
  const [isNextRoundDropdownOpen, setIsNextRoundDropdownOpen] = useState(false);
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [remark, setRemark] = useState("");
  const [result, setResult] = useState("Scheduled");
  const [round, setRound] = useState("Round 1");
  const [newInterviewDate, setNewInterviewDate] = useState("");
  const [newInterviewTime, setNewInterviewTime] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [showRescheduleDatePicker, setShowRescheduleDatePicker] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCompanyHistoryModalOpen, setIsCompanyHistoryModalOpen] = useState(false);

  // Conducted Modal Form
  const [conductedDate, setConductedDate] = useState(new Date().toISOString().split("T")[0]);
  const [conductedTime, setConductedTime] = useState("");
  const [interviewer, setInterviewer] = useState("");
  const [conductedRemarks, setConductedRemarks] = useState("");

  const [updateInterviewRecord, { isLoading: isUpdating }] = useUpdatePlacedInfoMutation();
  const [rescheduleInterview, { isLoading: isRescheduling }] = useRescheduleInterviewMutation();
  const [addInterviewRound, { isLoading: isAddingRound }] = useAddInterviewRoundMutation();
  const [markInterviewConducted, { isLoading: isMarkingConducted }] = useMarkInterviewConductedMutation();
  const [updateFinalResult, { isLoading: isUpdatingResult }] = useUpdateFinalResultMutation();

  const handleUpdateClick = (interview) => {
    setSelectedInterview({ studentId: id, ...interview });
    setResult(interview.status || "Scheduled");
    setIsUpdateModalOpen(true);
  };

  const handleMarkConductedClick = (interview) => {
    setSelectedInterview({ studentId: id, ...interview });
    setConductedDate(new Date().toISOString().split("T")[0]);
    setConductedTime(interview.rounds?.[0]?.time || "10:00 AM");
    setInterviewer(interview.rounds?.[0]?.interviewer || "");
    setConductedRemarks("");
    setIsConductedModalOpen(true);
  };

  const handleMarkConductedSubmit = async () => {
    if (!window.confirm("Are you sure this interview was conducted?")) return;
    try {
      await markInterviewConducted({
        studentId: id,
        interviewId: selectedInterview._id,
        actualDate: conductedDate,
        actualTime: conductedTime,
        interviewer,
        remarks: conductedRemarks
      }).unwrap();

      toast.success("Interview marked as Conducted successfully");
      setIsConductedModalOpen(false);
      await refetchHistory();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to mark interview as conducted");
    }
  };

  const handleAddNextRoundClick = (interview) => {
    // Check if latest round is cleared
    const lastRound = interview.rounds && interview.rounds.length > 0 ? interview.rounds[interview.rounds.length - 1] : null;
    const isPrevConducted = interview.status === "Conducted" || lastRound?.status === "Conducted" || !!lastRound?.conductedDate;
    const isPrevCleared = lastRound?.result === "Cleared" || lastRound?.result === "Passed";

    if (lastRound && (!isPrevConducted || !isPrevCleared)) {
      toast.error(`Cannot schedule next round. Previous round (${lastRound.roundName}) must be Conducted and Cleared.`);
      return;
    }

    const nextRoundNumber = (interview.rounds?.length || 0) + 1;
    setNextRoundData({ baseInterview: interview, companyName: interview.company?.companyName });
    setRound(`Round ${nextRoundNumber}`);
    setNextRoundDate("");
    setNextRoundTime("");
    setNextRoundFeedback("");
    setNextRoundResult("Pending");
    setNextRoundMode("Online");
    setIsAddNextRoundModalOpen(true);
  };

  const handleAddNextRoundSubmit = async () => {
    if (!window.confirm(`Schedule ${round} for this candidate?`)) return;
    try {
      const interviewId = nextRoundData.baseInterview._id;

      let roundDate = null;
      if (nextRoundDate && nextRoundTime) {
        const [day, month, year] = nextRoundDate.split('/');
        roundDate = new Date(`${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')} ${nextRoundTime}`).toISOString();
      }

      await addInterviewRound({
        studentId: id,
        interviewId,
        roundName: round,
        date: roundDate || new Date().toISOString(),
        mode: nextRoundMode,
        feedback: nextRoundFeedback,
        result: nextRoundResult,
      }).unwrap();

      toast.success(`${round} added successfully`);
      setIsAddNextRoundModalOpen(false);
      await refetchHistory();
    } catch (err) {
      toast.error(err?.data?.message || err?.data?.error || "Failed to add round");
    }
  };

  const handleRescheduleClick = (interview) => {
    setSelectedInterview({ studentId: id, ...interview });
    const dateToUse = interview.scheduleDate || interview.interviewDate;
    if (dateToUse) {
      const date = new Date(dateToUse);
      setNewInterviewDate(date.toLocaleDateString('en-GB'));
      setNewInterviewTime(date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
    } else {
      setNewInterviewDate("");
      setNewInterviewTime("");
    }
    setRescheduleReason("");
    setIsRescheduleModalOpen(true);
  };

  const handleUpdateSubmit = async () => {
    if (!window.confirm(`Confirm result update for ${selectedInterview?.companyName || 'Interview'}?`)) return;
    try {
      await updateFinalResult({
        studentId: selectedInterview.studentId,
        interviewId: selectedInterview._id,
        roundResult: result === "Cleared" || result === "Passed" ? "Cleared" : result === "Not Cleared" || result === "Failed" || result === "Rejected" ? "Not Cleared" : result,
        statusRemark: remark,
      }).unwrap();
      toast.success("Interview result updated successfully");
      setIsUpdateModalOpen(false);
      await refetchHistory();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update interview result");
    }
  };

  const handleRescheduleSubmit = async () => {
    if (isRescheduling) return;

    try {
      let combinedDateTime = '';
      if (newInterviewDate && newInterviewTime) {
        const dateParts = newInterviewDate.split('/');
        if (dateParts.length === 3) {
          const formattedDate = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
          combinedDateTime = `${formattedDate} ${newInterviewTime}`;
        }
      }

      await rescheduleInterview({
        studentId: selectedInterview.studentId,
        interviewId: selectedInterview._id,
        newDate: combinedDateTime || newInterviewDate,
        newTime: newInterviewTime,
        originalDate: selectedInterview.scheduleDate,
        reason: rescheduleReason || "Candidate requested reschedule",
      }).unwrap();

      toast.success("Interview rescheduled successfully. Reschedule log updated.");
      setIsRescheduleModalOpen(false);
      setShowRescheduleDatePicker(false);
      await refetchHistory();
    } catch (err) {
      toast.error("Failed to reschedule interview");
    }
  };
  
  const renderBadge = (status) => {
    const base = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium";
    switch (status) {
      case "Selected":
        return <span className={`${base} bg-green-100 text-green-700`}><CheckCircle className="w-4 h-4" />Selected</span>;
      case "Passed":
        return <span className={`${base} bg-green-100 text-green-700`}><CheckCircle className="w-4 h-4" />Passed</span>;
      case "Scheduled":
        return <span className={`${base} bg-blue-100 text-blue-700`}><Clock className="w-4 h-4" />Scheduled</span>;
      case "Rescheduled":
        return <span className={`${base} bg-yellow-100 text-yellow-700`}><Clock className="w-4 h-4" />Rescheduled</span>;
      case "Ongoing":
        return <span className={`${base} bg-orange-100 text-orange-700`}><Clock className="w-4 h-4" />Ongoing</span>;
      case "RejectedByCompany":
        return <span className={`${base} bg-red-100 text-red-700`}><XCircle className="w-4 h-4" />Rejected by Company</span>;
      case "RejectedByStudent":
        return <span className={`${base} bg-red-100 text-red-700`}><XCircle className="w-4 h-4" />Rejected by Student</span>;
      case "Reject":
      case "Rejected":
      case "Failed":
        return <span className={`${base} bg-red-100 text-red-700`}><XCircle className="w-4 h-4" />Failed</span>;
      default:
        return <span className={`${base} bg-gray-100 text-gray-600`}><Clock className="w-4 h-4" />{status || "Pending"}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center text-red-600 font-semibold py-6">
        Error loading interview history: {error?.data?.message || "Something went wrong!"}
      </div>
    );
  }

  return (
    <>
      <PageNavbar 
        title="Interview History" 
        subtitle="View and manage student interview records"
        onBack={() => {
          // Get the active tab from localStorage or default to 'Ongoing Interviews'
          const activeTab = localStorage.getItem('placementActiveTab') || 'Ongoing Interviews';
          localStorage.setItem('placementActiveTab', activeTab);
          navigate('/readiness-status');
        }}
      />

      {/* Student Info */}
      {studentName && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center">
            <p className="font-bold text-gray-800">{studentName}</p>
            <button
              onClick={() => navigate(`/student-profile/${id}`)}
              className="ml-4 bg-[#FDA92D] text-white px-3 py-1 rounded text-sm hover:bg-orange-600 transition"
            >
              View Profile
            </button>
          </div>
        </div>
      )}

      {/* Interview History Cards */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Interview Records</h3>
        
        {interviews.length === 0 ? (
          <div className="bg-white rounded-xl border shadow-sm p-8 text-center">
            <div className="text-gray-400 text-6xl mb-4">📋</div>
            <h4 className="text-lg font-semibold text-gray-600 mb-2">No Interview Records</h4>
            <p className="text-gray-500">This student has attended any interviews yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {interviews.map((interview, index) => (
              <div key={interview._id || interview.id || index} 
                   className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden backdrop-blur-sm">
                
                {/* Card Header */}
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200 p-6">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      {/* Company Name with Icon */}
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-sm">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div className="flex flex-col gap-3">
                          <h4 className="text-xl font-bold text-gray-900">{interview.company?.companyName || 'Company Name'}</h4>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-600 font-medium">Job Profile:</span>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m-8 0V6a2 2 0 00-2 2v6" />
                              </svg>
                              {interview.jobProfile || interview.positionOffered || interview.position || 'Job Profile'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Technology and Round Info */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
                          <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                          </svg>
                          {interview.requiredTechnology || "Not specified"}
                        </div>
                        
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full transition-all duration-200">
                          <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-blue-600 text-xs font-semibold">
                            {interview.rounds?.length || 0} Round(s)
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* View History Button */}
                    <button 
                      className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg cursor-pointer hover:bg-orange-100 hover:border-orange-300 transition-all duration-200 group ml-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/interview-rounds-history/${id}/${interview._id}`);
                      }}
                    >
                      <svg className="w-4 h-4 text-orange-500 group-hover:text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-orange-600 text-sm font-semibold group-hover:text-orange-700">
                        View History
                      </span>
                      <svg className="w-4 h-4 text-orange-500 group-hover:text-orange-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 bg-white">
                  <div className="grid md:grid-cols-2 gap-8">
                    
                    {/* Left Column */}
                    <div className="space-y-4 md:pr-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-500 font-medium mb-1">Interview Date</p>
                          <p className="text-gray-900 font-semibold text-lg mb-3">
                            {(interview.scheduleDate || interview.interviewDate) ? new Date(interview.scheduleDate || interview.interviewDate).toLocaleDateString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            }) : "Not specified"}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRescheduleClick(interview);
                            }}
                            className="mt-2 inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-all duration-200 group"
                          >
                            <svg className="w-4 h-4 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Reschedule
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-500 font-medium mb-1">Location</p>
                          <p className="text-gray-900 font-semibold text-lg">{interview.company?.location || 'Location not specified'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4 md:pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 font-medium">Result Status</p>
                          {renderBadge(interview.status || "Pending")}
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-500 font-medium mb-2">Remarks</p>
                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <p className="text-gray-700 text-sm leading-relaxed">
                              {(() => {
                                // Get last round feedback if available
                                const lastRoundFeedback = interview.rounds && interview.rounds.length > 0 
                                  ? interview.rounds[interview.rounds.length - 1]?.feedback 
                                  : null;
                                
                                // Show statusRemark first, then last round feedback, or default message
                                return interview.statusRemark || lastRoundFeedback || "No specific remarks provided for this interview.";
                              })()} 
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Reschedule History Timeline Card */}
                  {interview.rescheduleHistory && interview.rescheduleHistory.length > 0 && (
                    <div className="mt-6 p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2">
                      <h5 className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5 uppercase tracking-wider">
                        <Clock className="w-4 h-4 text-amber-600" /> Reschedule History Log ({interview.rescheduleHistory.length})
                      </h5>
                      <div className="space-y-2 divide-y divide-amber-200/60 pt-1">
                        {interview.rescheduleHistory.map((item, rIdx) => (
                          <div key={rIdx} className="pt-2 text-xs text-amber-800 flex flex-col sm:flex-row justify-between gap-1">
                            <div>
                              <span>Original: <strong className="line-through text-amber-600">{new Date(item.originalDate).toLocaleDateString()} {item.originalTime}</strong></span>
                              <span className="mx-2">➔</span>
                              <span>New: <strong className="text-amber-900">{new Date(item.newDate).toLocaleDateString()} {item.newTime}</strong></span>
                            </div>
                            <div className="text-[11px] text-amber-700 font-medium">
                              <span>Reason: <em>"{item.reason || "Rescheduled"}"</em></span> • <span>By: {item.rescheduledBy || "Placement Officer"}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer — Strict Workflow State Machine */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                  {(() => {
                    const lastRound = interview.rounds && interview.rounds.length > 0 ? interview.rounds[interview.rounds.length - 1] : null;
                    const isConducted = interview.status === "Conducted" || lastRound?.status === "Conducted" || !!lastRound?.conductedDate;
                    const isCleared = lastRound?.result === "Cleared" || lastRound?.result === "Passed";
                    const isFailed = lastRound?.result === "Not Cleared" || lastRound?.result === "Failed" || lastRound?.result === "Rejected" || interview.status === "Not Selected";

                    return (
                      <>
                        <div className="text-xs font-bold text-slate-500 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span>Interview #{index + 1} • {lastRound ? lastRound.roundName : "Round 1"} ({interview.status})</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* Case 1: Failed / Rejected -> Process Ended */}
                          {isFailed ? (
                            <span className="px-3 py-1.5 rounded-xl bg-rose-100 text-rose-700 border border-rose-200 text-xs font-extrabold flex items-center gap-1">
                              <XCircle className="w-4 h-4" /> Process Ended — Candidate did not clear {lastRound?.roundName || "Round"}
                            </span>
                          ) : (
                            <>
                              {/* Always show Add Round button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddNextRoundClick(interview);
                                }}
                                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Add Round
                              </button>

                              {!isConducted ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkConductedClick(interview);
                                  }}
                                  className="px-3.5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                                >
                                  <CheckCircle className="w-4 h-4" /> Mark Conducted
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateClick(interview);
                                  }}
                                  className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                                >
                                  <CheckCircle className="w-4 h-4" /> Record Result
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MARK CONDUCTED DRAWER */}
      <OrangeButton
        isOpen={isConductedModalOpen}
        onClose={() => setIsConductedModalOpen(false)}
        panelTitle="Mark Interview Conducted"
        panelSubtitle="Record actual interview date, time, interviewer, and notes"
        leftBtnText="Cancel"
        rightBtnText={isMarkingConducted ? "Saving..." : "Confirm Conducted"}
        onLeftClick={() => setIsConductedModalOpen(false)}
        onRightClick={handleMarkConductedSubmit}
        drawerContent={
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Actual Conducted Date *</label>
              <input
                type="date"
                value={conductedDate}
                onChange={(e) => setConductedDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-orange-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Actual Conducted Time</label>
              <input
                type="text"
                placeholder="e.g. 10:30 AM"
                value={conductedTime}
                onChange={(e) => setConductedTime(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-orange-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Interviewer Name</label>
              <input
                type="text"
                placeholder="e.g. John Doe (Tech Lead)"
                value={interviewer}
                onChange={(e) => setInterviewer(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-orange-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Interviewer Remarks & Notes</label>
              <textarea
                rows={3}
                placeholder="Notes on candidate technical performance..."
                value={conductedRemarks}
                onChange={(e) => setConductedRemarks(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-orange-400 outline-none"
              />
            </div>
          </div>
        }
      />

      {/* Update Drawer */}
      <OrangeButton
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        panelTitle="Update Interview"
        panelSubtitle="Update interview round, remark, and status"
        leftBtnText="Cancel"
        rightBtnText={isUpdating ? "Submitting..." : "Save Changes"}
        onLeftClick={() => setIsUpdateModalOpen(false)}
        onRightClick={handleUpdateSubmit}
        drawerContent={
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Round</label>
              <input
                value={round}
                onChange={(e) => setRound(e.target.value)}
                placeholder="Enter round name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Remark</label>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                rows={3}
                placeholder="Enter remark"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
              />
            </div>

            <div className="relative">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="h-11 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-left focus:outline-none focus:border-orange-400 flex items-center justify-between cursor-pointer"
              >
                <span className={result ? 'text-gray-900' : 'text-gray-400'}>
                  {result || 'Select Status'}
                </span>
                <span className={`ml-2 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-full rounded-xl shadow-lg z-50 overflow-hidden border bg-white">
                  {['Scheduled', 'Rescheduled', 'Ongoing', 'Selected', 'RejectedByStudent', 'RejectedByCompany'].map((option) => (
                    <div
                      key={option}
                      onClick={() => {
                        setResult(option);
                        setIsDropdownOpen(false);
                      }}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-xs text-left transition"
                    >
                      {option}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        }
      />

      {/* Add Next Round Drawer */}
      <OrangeButton
        isOpen={isAddNextRoundModalOpen}
        onClose={() => setIsAddNextRoundModalOpen(false)}
        panelTitle="Add Round"
        panelSubtitle="Schedule the next round of interview"
        leftBtnText="Cancel"
        rightBtnText={isAddingRound ? "Adding..." : "Add Round"}
        onLeftClick={() => setIsAddNextRoundModalOpen(false)}
        onRightClick={handleAddNextRoundSubmit}
        drawerContent={
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Round (Auto-generated)</label>
              <input
                value={round}
                readOnly
                disabled
                className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
              />
            </div>

            <div className="relative">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Interview Date & Time</label>
              <input
                type="text"
                placeholder="Select Date & Time"
                value={`${nextRoundDate}${nextRoundTime ? ` at ${nextRoundTime}` : ''}`}
                onClick={() => setShowNextRoundDatePicker(!showNextRoundDatePicker)}
                readOnly
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 cursor-pointer pr-10"
              />
              <FaCalendarAlt className="absolute right-3 top-8 text-gray-500" />
              {showNextRoundDatePicker && (
                <DatePickerComponent
                  selectedDate={nextRoundDate}
                  selectedTime={nextRoundTime}
                  onDateTimeSelect={(date, time) => {
                    setNextRoundDate(date);
                    setNextRoundTime(time);
                    setShowNextRoundDatePicker(false);
                  }}
                  onClose={() => setShowNextRoundDatePicker(false)}
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Feedback</label>
              <textarea
                value={nextRoundFeedback}
                onChange={(e) => setNextRoundFeedback(e.target.value)}
                rows={3}
                placeholder="Enter round feedback"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
              />
            </div>

            <div className="relative">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Result</label>
              <button
                type="button"
                onClick={() => setIsNextRoundDropdownOpen(!isNextRoundDropdownOpen)}
                className="h-11 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-left focus:outline-none focus:border-orange-400 flex items-center justify-between cursor-pointer"
              >
                <span className={nextRoundResult ? 'text-gray-900' : 'text-gray-400'}>
                  {nextRoundResult || 'Select Result'}
                </span>
                <span className={`ml-2 transition-transform duration-200 ${isNextRoundDropdownOpen ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>

              {isNextRoundDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-full rounded-xl shadow-lg z-50 overflow-hidden border bg-white">
                  {['Pending', 'Passed', 'Failed'].map((option) => (
                    <div
                      key={option}
                      onClick={() => {
                        setNextRoundResult(option);
                        setIsNextRoundDropdownOpen(false);
                      }}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-xs text-left transition"
                    >
                      {option}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Mode</label>
              <button
                type="button"
                onClick={() => setIsModeDropdownOpen(!isModeDropdownOpen)}
                className="h-11 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-left focus:outline-none focus:border-orange-400 flex items-center justify-between cursor-pointer"
              >
                <span className={nextRoundMode ? 'text-gray-900' : 'text-gray-400'}>
                  {nextRoundMode || 'Select Mode'}
                </span>
                <span className={`ml-2 transition-transform duration-200 ${isModeDropdownOpen ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>

              {isModeDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-full rounded-xl shadow-lg z-50 overflow-hidden border bg-white">
                  {['Online', 'Offline', 'Hybrid'].map((option) => (
                    <div
                      key={option}
                      onClick={() => {
                        setNextRoundMode(option);
                        setIsModeDropdownOpen(false);
                      }}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-xs text-left transition"
                    >
                      {option}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        }
      />

      {/* Reschedule Drawer */}
      <OrangeButton
        isOpen={isRescheduleModalOpen}
        onClose={() => setIsRescheduleModalOpen(false)}
        panelTitle="Reschedule Interview"
        panelSubtitle="Pick a new date and time for the interview"
        leftBtnText="Cancel"
        rightBtnText={isRescheduling ? "Rescheduling..." : "Reschedule"}
        onLeftClick={() => setIsRescheduleModalOpen(false)}
        onRightClick={handleRescheduleSubmit}
        drawerContent={
          <div className="space-y-4 pt-2">
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-700 mb-1">New Interview Date & Time</label>
              <input
                type="text"
                placeholder="Select Date & Time"
                value={`${newInterviewDate}${newInterviewTime ? ` at ${newInterviewTime}` : ''}`}
                onClick={() => setShowRescheduleDatePicker(!showRescheduleDatePicker)}
                readOnly
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 cursor-pointer pr-10"
              />
              <FaCalendarAlt className="absolute right-3 top-8 text-gray-500" />
              {showRescheduleDatePicker && (
                <DatePickerComponent
                  selectedDate={newInterviewDate}
                  selectedTime={newInterviewTime}
                  onDateTimeSelect={(date, time) => {
                    setNewInterviewDate(date);
                    setNewInterviewTime(time);
                    setShowRescheduleDatePicker(false);
                  }}
                  onClose={() => setShowRescheduleDatePicker(false)}
                />
              )}
            </div>
          </div>
        }
      />
    </>
  );
};

// Custom Date Picker Component with Time Selection
const DatePickerComponent = ({ selectedDate, selectedTime, onDateTimeSelect, onClose }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [tempSelectedDate, setTempSelectedDate] = useState(selectedDate);
  const [selectedHour, setSelectedHour] = useState('09');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedPeriod, setSelectedPeriod] = useState('AM');

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const hours = Array.from({ length: 12 }, (_, i) => {
    const hour = i + 1;
    return hour.toString().padStart(2, '0');
  });

  const minutes = ['00', '15', '30', '45'];

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay();
  };

  const formatDate = (day) => {
    const date = new Date(currentYear, currentMonth, day);
    return date.toLocaleDateString('en-GB');
  };

  const handleConfirm = () => {
    const timeString = `${selectedHour}:${selectedMinute} ${selectedPeriod}`;
    onDateTimeSelect(tempSelectedDate, timeString);
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(day);
      const isSelected = tempSelectedDate === dateStr;
      const isToday = new Date().toDateString() === new Date(currentYear, currentMonth, day).toDateString();

      days.push(
        <button
          key={day}
          onClick={() => setTempSelectedDate(dateStr)}
          className={`h-8 w-8 rounded-full text-sm font-medium transition-colors ${
            isSelected
              ? 'bg-[#FDA92D] text-white'
              : isToday
              ? 'bg-orange-100 text-[#FDA92D]'
              : 'hover:bg-orange-50 text-gray-700'
          }`}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  return (
    <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3 w-72 max-h-96 overflow-y-auto sm:w-80 sm:p-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => {
            if (currentMonth === 0) {
              setCurrentMonth(11);
              setCurrentYear(currentYear - 1);
            } else {
              setCurrentMonth(currentMonth - 1);
            }
          }}
          className="p-1 hover:bg-gray-100 rounded"
        >
          ←
        </button>
        <div className="font-semibold text-gray-700">
          {months[currentMonth]} {currentYear}
        </div>
        <button
          onClick={() => {
            if (currentMonth === 11) {
              setCurrentMonth(0);
              setCurrentYear(currentYear + 1);
            } else {
              setCurrentMonth(currentMonth + 1);
            }
          }}
          className="p-1 hover:bg-gray-100 rounded"
        >
          →
        </button>
      </div>

      {/* Days of week */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} className="h-8 flex items-center justify-center text-xs font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {renderCalendar()}
      </div>

      {/* Time Selection */}
      {tempSelectedDate && (
        <div className="border-t pt-4">
          <div className="text-center mb-3">
            <h4 className="font-semibold text-gray-700">Select Time</h4>
          </div>
          
          <div className="flex justify-center items-center space-x-2 mb-4">
            <select
              value={selectedHour}
              onChange={(e) => setSelectedHour(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-[#FDA92D]"
            >
              {hours.map(hour => (
                <option key={hour} value={hour}>{hour}</option>
              ))}
            </select>
            <span className="font-bold text-gray-600">:</span>
            <select
              value={selectedMinute}
              onChange={(e) => setSelectedMinute(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-[#FDA92D]"
            >
              {minutes.map(minute => (
                <option key={minute} value={minute}>{minute}</option>
              ))}
            </select>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-[#FDA92D]"
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-end space-x-2">
        <button
          onClick={onClose}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={!tempSelectedDate}
          className="px-3 py-1 text-sm bg-[#FDA92D] text-white rounded hover:opacity-90 disabled:opacity-50"
        >
          Confirm
        </button>
      </div>
    </div>
  );
};

export default InterviewHistory;