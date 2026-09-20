import { useState, useMemo } from "react";
import {
  Search, Mail, Phone, Users, ShieldCheck, UserCheck,
  Building, GraduationCap, X, ExternalLink, Sparkles
} from "lucide-react";
import { useGetFacultiesQuery } from "../../../redux/api/studentApi";
import EmptyState from "../../shared/empty-state/EmptyState";

const ROLE_COLORS = {
  hod: "bg-amber-50 text-amber-700 border-amber-200/80",
  faculty: "bg-blue-50 text-blue-700 border-blue-200/80",
  admin: "bg-slate-100 text-slate-700 border-slate-200/80",
  superadmin: "bg-purple-50 text-purple-700 border-purple-200/80",
};

const ROLE_LABELS = {
  hod: "Head of Department",
  faculty: "Faculty Member",
  admin: "Administrator",
  superadmin: "Super Admin",
};

// Helper to generate a background gradient based on faculty name
const getAvatarGradient = (name = "") => {
  const safeName = name || "";
  const charCodeSum = safeName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gradients = [
    "from-orange-400 to-amber-500",
    "from-purple-400 to-indigo-500",
    "from-teal-400 to-emerald-500",
    "from-pink-400 to-rose-500",
    "from-blue-400 to-cyan-500",
  ];
  return gradients[charCodeSum % gradients.length];
};

