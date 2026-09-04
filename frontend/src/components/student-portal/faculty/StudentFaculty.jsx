import { useState, useMemo } from "react";
import {
  MdSearch, MdEmail, MdPhone, MdWarning
} from "react-icons/md";
import { useGetFacultiesQuery } from "../../../redux/api/studentApi";

const ROLE_COLORS = {
  hod: "bg-amber-50 text-amber-600 border border-amber-100",
  faculty: "bg-blue-50 text-blue-600 border border-blue-100",
  admin: "bg-slate-50 text-slate-600 border border-slate-100",
  superadmin: "bg-indigo-50 text-indigo-600 border border-indigo-100",
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

  const faculties = facultiesRes?.data || [];

  // Filter faculties by name or designation/position
  const filteredFaculties = useMemo(() => {
    return faculties.filter((fac) => {
      const name = (fac.name || "").toLowerCase();
      const pos = (fac.position || "").toLowerCase();
      const query = searchQuery.toLowerCase();
      return name.includes(query) || pos.includes(query);
    });
  }, [faculties, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex justify-center pt-20">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Header Card ── */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="h-1.5 w-full bg-orange-500" />
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Department Faculty</h2>
            <p className="text-xs text-gray-400 mt-0.5">Faculty members and HODs assigned to your department</p>
          </div>

          {/* Search Input */}
          <div className="relative w-56 shrink-0">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search faculty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 bg-gray-50 transition-all duration-200"
              style={{ paddingLeft: "2.75rem" }}
            />
          </div>
        </div>
      </div>

      {/* Directory Grid */}
      {filteredFaculties.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
            <MdWarning size={24} />
          </div>
          <h3 className="text-sm font-bold text-gray-800">No Faculty Found</h3>
          <p className="text-xs text-gray-400">
            {searchQuery ? "Try checking your spelling or search terms." : "No faculty members are registered in your department yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
                className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-orange-200 transition-all duration-150 overflow-hidden flex flex-col p-5 group"
              >
                {/* Photo & Identity */}
                <div className="flex items-start gap-4">
                  {fac.profileImage ? (
                    <img
                      src={fac.profileImage}
                      alt={fac.name}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-gray-100 shrink-0 shadow-sm"
                    />
                  ) : (
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradientClass} text-white flex items-center justify-center text-lg font-bold shrink-0 shadow-sm`}>
                      {initials}
                    </div>
                  )}

                  <div className="space-y-1 min-w-0">
                    <h3 className="text-sm font-bold text-gray-900 truncate">
                      {fac.name}
                    </h3>

                    <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${ROLE_COLORS[fac.role] || ROLE_COLORS.faculty}`}>
                      {ROLE_LABELS[fac.role] || fac.role.toUpperCase()}
                    </span>

                    {fac.position && (
                      <p className="text-xs text-gray-400 truncate">
                        {fac.position}
                      </p>
                    )}
                  </div>
                </div>

                {/* Contact Methods (Read Only) */}
                <div className="mt-4 pt-3 border-t border-gray-50 space-y-2 text-xs">
                  <div className="flex items-center gap-2.5 text-gray-600">
                    <MdEmail className="text-gray-400 shrink-0" size={15} />
                    <span className="font-semibold select-all truncate" title={fac.email}>
                      {fac.email || "—"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 text-gray-600">
                    <MdPhone className="text-gray-400 shrink-0" size={15} />
                    <span className="font-semibold select-all">
                      {fac.mobileNo || "—"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
