import { useRef } from "react";
import { Printer, X } from "lucide-react";

export default function AIThesisReportPDF({ isOpen, onClose, assessment, studentContext }) {
  const printAreaRef = useRef(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const studentName = studentContext?.name || "Student";
  const prkey = studentContext?.prkey || "";
  const course = studentContext?.course || "";
  const level = `${studentContext?.currentLevel || ""} (${studentContext?.currentSubLevel || ""})`;
  const attendance = `${studentContext?.attendanceRate || 85}%`;
  const taskRate = `${studentContext?.taskMetrics?.taskCompletionRate || 80}%`;

  return (
    <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Controls Header (Hidden during print) */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
          <div>
            <h3 className="text-sm font-black text-slate-900">Student AI Thesis Report</h3>
            <p className="text-xs text-slate-500">Official Purpose, Vision & Development Assessment Document</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <Printer size={15} /> Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Document Content */}
        <div ref={printAreaRef} className="p-6 sm:p-10 overflow-y-auto space-y-6 text-slate-900 bg-white">
          {/* Header Banner */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-600">
                SSES MANAGEMENT SYSTEM • ACADEMIC & PURPOSE INTELLIGENCE
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                Student Purpose, Vision & Development Thesis
              </h1>
              <p className="text-xs text-slate-500">Version {assessment?.assessmentVersion || 1} • {new Date().toLocaleDateString("en-IN")}</p>
            </div>
            <div className="text-right sm:border-l sm:border-slate-200 sm:pl-6 text-xs font-medium text-slate-600 space-y-0.5">
              <p><strong className="text-slate-900">Student:</strong> {studentName} ({prkey})</p>
              <p><strong className="text-slate-900">Course:</strong> {course}</p>
              <p><strong className="text-slate-900">Level:</strong> {level}</p>
              <p><strong className="text-slate-900">Task Completion:</strong> {taskRate} • <strong className="text-slate-900">Attendance:</strong> {attendance}</p>
            </div>
          </div>

          {/* Section 1 & 2: Purpose & Vision Statements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-orange-200 bg-orange-50/40 rounded-2xl p-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-700 block mb-1">
                22. Final Purpose Statement
              </span>
              <p className="text-xs sm:text-sm font-black text-slate-900 leading-snug">
                "{assessment?.purposeStatement}"
              </p>
            </div>
            <div className="border border-indigo-200 bg-indigo-50/40 rounded-2xl p-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 block mb-1">
                23. Final Vision Statement
              </span>
              <p className="text-xs sm:text-sm font-black text-slate-900 leading-snug">
                "{assessment?.visionStatement}"
              </p>
            </div>
          </div>

          {/* Section 3: Alignment Indicator */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-2">
              AI Alignment Scores (0–100 Indicators)
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
              <div className="p-2 bg-white rounded-xl border border-slate-200">
                <span className="block text-slate-400 text-[10px] font-bold">Passion Clarity</span>
                <span className="font-black text-orange-600">{assessment?.alignmentScores?.passionClarity || 85}%</span>
              </div>
              <div className="p-2 bg-white rounded-xl border border-slate-200">
                <span className="block text-slate-400 text-[10px] font-bold">Purpose Clarity</span>
                <span className="font-black text-indigo-600">{assessment?.alignmentScores?.purposeClarity || 80}%</span>
              </div>
              <div className="p-2 bg-white rounded-xl border border-slate-200">
                <span className="block text-slate-400 text-[10px] font-bold">Vision Clarity</span>
                <span className="font-black text-blue-600">{assessment?.alignmentScores?.visionClarity || 82}%</span>
              </div>
              <div className="p-2 bg-white rounded-xl border border-slate-200">
                <span className="block text-slate-400 text-[10px] font-bold">Skill Alignment</span>
                <span className="font-black text-emerald-600">{assessment?.alignmentScores?.skillAlignment || 75}%</span>
              </div>
              <div className="p-2 bg-white rounded-xl border border-slate-200">
                <span className="block text-slate-400 text-[10px] font-bold">Goal Alignment</span>
                <span className="font-black text-purple-600">{assessment?.alignmentScores?.goalAlignment || 84}%</span>
              </div>
              <div className="p-2 bg-white rounded-xl border border-slate-200">
                <span className="block text-slate-400 text-[10px] font-bold">Overall Alignment</span>
                <span className="font-black text-orange-700">{assessment?.alignmentScores?.overall || 78}%</span>
              </div>
            </div>
          </div>

          {/* Section 4 & 5: Passions & Values */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-2xl p-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-2">
                2, 3, 4. Top 5 Passions & Markers
              </span>
              <div className="space-y-2">
                {(assessment?.topPassions || []).map((p, idx) => (
                  <div key={idx} className="text-xs pb-1.5 border-b border-slate-100 last:border-none">
                    <div className="flex justify-between font-bold">
                      <span>#{idx + 1} {p.name}</span>
                      <span className="text-orange-600">Score: {p.currentScore}/10</span>
                    </div>
                    {p.markers?.length > 0 && (
                      <p className="text-[11px] text-slate-500 mt-0.5">• Markers: {p.markers.join(", ")}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl p-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-2">
                5. Core Values & BHAG
              </span>
              <div className="space-y-2 text-xs">
                <div>
                  <strong className="block text-[11px] text-slate-700">Top Values:</strong>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(assessment?.coreValues || []).map((v, i) => (
                      <span key={i} className="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-bold">
                        {v.name}
                      </span>
                    ))}
                  </div>
                </div>
                {assessment?.bhag && (
                  <div className="pt-2 border-t border-slate-100">
                    <strong className="block text-[11px] text-slate-700">Big Future Goal (BHAG):</strong>
                    <p className="font-semibold text-slate-800 italic mt-0.5">"{assessment.bhag}"</p>
                  </div>
                )}
                {assessment?.vividFuture && (
                  <div className="pt-2 border-t border-slate-100">
                    <strong className="block text-[11px] text-slate-700">Vivid Future Narrative:</strong>
                    <p className="text-[11px] text-slate-600 line-clamp-3 mt-0.5 italic">"{assessment.vividFuture}"</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 6: Strengths & Development Areas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-emerald-100 bg-emerald-50/30 rounded-2xl p-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block mb-2">
                11. Strengths & What Is Going Well
              </span>
              <ul className="text-xs space-y-1 font-medium text-slate-700">
                {(assessment?.strengths || []).map((s, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">✓</span> {s}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border border-amber-100 bg-amber-50/30 rounded-2xl p-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block mb-2">
                12. Areas for Development
              </span>
              <ul className="text-xs space-y-1 font-medium text-slate-700">
                {(assessment?.developmentAreas || []).map((d, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-amber-600 font-bold">→</span> {d}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Section 7: Career Directions & Roadmap */}
          <div className="border border-slate-200 rounded-2xl p-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-2">
              16. Career Directions & 19-21. Multi-Horizon Development Roadmap
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs mb-3">
              {(assessment?.careerDirections || []).map((c, i) => (
                <div key={i} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50">
                  <span className="font-black text-slate-900 block">{c.title}</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">{c.alignmentRationale}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
              <div>
                <strong className="text-orange-600 block text-[11px]">3 Months (Immediate):</strong>
                <ul className="space-y-1 mt-1 text-[11px] text-slate-700">
                  {(assessment?.roadmap?.threeMonths || []).map((a, i) => (
                    <li key={i}>• {a}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong className="text-indigo-600 block text-[11px]">6 Months (Capabilities):</strong>
                <ul className="space-y-1 mt-1 text-[11px] text-slate-700">
                  {(assessment?.roadmap?.sixMonths || []).map((a, i) => (
                    <li key={i}>• {a}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong className="text-emerald-600 block text-[11px]">12 Months (Readiness):</strong>
                <ul className="space-y-1 mt-1 text-[11px] text-slate-700">
                  {(assessment?.roadmap?.twelveMonths || []).map((a, i) => (
                    <li key={i}>• {a}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
            This document is generated by the SSES Management System AI Purpose & Vision Intelligence Module. It provides developmental self-reflection and mentoring guidance.
          </div>
        </div>
      </div>
    </div>
  );
}
