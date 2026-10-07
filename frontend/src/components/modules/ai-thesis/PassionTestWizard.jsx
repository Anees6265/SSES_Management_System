import { useState } from "react";
import { Flame, Check, ArrowRight, Save, X } from "lucide-react";
import { toast } from "react-toastify";

// Compact, multi-domain curated passion library (3-5 to pick)
const PASSION_LIBRARY = [
  { id: "p1", category: "Core", label: "Solving difficult real-world problems", icon: "🧩" },
  { id: "p2", category: "Core", label: "Learning continuously & mastering skills", icon: "📚" },
  { id: "p3", category: "Core", label: "Helping people & social impact", icon: "🤝" },
  { id: "p4", category: "Core", label: "Financial independence & wealth building", icon: "💼" },
  { id: "p5", category: "Core", label: "Building useful software & tech products", icon: "💻" },
  { id: "p6", category: "Core", label: "Leading teams & organizing projects", icon: "👥" },
  { id: "p7", category: "Core", label: "Teaching & mentoring peers", icon: "🎓" },
  { id: "p8", category: "Core", label: "Scientific research & experimentation", icon: "🔬" },
  { id: "p9", category: "Core", label: "Starting an entrepreneurial business", icon: "🚀" },
  { id: "p10", category: "Core", label: "Creative design, storytelling & media", icon: "🎨" },
  { id: "p11", category: "Core", label: "Data analytics & strategic planning", icon: "📊" },
  { id: "p12", category: "Core", label: "Fitness, wellness & personal discipline", icon: "⚡" },
];

