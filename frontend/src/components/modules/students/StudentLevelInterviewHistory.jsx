/* eslint-disable react/prop-types */
import { useParams } from "react-router-dom";
import { useState, useMemo } from "react";
import { useGetAdmittedStudentsByIdQuery, useGetStudentLevelInterviewsQuery } from "../../../redux/api/authApi";
import Loader from "../../shared/loader/Loader";
import Header from "../../shared/sidebar/Header";
import Pagination from "../../shared/pagination/Pagination";
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
                            <div className="border border-gray-200 rounded-2xl bg-gray-100 px-3 sm:px-6 py-3 sm:py-4 mt-6">
                                <Pagination
                                    totalItems={interviews.length}
                                    currentPage={currentPage}
                                    pageSize={itemsPerPage}
                                    totalPages={totalPages}
                                    onPageChange={setCurrentPage}
                                    label="entries"
                                />
                            </div>
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

export default StudentLevelInterviewHistory;

