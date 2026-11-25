/* eslint-disable react/prop-types */
import { 
  MdTrendingUp, MdCheckCircleOutline, MdWorkOutline, MdVerifiedUser
} from "react-icons/md";

const STEPS = [
  { 
    key: "ready",     
    label: "Placement Ready",     
    subLabel: "Eligible Pool",
    barColor: "bg-slate-500",
    iconBg: "bg-slate-100 text-slate-700 border-slate-200",
    icon: <MdCheckCircleOutline />
  },
  { 
    key: "interview", 
    label: "In Interviews", 
    subLabel: "Active Drives",
    barColor: "bg-amber-500",
    iconBg: "bg-amber-50 text-amber-700 border-amber-200",
    icon: <MdWorkOutline />
  },
  { 
    key: "selected",  
    label: "Offers Selected",  
    subLabel: "Offer Received",
    barColor: "bg-orange-500",
    iconBg: "bg-orange-50 text-orange-700 border-orange-200",
    icon: <MdVerifiedUser />
  },
  { 
    key: "placed",    
    label: "Successfully Placed",    
    subLabel: "Job Confirmed",
    barColor: "bg-emerald-600",
    iconBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: <MdTrendingUp />
  },
];

const PlacementFunnel = ({ data = {}, loading, className = "" }) => {
  if (loading) {
    return (
      <div className={`bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 ${className}`}>
        <div className="h-5 bg-slate-100 rounded-lg w-44 mb-6 animate-pulse" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-50 rounded-xl animate-pulse" />
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
    <div className={`bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-6 transition-all duration-200 hover:shadow-xs flex flex-col justify-between h-full ${className}`}>
      
      {/* Header with Title */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                Placement Funnel
              </h3>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Live funnel from verified eligible pool to confirmed job offers
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shrink-0">
            {conversionPct}% Placed
          </span>
        </div>

        {/* Funnel Stacked Layers */}
        <div className="space-y-5 sm:space-y-6 my-3 sm:my-4">
          {STEPS.map((step, idx) => {
            const val = values[step.key] ?? 0;
            const pctOfReady = readyVal > 0 ? Math.round((val / readyVal) * 100) : 0;
            const widthPct   = Math.max(14, Math.min(100, Math.round((val / maxVal) * 100)));

            // Conversion from previous step
            const prevVal = idx > 0 ? values[STEPS[idx - 1].key] : null;
            const stepConversion = (prevVal && prevVal > 0) ? Math.round((val / prevVal) * 100) : null;

            return (
              <div key={step.key} className="space-y-2.5 group">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 px-0.5">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-base border shadow-2xs ${step.iconBg}`}>
                      {step.icon}
                    </span>
                    <div>
                      <span className="font-extrabold text-slate-800 text-xs sm:text-sm">{step.label}</span>
                      <span className="text-[11px] text-slate-400 font-medium ml-1.5 hidden sm:inline">({step.subLabel})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {stepConversion !== null && (
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md hidden sm:inline">
                        {stepConversion}% from prev stage
                      </span>
                    )}
                    <span className="font-black text-slate-900 text-sm">{val}</span>
                    <span className="text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md min-w-[46px] text-center">
                      {pctOfReady}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-xl h-4 p-0.5 sm:p-1 border border-slate-200/70 flex items-center overflow-hidden">
                  <div
                    className={`h-full rounded-lg ${step.barColor} transition-all duration-700 flex items-center justify-end pr-2.5 text-[10px] font-bold text-white shadow-2xs`}
                    style={{ width: `${widthPct}%` }}
                  >
                    {widthPct > 20 && `${widthPct}%`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
        <span>Pool conversion rate</span>
        <span className="font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">
          {conversionPct}% of ready pool placed
        </span>
      </div>
    </div>
  );
};

export default PlacementFunnel;
