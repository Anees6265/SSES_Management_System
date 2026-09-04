import React, { useState } from "react";
import { 
  MdTrendingUp, MdCheckCircleOutline, MdWorkOutline, MdVerifiedUser,
  MdViewStream, MdGridOn, MdLinearScale, MdArrowForward
} from "react-icons/md";

const STEPS = [
  { 
    key: "ready",     
    label: "Placement Ready",     
    subLabel: "Eligible Pool",
    color: "from-blue-500 to-indigo-600",
    barColor: "bg-gradient-to-r from-blue-500 to-indigo-600",
    bgColor: "bg-blue-50/60 border-blue-100/80 text-blue-700",
    badgeBg: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <MdCheckCircleOutline />
  },
  { 
    key: "interview", 
    label: "In Interviews", 
    subLabel: "Active Drives",
    color: "from-amber-500 to-orange-600",
    barColor: "bg-gradient-to-r from-amber-500 to-orange-600",
    bgColor: "bg-amber-50/60 border-amber-100/80 text-amber-700",
    badgeBg: "bg-amber-100 text-amber-700 border-amber-200",
    icon: <MdWorkOutline />
  },
  { 
    key: "selected",  
    label: "Offers Selected",  
    subLabel: "Offer Received",
    color: "from-purple-500 to-violet-600",
    barColor: "bg-gradient-to-r from-purple-500 to-violet-600",
    bgColor: "bg-purple-50/60 border-purple-100/80 text-purple-700",
    badgeBg: "bg-purple-100 text-purple-700 border-purple-200",
    icon: <MdVerifiedUser />
  },
  { 
    key: "placed",    
    label: "Successfully Placed",    
    subLabel: "Job Confirmed",
    color: "from-emerald-500 to-teal-600",
    barColor: "bg-gradient-to-r from-emerald-500 to-teal-600",
    bgColor: "bg-emerald-50/60 border-emerald-100/80 text-emerald-700",
    badgeBg: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: <MdTrendingUp />
  },
];

