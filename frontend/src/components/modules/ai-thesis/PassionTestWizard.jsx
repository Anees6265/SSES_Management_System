import { useState, useMemo } from "react";
import {
  Flame,
  Check,
  ArrowRight,
  Save,
  X,
  Sparkles,
  HelpCircle,
  Search,
  Plus,
  Minus,
  ChevronLeft,
} from "lucide-react";
import { toast } from "react-toastify";

const CATEGORIES = [
  "All",
  "Tech & Coding",
  "Creative & Media",
  "Business & Leadership",
  "Personal & Impact",
];

const PASSION_LIBRARY = [
  {
    id: "p1",
    category: "Tech & Coding",
    label: "Coding & Software Development",
    subtitle: "Websites, mobile apps banana aur programming logic likhna",
    icon: "💻",
  },
  {
    id: "p2",
    category: "Tech & Coding",
    label: "Problem Solving & Logic",
    subtitle: "Mushkil logic, puzzles, DSA aur technical challenges solve karna",
    icon: "🧩",
  },
  {
    id: "p5",
    category: "Tech & Coding",
    label: "Data Science & AI Technology",
    subtitle: "Data analyze karna, machine learning aur AI tools explore karna",
    icon: "📊",
  },
  {
    id: "p3",
    category: "Creative & Media",
    label: "UI/UX Design & Creative Arts",
    subtitle: "Digital designs, user interfaces, visuals aur graphic layouts banana",
    icon: "🎨",
  },
  {
    id: "p9",
    category: "Creative & Media",
    label: "Communication, Writing & Media",
    subtitle: "Public speaking, content creation, technical writing aur presentations",
    icon: "📢",
  },
  {
    id: "p4",
    category: "Business & Leadership",
    label: "Startups & Entrepreneurship",
    subtitle: "Naye business ideas sochna, products launch karna aur startup build karna",
    icon: "🚀",
  },
  {
    id: "p7",
    category: "Business & Leadership",
    label: "Team Leadership & Event Management",
    subtitle: "Projects coordinate karna, team lead karna aur college events organize karna",
    icon: "👥",
  },
  {
    id: "p8",
    category: "Business & Leadership",
    label: "Finance, Money & Investing",
    subtitle: "Financial independence, investing, stock market aur business finance samajhna",
    icon: "💼",
  },
  {
    id: "p6",
    category: "Personal & Impact",
    label: "Helping & Mentoring Others",
    subtitle: "Dosto aur peers ko sikhana, guide karna aur social contribution",
    icon: "🤝",
  },
  {
    id: "p10",
    category: "Tech & Coding",
    label: "Science, Lab & Research",
    subtitle: "Scientific research, experiments aur new technology developments",
    icon: "🔬",
  },
  {
    id: "p11",
    category: "Personal & Impact",
    label: "Continuous Learning & New Skills",
    subtitle: "Har din nayi technologies aur certifications jaldi seekhna",
    icon: "📚",
  },
  {
    id: "p12",
    category: "Personal & Impact",
    label: "Fitness, Sports & Personal Discipline",
    subtitle: "Physical health, mental toughness aur daily productive routine",
    icon: "⚡",
  },
];

const PRESET_MARKERS = [
  "⏱ 3–4 hrs / week practical focus",
  "🚀 Build 1 project / month",
  "📚 Daily 45 mins practice",
  "🎯 Weekend deep work session",
];