export default function PassionTestWizard({
  initialData = {},
  onSave,
  onClose,
  isSaving = false,
}) {
  const [step, setStep] = useState(1); // 1: Select | 2: Rate Top Passions
  const [customInput, setCustomInput] = useState("");

  // Step 1: Selected passions
  const [selectedPassions, setSelectedPassions] = useState(() => {
    if (initialData.topPassions?.length > 0) {
      return initialData.topPassions.map(p => p.name);
    }
    if (initialData.passionStatements?.length > 0) {
      return initialData.passionStatements;
    }
    return [
      "Solving difficult real-world problems",
      "Building useful software & tech products",
      "Learning continuously & mastering skills",
    ];
  });

  // Step 2: Top Passions with ratings & markers
  const [topPassions, setTopPassions] = useState(() => {
    if (initialData.topPassions?.length > 0) {
      return initialData.topPassions.map((p, idx) => ({
        name: p.name,
        originalStatement: p.originalStatement || `When my life is ideal, I am ${p.name.toLowerCase()}`,
        priority: p.priority || idx + 1,
        selfRatedImportance: typeof p.selfRatedImportance === "number" ? p.selfRatedImportance : 8,
        currentScore: typeof p.currentScore === "number" ? p.currentScore : 5,
        marker: p.markers?.[0] || "",
      }));
    }
    return [];
  });

  const togglePassion = (name) => {
    if (selectedPassions.includes(name)) {
      if (selectedPassions.length <= 3) {
        toast.info("Keep at least 3 passions selected.");
        return;
      }
      setSelectedPassions(prev => prev.filter(p => p !== name));
    } else {
      if (selectedPassions.length >= 6) {
        toast.info("3 to 5 passions are ideal for sharp focus.");
        return;
      }
      setSelectedPassions(prev => [...prev, name]);
    }
  };

  const addCustomPassion = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if (selectedPassions.includes(trimmed)) {
      toast.warning("Passion already selected");
      return;
    }
    setSelectedPassions(prev => [...prev, trimmed]);
    setCustomInput("");
  };

  const handleProceedToStep2 = () => {
    if (selectedPassions.length < 3) {
      toast.warning("Please select at least 3 passions.");
      return;
    }

    const existingMap = new Map((topPassions || []).map(p => [p.name, p]));
    const newTop = selectedPassions.slice(0, 5).map((name, idx) => {
      const existing = existingMap.get(name);
      return existing || {
        name,
        originalStatement: `When my life is ideal, I am engaged with ${name.toLowerCase()}`,
        priority: idx + 1,
        selfRatedImportance: 8,
        currentScore: 5,
        marker: `Dedicate 4 hours/week to ${name.toLowerCase()}`,
      };
    });

    setTopPassions(newTop);
    setStep(2);
  };

  const updateAttribute = (idx, field, val) => {
    setTopPassions(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleSubmit = async () => {
    const payload = {
      passionStatements: selectedPassions.map((p) => ({
        text: typeof p === "string" ? p : (p.text || p.name || ""),
        category: (typeof p === "object" && p?.category) || "General",
      })),
      topPassions: topPassions.map((p, idx) => {
        const importance = Number(p.selfRatedImportance) || 8;
        const current = Number(p.currentScore) || 5;
        const name = p.name || `Passion ${idx + 1}`;
        return {
          name,
          originalStatement: p.originalStatement || `When my life is ideal, I am engaged with ${name.toLowerCase()}`,
          priority: idx + 1,
          selfRatedImportance: importance,
          currentScore: current,
          passionGap: Math.max(0, importance - current),
          markers: p.marker ? [p.marker] : [`Consistent weekly practice in ${name.toLowerCase()}`],
        };
      }),
      isPassionTestCompleted: true,
    };

    try {
      await onSave(payload);
      toast.success("Passion Test saved!");
      if (onClose) onClose();
    } catch {
      toast.error("Failed to save Passion Test");
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden max-w-3xl mx-auto flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 bg-orange-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-xs">
            <Flame size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-gray-900">Passion Discovery Test</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                Step {step} of 2
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {step === 1 ? "Select 3 to 5 things that genuinely energize you" : "Rate importance vs. current daily expression"}
            </p>
          </div>
        </div>

        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
        )}
      </div>

      {/* STEP 1: Fast Selection */}
      {step === 1 && (
        <div className="p-5 sm:p-6 space-y-5 flex-1 overflow-y-auto max-h-[70vh]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700">
              When my life is ideal, I naturally enjoy:
            </span>
            <span className="text-xs font-black text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg">
              {selectedPassions.length} / 5 selected
            </span>
          </div>

          {/* Simple Compact Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {PASSION_LIBRARY.map(item => {
              const isSelected = selectedPassions.includes(item.label);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => togglePassion(item.label)}
                  className={`p-3 rounded-2xl border text-left transition flex items-center gap-3 ${
                    isSelected
                      ? "border-orange-500 bg-orange-50/70 shadow-2xs text-orange-950 font-bold"
                      : "border-gray-100 bg-gray-50/50 hover:bg-gray-50 text-gray-800"
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-xs flex-1 min-w-0 truncate">{item.label}</span>
                  <div
                    className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                      isSelected ? "bg-orange-500 border-orange-500 text-white" : "border-gray-300 bg-white"
                    }`}
                  >
                    {isSelected && <Check size={10} strokeWidth={3} />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom Input */}
          <div className="flex gap-2 pt-1">
            <input
              type="text"
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addCustomPassion()}
              placeholder="Or write a custom passion..."
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-orange-500 bg-gray-50/50"
            />
            <button
              type="button"
              onClick={addCustomPassion}
              className="px-3.5 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold transition shrink-0"
            >
              Add
            </button>
          </div>

          {/* Footer */}
          <div className="pt-2 border-t border-gray-100 flex justify-end">
            <button
              type="button"
              disabled={selectedPassions.length < 3}
              onClick={handleProceedToStep2}
              className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-40"
            >
              <span>Next: Rate Expression Gap</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Scoring & Gap */}
      {step === 2 && (
        <div className="p-5 sm:p-6 space-y-4 flex-1 overflow-y-auto max-h-[70vh]">
          <p className="text-xs text-gray-500">
            For each passion, rate how <strong>important</strong> it is to you (1-10) versus how actively you are <strong>currently living</strong> it (0-10).
          </p>

          <div className="space-y-3">
            {topPassions.map((p, idx) => {
              const imp = Number(p.selfRatedImportance) || 8;
              const cur = Number(p.currentScore) || 5;
              const gap = Math.max(0, imp - cur);

              return (
                <div key={p.name} className="p-3.5 rounded-2xl border border-gray-100 bg-gray-50/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-orange-500 text-white text-[11px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      {p.name}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                        gap >= 4 ? "bg-rose-100 text-rose-700" : gap >= 2 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      Gap: {gap} pts
                    </span>
                  </div>

                  {/* Compact Quick Rating */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[11px] text-gray-500 block mb-1">
                        Importance: <strong>{imp} / 10</strong>
                      </span>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={imp}
                        onChange={e => updateAttribute(idx, "selfRatedImportance", Number(e.target.value))}
                        className="w-full accent-orange-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <span className="text-[11px] text-gray-500 block mb-1">
                        Currently Living: <strong>{cur} / 10</strong>
                      </span>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={cur}
                        onChange={e => updateAttribute(idx, "currentScore", Number(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  <input
                    type="text"
                    value={p.marker || ""}
                    onChange={e => updateAttribute(idx, "marker", e.target.value)}
                    placeholder="Real-world marker (e.g., Spend 4 hrs/week, Build 1 project/month)..."
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
              );
            })}
          </div>

          {/* Footer */}
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
              disabled={isSaving}
              onClick={handleSubmit}
              className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <Save size={14} />
              <span>{isSaving ? "Saving..." : "Save Passion Test"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
