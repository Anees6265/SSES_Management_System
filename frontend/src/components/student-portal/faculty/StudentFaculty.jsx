import { useMemo } from "react";
import {
  Mail, Phone, Users, ShieldCheck,
  Building, GraduationCap, Crown, Briefcase, Award
} from "lucide-react";
import { useGetFacultiesQuery } from "../../../redux/api/studentApi";
import EmptyState from "../../shared/empty-state/EmptyState";
import ActiveFilterChips from "../../shared/search-export/ActiveFilterChips";
import { usePersistentState } from "../../../hooks/usePersistentFilters";

// Helper to categorize faculty and staff roles with dedicated branding
export const getFacultyCategory = (fac) => {
  const pos = (fac.position || "").toLowerCase();
  const role = (fac.role || "").toLowerCase();

  if (pos.includes("chairman") || role === "chairman") {
    return {
      key: "leadership",
      roleKey: "chairman",
      label: "Chairman",
      badgeLabel: "CHAIRMAN",
      color: "bg-rose-50 text-rose-700 border-rose-200/80",
      accentBg: "from-rose-500 to-red-600",
      scopeLabel: "College Leadership"
    };
  }
  if (pos.includes("ceo") || role === "ceo") {
    return {
      key: "leadership",
      roleKey: "ceo",
      label: "Chief Executive Officer (CEO)",
      badgeLabel: "CEO",
      color: "bg-purple-50 text-purple-700 border-purple-200/80",
      accentBg: "from-purple-500 to-indigo-600",
      scopeLabel: "College Leadership"
    };
  }
  if (role === "hod" || pos.includes("head of department") || pos.includes("hod")) {
    return {
      key: "hod",
      roleKey: "hod",
      label: "Head of Department (HOD)",
      badgeLabel: "HOD",
      color: "bg-amber-50 text-amber-700 border-amber-200/80",
      accentBg: "from-amber-500 to-orange-500",
      scopeLabel: fac.departmentId?.name ? `${fac.departmentId.name} Department` : "Department Head"
    };
  }
  if (role === "coordinator" || role === "cordinator" || pos.includes("coordinator")) {
    return {
      key: "coordinator",
      roleKey: "coordinator",
      label: "Academic Coordinator",
      badgeLabel: "COORDINATOR",
      color: "bg-teal-50 text-teal-700 border-teal-200/80",
      accentBg: "from-teal-500 to-emerald-500",
      scopeLabel: fac.departmentId?.name ? `${fac.departmentId.name} Department` : "Academic Coordinator"
    };
  }
  if (role === "placement_officer" || pos.includes("placement")) {
    return {
      key: "placement",
      roleKey: "placement_officer",
      label: "Placement Officer",
      badgeLabel: "PLACEMENT OFFICER",
      color: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
      accentBg: "from-emerald-500 to-teal-600",
      scopeLabel: "Training & Placement Cell"
    };
  }
  return {
    key: "faculty",
    roleKey: "faculty",
    label: fac.position || "Faculty Member",
    badgeLabel: "FACULTY",
    color: "bg-blue-50 text-blue-700 border-blue-200/80",
    accentBg: "from-blue-500 to-sky-600",
    scopeLabel: fac.departmentId?.name ? `${fac.departmentId.name} Department` : "Department Faculty"
  };
};