export default function PassionTestWizard({
  initialData = {},
  onSave,
  onClose,
  isSaving = false,
}) {
  const [step, setStep] = useState(1); // 1: Select Passions | 2: Rate Focus Gap
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [customInput, setCustomInput] = useState("");

  // Step 1: Selected passions
  const [selectedPassions, setSelectedPassions] = useState(() => {
    if (initialData.topPassions?.length > 0) {
      return initialData.topPassions.map((p) => p.name);
    }
    if (initialData.passionStatements?.length > 0) {
      return initialData.passionStatements.map((s) =>
        typeof s === "string" ? s : s.text || s.name || ""
      );
    }
    return [];
  });

  // Step 2: Top Passions with ratings & markers
  const [topPassions, setTopPassions] = useState(() => {
    if (initialData.topPassions?.length > 0) {
      return initialData.topPassions.map((p, idx) => ({
        name: p.name,
        originalStatement:
          p.originalStatement ||
          `When my life is ideal, I am engaged with ${p.name.toLowerCase()}`,
        priority: p.priority || idx + 1,
        selfRatedImportance:
          typeof p.selfRatedImportance === "number" ? p.selfRatedImportance : 8,
        currentScore:
          typeof p.currentScore === "number" ? p.currentScore : 5,
        marker: p.markers?.[0] || PRESET_MARKERS[0],
      }));
    }
    return [];
  });

  // Filtered passions
  const filteredLibrary = useMemo(() => {
    return PASSION_LIBRARY.filter((item) => {
      const matchesCategory =
        activeCategory === "All" || item.category === activeCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const togglePassion = (name) => {
    if (selectedPassions.includes(name)) {
      setSelectedPassions((prev) => prev.filter((p) => p !== name));
    } else {
      if (selectedPassions.length >= 5) {
        toast.info("Aap maximum 5 passions choose kar sakte hain.");
        return;
      }
      setSelectedPassions((prev) => [...prev, name]);
    }
  };

  const addCustomPassion = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if (selectedPassions.includes(trimmed)) {
      toast.warning("Yeh passion pehle se selected hai.");
      return;
    }
    if (selectedPassions.length >= 5) {
      toast.info("Maximum 5 passions select kar sakte hain.");
      return;
    }
    setSelectedPassions((prev) => [...prev, trimmed]);
    setCustomInput("");
  };

  const handleProceedToStep2 = () => {
    if (selectedPassions.length < 3) {
      toast.warning("Kripya kam se kam 3 passions select karein.");
      return;
    }

    const existingMap = new Map((topPassions || []).map((p) => [p.name, p]));
    const newTop = selectedPassions.slice(0, 5).map((name, idx) => {
      const existing = existingMap.get(name);
      return (
        existing || {
          name,
          originalStatement: `When my life is ideal, I am engaged with ${name.toLowerCase()}`,
          priority: idx + 1,
          selfRatedImportance: 8,
          currentScore: 5,
          marker: PRESET_MARKERS[0],
        }
      );
    });

    setTopPassions(newTop);
    setStep(2);
  };

  const updateAttribute = (idx, field, val) => {
    setTopPassions((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const adjustScore = (idx, field, delta, min, max) => {
    setTopPassions((prev) => {
      const copy = [...prev];
      const curVal = Number(copy[idx][field]) || 0;
      const nextVal = Math.min(max, Math.max(min, curVal + delta));
      copy[idx] = { ...copy[idx], [field]: nextVal };
      return copy;
    });
  };

  const handleSubmit = async () => {
    const payload = {
      passionStatements: selectedPassions.map((p) => ({
        text: typeof p === "string" ? p : p.text || p.name || "",
        category: (typeof p === "object" && p?.category) || "General",
      })),
      topPassions: topPassions.map((p, idx) => {
        const importance = Number(p.selfRatedImportance) || 8;
        const current = Number(p.currentScore) || 5;
        const name = p.name || `Passion ${idx + 1}`;
        return {
          name,
          originalStatement:
            p.originalStatement ||
            `When my life is ideal, I am engaged with ${name.toLowerCase()}`,
          priority: idx + 1,
          selfRatedImportance: importance,
          currentScore: current,
          passionGap: Math.max(0, importance - current),
          markers: p.marker
            ? [p.marker]
            : [`Consistent weekly practice in ${name.toLowerCase()}`],
        };
      }),
      isPassionTestCompleted: true,
    };

    try {
      await onSave(payload);
      toast.success("Passion Test successfully saved!");
      if (onClose) onClose();
    } catch {
      toast.error("Failed to save Passion Test");
    }
  };

  return (
    <div className="bg-white flex flex-col h-full w-full overflow-hidden">
      {/* ── Fixed Header ── */}
      <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
            <Flame size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                Passion Discovery Test
              </h3>
              <span className="text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                Step {step} of 2
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium line-clamp-1">
              {step === 1
                ? "Select 3 to 5 core passions that naturally energize you"
                : "Rate importance vs current effort (Focus Gap)"}
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
          className="bg-gradient-to-r from-orange-500 to-amber-500 h-1.5 transition-all duration-300"
          style={{ width: step === 1 ? "50%" : "100%" }}
        />
      </div>

      {/* ── STEP 1: Passion Selection ── */}
      {step === 1 && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 overscroll-contain">
          {/* Quick Guide Card */}
          <div className="p-3.5 rounded-2xl bg-orange-50/80 border border-orange-200/80 flex items-start gap-3 text-xs text-orange-950 shadow-2xs">
            <Sparkles size={16} className="text-orange-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="font-black">Kaise choose karein?</strong> Jin cheezon ko karte waqt aapko time ka pata nahi chalta aur sikhne ka man karta hai, unhe tap karein. Minimum <strong>3</strong> aur maximum <strong>5</strong> select karein.
            </div>
          </div>

          {/* Search & Category Filter */}
          <div className="space-y-2.5">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search passions (e.g. Coding, Design, AI, Leadership)..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-orange-500 transition font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Category Pills (Horizontal scroll on mobile) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap cursor-pointer text-xs ${
                    activeCategory === cat
                      ? "bg-slate-900 text-white shadow-2xs font-black"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Selection Counter Bar */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Available Passions
            </span>
            <span
              className={`text-xs font-black px-3 py-1 rounded-xl transition ${
                selectedPassions.length >= 3
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : "bg-orange-100 text-orange-800 border border-orange-200"
              }`}
            >
              {selectedPassions.length} / 5 Selected{" "}
              {selectedPassions.length < 3 && `(${3 - selectedPassions.length} more needed)`}
            </span>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filteredLibrary.map((item) => {
              const isSelected = selectedPassions.includes(item.label);
              const selectionIndex = selectedPassions.indexOf(item.label);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => togglePassion(item.label)}
                  className={`p-3.5 rounded-2xl border text-left transition-all duration-150 flex items-start gap-3 cursor-pointer group active:scale-[0.98] ${
                    isSelected
                      ? "border-orange-500 bg-orange-50/70 shadow-xs ring-1 ring-orange-500/30"
                      : "border-slate-200/90 bg-white hover:border-orange-300 hover:bg-slate-50/60"
                  }`}
                >
                  <span className="text-2xl p-1 shrink-0 select-none">
                    {item.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span
                      className={`text-xs block font-bold leading-snug ${
                        isSelected ? "text-orange-950 font-black" : "text-slate-900"
                      }`}
                    >
                      {item.label}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5 leading-relaxed line-clamp-2 font-normal">
                      {item.subtitle}
                    </span>
                  </div>

                  <div
                    className={`w-6 h-6 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 transition ${
                      isSelected
                        ? "bg-orange-500 border-orange-500 text-white shadow-xs font-black text-[11px]"
                        : "border-slate-300 bg-white group-hover:border-orange-400"
                    }`}
                  >
                    {isSelected ? (
                      <span>#{selectionIndex + 1}</span>
                    ) : (
                      <span className="opacity-0 group-hover:opacity-100 text-orange-400 text-xs">+</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom Passion Input */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="text-[11px] font-bold text-slate-700 block">
              Kuch alag interest hai jo upar nahi mila? Yahan likhein:
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustomPassion()}
                placeholder="e.g. Game Dev, Cyber Security, Robotics, Cloud..."
                className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 font-medium"
              />
              <button
                type="button"
                onClick={addCustomPassion}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shrink-0 cursor-pointer active:scale-95"
              >
                + Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: Rating & Expression Gap ── */}
      {step === 2 && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 overscroll-contain">
          {/* Explanation Banner */}
          <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-xs text-amber-950 space-y-1 shadow-2xs">
            <div className="font-black flex items-center gap-1.5 text-amber-900">
              <HelpCircle size={15} />
              <span>Expression Gap Samajhein:</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-900/90">
              <strong>Importance (1-10):</strong> Yeh aapke liye kitna important hai. <br />
              <strong>Current Time & Effort (0-10):</strong> Abhi aap isme kitna time de pa rahe hain. <br />
              Dono ke difference ko AI analyse karke aapka weekly bridge plan banayega!
            </p>
          </div>

          {/* Each Passion Rating Card */}
          <div className="space-y-3.5">
            {topPassions.map((p, idx) => {
              const imp = Number(p.selfRatedImportance) || 8;
              const cur = Number(p.currentScore) || 5;
              const gap = Math.max(0, imp - cur);

              return (
                <div
                  key={p.name}
                  className="p-4 rounded-3xl border border-slate-200 bg-white space-y-3.5 shadow-xs hover:border-orange-300 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <span className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-orange-500 text-white text-xs font-black flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>
                      <span>{p.name}</span>
                    </span>

                    <span
                      className={`text-[11px] font-black px-2.5 py-1 rounded-xl self-start sm:self-auto border ${
                        gap >= 4
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : gap >= 2
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      Gap: {gap} pts {gap >= 4 ? "(Needs Focus)" : gap >= 2 ? "(Moderate)" : "(Balanced)"}
                    </span>
                  </div>

                  {/* 2 Touch-Friendly Sliders & Steppers */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Importance */}
                    <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-slate-700">
                          Importance (Aapke liye kitna zaroori hai):
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => adjustScore(idx, "selfRatedImportance", -1, 1, 10)}
                            className="w-6 h-6 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-700 font-bold active:scale-95"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md min-w-[2.2rem] text-center border border-orange-200/60">
                            {imp}/10
                          </span>
                          <button
                            type="button"
                            onClick={() => adjustScore(idx, "selfRatedImportance", 1, 1, 10)}
                            className="w-6 h-6 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-700 font-bold active:scale-95"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={imp}
                        onChange={(e) =>
                          updateAttribute(idx, "selfRatedImportance", Number(e.target.value))
                        }
                        className="w-full accent-orange-500 cursor-pointer h-2 bg-slate-200 rounded-lg"
                      />
                    </div>

                    {/* Current Effort */}
                    <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-slate-700">
                          Current Effort (Abhi kitna time dete hain):
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => adjustScore(idx, "currentScore", -1, 0, 10)}
                            className="w-6 h-6 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-700 font-bold active:scale-95"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md min-w-[2.2rem] text-center border border-indigo-200/60">
                            {cur}/10
                          </span>
                          <button
                            type="button"
                            onClick={() => adjustScore(idx, "currentScore", 1, 0, 10)}
                            className="w-6 h-6 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-700 font-bold active:scale-95"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={cur}
                        onChange={(e) =>
                          updateAttribute(idx, "currentScore", Number(e.target.value))
                        }
                        className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Target Chips */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-600 block">
                      Target Weekly Practice:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_MARKERS.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => updateAttribute(idx, "marker", chip)}
                          className={`text-[11px] px-2.5 py-1 rounded-xl border transition cursor-pointer font-medium ${
                            p.marker === chip
                              ? "bg-orange-500 text-white border-orange-500 font-black shadow-2xs"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Fixed Sticky Footer ── */}
      <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-t border-slate-100 bg-white/95 backdrop-blur-xs flex items-center justify-between gap-3 shrink-0">
        {step === 1 ? (
          <>
            <span className="text-xs text-slate-500 font-medium">
              {selectedPassions.length < 3
                ? `Need ${3 - selectedPassions.length} more to continue`
                : `${selectedPassions.length} passions selected`}
            </span>
            <button
              type="button"
              disabled={selectedPassions.length < 3}
              onClick={handleProceedToStep2}
              className="px-5 sm:px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white text-xs font-black transition flex items-center gap-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>Next: Rate Focus</span>
              <ArrowRight size={14} />
            </button>
          </>
        ) : (
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
              disabled={isSaving}
              onClick={handleSubmit}
              className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white text-xs font-black transition flex items-center gap-2 shadow-sm shadow-orange-500/20 cursor-pointer disabled:opacity-40"
            >
              <Save size={14} />
              <span>{isSaving ? "Saving..." : "Save Passion Test ✓"}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
