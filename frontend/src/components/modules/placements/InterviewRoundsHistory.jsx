import { useParams, useNavigate } from "react-router-dom";
import { useGetInterviewHistoryQuery } from "../../../redux/api/authApi";
import Loader from "../../shared/loader/Loader";
import { CheckCircle, XCircle } from "lucide-react";
import { HiArrowNarrowLeft } from "react-icons/hi";

const InterviewRoundsHistory = () => {
  const { studentId, interviewId } = useParams();
  const navigate = useNavigate();

  const { data: historyData, isLoading, isError, error } = useGetInterviewHistoryQuery(studentId);

  const interviews = historyData?.data?.interviews || [];
  const selectedInterview = interviews.find((i) => i._id === interviewId) || {};
  
  const renderBadge = (status) => {
    const base = "inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold";
    switch (status) {
      case "Cleared":
      case "Passed":
      case "Selected":
        return <span className={`${base} bg-emerald-100 text-emerald-700`}><CheckCircle className="w-4 h-4" />Cleared</span>;
      case "Not Cleared":
      case "Failed":
      case "Reject":
      case "Rejected":
        return <span className={`${base} bg-red-100 text-red-700`}><XCircle className="w-4 h-4" />Not Cleared</span>;
      case "Conducted":
        return <span className={`${base} bg-blue-100 text-blue-700`}><CheckCircle className="w-4 h-4" />Conducted</span>;
      case "Pending":
      case "Scheduled":
      case "Rescheduled":
        return <span className={`${base} bg-amber-100 text-amber-700`}>{status || "Pending"}</span>;
      default:
        return <span className={`${base} bg-emerald-100 text-emerald-700`}><CheckCircle className="w-4 h-4" />{status || "Cleared"}</span>;
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
      <div className="min-h-screen bg-white p-6">
        <div className="text-center text-red-600 font-semibold py-6">
          Error loading interview history: {error?.data?.message || "Something went wrong!"}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Professional Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`/interview-history/${studentId}`)}
                className="group flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200 text-gray-700 hover:text-gray-900"
              >
                <HiArrowNarrowLeft className="text-lg group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-medium">Back</span>
              </button>
              <div className="h-8 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-2xl font-bold text-black">Interview Rounds History</h1>
                <p className="text-sm text-black">Detailed rounds breakdown for {selectedInterview.company?.companyName}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        {/* Student & Company Info Card */}
        <div className="bg-white rounded-2xl overflow-hidden mb-8" style={{ boxShadow: '0 0 15px 3px rgba(0, 0, 0, 0.06)' }}>
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 px-6 py-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    {selectedInterview.company?.companyName || 'Company Name'}
                  </h2>
                  <p className="text-gray-600 mb-2">
                    Interview with {historyData?.data?.studentName || ""}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m-8 0V6a2 2 0 00-2 2v6" />
                      </svg>
                      {selectedInterview.jobProfile || 'Job Profile'}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {selectedInterview.company?.location || 'Location'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500 mb-1">Interview Date</div>
                <div className="text-lg font-semibold text-gray-900">
                  {selectedInterview.scheduleDate ? 
                    new Date(selectedInterview.scheduleDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    }) : "Not specified"
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Interview Rounds Section */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 0 15px 3px rgba(0, 0, 0, 0.06)' }}>
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Interview Rounds</h3>
                  <p className="text-sm text-gray-600">Complete breakdown of all interview rounds</p>
                </div>
              </div>
              <span className="px-4 py-2 bg-orange-100 text-orange-700 text-sm rounded-full font-medium">
                {selectedInterview.rounds?.length || 0} rounds conducted
              </span>
            </div>
          </div>

          <div className="p-6">
            {selectedInterview.rounds && selectedInterview.rounds.length > 0 ? (
              <div className="space-y-6">
                {selectedInterview.rounds.map((round, roundIndex) => (
                  <div key={roundIndex} className="bg-gray-50 border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all duration-200">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white border-2 border-orange-200 rounded-lg flex items-center justify-center font-bold text-orange-600">
                          {roundIndex + 1}
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-1">
                            {round.roundName || `Round ${roundIndex + 1}`}
                          </h4>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 4V7m6 0v4M6 20h12a2 2 0 002-2V10a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              {round.date ? new Date(round.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              }) : "Date not specified"}
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span className="px-2 py-1 bg-white text-gray-700 rounded text-xs border">
                                {round.mode || "Offline"}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {renderBadge(round.result || round.status)}
                      </div>
                    </div>
                    
                    {round.feedback && (
                      <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900 mb-1">Round Feedback</h5>
                            <p className="text-gray-700 text-sm leading-relaxed">{round.feedback}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">No Rounds Conducted</h3>
                <p className="text-gray-500">This interview session has no rounds recorded yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Overall Interview Remarks */}
        {(selectedInterview.statusRemark || selectedInterview.remark) && (
          <div className="mt-8 bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 0 15px 3px rgba(0, 0, 0, 0.06)' }}>
            <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Overall Interview Remarks</h3>
                  <p className="text-sm text-gray-600">General feedback and observations</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 leading-relaxed">
                  {selectedInterview.statusRemark || selectedInterview.remark}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewRoundsHistory;