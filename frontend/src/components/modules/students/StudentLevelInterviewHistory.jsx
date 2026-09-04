/* eslint-disable react/prop-types */
import { useParams } from "react-router-dom";
import { useState, useMemo } from "react";
import { useGetAdmittedStudentsByIdQuery, useGetStudentLevelInterviewsQuery } from "../../../redux/api/authApi";
import Loader from "../../shared/loader/Loader";
import Header from "../../shared/sidebar/Header";
import InterviewSuccessModal from "./InterviewSuccessModal";

const StudentLevelInterviewHistory = () => {
    const { studentId } = useParams();
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(5);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [interviewResult, setInterviewResult] = useState(null);

    const { data: studentData } = useGetAdmittedStudentsByIdQuery(studentId);
    const { data: levelInterviewData, isLoading, error } = useGetStudentLevelInterviewsQuery(studentId);

    const interviews = levelInterviewData?.level || levelInterviewData || [];

    const { paginatedInterviews, totalPages, startIndex, endIndex } = useMemo(() => {
        const startIdx = (currentPage - 1) * itemsPerPage;
        const endIdx = startIdx + itemsPerPage;
        return {
            paginatedInterviews: interviews.slice(startIdx, endIdx),
            totalPages: Math.ceil(interviews.length / itemsPerPage),
            startIndex: startIdx + 1,
            endIndex: Math.min(endIdx, interviews.length)
        };
    }, [interviews, currentPage, itemsPerPage]);

    if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader /></div>;

    const breadcrumbs = [
        { label: 'Academics', path: '/student-detail-table' },
        { label: 'Student Progress', path: '/student-detail-table' },
        { label: 'Profile', path: `/student-profile/${studentId}` },
        { label: 'Level History' }
    ];

    if (error) {
        return (
            <>
                <Header title="Level Interview History" breadcrumbs={breadcrumbs} />
                <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">📚</div>
                    <p className="text-gray-500 text-lg mb-2">No Level Interview History Found</p>
                </div>
            </>
        );
    }

    return (
        <>
            <Header title="Level Interview History" breadcrumbs={breadcrumbs} />

            {studentData && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6 mx-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                            <span className="font-semibold text-gray-600">Student Name:</span>
                            <p className="text-gray-800">{studentData.firstName} {studentData.lastName}</p>
                        </div>
                        <div>
                            <span className="font-semibold text-gray-600">Track:</span>
                            <p className="text-gray-800">{studentData.track || 'N/A'}</p>
                        </div>
                        <div>
                            <span className="font-semibold text-gray-600">Current Level:</span>
                            <p className="text-gray-800">{studentData.currentLevel || 'N/A'}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-4 px-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-gray-700">Interview Records ({interviews.length})</h3>
                    {interviews.length > 0 && (
                        <div className="text-sm text-gray-500">Showing {startIndex}-{endIndex} of {interviews.length} records</div>
                    )}
                </div>

                {interviews.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-gray-400 text-6xl mb-4">🎓</div>
                        <p className="text-gray-500 text-lg mb-2">No Level Interview Records</p>
                        <p className="text-gray-400 text-sm">This student hasn't taken any level interviews yet.</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-4">
                            {paginatedInterviews.map((interview, index) => (
                                <InterviewCard key={interview._id || index} interview={interview} />
                            ))}
                        </div>
                        {totalPages > 1 && (
                            <PaginationComponent currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                        )}
                    </>
                )}
            </div>

            <InterviewSuccessModal
                isOpen={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                studentName={interviewResult?.studentName}
                currentLevel={interviewResult?.currentLevel}
                nextLevel={interviewResult?.nextLevel}
                result={interviewResult?.result}
            />
        </>
    );
};

const InterviewCard = ({ interview }) => {
    const getResultColor = (result) => {
        switch (result?.toLowerCase()) {
            case 'pass': return 'text-green-600 bg-green-100';
            case 'fail': return 'text-red-600 bg-red-100';
            case 'pending': return 'text-yellow-600 bg-yellow-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                        <span className="text-orange-600 font-semibold text-sm">{interview.levelNo}</span>
                    </div>
                    <div>
                        <h4 className="text-lg font-medium text-gray-800">
                            Level {interview.levelNo} Interview{interview.Topic && ` | Topic - ${interview.Topic}`}
                        </h4>
                        <p className="text-sm text-gray-500">Date: {formatDate(interview.date)}</p>
                    </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getResultColor(interview.result)}`}>
                    {interview.result || 'Pending'}
                </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Theoretical</p>
                    <p className="text-lg font-semibold text-blue-600">{interview.Theoretical_Marks || 0}/10</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Practical</p>
                    <p className="text-lg font-semibold text-green-600">{interview.Practical_Marks || 0}/10</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Communication</p>
                    <p className="text-lg font-semibold text-purple-600">{interview.Communication_Marks || 0}/10</p>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Total</p>
                    <p className="text-lg font-semibold text-orange-600">{interview.marks || 0}/30</p>
                </div>
            </div>

            {interview.remark && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Remark/Feedback:</p>
                    <p className="text-sm text-gray-800">{interview.remark}</p>
                </div>
            )}
        </div>
    );
};

const PaginationComponent = ({ currentPage, totalPages, onPageChange }) => {
    const getPageNumbers = () => {
        const pages = [];
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) { for (let i = 1; i <= 4; i++) pages.push(i); pages.push('...'); pages.push(totalPages); }
            else if (currentPage >= totalPages - 2) { pages.push(1); pages.push('...'); for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i); }
            else { pages.push(1); pages.push('...'); for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i); pages.push('...'); pages.push(totalPages); }
        }
        return pages;
    };

    return (
        <div className="flex items-center justify-center space-x-2 mt-8 py-4">
            <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:text-orange-500 hover:bg-orange-50'}`}>
                ← Previous
            </button>
            <div className="flex items-center space-x-1">
                {getPageNumbers().map((page, index) => (
                    <button key={index} onClick={() => typeof page === 'number' && onPageChange(page)} disabled={page === '...'}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${page === currentPage ? 'bg-orange-500 text-white' : page === '...' ? 'text-gray-400 cursor-default' : 'text-gray-600 hover:text-orange-500 hover:bg-orange-50'}`}>
                        {page}
                    </button>
                ))}
            </div>
            <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:text-orange-500 hover:bg-orange-50'}`}>
                Next →
            </button>
        </div>
    );
};

export default StudentLevelInterviewHistory;