const TAB_LABELS = {
  all: "All",
  leadership: "Leadership (CEO & Chairman)",
  hod: "HODs",
  coordinator: "Coordinators",
  faculty: "Faculty",
  placement: "Placement Cell",
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
  const [activeTab, setActiveTab] = usePersistentState("student_faculty_tab", "all");

  const faculties = facultiesRes?.data || [];

  // Metrics
  const leadershipCount = faculties.filter(f => getFacultyCategory(f).key === "leadership").length;
  const hodCount = faculties.filter(f => getFacultyCategory(f).key === "hod").length;
  const coordinatorCount = faculties.filter(f => getFacultyCategory(f).key === "coordinator").length;
  const placementCount = faculties.filter(f => getFacultyCategory(f).key === "placement").length;
  const facultyCount = faculties.filter(f => getFacultyCategory(f).key === "faculty").length;

  const activeFacultyChips = useMemo(() => {
    const chips = [];
    if (activeTab !== "all") {
      chips.push({
        key: "role",
        label: "Category",
        value: activeTab,
        displayValue: TAB_LABELS[activeTab] || activeTab,
        onRemove: () => setActiveTab("all"),
      });
    }
    return chips;
  }, [activeTab, setActiveTab]);

  // Filter faculties by tab
  const filteredFaculties = useMemo(() => {
    return faculties.filter((fac) => {
      const cat = getFacultyCategory(fac);
      return activeTab === "all" || cat.key === activeTab;
    });
  }, [faculties, activeTab]);

  if (isLoading) {
    return (
      <div className="flex justify-center pt-20">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">

      {/* ── Header Card ── */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-xs">
        <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400" />
        <div className="p-3.5 sm:p-5">
          
          {/* Top Row: Title */}
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-gray-900">My Faculty & Mentors</h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100">
                  {faculties.length}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                College leadership, department faculties, coordinators and placement officers
              </p>
            </div>
          </div>

          {/* Stat Pills */}
          <div className="mt-3.5 pt-3 border-t border-gray-100/80">
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-orange-50/80 border border-orange-100">
                <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                <span className="text-[11px] sm:text-xs font-bold text-orange-700 truncate">{faculties.length} Total Members</span>
              </div>

              {leadershipCount > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-50/80 border border-rose-100">
                  <Crown size={13} className="text-rose-500 shrink-0" />
                  <span className="text-[11px] sm:text-xs font-bold text-rose-700 truncate">{leadershipCount} Leadership (CEO / Chairman)</span>
                </div>
              )}

              {hodCount > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50/80 border border-amber-100">
                  <Building size={13} className="text-amber-500 shrink-0" />
                  <span className="text-[11px] sm:text-xs font-bold text-amber-700 truncate">{hodCount} HOD</span>
                </div>
              )}

              {facultyCount > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50/80 border border-blue-100">
                  <GraduationCap size={13} className="text-blue-500 shrink-0" />
                  <span className="text-[11px] sm:text-xs font-bold text-blue-700 truncate">{facultyCount} Faculties</span>
                </div>
              )}

              {placementCount > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50/80 border border-emerald-100">
                  <Briefcase size={13} className="text-emerald-500 shrink-0" />
                  <span className="text-[11px] sm:text-xs font-bold text-emerald-700 truncate">{placementCount} Placement Officer</span>
                </div>
              )}

              {coordinatorCount > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-teal-50/80 border border-teal-100">
                  <Award size={13} className="text-teal-500 shrink-0" />
                  <span className="text-[11px] sm:text-xs font-bold text-teal-700 truncate">{coordinatorCount} Coordinator</span>
                </div>
              )}
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

      {/* ── Segmented Category Filter Tabs (Responsive: Desktop & Mobile) ── */}
      <div className="bg-gray-100/90 p-1 rounded-xl flex items-center gap-1 text-xs font-bold overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("all")}
          className={`py-1.5 px-3 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap ${
            activeTab === "all" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <span>All</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-200 text-gray-700">
            {faculties.length}
          </span>
        </button>

        {leadershipCount > 0 && (
          <button
            onClick={() => setActiveTab("leadership")}
            className={`py-1.5 px-3 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeTab === "leadership" ? "bg-white text-rose-700 shadow-xs" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Crown size={12} className={activeTab === "leadership" ? "text-rose-500" : "text-gray-400"} />
            <span>Leadership (CEO / Chairman)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800">
              {leadershipCount}
            </span>
          </button>
        )}

        {hodCount > 0 && (
          <button
            onClick={() => setActiveTab("hod")}
            className={`py-1.5 px-3 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeTab === "hod" ? "bg-white text-amber-700 shadow-xs" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Building size={12} className={activeTab === "hod" ? "text-amber-500" : "text-gray-400"} />
            <span>HODs</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800">
              {hodCount}
            </span>
          </button>
        )}

        {coordinatorCount > 0 && (
          <button
            onClick={() => setActiveTab("coordinator")}
            className={`py-1.5 px-3 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeTab === "coordinator" ? "bg-white text-teal-700 shadow-xs" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Award size={12} className={activeTab === "coordinator" ? "text-teal-500" : "text-gray-400"} />
            <span>Coordinators</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-teal-100 text-teal-800">
              {coordinatorCount}
            </span>
          </button>
        )}

        {facultyCount > 0 && (
          <button
            onClick={() => setActiveTab("faculty")}
            className={`py-1.5 px-3 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeTab === "faculty" ? "bg-white text-blue-700 shadow-xs" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <GraduationCap size={12} className={activeTab === "faculty" ? "text-blue-500" : "text-gray-400"} />
            <span>Faculty</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800">
              {facultyCount}
            </span>
          </button>
        )}

        {placementCount > 0 && (
          <button
            onClick={() => setActiveTab("placement")}
            className={`py-1.5 px-3 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeTab === "placement" ? "bg-white text-emerald-700 shadow-xs" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Briefcase size={12} className={activeTab === "placement" ? "text-emerald-500" : "text-gray-400"} />
            <span>Placement</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
              {placementCount}
            </span>
          </button>
        )}
      </div>

      {activeFacultyChips.length > 0 && (
        <ActiveFilterChips
          chips={activeFacultyChips}
          onClearAll={() => setActiveTab("all")}
        />
      )}

      {/* ── Faculty Directory Grid ── */}
      {filteredFaculties.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Faculty or Staff Found"
          subtitle="No faculty members or leaders found under this filter."
          actionText={activeTab !== "all" ? "Show All Faculty" : undefined}
          onAction={activeTab !== "all" ? () => setActiveTab("all") : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
          {filteredFaculties.map((fac) => {
            const cat = getFacultyCategory(fac);
            const initials = (fac.name || "")
              .split(" ")
              .map((n) => n[0] || "")
              .join("")
              .slice(0, 2)
              .toUpperCase();

            const gradientClass = getAvatarGradient(fac.name);
            const isLeadership = cat.key === "leadership";

            return (
              <div
                key={fac._id}
                className={`bg-white border ${
                  isLeadership ? "border-rose-200/90 shadow-xs ring-1 ring-rose-100" : "border-gray-200/80 shadow-xs"
                } rounded-2xl hover:border-orange-300 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col p-4 sm:p-5 group justify-between relative`}
              >
                {/* Top Subtle Accent Strip for Leadership */}
                {isLeadership && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-purple-500 to-amber-500" />
                )}

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

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-xs sm:text-sm font-bold text-gray-900 truncate group-hover:text-orange-600 transition-colors">
                          {fac.name}
                        </h3>
                        {isLeadership && (
                          <Crown size={13} className="text-amber-500 shrink-0" title="College Leadership" />
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cat.color}`}>
                          {cat.badgeLabel}
                        </span>
                        <span className="text-[10px] font-semibold text-gray-500 bg-gray-100/80 px-2 py-0.5 rounded-full truncate">
                          {cat.scopeLabel}
                        </span>
                      </div>

                      {fac.position && (
                        <p className="text-[11px] sm:text-xs text-gray-600 truncate pt-0.5 font-medium">
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

                {/* Quick Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-3 mt-3 border-t border-gray-100/80">
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
