import React, { useState } from "react";
import { toast } from "react-toastify";
import { useUpdateFinalResultMutation, useConfirmPlacementMutation } from "../../../redux/api/authApi";
import { MdClose, MdFileUpload, MdBadge, MdWork, MdCheckCircle } from "react-icons/md";

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
              <select
                value={offerStatus}
                onChange={(e) => setOfferStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="Received">Offer Received</option>
                <option value="Accepted">Offer Accepted</option>
                <option value="Declined">Offer Declined</option>
              </select>
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

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updatingResult}
                className="px-5 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition shadow-sm disabled:opacity-50"
              >
                {updatingResult ? "Saving..." : offerStatus === "Accepted" ? "Next: Joining Details" : "Save Offer Status"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleJoiningSubmit} className="p-6 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Joining Decision *</label>
              <select
                value={joiningStatus}
                onChange={(e) => setJoiningStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 font-bold text-slate-800"
              >
                <option value="Joining Pending">Joining Pending</option>
                <option value="Joined">Joined (Mark PLACED)</option>
                <option value="Did Not Join">Did Not Join</option>
              </select>
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
                <select
                  value={notJoiningReason}
                  onChange={(e) => setNotJoiningReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-400"
                >
                  {NOT_JOINING_REASONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
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
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={confirmingPlacement || updatingResult}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-sm disabled:opacity-50"
              >
                {confirmingPlacement || updatingResult ? "Saving..." : joiningStatus === "Joined" ? "Confirm & Mark PLACED" : "Update Status"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default OfferJoiningModal;
