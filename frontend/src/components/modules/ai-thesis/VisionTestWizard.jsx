import { useState } from "react";
import { Compass, Check, ArrowRight, Sparkles, Save, X, Zap } from "lucide-react";
import { toast } from "react-toastify";

const CORE_VALUES = [
  "Growth", "Innovation", "Integrity", "Freedom", "Impact",
  "Excellence", "Leadership", "Service", "Family", "Creativity",
  "Discipline", "Curiosity"
];

export default function VisionTestWizard({
  initialData = {},
  onSave,
  onClose,
  isSaving = false,
}) {
  const [step, setStep] = useState(1); // 1: Values | 2: Purpose | 3: Future Vision

  // Step 1: Core values
  const [selectedValues, setSelectedValues] = useState(() => {
    if (initialData.coreValues?.length > 0) {
      return initialData.coreValues.map(v => v.name);
    }
    return ["Growth", "Innovation", "Integrity"];
  });

  // Step 2: Purpose & Why
  const [primaryGoal, setPrimaryGoal] = useState(() => {
    return initialData.fiveWhys?.[0]?.answer || "I want to become an expert professional solving challenging problems";
  });
  const [whyReason, setWhyReason] = useState(() => {
    return initialData.fiveWhys?.[1]?.answer || "Because I want my work to create tangible positive impact for society";
  });
  const [purposeStatement, setPurposeStatement] = useState(() => {
    return initialData.purposeStatement || "To apply problem-solving and modern skills to create impactful solutions that elevate lives.";
  });

  // Step 3: Vision & BHAG
  const [fiveYearGoal, setFiveYearGoal] = useState(() => {
    return initialData.fiveYearGoal || "Master advanced specialized domain skills and lead innovative projects.";
  });
  const [bhag, setBhag] = useState(() => {
    return initialData.bhag || "Lead a transformative venture or innovation impacting 50,000+ people.";
  });

  const toggleValue = (val) => {
    if (selectedValues.includes(val)) {
      if (selectedValues.length <= 2) {
        toast.info("Please keep at least 2 core values.");
        return;
      }
      setSelectedValues(prev => prev.filter(v => v !== val));
    } else {
      if (selectedValues.length >= 5) {
        toast.info("Pick 3 to 5 core values for best focus.");
        return;
      }
      setSelectedValues(prev => [...prev, val]);
    }
  };

  const handleSubmit = async () => {
    const compiledWhys = [
      { level: 1, question: "What is your primary professional ambition?", answer: primaryGoal },
      { level: 2, question: "Why is that deeply meaningful to you?", answer: whyReason },
    ];

    const payload = {
      coreValues: selectedValues.map((name, idx) => ({
        name,
        priority: idx + 1,
        reason: "Core guiding standard for my career and decisions.",
      })),
      fiveWhys: compiledWhys,
      purposeStatement,
      fiveYearGoal,
      tenYearGoal: `Lead transformative initiatives and mentor upcoming talent.`,
      bhag,
      isVisionTestCompleted: true,
    };

    try {
      await onSave(payload);
      toast.success("Vision & Purpose Test saved!");
      if (onClose) onClose();
    } catch {
      toast.error("Failed to save Vision Test");
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden max-w-3xl mx-auto flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 bg-indigo-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Compass size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-gray-900">Vision & Purpose Test</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                Step {step} of 3
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {step === 1 && "Select 3 to 5 core principles that guide your decisions"}
              {step === 2 && "Uncover your root purpose and craft your purpose statement"}
              {step === 3 && "Define your 5-year vision and one ambitious future goal"}
            </p>
          </div>
        </div>

        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
        )}
      </div>

      {/* STEP 1: Core Values */}
      {step === 1 && (
        <div className="p-5 sm:p-6 space-y-5 flex-1 overflow-y-auto max-h-[70vh]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700">
              Pick 3 to 5 values that matter most to you:
            </span>
            <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
              {selectedValues.length} / 5 selected
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {CORE_VALUES.map(val => {
              const isSelected = selectedValues.includes(val);
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => toggleValue(val)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-2xs scale-102"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  {isSelected && <Check size={12} strokeWidth={3} />}
                  <span>{val}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="button"
              disabled={selectedValues.length < 2}
              onClick={() => setStep(2)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-40"
            >
              <span>Next: Purpose Discovery</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Purpose */}
      {step === 2 && (
        <div className="p-5 sm:p-6 space-y-4 flex-1 overflow-y-auto max-h-[70vh]">
          <div className="space-y-1">
            <label className="text-xs font-black text-gray-800">
              1. What is your primary career aspiration?
            </label>
            <input
              type="text"
              value={primaryGoal}
              onChange={e => setPrimaryGoal(e.target.value)}
              placeholder="e.g., I want to become a successful software engineer / consultant..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-600 bg-gray-50/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black text-gray-800">
              2. Why is that deeply meaningful to you?
            </label>
            <input
              type="text"
              value={whyReason}
              onChange={e => setWhyReason(e.target.value)}
              placeholder="e.g., Because I want to use technology to solve real-world problems..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-600 bg-gray-50/50"
            />
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-1.5">
            <label className="text-xs font-black text-indigo-900 flex items-center gap-1">
              <Sparkles size={13} className="text-indigo-600" />
              Your Synthesized Purpose Statement (Editable)
            </label>
            <textarea
              rows={2}
              value={purposeStatement}
              onChange={e => setPurposeStatement(e.target.value)}
              className="w-full bg-white border border-indigo-200 rounded-xl p-2.5 text-xs font-medium focus:outline-none focus:border-indigo-600"
            />
          </div>

          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs font-bold text-gray-500 hover:text-gray-800"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <span>Next: Future Vision</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Vision & BHAG */}
      {step === 3 && (
        <div className="p-5 sm:p-6 space-y-4 flex-1 overflow-y-auto max-h-[70vh]">
          <div className="space-y-1">
            <label className="text-xs font-black text-gray-800">
              5-Year Vision (Role, skills mastered, environment)
            </label>
            <input
              type="text"
              value={fiveYearGoal}
              onChange={e => setFiveYearGoal(e.target.value)}
              placeholder="Where do you want to be in 5 years?"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-600 bg-gray-50/50"
            />
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1.5">
            <label className="text-xs font-black text-amber-900 flex items-center gap-1">
              <Zap size={13} className="text-amber-600" />
              One Big Ambitious Future Goal (BHAG)
            </label>
            <p className="text-[11px] text-amber-800">
              What is one bold goal that would make you extraordinarily proud if you achieved it?
            </p>
            <input
              type="text"
              value={bhag}
              onChange={e => setBhag(e.target.value)}
              placeholder="e.g., Build a software company powering 100K users / Lead a global team..."
              className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-xs font-bold text-gray-500 hover:text-gray-800"
            >
              ← Back
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSubmit}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <Save size={14} />
              <span>{isSaving ? "Saving..." : "Save Vision Test"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
