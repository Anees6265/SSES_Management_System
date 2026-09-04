/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useGetInterviewHistoryQuery } from '../../../redux/api/authApi';
import PageNavbar from '../../shared/navbar/PageNavbar';
import Loader from '../../shared/loader/Loader';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

const InterviewHistoryDetails = () => {
  const { companyName } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get student ID from location state
  const studentId = location.state?.studentId;
  
  // Fetch fresh data from API
  const { data: historyData, isLoading, refetch } = useGetInterviewHistoryQuery(studentId, {
    refetchOnMountOrArgChange: true,
    skip: !studentId
  });
  
  // Filter rounds for this specific company only
  const interviews = historyData?.data?.interviews || [];
  const companyRounds = interviews.filter(interview => 
    interview.company?.companyName === decodeURIComponent(companyName)
  );
  
  // Get added rounds details from InterviewHistory localStorage
  const getAddedRoundsData = () => {
    try {
      const addedRoundDetails = localStorage.getItem(`addedRoundDetails_${studentId}`);
      if (addedRoundDetails) {
        const parsed = JSON.parse(addedRoundDetails);
        return parsed[decodeURIComponent(companyName)] || [];
      }
      return [];
    } catch {
      return [];
    }
  };
  
  const addedRoundsData = getAddedRoundsData();
  const addedCount = addedRoundsData.length;
  
  // Create array with original rounds + added rounds from localStorage
  const allCompanyRounds = [];
  
  // Add original rounds from API
  if (companyRounds.length > 0) {
    allCompanyRounds.push(...companyRounds);
  }
  
  // Add detailed rounds from localStorage (from InterviewHistory form)
  if (addedRoundsData.length > 0) {
    allCompanyRounds.push(...addedRoundsData);
  }
  
  const totalRoundCount = allCompanyRounds.length;
  
  // Update InterviewHistory card status based on latest round
  useEffect(() => {
    if (allCompanyRounds.length > 0) {
      const latestRound = allCompanyRounds[allCompanyRounds.length - 1];
      const companyKey = decodeURIComponent(companyName);
      
      // Store latest status for InterviewHistory to read
      const latestStatus = {
        [companyKey]: {
          latestResult: latestRound.result || 'Pending',
          totalRounds: allCompanyRounds.length,
          lastUpdated: Date.now()
        }
      };
      
      localStorage.setItem(`companyStatus_${studentId}`, JSON.stringify(latestStatus));
    }
  }, [allCompanyRounds, companyName, studentId]);
  

  
  // Refetch data when component mounts
  useEffect(() => {
    if (studentId) {
      refetch();
    }
  }, [studentId, refetch]);
  
  // Listen for localStorage changes and update parent component
  useEffect(() => {
    const handleStorageChange = () => {
      refetch();
      // Trigger parent component update
      window.dispatchEvent(new CustomEvent('interviewStatusUpdate', {
        detail: { companyName: decodeURIComponent(companyName), studentId }
      }));
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refetch, companyName, studentId]);

  const renderBadge = (status) => {
    const base = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium";
    switch (status) {
      case "Selected":
        return <span className={`${base} bg-green-100 text-green-700`}><CheckCircle className="w-4 h-4" />Selected</span>;
      case "Reject":
      case "Rejected":
        return <span className={`${base} bg-red-100 text-red-700`}><XCircle className="w-4 h-4" />Rejected</span>;
      default:
        return <span className={`${base} bg-yellow-100 text-yellow-700`}><Clock className="w-4 h-4" />Pending</span>;
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader />
      </div>
    );
  }

  return (
    <>
      <PageNavbar 
        title={`${decodeURIComponent(companyName)} - All Rounds History`}
        subtitle="View interview rounds history for this company"
        onBack={() => navigate(-1)}
      />

      <div className="p-6">
        {allCompanyRounds.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No rounds found for this company.</p>
            <p className="text-xs text-gray-400 mt-2">Debug: Company: {decodeURIComponent(companyName)}, Total Round Count: {totalRoundCount}, Added Count: {addedCount}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {allCompanyRounds.map((round, index) => (
            <div key={`${round._id || 'round'}-${index}`} className="bg-white rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
              {/* Card Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 p-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
                      <span className="text-white font-bold text-lg">{index + 1}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-xl text-gray-900 mb-1">
                        {round.round || `Round ${index + 1}`}
                      </h3>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m-8 0V6a2 2 0 00-2 2v6" />
                        </svg>
                        <p className="text-sm text-gray-600 font-medium">
                          {round.jobProfile || round.positionOffered || 'Software Developer'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    {renderBadge(round.result)}
                  </div>
                </div>
              </div>
              
              {/* Card Body */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM4 9h12v7H4V9z" />
                      </svg>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700 block mb-1">Interview Date</span>
                      <p className="text-gray-900 font-medium">
                        {(round.scheduleDate || round.interviewDate) 
                          ? new Date(round.scheduleDate || round.interviewDate).toLocaleDateString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })
                          : round.isLocallyAdded ? "To be scheduled" : "Not specified"
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700 block mb-1">Location</span>
                      <p className="text-gray-900 font-medium">
                        {round.company?.location || round.location || "Not specified"}
                      </p>
                    </div>
                  </div>
                  
                  {round.mode && (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700 block mb-1">Mode</span>
                        <p className="text-gray-900 font-medium">{round.mode}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <span className="font-semibold text-gray-700 block mb-2">Remarks & Feedback</span>
                      <p className="text-gray-800 text-sm leading-relaxed">
                        {round.remark || round.feedback || "No specific remarks or feedback provided for this interview round."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default InterviewHistoryDetails;