export default function StudentFaculty() {
  const { data: facultiesRes, isLoading } = useGetFacultiesQuery();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileTab, setMobileTab] = useState("all"); // "all" | "hod" | "faculty"

  const faculties = facultiesRes?.data || [];

  // Metrics
  const hodCount = faculties.filter(f => f.role === "hod").length;
  const facultyCount = faculties.filter(f => f.role === "faculty" || !f.role).length;

  // Filter faculties by search & role
  const filteredFaculties = useMemo(() => {
    return faculties.filter((fac) => {
      const name = (fac.name || "").toLowerCase();
      const pos = (fac.position || "").toLowerCase();
      const query = searchQuery.toLowerCase();
      const matchesSearch = !query || name.includes(query) || pos.includes(query);

      const matchesRole = mobileTab === "all" || fac.role === mobileTab;
      return matchesSearch && matchesRole;
    });
  }, [faculties, searchQuery, mobileTab]);

  if (isLoading) {
    return (
      <div className="flex justify-center pt-20">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">

      {/* ── Header Card (Matching StudentTasks Design System) ── */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-xs">
        <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400" />
        <div className="p-3.5 sm:p-5">
          
          {/* Top Row: Title + Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-gray-900">My Faculty & Mentors</h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100">
                  {faculties.length}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Department faculty members, academic mentors and heads
              </p>
            </div>

            {/* Search Input (Mobile full-width, desktop w-64) */}
            <div className="relative w-full sm:w-60 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search faculty or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-2 text-xs sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 focus:bg-white bg-gray-50 text-gray-800 transition-all duration-200 placeholder:text-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Stat Pills & Progress Bar (Identical to StudentTasks) */}
          <div className="mt-3.5 pt-3 border-t border-gray-100/80">
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-orange-50/80 border border-orange-100">
                <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                <span className="text-[11px] sm:text-xs font-bold text-orange-700 truncate">{faculties.length} Total Faculty</span>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50/80 border border-amber-100">
                <Building size={13} className="text-amber-500 shrink-0" />
                <span className="text-[11px] sm:text-xs font-bold text-amber-700 truncate">{hodCount} HODs</span>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50/80 border border-blue-100">
                <GraduationCap size={13} className="text-blue-500 shrink-0" />
                <span className="text-[11px] sm:text-xs font-bold text-blue-700 truncate">{facultyCount} Mentors</span>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50/80 border border-emerald-100">
                <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
                <span className="text-[11px] sm:text-xs font-bold text-emerald-700 truncate">SSISM Staff</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
              <div 
                className="h-1.5 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-500" 
                style={{ width: `${faculties.length > 0 ? 100 : 0}%` }} 
              />
            </div>
          </div>

        </div>
      </div>

      {/* ── Mobile Role Tabs (`md:hidden`) — Matches StudentTasks ── */}
      <div className="md:hidden bg-gray-100/90 p-1 rounded-xl flex gap-1 text-xs font-bold">
        <button
          onClick={() => setMobileTab("all")}
          className={`flex-1 py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
            mobileTab === "all" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <span>All</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-200 text-gray-700">
            {faculties.length}
          </span>
        </button>

        {hodCount > 0 && (
          <button
            onClick={() => setMobileTab("hod")}
            className={`flex-1 py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
              mobileTab === "hod" ? "bg-white text-amber-700 shadow-xs" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span>HODs</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800">
              {hodCount}
            </span>
          </button>
        )}

        <button
          onClick={() => setMobileTab("faculty")}
          className={`flex-1 py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
            mobileTab === "faculty" ? "bg-white text-blue-700 shadow-xs" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <span>Faculty</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800">
            {facultyCount}
          </span>
        </button>
      </div>

      {/* ── Faculty Directory Grid ── */}
      {filteredFaculties.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Faculty Found"
          subtitle={searchQuery
            ? "No faculty members match your search criteria. Try checking spelling or resetting."
            : "No faculty members are registered in your department yet."}
          actionText={searchQuery ? "Clear Search" : undefined}
          onAction={searchQuery ? () => setSearchQuery("") : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
          {filteredFaculties.map((fac) => {
            const initials = (fac.name || "")
              .split(" ")
              .map((n) => n[0] || "")
              .join("")
              .slice(0, 2)
              .toUpperCase();

            const gradientClass = getAvatarGradient(fac.name);

            return (
              <div
                key={fac._id}
                className="bg-white border border-gray-200/80 rounded-2xl shadow-xs hover:border-orange-200 hover:shadow-sm transition-all duration-150 overflow-hidden flex flex-col p-4 sm:p-5 group justify-between"
              >
                <div>
                  {/* Photo & Identity */}
                  <div className="flex items-start gap-3 sm:gap-3.5">
                    {fac.profileImage ? (
                      <img
                        src={fac.profileImage}
                        alt={fac.name}
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border-2 border-gray-100 shrink-0 shadow-2xs"
                      />
                    ) : (
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${gradientClass} text-white flex items-center justify-center text-base sm:text-lg font-black shrink-0 shadow-2xs`}>
                        {initials}
                      </div>
                    )}

                    <div className="space-y-0.5 min-w-0 flex-1">
                      <h3 className="text-xs sm:text-sm font-bold text-gray-900 truncate group-hover:text-orange-600 transition-colors">
                        {fac.name}
                      </h3>

                      <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${ROLE_COLORS[fac.role] || ROLE_COLORS.faculty}`}>
                        {ROLE_LABELS[fac.role] || fac.role?.toUpperCase() || "FACULTY"}
                      </span>

                      {fac.position && (
                        <p className="text-[11px] sm:text-xs text-gray-500 truncate pt-0.5">
                          {fac.position}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Contact Details (Interactive with tel: and mailto: on mobile) */}
                  <div className="mt-3.5 pt-3 border-t border-gray-100 space-y-2 text-xs">
                    {fac.email ? (
                      <a
                        href={`mailto:${fac.email}`}
                        className="flex items-center gap-2 text-gray-600 hover:text-orange-600 transition-colors truncate group/link"
                        title={fac.email}
                      >
                        <Mail className="text-gray-400 group-hover/link:text-orange-500 shrink-0" size={14} />
                        <span className="font-semibold truncate">{fac.email}</span>
                      </a>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Mail size={14} className="shrink-0" />
                        <span className="text-[11px]">—</span>
                      </div>
                    )}

                    {fac.mobileNo ? (
                      <a
                        href={`tel:${fac.mobileNo}`}
                        className="flex items-center gap-2 text-gray-600 hover:text-orange-600 transition-colors group/phone"
                      >
                        <Phone className="text-gray-400 group-hover/phone:text-orange-500 shrink-0" size={14} />
                        <span className="font-semibold">{fac.mobileNo}</span>
                      </a>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Phone size={14} className="shrink-0" />
                        <span className="text-[11px]">—</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mobile Quick Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-3 mt-3 border-t border-gray-50">
                  {fac.email ? (
                    <a
                      href={`mailto:${fac.email}`}
                      className="py-1.5 px-2 bg-gray-50 hover:bg-orange-50 hover:text-orange-600 text-gray-700 rounded-xl text-[11px] font-bold text-center border border-gray-100 flex items-center justify-center gap-1 transition-all"
                    >
                      <Mail size={12} />
                      <span>Email</span>
                    </a>
                  ) : (
                    <span className="py-1.5 px-2 bg-gray-50 text-gray-400 rounded-xl text-[11px] text-center border border-gray-100">
                      No Email
                    </span>
                  )}

                  {fac.mobileNo ? (
                    <a
                      href={`tel:${fac.mobileNo}`}
                      className="py-1.5 px-2 bg-gray-50 hover:bg-emerald-50 hover:text-emerald-700 text-gray-700 rounded-xl text-[11px] font-bold text-center border border-gray-100 flex items-center justify-center gap-1 transition-all"
                    >
                      <Phone size={12} />
                      <span>Call</span>
                    </a>
                  ) : (
                    <span className="py-1.5 px-2 bg-gray-50 text-gray-400 rounded-xl text-[11px] text-center border border-gray-100">
                      No Phone
                    </span>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
