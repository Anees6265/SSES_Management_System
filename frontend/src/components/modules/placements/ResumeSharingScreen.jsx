import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  getAllPlacementDrives,
  getPlacementDriveById,
  shareResumesForDrive,
  updateResumeShareStatus
} from "../../../services/placementDriveService";
import Header from "../../shared/sidebar/Header";
import Loader from "../../shared/loader/Loader";
import ScheduleInterviewModal from "./ScheduleInterviewModal";
import SelectDropdown from "../../shared/form-fields/SelectDropdown";
import {
  MdShare, MdFileDownload, MdOpenInNew, MdSearch,
  MdCheckCircle, MdBusiness, MdWork, MdBadge, MdFilterList
} from "react-icons/md";

const ResumeSharingScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const driveIdParam = searchParams.get("driveId");

  const [drives, setDrives] = useState([]);
  const [selectedDriveId, setSelectedDriveId] = useState(driveIdParam || "");
  const [activeDrive, setActiveDrive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [search, setSearch] = useState("");

  // Interview modal trigger for candidate whose resume was reviewed/shortlisted
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [selectedStudentForInterview, setSelectedStudentForInterview] = useState(null);

  const fetchDrivesList = async () => {
    try {
      const res = await getAllPlacementDrives();
      if (res.data?.success) {
        const driveList = res.data.data || [];
        setDrives(driveList);
        if (!selectedDriveId && driveList.length > 0) {
          setSelectedDriveId(driveList[0]._id);
        }
      }
    } catch (err) {
      toast.error("Failed to load placement drives");
    }
  };

  const fetchDriveDetails = async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await getPlacementDriveById(id);
      if (res.data?.success) {
        setActiveDrive(res.data.data);
      }
    } catch (err) {
      toast.error("Failed to load drive candidates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivesList();
  }, []);

  useEffect(() => {
    if (selectedDriveId) {
      fetchDriveDetails(selectedDriveId);
      setSelectedStudentIds([]);
    }
  }, [selectedDriveId]);

  const shortlistedCandidates = activeDrive?.shortlistedStudents || [];
  const resumeSharedRecords = activeDrive?.resumeSharedStudents || [];

  const getShareRecord = (studentId) => {
    return resumeSharedRecords.find(r => (r.studentId?._id || r.studentId)?.toString() === studentId.toString());
  };

  const filteredCandidates = shortlistedCandidates.filter(c =>
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    (c.prkey || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.track || c.course || "").toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelectStudent = (id) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.length === filteredCandidates.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredCandidates.map(c => c._id));
    }
  };

  const handleBulkShare = async () => {
    if (selectedStudentIds.length === 0) {
      toast.error("Please select candidates to share resumes");
      return;
    }

    setSharing(true);
    try {
      await shareResumesForDrive(selectedDriveId, selectedStudentIds);
      toast.success(`Resumes shared successfully for ${selectedStudentIds.length} candidate(s)!`);
      setSelectedStudentIds([]);
      fetchDriveDetails(selectedDriveId);
    } catch (err) {
      toast.error("Failed to share resumes");
    } finally {
      setSharing(false);
    }
  };

  const handleStatusChange = async (studentId, newStatus) => {
    try {
      await updateResumeShareStatus(selectedDriveId, studentId, newStatus);
      toast.success(`Status updated to "${newStatus}"`);
      fetchDriveDetails(selectedDriveId);
    } catch (err) {
      toast.error("Failed to update resume share status");
    }
  };

  return (
    <>
      <Header
        title="Resume Sharing Portal"
        showBack={true}
        breadcrumbs={[
          { label: "Placements", path: "/placements/dashboard" },
          { label: "Placement Drives", path: "/placements/drives" },
          { label: "Resume Sharing" }
        ]}
      />

      <div className="px-6 pb-10 space-y-6">
        {/* Drive Selector Bar */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 font-bold shrink-0">
              <MdBusiness size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Select Placement Drive</label>
              <SelectDropdown
                value={selectedDriveId}
                onChange={(val) => setSelectedDriveId(val)}
                options={drives.map(d => ({
                  value: d._id,
                  label: `${d.companyName} — ${d.jobRole} (${d.packageCTC})`
                }))}
                className="w-full sm:w-80 md:w-96"
                buttonClassName="h-9 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-900 font-extrabold transition focus:outline-none hover:border-slate-350 shadow-sm"
              />
            </div>
          </div>

          {activeDrive && (
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 flex-wrap">
              <span className="bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                Shortlisted: <strong>{shortlistedCandidates.length}</strong>
              </span>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl">
                Resumes Shared: <strong>{resumeSharedRecords.length}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Action Header */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center h-10 w-full sm:w-80 bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 shadow-sm hover:border-slate-300 focus-within:border-orange-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-400/20 transition-all">
            <MdSearch className="text-slate-400 flex-shrink-0 mr-2" size={18} />
            <input
              type="text"
              placeholder="Search shortlisted candidates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-full bg-transparent border-none outline-none ring-0 focus:ring-0 focus:outline-none focus:border-none text-xs font-medium text-slate-800 placeholder-slate-400 p-0 shadow-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={toggleSelectAll}
              className="h-10 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              {selectedStudentIds.length === filteredCandidates.length && filteredCandidates.length > 0 ? "Deselect All" : "Select All"}
            </button>

            <button
              onClick={handleBulkShare}
              disabled={sharing || selectedStudentIds.length === 0}
              className="h-10 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-5 rounded-xl transition shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <MdShare size={16} /> {sharing ? "Sharing..." : `Share Selected (${selectedStudentIds.length})`}
            </button>
          </div>
        </div>

        {/* Candidate Resume Sharing Table */}
        {loading ? (
          <Loader />
        ) : filteredCandidates.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <p className="text-slate-500 font-semibold text-sm">No shortlisted candidates for this drive yet.</p>
            <p className="text-slate-400 text-xs mt-1">Shortlist candidates from the Placement Drives page first.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4 w-10">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.length === filteredCandidates.length && filteredCandidates.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-orange-500 rounded focus:ring-orange-400"
                      />
                    </th>
                    <th className="p-4">Student Candidate</th>
                    <th className="p-4">Technology Track</th>
                    <th className="p-4">Sharing Status</th>
                    <th className="p-4">Last Shared Date</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                  {filteredCandidates.map((candidate) => {
                    const isChecked = selectedStudentIds.includes(candidate._id);
                    const shareRecord = getShareRecord(candidate._id);
                    const status = shareRecord?.status || "Not Shared";
                    const sharedDate = shareRecord?.sharedAt ? new Date(shareRecord.sharedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

                    return (
                      <tr key={candidate._id} className={isChecked ? "bg-orange-50/40" : "hover:bg-slate-50"}>
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectStudent(candidate._id)}
                            className="w-4 h-4 text-orange-500 rounded focus:ring-orange-400"
                          />
                        </td>
                        <td className="p-4">
                          <div>
                            <p
                              onClick={() => navigate(`/student-profile/${candidate._id || candidate.studentId}`)}
                              className="font-extrabold text-slate-900 hover:text-orange-600 cursor-pointer transition"
                              title="Click to view student profile"
                            >
                              {candidate.firstName} {candidate.lastName}
                            </p>
                            <p className="text-[11px] text-slate-400">PRKey: {candidate.prkey || "—"}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-[11px] font-bold">
                            {candidate.technology || candidate.techno || candidate.track || "Technology Not Updated"}
                          </span>
                        </td>

                        <td className="p-4">
                          <select
                            value={status}
                            onChange={(e) => handleStatusChange(candidate._id, e.target.value)}
                            className={`px-3 py-1 rounded-full text-[11px] font-extrabold border outline-none cursor-pointer ${
                              status === "Shortlisted for Interview" ? "bg-purple-50 text-purple-700 border-purple-200" :
                              status === "Company Reviewed" ? "bg-blue-50 text-blue-700 border-blue-200" :
                              status === "Shared" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                              "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            <option value="Not Shared">Not Shared</option>
                            <option value="Shared">Shared</option>
                            <option value="Company Reviewed">Company Reviewed</option>
                            <option value="Shortlisted for Interview">Shortlisted for Interview</option>
                          </select>
                        </td>
                        <td className="p-4 text-slate-500 text-[11px]">
                          {sharedDate}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => {
                              setSelectedStudentIds([candidate._id]);
                              handleBulkShare();
                            }}
                            className="px-2.5 py-1 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1"
                          >
                            <MdShare size={12} /> Share
                          </button>
                          <button
                            onClick={() => {
                              setSelectedStudentForInterview(candidate);
                              setIsInterviewModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1"
                          >
                            Schedule Interview
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* SCHEDULE INTERVIEW MODAL */}
      {isInterviewModalOpen && selectedStudentForInterview && activeDrive && (
        <ScheduleInterviewModal
          isOpen={isInterviewModalOpen}
          onClose={() => {
            setIsInterviewModalOpen(false);
            setSelectedStudentForInterview(null);
          }}
          student={selectedStudentForInterview}
          initialCompanyName={activeDrive.companyName}
          initialJobProfile={activeDrive.jobRole}
        />
      )}
    </>
  );
};

export default ResumeSharingScreen;