const PlacementFunnel = ({ data = {}, loading }) => {
  // View mode state: "funnel" (stacked funnel bars), "pipeline" (flow steps), or "grid" (2x2 grid)
  const [viewMode, setViewMode] = useState("funnel");

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="h-5 bg-gray-100 rounded w-44 mb-6 animate-pulse" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const readyVal     = data.ready || 0;
  const interviewVal = data.interview || 0;
  const selectedVal  = data.selected || 0;
  const placedVal    = data.placed || 0;
  
  const values = { ready: readyVal, interview: interviewVal, selected: selectedVal, placed: placedVal };
  const conversionPct = readyVal > 0 ? Math.round((placedVal / readyVal) * 100) : 0;

  // Max value calculation for bar sizing
  const maxVal = Math.max(readyVal, interviewVal, selectedVal, placedVal, 1);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-all duration-300">
      
      {/* Header with Title & Adjustable View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-800 text-base">Placement Funnel & Pipeline</h3>
            <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
              {conversionPct}% Placed
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">Stage-by-stage student readiness and drive progression</p>
        </div>

        {/* Adjustable View Switcher Controls */}
        <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl border border-gray-200/60 self-start sm:self-auto">
          <button
            onClick={() => setViewMode("funnel")}
            title="Funnel Layers View"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              viewMode === "funnel"
                ? "bg-white text-orange-600 shadow-xs border border-gray-200/80"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <MdViewStream className="text-sm" /> Funnel
          </button>

          <button
            onClick={() => setViewMode("pipeline")}
            title="Flow Stepper View"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              viewMode === "pipeline"
                ? "bg-white text-orange-600 shadow-xs border border-gray-200/80"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <MdLinearScale className="text-sm" /> Pipeline
          </button>

          <button
            onClick={() => setViewMode("grid")}
            title="Cards Grid View"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              viewMode === "grid"
                ? "bg-white text-orange-600 shadow-xs border border-gray-200/80"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <MdGridOn className="text-sm" /> Grid
          </button>
        </div>
      </div>

      {/* ── VIEW MODE 1: Funnel Stacked Layers ───────────────────── */}
      {viewMode === "funnel" && (
        <div className="space-y-3.5">
          {STEPS.map((step, idx) => {
            const val = values[step.key] ?? 0;
            const pctOfReady = readyVal > 0 ? Math.round((val / readyVal) * 100) : 0;
            const widthPct   = Math.max(16, Math.min(100, Math.round((val / maxVal) * 100)));

            // Conversion from previous step
            const prevVal = idx > 0 ? values[STEPS[idx - 1].key] : null;
            const stepConversion = (prevVal && prevVal > 0) ? Math.round((val / prevVal) * 100) : null;

            return (
              <div key={step.key} className="space-y-1 group">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-700 px-1">
                  <div className="flex items-center gap-2">
                    <span className={`p-1.5 rounded-lg text-sm ${step.badgeBg}`}>
                      {step.icon}
                    </span>
                    <span className="font-bold text-gray-800">{step.label}</span>
                    <span className="text-[10px] text-gray-400 font-medium">({step.subLabel})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {stepConversion !== null && (
                      <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                        {stepConversion}% from prev stage
                      </span>
                    )}
                    <span className="font-extrabold text-gray-800 text-sm">{val}</span>
                    <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md min-w-[42px] text-center">
                      {pctOfReady}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-100/80 rounded-xl h-4 p-0.5 border border-gray-100 flex items-center overflow-hidden">
                  <div
                    className={`h-full rounded-lg ${step.barColor} transition-all duration-700 shadow-xs flex items-center justify-end pr-2 text-[10px] font-bold text-white`}
                    style={{ width: `${widthPct}%` }}
                  >
                    {widthPct > 20 && `${widthPct}%`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── VIEW MODE 2: Pipeline Stepper Flow ───────────────────── */}
      {viewMode === "pipeline" && (
        <div className="space-y-3">
          {STEPS.map((step, idx) => {
            const val = values[step.key] ?? 0;
            const pctOfReady = readyVal > 0 ? Math.round((val / readyVal) * 100) : 0;
            const isLast = idx === STEPS.length - 1;

            return (
              <React.Fragment key={step.key}>
                <div className={`p-4 rounded-xl border flex items-center justify-between transition-all ${step.bgColor} hover:shadow-xs`}>
                  <div className="flex items-center gap-3">
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold border ${step.badgeBg}`}>
                      {step.icon}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-extrabold text-gray-800 text-sm">{step.label}</p>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Step {idx + 1}</span>
                      </div>
                      <p className="text-xs text-gray-500">{step.subLabel}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-extrabold text-gray-800">{val}</p>
                    <p className="text-[10px] font-bold text-gray-500 bg-white/80 px-2 py-0.5 rounded-full border border-black/5 inline-block">
                      {pctOfReady}% of pool
                    </p>
                  </div>
                </div>

                {!isLast && (
                  <div className="flex justify-center my-1 text-gray-300">
                    <MdArrowForward className="rotate-90 text-lg text-orange-400" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* ── VIEW MODE 3: 2x2 Responsive Grid ───────────────────── */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {STEPS.map((step, idx) => {
            const val = values[step.key] ?? 0;
            const pctOfReady = readyVal > 0 ? Math.round((val / readyVal) * 100) : 0;
            const barPct = Math.min(100, Math.max(12, Math.round((val / maxVal) * 100)));

            return (
              <div 
                key={step.key} 
                className={`rounded-xl border p-4 flex flex-col justify-between transition-all duration-300 ${step.bgColor} hover:shadow-sm`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`p-2 rounded-lg text-lg ${step.badgeBg}`}>
                    {step.icon}
                  </span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Stage {idx + 1}</span>
                </div>

                <div className="my-1">
                  <p className="text-xs font-bold text-gray-700">{step.label}</p>
                  <div className="flex items-baseline justify-between mt-1">
                    <p className="text-2xl font-extrabold text-gray-800">{val}</p>
                    <span className="text-xs font-bold text-gray-500">{pctOfReady}%</span>
                  </div>
                </div>

                <div className="mt-2">
                  <div className="w-full bg-white/70 rounded-full h-2 overflow-hidden border border-black/5">
                    <div 
                      className={`h-full rounded-full ${step.barColor} transition-all duration-500`} 
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Pipeline Summary Metric */}
      <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium">
        <span>Ready: <strong className="text-blue-600">{readyVal}</strong></span>
        <span>Interviewing: <strong className="text-amber-600">{interviewVal}</strong></span>
        <span>Offered: <strong className="text-purple-600">{selectedVal}</strong></span>
        <span>Placed: <strong className="text-emerald-600">{placedVal}</strong></span>
      </div>

    </div>
  );
};

export default PlacementFunnel;