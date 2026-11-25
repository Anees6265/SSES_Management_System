/* eslint-disable react/prop-types */

const STATUSES = [
  { key: "notReady",          label: "Not Ready",           sub: "Initial Stage",     badge: "bg-slate-100 text-slate-700 border-slate-200" },
  { key: "inProgress",        label: "In Progress",         sub: "Syllabus Clearing", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "ready",             label: "Ready",               sub: "Pool Eligible",     badge: "bg-orange-50 text-orange-700 border-orange-200" },
  { key: "readyForInterview", label: "Ready for Drive",     sub: "Drive Shortlist",   badge: "bg-orange-100 text-orange-800 border-orange-300" },
  { key: "interview",         label: "In Interview",        sub: "Interview Rounds",  badge: "bg-amber-100 text-amber-800 border-amber-300" },
  { key: "selected",          label: "Offer Selected",      sub: "Selected by Client", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { key: "placed",            label: "Confirmed Placed",    sub: "Offer Verified",    badge: "bg-emerald-100 text-emerald-800 border-emerald-300" },
];

const StatusBreakdown = ({ data = {}, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-6">
        <div className="h-5 bg-slate-100 rounded-lg w-48 mb-4 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-18 bg-slate-50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-6 transition-all duration-200 hover:shadow-xs">
      <div className="flex items-center justify-between mb-3.5 sm:mb-4 pb-3 border-b border-slate-100">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
            Student Placement Readiness Stages
          </h3>
          <p className="text-xs text-slate-500">
            Real-time classification of batch students across readiness and interview stages
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
        {STATUSES.map((s, idx) => {
          const val = data[s.key] ?? 0;
          const isLast = idx === STATUSES.length - 1;
          return (
            <div
              key={s.key}
              className={`rounded-xl border border-slate-200/80 bg-white p-3 flex flex-col justify-between text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xs hover:border-orange-300 ${
                isLast ? "col-span-2 sm:col-span-1 lg:col-span-1" : ""
              }`}
            >
              <div className="flex items-center justify-center">
                <span className={`text-base sm:text-lg font-black px-3 py-0.5 rounded-lg border ${s.badge}`}>
                  {val}
                </span>
              </div>
              <div className="mt-2">
                <p className="text-xs font-extrabold text-slate-800 leading-tight">{s.label}</p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">{s.sub}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StatusBreakdown;
