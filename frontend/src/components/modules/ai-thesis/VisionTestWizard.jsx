import { useState } from "react";
import {
  Compass,
  Check,
  ArrowRight,
  Save,
  X,
  Sparkles,
  Zap,
  Heart,
  ChevronLeft,
  Lightbulb,
} from "lucide-react";
import { toast } from "react-toastify";

const CORE_VALUES = [
  { name: "Growth", desc: "Har din nayi cheezein seekhna aur aage badhna", icon: "🌱" },
  { name: "Excellence", desc: "Apne kaam me sabse behtar standard achieve karna", icon: "⭐" },
  { name: "Impact", desc: "Dusro ki zindagi aur society me positive badlav lana", icon: "🌍" },
  { name: "Freedom", desc: "Financial aur creative independence hasil karna", icon: "🕊️" },
  { name: "Creativity", desc: "Naye ideas sochna aur unique solutions banana", icon: "💡" },
  { name: "Integrity", desc: "Sache mann aur imaandari ke sath kaam karna", icon: "🛡️" },
  { name: "Leadership", desc: "Team ko lead karna aur dusro ko inspire karna", icon: "👑" },
  { name: "Discipline", desc: "Daily consistency aur focus maintain karna", icon: "🎯" },
  { name: "Curiosity", desc: "Hamesha questions puchna aur explore karna", icon: "🔍" },
  { name: "Service", desc: "Community aur logon ki niswarth madad karna", icon: "🤝" },
];

const CAREER_SUGGESTIONS = [
  "Dedicated Educator & Academic Specialist",
  "Sustainable Agriculture & AgTech Professional",
  "Financial Analyst, Accountant & Advisory Associate",
  "Business Founder & Management Consultant",
  "Scientific Researcher & Laboratory Specialist",
  "Digital Experience Designer & Creative Artist",
  "Community Development & Social Impact Leader",
  "Software Solutions Developer & Technology Innovator",
  "Exploring multiple interdisciplinary directions",
];

const WHY_SUGGESTIONS = [
  "Family financial independence, stability & security",
  "Love teaching, mentoring and simplifying complex knowledge",
  "Passionate about solving real-world farm & living system problems",
  "Desire to build and scale an impactful commercial enterprise",
  "Scientific curiosity to discover, test and contribute to research",
  "Creative freedom, aesthetic craftsmanship & human impact",
];

const FIVE_YEAR_SUGGESTIONS = [
  "Leading a successful professional practice or enterprise in my domain",
  "Spearheading high-impact community or educational initiatives",
  "Developing innovative solutions for sustainable agriculture or business",
  "Managing advanced research or specialized corporate advisory projects",
  "Achieving respected expertise and mentoring junior peers in my field",
];

const BHAG_SUGGESTIONS = [
  "Build a thriving enterprise or initiative benefiting 25,000+ people",
  "Empower thousands of learners or local farmers with practical solutions",
  "Achieve total financial independence and support my family's dreams",
  "Publish groundbreaking research or build celebrated creative products",
  "Lead a recognized organization driving sustainable regional progress",
];

