import { Clock, Compass, Award, X } from "lucide-react";

export default function PurposeEvolutionModal({ isOpen, onClose, versions = [], currentVersion, onSelectVersion }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative z-10 bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh] sm:max-h-[85vh]">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-gradient-to-r from-orange-50 to-indigo-50/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Compass size={20} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">Purpose Evolution History</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium line-clamp-1">Track development trajectory and vision shifts across 6–12 month milestones</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white/80 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {versions.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Clock size={36} className="mx-auto mb-2 opacity-50" />
              <p className="text-xs font-bold">Only 1 active assessment version recorded.</p>
              <p className="text-[11px] mt-1">Re-assess in 6–12 months to unlock longitudinal growth tracking.</p>
            </div>
          ) : (
            versions.map((ver) => {
              const isSelected = ver.assessmentVersion === currentVersion;
              const isAnalyzed = ver.status === "analyzed" || ver.status === "finalized";
              return (
                <div
                  key={ver._id || ver.assessmentVersion}
                  className={`border rounded-2xl p-4 transition-all ${
                    isSelected
                      ? "border-orange-400 bg-orange-50/40 shadow-xs ring-1 ring-orange-400/30"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-700 font-extrabold text-xs">
                        Version {ver.assessmentVersion}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                        isAnalyzed
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {isAnalyzed ? "✓ Analyzed" : "Draft In-Progress"}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {new Date(ver.createdAt || Date.now()).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {isAnalyzed && ver.alignmentScores?.overall ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                          <Award size={15} className="text-orange-500" />
                          <span>Alignment: {ver.alignmentScores.overall}%</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-semibold italic">Un-synthesized Draft</span>
                      )}
                      {!isSelected && onSelectVersion && (
                        <button
                          type="button"
                          onClick={() => onSelectVersion(ver.assessmentVersion)}
                          className="px-3 py-1 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                        >
                          {isAnalyzed ? "View Version" : "Open Draft"}
                        </button>
                      )}
                    </div>
                  </div>

                  {ver.purposeStatement && (
                    <div className="mt-2 text-xs font-medium text-slate-600 bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 italic">
                      "{ver.purposeStatement}"
                    </div>
                  )}

                  {ver.topPassions?.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                        Top Passions:
                      </span>
                      {ver.topPassions.map((p, i) => (
                        <span
                          key={i}
                          className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700"
                        >
                          {p.name || p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
