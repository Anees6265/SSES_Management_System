import React from "react";
import {
  MdClose, MdBusiness, MdLocationOn, MdEmail, MdPhone, MdLanguage,
  MdWork, MdPeople, MdCheckCircle, MdCategory, MdEdit
} from "react-icons/md";
import { useGetCompanyByIdQuery } from "../../../redux/api/authApi";
import Loader from "../../shared/loader/Loader";

const CompanyProfileModal = ({ isOpen, onClose, companyId, onEdit }) => {
  const { data, isLoading, error } = useGetCompanyByIdQuery(companyId, {
    skip: !isOpen || !companyId,
  });

  if (!isOpen || !companyId) return null;

  const company = data?.data?.company || {};
  const drives = data?.data?.drives || [];
  const stats = data?.data?.stats || {
    totalDrives: drives.length,
    totalStudents: 0,
    shortlisted: 0,
    interviewing: 0,
    selected: 0,
    placed: 0
  };

  const studentPlacements = data?.data?.studentPlacements || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-50 rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <div className="flex items-center gap-3">
            {company.companyLogo ? (
              <img
                src={company.companyLogo}
                alt={company.companyName}
                className="w-12 h-12 rounded-2xl object-cover border border-white/20 shadow-xs"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white font-extrabold text-xl flex items-center justify-center shadow-xs">
                {company.companyName?.charAt(0)?.toUpperCase() || "C"}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-white">{company.companyName}</h2>
                <span
                  className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                    company.status === "Inactive"
                      ? "bg-red-500/20 text-red-300 border-red-400/30"
                      : "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                  }`}
                >
                  {company.status || "Active"}
                </span>
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-1 mt-0.5">
                <MdCategory className="text-orange-400" /> {company.industry || "IT Services"} • {company.companyType || "Company"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(company);
                }}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition flex items-center gap-1 border border-white/20"
              >
                <MdEdit size={14} /> Edit Company
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition"
            >
              <MdClose size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {isLoading ? (
          <div className="p-12 flex justify-center items-center">
            <Loader />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 font-semibold text-xs">
            Failed to load company details: {error?.data?.message || 'Server error'}
          </div>
        ) : (
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
            
            {/* Quick Stat Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs text-center">
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Total Drives</p>
                <p className="text-xl font-extrabold text-slate-800 mt-1">{stats.totalDrives}</p>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs text-center">
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Shortlisted</p>
                <p className="text-xl font-extrabold text-blue-600 mt-1">{stats.shortlisted}</p>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs text-center">
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Interviewing</p>
                <p className="text-xl font-extrabold text-purple-600 mt-1">{stats.interviewing}</p>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs text-center">
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Total Placed</p>
                <p className="text-xl font-extrabold text-emerald-600 mt-1">{stats.placed}</p>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Left Column: Contact & Location */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <h3 className="font-bold text-slate-800 text-xs border-b border-slate-100 pb-2 flex items-center gap-1.5">
                  <MdBusiness className="text-orange-500" /> Corporate Information
                </h3>
                
                <div className="space-y-2 text-slate-600">
                  <div className="flex items-center gap-2">
                    <MdLocationOn className="text-slate-400 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-700">Location: </span>
                      {company.location || company.address || "Not provided"}
                    </div>
                  </div>

                  {company.website && (
                    <div className="flex items-center gap-2">
                      <MdLanguage className="text-slate-400 shrink-0" />
                      <div>
                        <span className="font-bold text-slate-700">Website: </span>
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-600 font-semibold hover:underline"
                        >
                          {company.website}
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <MdEmail className="text-slate-400 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-700">Company Email: </span>
                      {company.companyEmail || company.hrEmail || "—"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <MdPhone className="text-slate-400 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-700">Company Phone: </span>
                      {company.companyContact || company.hrContact || "—"}
                    </div>
                  </div>
                </div>

                {company.description && (
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-[11px] font-bold text-slate-700">About Company:</p>
                    <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">{company.description}</p>
                  </div>
                )}
              </div>

              {/* Right Column: HR / Contact Person */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <h3 className="font-bold text-slate-800 text-xs border-b border-slate-100 pb-2 flex items-center gap-1.5">
                  <MdPeople className="text-blue-500" /> HR & Contact Person
                </h3>

                <div className="space-y-2 text-slate-600">
                  <div>
                    <span className="font-bold text-slate-700">Contact Person: </span>
                    {company.contactPersonName || "Not assigned"}
                  </div>

                  <div>
                    <span className="font-bold text-slate-700">Designation: </span>
                    {company.designation || "TPO Liaison / HR"}
                  </div>

                  <div className="flex items-center gap-2">
                    <MdEmail className="text-slate-400 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-700">Email: </span>
                      {company.contactPersonEmail || company.hrEmail || "—"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <MdPhone className="text-slate-400 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-700">Phone: </span>
                      {company.contactPersonPhone || company.hrContact || "—"}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Placement Drives List Section */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <MdWork className="text-purple-500" /> Associated Placement Drives ({drives.length})
                </h3>
              </div>

              {drives.length === 0 ? (
                <p className="text-slate-400 text-center py-4 italic text-xs">
                  No placement drives registered for this company yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {drives.map((drive) => (
                    <div
                      key={drive._id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-orange-50/50 transition"
                    >
                      <div>
                        <p className="font-bold text-slate-800 text-xs">{drive.jobRole}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          CTC: <strong className="text-emerald-600">{drive.packageCTC}</strong> • Location: {drive.jobLocation} • Work Mode: {drive.workMode}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-bold text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                          {new Date(drive.driveDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Placed Students List Section (if any) */}
            {studentPlacements.length > 0 && (
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <h3 className="font-bold text-slate-800 text-xs border-b border-slate-100 pb-2 flex items-center gap-1.5">
                  <MdCheckCircle className="text-emerald-500" /> Placed Candidates ({studentPlacements.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {studentPlacements.map((sp) => {
                    const student = sp.studentId || {};
                    return (
                      <div key={sp._id} className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 text-white font-extrabold flex items-center justify-center text-xs">
                          {student.firstName?.charAt(0) || "S"}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-xs">
                            {student.firstName ? `${student.firstName} ${student.lastName || ''}` : "Student"}
                          </p>
                          <p className="text-[10px] text-emerald-700 font-semibold">
                            {sp.placedInfo?.jobProfile || "Placed Candidate"} • {sp.placedInfo?.packageOffered || "Selected"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};

export default CompanyProfileModal;
