import React, { useState } from "react";
import { toast } from "react-toastify";
import { useUpdateFinalResultMutation, useConfirmPlacementMutation } from "../../../redux/api/authApi";
import { MdClose, MdFileUpload, MdBadge, MdWork, MdCheckCircle, MdCheck, MdArrowBack } from "react-icons/md";
import SelectDropdown from "../../shared/form-fields/SelectDropdown";

const NOT_JOINING_REASONS = [
  "Higher Studies",
  "Better Offer",
  "Salary Package",
  "Location / Relocation",
  "Family Reason",
  "Personal Reason",
  "Company Related",
  "Other"
];

const OfferJoiningModal = ({ isOpen, onClose, student, interview, onSuccess }) => {
  const [updateFinalResult, { isLoading: updatingResult }] = useUpdateFinalResultMutation();
  const [confirmPlacement, { isLoading: confirmingPlacement }] = useConfirmPlacementMutation();

  const [step, setStep] = useState(interview?.status === "Selected" ? "offer" : "joining");

  // Offer Form
  const [offerStatus, setOfferStatus] = useState("Received");
  const [salary, setSalary] = useState(interview?.salary || "");
  const [offerDate, setOfferDate] = useState(new Date().toISOString().split("T")[0]);
  const [offerLetter, setOfferLetter] = useState(null);

  // Joining Form
  const [joiningStatus, setJoiningStatus] = useState("Joining Pending");
  const [joiningDate, setJoiningDate] = useState("");
  const [notJoiningReason, setNotJoiningReason] = useState("Better Offer");
  const [remarks, setRemarks] = useState("");

  if (!isOpen || !student || !interview) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => setOfferLetter(event.target.result);
    reader.readAsDataURL(file);
  };

  const handleOfferSubmit = async (e) => {
    e.preventDefault();
    try {
      if (offerStatus === "Accepted") {
        setStep("joining");
        toast.info("Offer Accepted. Proceed to Joining Details.");
      } else {
        await updateFinalResult({
          studentId: student._id || student.studentId,
          interviewId: interview._id,
          status: offerStatus === "Declined" ? "Offer Declined" : "Offer Received",
          statusRemark: remarks
        }).unwrap();
        toast.success(`Offer status updated to ${offerStatus}`);
        onSuccess?.();
        onClose();
      }
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update offer status");
    }
  };

  const handleJoiningSubmit = async (e) => {
    e.preventDefault();
    try {
      const studentId = student._id || student.studentId;
      const companyName = interview.companyRef?.companyName || interview.companyName || "Company";

      if (joiningStatus === "Joined") {
        await confirmPlacement({
          studentId,
          companyName,
          salary: Number(salary) || 0,
          location: interview.location || "Office",
          jobProfile: interview.jobProfile || "Software Engineer",
          jobType: "Full-Time",
          joiningDate: joiningDate || new Date().toISOString(),
          offerLetter
        }).unwrap();

        await updateFinalResult({
          studentId,
          interviewId: interview._id,
          status: "Placed",
          salary: Number(salary) || 0,
          joiningDate,
          statusRemark: remarks
        }).unwrap();

        toast.success(`🎉 Congratulations! ${student.firstName} is now marked as PLACED at ${companyName}!`);
      } else {
        await updateFinalResult({
          studentId,
          interviewId: interview._id,
          status: "Did Not Join",
          notJoiningReason,
          notJoiningRemarks: remarks,
          statusRemark: `Did Not Join: ${notJoiningReason}. ${remarks}`
        }).unwrap();

        toast.warning(`Status updated to "Did Not Join". Candidate remains available for other placement drives.`);
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update joining status");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              {step === "offer" ? "Offer Management" : "Joining Management & Placement"}
            </h2>
            <p className="text-xs text-orange-600 font-semibold">
              {student.firstName} {student.lastName} • {interview.companyRef?.companyName || interview.companyName}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <MdClose size={20} />
          </button>
        </div>

        {step === "offer" ? (
          <form onSubmit={handleOfferSubmit} className="p-6 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Offer Status *</label>
              <SelectDropdown
                value={offerStatus}
                onChange={(val) => setOfferStatus(val)}
                options={[
                  { value: "Received", label: "Offer Received" },
                  { value: "Accepted", label: "Offer Accepted" },
                  { value: "Declined", label: "Offer Declined" },
                ]}
                className="w-full"
                buttonClassName="w-full px-3 py-2 text-xs border border-slate-200 hover:border-orange-400 bg-white rounded-xl outline-none font-medium text-slate-800 flex items-center justify-between gap-1.5 shadow-2xs transition cursor-pointer"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Offered Package (Salary CTC)</label>
              <input
                type="text"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="e.g. 6.5 LPA"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Offer Date</label>
              <input
                type="date"
                value={offerDate}
                onChange={(e) => setOfferDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Upload Official Offer Letter (PDF / Image)</label>
              <input
                type="file"
                accept=".pdf,image/*"
                onChange={handleFileUpload}
                className="text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Remarks</label>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Additional offer details or notes..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 border border-gray-200 text-gray-700 bg-white hover:bg-slate-50 hover:border-gray-400 font-bold tracking-wider uppercase text-xs rounded-xl transition-all duration-200 active:scale-[0.97] shadow-2xs hover:shadow-xs cursor-pointer flex items-center justify-center text-center"
              >
                <span>Cancel</span>
              </button>
              <button
                type="submit"
                disabled={updatingResult}
                className="w-full sm:w-auto px-5 py-2 text-xs font-bold tracking-wider uppercase text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 rounded-xl transition-all duration-200 active:scale-[0.97] shadow-xs hover:shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 text-center"
              >
                <MdCheck size={15} />
                <span>{updatingResult ? "Saving..." : offerStatus === "Accepted" ? "Next: Joining Details" : "Save Offer Status"}</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleJoiningSubmit} className="p-6 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Joining Decision *</label>
              <SelectDropdown
                value={joiningStatus}
                onChange={(val) => setJoiningStatus(val)}
                options={[
                  { value: "Joining Pending", label: "Joining Pending" },
                  { value: "Joined", label: "Joined (Mark PLACED)" },
                  { value: "Did Not Join", label: "Did Not Join" },
                ]}
                className="w-full"
                buttonClassName="w-full px-3 py-2 text-xs border border-slate-200 hover:border-orange-400 bg-white rounded-xl outline-none font-bold text-slate-800 flex items-center justify-between gap-1.5 shadow-2xs transition cursor-pointer"
              />
            </div>

            {joiningStatus === "Joined" && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Joining Date *</label>
                <input
                  type="date"
                  required
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            )}

            {joiningStatus === "Did Not Join" && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Reason for Not Joining *</label>
                <SelectDropdown
                  value={notJoiningReason}
                  onChange={(val) => setNotJoiningReason(val)}
                  options={NOT_JOINING_REASONS.map((r) => ({ value: r, label: r }))}
                  className="w-full"
                  buttonClassName="w-full px-3 py-2 text-xs border border-slate-200 hover:border-orange-400 bg-white rounded-xl outline-none font-medium text-slate-800 flex items-center justify-between gap-1.5 shadow-2xs transition cursor-pointer"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Remarks & Details</label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Notes on joining / reason details..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep("offer")}
                className="px-4 py-2 border border-gray-200 text-gray-700 bg-white hover:bg-slate-50 hover:border-gray-400 font-bold tracking-wider uppercase text-xs rounded-xl transition-all duration-200 active:scale-[0.97] shadow-2xs hover:shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <MdArrowBack size={15} />
                <span>Back</span>
              </button>
              <button
                type="submit"
                disabled={confirmingPlacement || updatingResult}
                className="px-5 py-2 text-xs font-bold tracking-wider uppercase text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl transition-all duration-200 active:scale-[0.97] shadow-xs hover:shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <MdCheckCircle size={15} />
                <span>{confirmingPlacement || updatingResult ? "Saving..." : joiningStatus === "Joined" ? "Confirm & Mark PLACED" : "Update Status"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default OfferJoiningModal;
