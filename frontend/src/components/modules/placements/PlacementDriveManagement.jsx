import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  getAllPlacementDrives,
  createPlacementDrive,
  shortlistStudentsForDrive,
  shareResumesForDrive
} from "../../../services/placementDriveService";
import { useGetNewReadyStudentsQuery, useGetAllCompaniesQuery } from "../../../redux/api/authApi";
import AddCompanyModal from "./AddCompanyModal";
import Header from "../../shared/sidebar/Header";
import Loader from "../../shared/loader/Loader";
import CommonTable from "../../shared/table/CommonTable";
import OrangeButton from "../../shared/OrangeButton";
import SelectDropdown from "../../shared/form-fields/SelectDropdown";
import {
  MdAdd, MdSearch, MdBusiness, MdWork, MdLocationOn,
  MdCalendarToday, MdFileUpload, MdBadge, MdCheckCircle,
  MdShare, MdPeople, MdFolderSpecial, MdClose
} from "react-icons/md";

const PlacementDriveManagement = () => {
  const navigate = useNavigate();
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isAddCompanyModalOpen, setAddCompanyModalOpen] = useState(false);

  // Fetch Active Master Companies for Drive Dropdown
  const { data: companiesRes, refetch: refetchCompanies } = useGetAllCompaniesQuery({ status: "Active" });
  const activeCompanies = companiesRes?.data || companiesRes || [];
  const [selectedDrive, setSelectedDrive] = useState(null);
  const [isShortlistModalOpen, setShortlistModalOpen] = useState(false);

  // Form State for New Drive
  const [form, setForm] = useState({
    companyName: "",
    jobRole: "",
    technology: "",
    packageCTC: "",
    jobLocation: "",
    workMode: "WFO",
    driveDate: "",
    applicationDeadline: "",
    jobDescription: "",
    vacancies: 1,
    requiredSkills: "",
    minimumCriteria: ""
  });
  const [submitting, setSubmitting] = useState(false);

  // Candidates for shortlisting
  const { data: readyRes = {} } = useGetNewReadyStudentsQuery();
  const readyStudents = readyRes.data || [];

  const fetchDrives = async () => {
    setLoading(true);
    try {
      const res = await getAllPlacementDrives();
      if (res.data?.success) {
        setDrives(res.data.data || []);
      }
    } catch (err) {
      toast.error("Failed to load placement drives");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrives();
  }, []);

  const handleCreateDrive = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSubmitting(true);
    try {
      await createPlacementDrive(form);
      toast.success("Placement drive created successfully!");
      setCreateModalOpen(false);
      setForm({
        companyName: "",
        jobRole: "",
        technology: "",
        packageCTC: "",
        jobLocation: "",
        workMode: "WFO",
        driveDate: "",
        applicationDeadline: "",
        jobDescription: "",
        vacancies: 1,
        requiredSkills: "",
        minimumCriteria: ""
      });
      fetchDrives();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create placement drive");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered drives
  const filteredDrives = drives.filter(d =>
    d.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.jobRole.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.packageCTC.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Header
        title="Placement Drives"
        showBack={true}
        breadcrumbs={[
          { label: "Placements", path: "/placements/dashboard" },
          { label: "Drives & Company Management" }
        ]}
      />

      <div className="px-6 pb-10 space-y-6">
        {/* Top Control Bar */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center h-10 w-full sm:w-80 bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 shadow-sm hover:border-slate-300 focus-within:border-orange-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-400/20 transition-all">
            <MdSearch className="text-slate-400 flex-shrink-0 mr-2" size={18} />
            <input
              type="text"
              placeholder="Search company or job role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-full bg-transparent border-none outline-none ring-0 focus:ring-0 focus:outline-none focus:border-none text-xs font-medium text-slate-800 placeholder-slate-400 p-0 shadow-none"
            />
          </div>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="w-full sm:w-auto h-10 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-5 rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <MdAdd size={18} /> Create Placement Drive
          </button>
        </div>

        {/* Drive Cards Grid */}
        {loading ? (
          <Loader />
        ) : filteredDrives.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <p className="text-slate-500 font-semibold text-sm">No placement drives found.</p>
            <p className="text-slate-400 text-xs mt-1">Click "Create Placement Drive" to announce a new hiring drive.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDrives.map((drive) => {
              const shortlistedCount = drive.shortlistedStudents?.length || 0;
              const sharedCount = drive.resumeSharedStudents?.length || 0;

              return (
                <div key={drive._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 font-bold text-lg">
                          <MdBusiness size={24} />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 text-base">{drive.companyName}</h3>
                          <p className="text-xs text-orange-600 font-semibold">{drive.jobRole}</p>
                        </div>
                      </div>
                      <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase">
                        {drive.workMode}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg">
                        <MdBadge className="text-slate-400" size={14} />
                        <span className="font-semibold text-slate-800">{drive.packageCTC}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg">
                        <MdLocationOn className="text-slate-400" size={14} />
                        <span className="truncate font-semibold text-slate-800">{drive.jobLocation}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                      <MdCalendarToday size={14} className="text-orange-500" />
                      <span>Drive Date: <strong>{new Date(drive.driveDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</strong></span>
                    </div>

                    <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Shortlisted: <strong className="text-slate-800">{shortlistedCount}</strong></span>
                      <span className="text-slate-500 font-medium">Resumes Shared: <strong className="text-emerald-600">{sharedCount}</strong></span>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedDrive(drive);
                        setShortlistModalOpen(true);
                      }}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2 rounded-xl transition flex items-center justify-center gap-1"
                    >
                      <MdPeople size={14} /> Shortlist
                    </button>
                    <button
                      onClick={() => navigate(`/placements/resume-sharing?driveId=${drive._id}`)}
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-2 rounded-xl transition flex items-center justify-center gap-1 shadow-sm"
                    >
                      <MdShare size={14} /> Resumes
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE DRIVE DRAWER */}
      <OrangeButton
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
        panelTitle="Announce Placement Drive"
        panelSubtitle="Create company hiring drive profile and criteria"
        maxWidth="sm:max-w-md"
        leftBtnText="Cancel"
        rightBtnText={submitting ? "Creating..." : "Create Drive"}
        onLeftClick={() => setCreateModalOpen(false)}
        onRightClick={handleCreateDrive}
        drawerContent={
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 block">Company Name *</label>
                <button
                  type="button"
                  onClick={() => setAddCompanyModalOpen(true)}
                  className="text-[11px] font-bold text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <MdAdd size={14} /> Add Company
                </button>
              </div>
              <SelectDropdown
                value={form.companyName}
                onChange={(val) => {
                  if (val === "__add_new__") {
                    setAddCompanyModalOpen(true);
                  } else {
                    const matched = activeCompanies.find(c => c.companyName === val);
                    setForm({
                      ...form,
                      companyName: val,
                      jobLocation: form.jobLocation || matched?.location || matched?.city || ""
                    });
                  }
                }}
                options={[
                  { value: "", label: "Select Company..." },
                  ...activeCompanies.map((c) => ({
                    value: c.companyName,
                    label: c.companyName
                  })),
                  { value: "__add_new__", label: "+ Add New Company" }
                ]}
                className="w-full"
                buttonClassName="h-10 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-medium transition focus:outline-none hover:border-slate-350 shadow-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Job Role *</label>
              <input
                type="text"
                required
                value={form.jobRole}
                onChange={(e) => setForm({ ...form, jobRole: e.target.value })}
                className="w-full h-10 px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none bg-white focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
                placeholder="e.g. Software Developer"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Package (CTC) *</label>
              <input
                type="text"
                required
                value={form.packageCTC}
                onChange={(e) => setForm({ ...form, packageCTC: e.target.value })}
                className="w-full h-10 px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none bg-white focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
                placeholder="e.g. 6.5 LPA"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Location *</label>
              <input
                type="text"
                required
                value={form.jobLocation}
                onChange={(e) => setForm({ ...form, jobLocation: e.target.value })}
                className="w-full h-10 px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none bg-white focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
                placeholder="e.g. Indore"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Work Mode</label>
              <SelectDropdown
                value={form.workMode}
                onChange={(val) => setForm({ ...form, workMode: val })}
                options={[
                  { value: "WFO", label: "WFO" },
                  { value: "Hybrid", label: "Hybrid" },
                  { value: "Remote", label: "Remote" }
                ]}
                className="w-full"
                buttonClassName="h-10 w-full flex items-center justify-between gap-2 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 font-medium transition focus:outline-none hover:border-slate-350 shadow-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Drive Date *</label>
              <input
                type="date"
                required
                value={form.driveDate}
                onChange={(e) => setForm({ ...form, driveDate: e.target.value })}
                className="w-full h-10 px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none bg-white focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Application Deadline</label>
              <input
                type="date"
                value={form.applicationDeadline}
                onChange={(e) => setForm({ ...form, applicationDeadline: e.target.value })}
                className="w-full h-10 px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none bg-white focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Job Description & Selection Rounds</label>
              <textarea
                rows={3}
                value={form.jobDescription}
                onChange={(e) => setForm({ ...form, jobDescription: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none bg-white focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
                placeholder="Round 1: Aptitude, Round 2: Technical, Round 3: HR"
              />
            </div>
          </div>
        }
      />

      {/* SHORTLIST CANDIDATES MODAL */}
      {isShortlistModalOpen && selectedDrive && (
        <ShortlistCandidatesModal
          drive={selectedDrive}
          readyStudents={readyStudents}
          onClose={() => {
            setShortlistModalOpen(false);
            setSelectedDrive(null);
            fetchDrives();
          }}
        />
      )}

      {/* ADD COMPANY MODAL */}
      <AddCompanyModal
        isOpen={isAddCompanyModalOpen}
        onClose={() => setAddCompanyModalOpen(false)}
        onSuccess={() => {
          refetchCompanies();
        }}
      />
    </>
  );
};



// Shortlist Candidates Modal Component (Using Standard Drawer)
const ShortlistCandidatesModal = ({ drive, readyStudents, onClose }) => {
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Filter ready students
  const candidates = readyStudents.filter(s =>
    (s.readinessStatus === "Ready for Drive" || s.readinessStatus === "Ready for Placement" || s.readinessStatus === "Ready") &&
    (`${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    (s.prkey || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.technology || "").toLowerCase().includes(search.toLowerCase()))
  );

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === candidates.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(candidates.map(c => c._id || c.studentId));
    }
  };

  const handleShortlist = async () => {
    if (selectedIds.length === 0) {
      toast.error("Please select at least one student");
      return;
    }

    setSubmitting(true);
    try {
      await shortlistStudentsForDrive(drive._id, selectedIds);
      toast.success(`Successfully shortlisted ${selectedIds.length} candidate(s) for ${drive.companyName}`);
      onClose();
    } catch (err) {
      toast.error("Failed to shortlist candidates");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <OrangeButton
      isOpen={true}
      onClose={onClose}
      panelTitle={`Shortlist Candidates — ${drive.companyName}`}
      panelSubtitle={`${drive.jobRole} (${drive.packageCTC})`}
      maxWidth="sm:max-w-2xl"
      leftBtnText="Cancel"
      rightBtnText={submitting ? "Saving..." : "Save Shortlist"}
      onLeftClick={onClose}
      onRightClick={handleShortlist}
      drawerContent={
        <div className="flex flex-col h-full space-y-4">
          <div className="flex items-center justify-between gap-4">
            <input
              type="text"
              placeholder="Search candidate by name, PRKey, technology..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 bg-white"
            />
            <button
              onClick={toggleSelectAll}
              className="text-xs font-bold text-orange-600 hover:text-orange-700 whitespace-nowrap px-3 py-2 bg-orange-50 rounded-xl border border-orange-100 cursor-pointer"
            >
              {selectedIds.length === candidates.length && candidates.length > 0 ? "Deselect All" : "Select All"}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 max-h-[55vh] pr-1">
            {candidates.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-8">No eligible Ready for Drive students found.</p>
            ) : (
              candidates.map(candidate => {
                const isChecked = selectedIds.includes(candidate._id || candidate.studentId);
                return (
                  <div
                    key={candidate._id || candidate.studentId}
                    onClick={() => toggleSelect(candidate._id || candidate.studentId)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                      isChecked ? "bg-orange-50/60 border-orange-300" : "bg-white border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="w-4 h-4 text-orange-500 rounded focus:ring-orange-400"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">{candidate.firstName} {candidate.lastName}</h4>
                        <p className="text-[11px] text-slate-500">ID: {candidate.prkey || "—"} • Tech: {candidate.technology || candidate.track || "General"}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {candidate.readinessStatus}
                    </span>
                  </div>
                );
              })
            )}
          </div>
          
          <div className="text-xs font-semibold text-slate-600">
            Selected: <strong className="text-slate-800">{selectedIds.length}</strong> candidates
          </div>
        </div>
      }
    />
  );
};

export default PlacementDriveManagement;