export default function VisionTestWizard({
  initialData = {},
  onSave,
  onClose,
  isSaving = false,
}) {
  const [step, setStep] = useState(1); // 1: Core Values | 2: Career Purpose | 3: Future Vision

  // Step 1: Core values
  const [selectedValues, setSelectedValues] = useState(() => {
    if (initialData.coreValues?.length > 0) {
      return initialData.coreValues.map((v) => (typeof v === "string" ? v : v.name));
    }
    return [];
  });

  // Step 2: Purpose & Why
  const [primaryGoal, setPrimaryGoal] = useState(() => {
    return initialData.fiveWhys?.[0]?.answer || "";
  });
  const [whyReason, setWhyReason] = useState(() => {
    return initialData.fiveWhys?.[1]?.answer || "";
  });

  // Step 3: Vision & BHAG
  const [fiveYearGoal, setFiveYearGoal] = useState(() => {
    return initialData.fiveYearGoal || "";
  });
  const [bhag, setBhag] = useState(() => {
    return initialData.bhag || "";
  });

  const toggleValue = (valName) => {
    if (selectedValues.includes(valName)) {
      setSelectedValues((prev) => prev.filter((v) => v !== valName));
    } else {
      if (selectedValues.length >= 5) {
        toast.info("Aap maximum 5 core values select kar sakte hain.");
        return;
      }
      setSelectedValues((prev) => [...prev, valName]);
    }
  };

  const handleSubmit = async () => {
    if (selectedValues.length < 2) {
      toast.warning("Kripya kam se kam 2 core values select karein.");
      setStep(1);
      return;
    }

    if (!primaryGoal.trim()) {
      toast.warning("Kripya apna career goal likhein.");
      setStep(2);
      return;
    }

    const compiledWhys = [
      {
        level: 1,
        question: "What is your primary professional ambition?",
        answer: primaryGoal.trim(),
      },
      {
        level: 2,
        question: "Why is that deeply meaningful to you?",
        answer:
          whyReason.trim() ||
          "To build a successful, meaningful career and support my family and community.",
      },
    ];

    const payload = {
      coreValues: selectedValues.map((name, idx) => ({
        name,
        priority: idx + 1,
        reason: "Core guiding standard for my career and decisions.",
      })),
      fiveWhys: compiledWhys,
      fiveYearGoal: fiveYearGoal.trim(),
      tenYearGoal:
        "Assume domain leadership, build impactful solutions, and mentor future peers.",
      bhag: bhag.trim(),
      isVisionTestCompleted: true,
    };

    try {
      await onSave(payload);
      toast.success("Vision & Purpose Test successfully saved!");
      if (onClose) onClose();
    } catch {
      toast.error("Failed to save Vision Test");
    }
  };

  return (
    <div className="bg-white flex flex-col h-full w-full overflow-hidden">
      {/* ── Fixed Header ── */}
      <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Compass size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                Vision & Purpose Test
              </h3>
              <span className="text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                Step {step} of 3
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium line-clamp-1">
              {step === 1 && "Select 2 to 5 core guiding values"}
              {step === 2 && "State your ambition & why it matters to you"}
              {step === 3 && "Set your 3-5 year goal & Big Dream (BHAG)"}
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0 cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* ── Progress Track ── */}
      <div className="w-full bg-slate-100 h-1.5 shrink-0">
        <div
          className="bg-gradient-to-r from-indigo-600 to-purple-600 h-1.5 transition-all duration-300"
          style={{ width: step === 1 ? "33%" : step === 2 ? "66%" : "100%" }}
        />
      </div>

      {/* ── STEP 1: Core Values ── */}
      {step === 1 && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 overscroll-contain">
          <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200/80 flex items-start gap-3 text-xs text-indigo-950 shadow-2xs">
            <Heart size={16} className="text-indigo-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="font-black">Core Values ka matlab:</strong> Yeh wo principles hain jinhe aap apne career aur life decisions me sabse zyada ahmiyat dete hain. Minimum <strong>2</strong> aur maximum <strong>5</strong> select karein.
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Choose Guiding Values
            </span>
            <span
              className={`text-xs font-black px-3 py-1 rounded-xl transition ${
                selectedValues.length >= 2
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : "bg-indigo-100 text-indigo-800 border border-indigo-200"
              }`}
            >
              {selectedValues.length} / 5 Selected{" "}
              {selectedValues.length < 2 && `(${2 - selectedValues.length} more needed)`}
            </span>
          </div>

          {/* Core Values Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {CORE_VALUES.map((val) => {
              const isSelected = selectedValues.includes(val.name);
              return (
                <button
                  key={val.name}
                  type="button"
                  onClick={() => toggleValue(val.name)}
                  className={`p-3.5 rounded-2xl border text-left transition-all duration-150 flex items-start gap-3 cursor-pointer group active:scale-[0.98] ${
                    isSelected
                      ? "border-indigo-600 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-600/30"
                      : "border-slate-200/90 bg-white hover:border-indigo-300 hover:bg-slate-50/60"
                  }`}
                >
                  <span className="text-2xl p-1 shrink-0 select-none">{val.icon}</span>
                  <div className="flex-1 min-w-0">
                    <span
                      className={`text-xs block font-bold leading-snug ${
                        isSelected ? "text-indigo-950 font-black" : "text-slate-900"
                      }`}
                    >
                      {val.name}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5 leading-relaxed line-clamp-2 font-normal">
                      {val.desc}
                    </span>
                  </div>

                  <div
                    className={`w-6 h-6 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 transition ${
                      isSelected
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-xs font-black text-[11px]"
                        : "border-slate-300 bg-white group-hover:border-indigo-400"
                    }`}
                  >
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── STEP 2: Career Purpose & Why ── */}
      {step === 2 && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 overscroll-contain">
          <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200/80 text-xs text-indigo-950 space-y-1 shadow-2xs">
            <div className="font-black flex items-center gap-1.5 text-indigo-900">
              <Sparkles size={15} />
              <span>Aapka Career Dream & Motivation:</span>
            </div>
            <p className="text-[11px] text-indigo-900/90 leading-relaxed">
              Batayein ki aap kya banna chahte hain aur yeh aapke liye kyun zaroori hai. AI isse aapka authentic <strong>Purpose Statement</strong> synthesize karega.
            </p>
          </div>

          <div className="space-y-4">
            {/* Input 1 */}
            <div className="space-y-2 bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs">
              <label className="text-xs font-black text-slate-900 block">
                1. Aapka primary career goal kya hai? (What do you want to become?)
              </label>
              <input
                type="text"
                value={primaryGoal}
                onChange={(e) => setPrimaryGoal(e.target.value)}
                placeholder="e.g. Full-Stack Software Developer, Data Scientist, UI/UX Designer..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 transition"
              />

              {/* Suggestions chips */}
              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Lightbulb size={11} className="text-amber-500" />
                  <span>Tap to choose suggestion:</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {CAREER_SUGGESTIONS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setPrimaryGoal(item)}
                      className={`text-[11px] px-2.5 py-1 rounded-xl border transition cursor-pointer font-medium ${
                        primaryGoal === item
                          ? "bg-indigo-600 text-white border-indigo-600 font-black shadow-2xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Input 2 */}
            <div className="space-y-2 bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs">
              <label className="text-xs font-black text-slate-900 block">
                2. Yeh goal aapke liye kyun zaroori hai? (Why does this matter to you?)
              </label>
              <textarea
                rows={3}
                value={whyReason}
                onChange={(e) => setWhyReason(e.target.value)}
                placeholder="e.g. Because I love solving technical logic, want financial independence, and want to support my family..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-900 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 transition"
              />

              {/* Suggestions chips */}
              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Lightbulb size={11} className="text-amber-500" />
                  <span>Tap to append inspiration:</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {WHY_SUGGESTIONS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        setWhyReason((prev) =>
                          prev ? `${prev}. ${item}` : item
                        )
                      }
                      className="text-[11px] px-2.5 py-1 rounded-xl bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition cursor-pointer font-medium"
                    >
                      + {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: 5-Year Goal & Big Dream ── */}
      {step === 3 && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 overscroll-contain">
          <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-xs text-amber-950 space-y-1 shadow-2xs">
            <div className="font-black flex items-center gap-1.5 text-amber-900">
              <Zap size={15} />
              <span>Future Horizon & Bold Ambition:</span>
            </div>
            <p className="text-[11px] text-amber-900/90 leading-relaxed">
              Agale 3-5 saal ka clear milestone aur aapka sabse bada sapna jise achieve karke aapko aur aapki family ko proud feel hoga!
            </p>
          </div>

          <div className="space-y-4">
            {/* 3-5 Year Goal */}
            <div className="space-y-2 bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs">
              <label className="text-xs font-black text-slate-900 block">
                3–5 Year Goal: (Skills, role & growth target)
              </label>
              <input
                type="text"
                value={fiveYearGoal}
                onChange={(e) => setFiveYearGoal(e.target.value)}
                placeholder="e.g. Senior Software Engineer at a top firm leading production projects..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:bg-white focus:border-indigo-600 transition"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {FIVE_YEAR_SUGGESTIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setFiveYearGoal(item)}
                    className="text-[11px] px-2.5 py-1 rounded-xl bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition cursor-pointer font-medium"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* BHAG */}
            <div className="space-y-2 bg-gradient-to-br from-amber-50/60 to-orange-50/60 p-4 rounded-3xl border border-amber-200/80 shadow-2xs">
              <label className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                <Zap size={15} className="text-amber-600" />
                <span>Aapka Sabse Bada Sapna (Big Ambitious Dream - BHAG):</span>
              </label>
              <p className="text-[11px] text-amber-900 leading-snug">
                Koi aisa bold aur courageous dream jo aapko daily hard work ke liye inspire kare:
              </p>
              <input
                type="text"
                value={bhag}
                onChange={(e) => setBhag(e.target.value)}
                placeholder="e.g. Build a tech platform empowering 50,000+ users / Launch a successful startup..."
                className="w-full bg-white border border-amber-300 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-amber-500 transition shadow-2xs"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {BHAG_SUGGESTIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setBhag(item)}
                    className="text-[11px] px-2.5 py-1 rounded-xl bg-white text-amber-900 border border-amber-200 hover:bg-amber-100/60 transition cursor-pointer font-medium shadow-2xs"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Fixed Sticky Footer ── */}
      <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-t border-slate-100 bg-white/95 backdrop-blur-xs flex items-center justify-between gap-3 shrink-0">
        {step === 1 ? (
          <>
            <span className="text-xs text-slate-500 font-medium">
              {selectedValues.length < 2
                ? `Need ${2 - selectedValues.length} more to continue`
                : `${selectedValues.length} values selected`}
            </span>
            <button
              type="button"
              disabled={selectedValues.length < 2}
              onClick={() => setStep(2)}
              className="px-5 sm:px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-black transition flex items-center gap-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>Next: Purpose</span>
              <ArrowRight size={14} />
            </button>
          </>
        ) : step === 2 ? (
          <>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <ChevronLeft size={15} />
              <span>Back</span>
            </button>
            <button
              type="button"
              disabled={!primaryGoal.trim()}
              onClick={() => setStep(3)}
              className="px-5 sm:px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-black transition flex items-center gap-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>Next: Future Vision</span>
              <ArrowRight size={14} />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <ChevronLeft size={15} />
              <span>Back</span>
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSubmit}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-black transition flex items-center gap-2 shadow-sm shadow-indigo-600/20 cursor-pointer disabled:opacity-40"
            >
              <Save size={14} />
              <span>{isSaving ? "Saving..." : "Save Vision Test ✓"}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
