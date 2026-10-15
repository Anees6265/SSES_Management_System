import { useState } from "react";
import {
  useGetReadyStudentsForPlacementQuery,
  useUpdatePlacedInfoMutation,
} from "../../../redux/api/authApi";
import Loader from "../../shared/loader/Loader";
import { Dialog } from "@headlessui/react";
import { toast } from "react-toastify";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import Avatar from "../../shared/Avatar";
import OrangeButton from "../../shared/sidebar/OrangeButton";
import SelectDropdown from "../../shared/form-fields/SelectDropdown";

const PlacementRecords = () => {
  const { data = {}, refetch, isLoading } = useGetReadyStudentsForPlacementQuery(undefined, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    pollingInterval: 10000, // Poll every 15 seconds
  });
  const students = data?.data || [];

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [remark, setRemark] = useState("");
  const [result, setResult] = useState("Pending");

  const [updateInterviewRecord, { isLoading: isUpdating }] = useUpdatePlacedInfoMutation();

  const handleUpdateClick = (studentId, interview) => {
    setSelectedInterview({ studentId, ...interview });
    setRemark(interview.statusRemark || interview.remark || "");
    setResult(interview.status || interview.result || "Pending");
    setIsUpdateModalOpen(true);
  };

  const handleUpdateSubmit = async () => {
    try {
      await updateInterviewRecord({
        studentId: selectedInterview.studentId,
        interviewId: selectedInterview._id,
        status: result,
        result,
        remark,
        statusRemark: remark,
      }).unwrap();

      toast.success("Interview updated successfully");
      setIsUpdateModalOpen(false);
      await refetch();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update interview");
    }
  };

  const renderBadge = (status) => {
    const base = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium";
    switch (status) {
      case "Selected":
      case "Placed":
      case "Cleared":
      case "Passed":
        return <span className={`${base} bg-green-100 text-green-700`}><CheckCircle className="w-4 h-4" />{status}</span>;
      case "Rejected":
      case "Not Cleared":
      case "Failed":
      case "Not Selected":
        return <span className={`${base} bg-red-100 text-red-700`}><XCircle className="w-4 h-4" />{status}</span>;
      default:
        return <span className={`${base} bg-yellow-100 text-yellow-700`}><Clock className="w-4 h-4" />{status || "Pending"}</span>;
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
      <div className="space-y-6 p-4">
        {students.map((student) => {
          const interviews = student.PlacementinterviewRecord || student.interviewRecord || [];

          return (
            <div
              key={student._id}
              className="bg-white border border-gray-200 rounded-2xl shadow-md hover:shadow-lg transition duration-300 flex flex-col md:flex-row p-6 gap-6"
            >
              {/* Left Side - Profile Info */}
              <div className="flex-shrink-0 flex flex-col items-center text-center md:w-60">
                <Avatar firstName={student.firstName} lastName={student.lastName} imageUrl={student.profileImage || student.image} size="lg" />
                <h2 className="text-lg font-semibold text-gray-800 capitalize mt-2">
                  {student.firstName} {student.lastName}
                </h2>
                <p className="text-sm text-gray-500">{student.email}</p>
                <p className="text-sm text-gray-500">{student.studentMobile}</p>

                <div className="mt-4 text-sm text-gray-600 space-y-1">
                  <p><strong>Course:</strong> {student.course}</p>
                  <p><strong>Tech:</strong> {student.techno || student.technology || student.track || "—"}</p>
                  <p><strong>Status:</strong> {student.readinessStatus || "—"}</p>
                </div>
              </div>

              {/* Right Side - Interview Info */}
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-indigo-600 mb-3">📋 Interview History</h3>
                {interviews.length > 0 ? (
                  <div className="flex gap-4 overflow-x-auto scrollbar-thin scrollbar-thumb-indigo-300 pr-1">
                    {interviews.map((interview) => {
                      const companyTitle = interview.companyRef?.companyName || interview.companyName || "Company";
                      const interviewLocation = interview.companyRef?.location || interview.location || "—";
                      const dateVal = interview.scheduleDate || interview.interviewDate;
                      const formattedDate = dateVal ? new Date(dateVal).toLocaleDateString() : "—";
                      const currentStatus = interview.status || interview.result || "Pending";
                      const currentRemark = interview.statusRemark || interview.remark || "—";

                      return (
                        <div
                          key={interview._id}
                          className="min-w-[250px] bg-gray-50 rounded-lg border border-gray-200 p-4 shadow-sm flex flex-col justify-between"
                        >
                          <div className="text-sm text-gray-700 space-y-1 mb-2">
                            <p><strong>🏢 Company:</strong> {companyTitle}</p>
                            <p><strong>📅 Date:</strong> {formattedDate}</p>
                            <p><strong>📍 Location:</strong> {interviewLocation}</p>
                            <p><strong>💼 Profile:</strong> {interview.jobProfile || "—"}</p>
                            <p><strong>📝 Remark:</strong> {currentRemark}</p>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            {renderBadge(currentStatus)}
                            <button
                              className="bg-gradient-to-r from-green-500 to-green-600 text-white text-xs px-3 py-1.5 rounded hover:opacity-90 cursor-pointer"
                              onClick={() => handleUpdateClick(student._id, interview)}
                            >
                              Update
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-red-500 italic">No interviews found</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Drawer */}
      <OrangeButton
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        panelTitle="Update Interview"
        panelSubtitle="Modify interview remark and result status"
        leftBtnText="Cancel"
        rightBtnText={isUpdating ? "Submitting..." : "Save"}
        onLeftClick={() => setIsUpdateModalOpen(false)}
        onRightClick={handleUpdateSubmit}
        drawerContent={
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Remark</label>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                placeholder="Enter interview remark..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Result</label>
              <SelectDropdown
                value={result}
                onChange={(val) => setResult(val)}
                options={[
                  { value: "Pending", label: "Pending" },
                  { value: "Selected", label: "Selected" },
                  { value: "Rejected", label: "Rejected" },
                ]}
                className="w-full"
                buttonClassName="w-full bg-white border border-gray-300 hover:border-orange-400 rounded-lg px-3 py-2 text-sm text-gray-700 flex items-center justify-between gap-1.5 shadow-2xs transition cursor-pointer"
              />
            </div>
          </div>
        }
      />
    </>
  );
};

export default PlacementRecords;