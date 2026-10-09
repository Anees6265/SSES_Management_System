import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Flame,
  Target,
  Compass,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  Send,
  Edit3,
  Check,
  X,
  Info,
  Clock,
  ChevronRight,
  AlertCircle,
  Lightbulb,
  ThumbsUp,
  Award,
  Layers,
  User,
} from "lucide-react";
import { toast } from "react-toastify";

const PHASES = [
  { key: "myself", title: "1. Understand Myself", subtitle: "Experiences & Learning", icon: User, color: "cyan" },
  { key: "passion", title: "2. Passions", subtitle: "What energizes me?", icon: Flame, color: "orange" },
  { key: "patterns", title: "3. Patterns", subtitle: "Recurring Drivers", icon: Sparkles, color: "purple" },
  { key: "purpose", title: "4. Purpose", subtitle: "Why does it matter?", icon: Target, color: "amber" },
  { key: "vision", title: "5. Vision Exercises", subtitle: "Ideal Day & Directions", icon: Compass, color: "indigo" },
  { key: "review", title: "6. Review & Confirm", subtitle: "Does this reflect you?", icon: CheckCircle2, color: "emerald" },
];

export default function AIDiscoveryWizard({
  assessment,
  studentContext = {},
  onSubmitStep,
  onResetDiscovery,
  onConfirmThesis,
  onClose,
  isSubmitting = false,
}) {
  const [inputText, setInputText] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editablePurpose, setEditablePurpose] = useState("");
  const [editableVision, setEditableVision] = useState("");
  const [careerPreferences, setCareerPreferences] = useState({});
  const [studentNote, setStudentNote] = useState("");
  const [activeTab, setActiveTab] = useState("conversation"); // "conversation" | "insights"
  const chatBottomRef = useRef(null);

  const discoveryState = assessment?.discoveryState || {
    currentPhase: "myself",
    currentStepKey: "myself_intro",
    explicitInsights: [],
    inferredPatterns: [],
    uncertainties: [],
    isDiscoveryCompleted: false,
  };

  const chatHistory = assessment?.discoveryChat || [];
  const latestAiTurn = [...chatHistory].reverse().find((m) => m.sender === "ai") || {
    phase: "myself",
    stepKey: "myself_intro",
    message: "Welcome to your AI Personal Discovery & Vision Journey! Before choosing a career, let's explore who you are. Tell me about something you created, improved, organized, or imagined (in school, college, home, or community). What part of that did you enjoy most?",
    contextHelp: "Understand Myself: Pehle khud ko samajhna zaroori hai. Humein sirf adjectives (jaise creative ya hard-working) nahi chahiye, balki aapke real experiences. Aisi cheez batayein jise aapne kabhi banaya, improve kiya, organise kiya ya imagine kiya — aur usme sabse zyada kya pasand aaya?",
    quickOptions: [
      "Organized a college/school event, fest, or group activity",
      "Created or built a project, digital work, artwork, or craft",
      "Helped family, friends, or neighbors solve a practical problem",
      "Explained difficult subjects or mentored younger peers",
      "Managed finances, budget, or small sales/business activity",
      "Investigated an interesting question or ran an experiment",
      "Worked with plants, agriculture, or living systems",
      "I am exploring my past experiences (let me type my own story)",
    ],
    allowCustom: true,
  };

  const isReviewPhase = discoveryState.currentStepKey === "review" || discoveryState.currentPhase === "review";

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory.length, isReviewPhase]);

  // Synchronize draft purpose & vision statements for the review screen
  useEffect(() => {
    if (assessment?.purposeStatement && !editablePurpose) {
      setEditablePurpose(assessment.confirmedPurpose || assessment.purposeStatement);
    }
    if (assessment?.visionStatement && !editableVision) {
      setEditableVision(assessment.confirmedVision || assessment.visionStatement);
    }
  }, [assessment?.purposeStatement, assessment?.visionStatement]);

  // Handle option selection
  const handleSelectOption = (opt) => {
    setSelectedOption(opt);
    setInputText(opt);
  };

  // Submit current answer
  const handleSend = async (e) => {
    if (e) e.preventDefault();
    const answer = inputText.trim() || selectedOption.trim();
    if (!answer) {
      toast.warning("Please type an answer or select an option to continue.");
      return;
    }

    try {
      await onSubmitStep({
        stepKey: latestAiTurn.stepKey || discoveryState.currentStepKey,
        studentAnswer: answer,
        phase: discoveryState.currentPhase,
      });
      setInputText("");
      setSelectedOption("");
    } catch {
      toast.error("Failed to process your response. Please try again.");
    }
  };

  // Handle Reset Discovery
  const handleReset = async () => {
    if (window.confirm("Start discovery conversation from the beginning? Your previous responses will be cleared.")) {
      try {
        await onResetDiscovery();
        setInputText("");
        setSelectedOption("");
        toast.info("Discovery conversation restarted from Step 1.");
      } catch {
        toast.error("Failed to reset conversation.");
      }
    }
  };

  // Final confirmation
  const handleFinalConfirm = async () => {
    try {
      const compiledPreferences = Object.entries(careerPreferences).map(([title, status]) => ({
        title,
        interestStatus: status,
        studentNote: studentNote || "",
      }));

      await onConfirmThesis({
        confirmedPurpose: editablePurpose.trim() || assessment.purposeStatement,
        confirmedVision: editableVision.trim() || assessment.visionStatement,
        confirmedCareerDirections: compiledPreferences,
        studentCommitment: assessment.studentCommitment || "",
        studentReflection: studentNote || "",
      });
      toast.success("AI Thesis successfully synthesized based on your confirmed inputs!");
      if (onClose) onClose();
    } catch {
      toast.error("Failed to confirm thesis. Please try again.");
    }
  };

  // Determine current active phase index (0..3)
  const currentPhaseIndex = PHASES.findIndex((p) => p.key === discoveryState.currentPhase) >= 0
    ? PHASES.findIndex((p) => p.key === discoveryState.currentPhase)
    : 0;

  return (
    <div className="bg-white flex flex-col h-full w-full overflow-hidden text-slate-900">
      {/* ── Fixed Header & Phase Navigation ── */}
      <div className="px-4 sm:px-6 py-3.5 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                AI Passion & Vision Discovery
              </h3>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                Live Guided
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
              Understand yourself → Uncover driving passions → Clarify purpose → Shape your vision
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleReset}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-[11px] font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
            title="Restart discovery from Step 1"
          >
            <RotateCcw size={12} />
            <span>Restart</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── Interactive 4-Phase Progress Bar ── */}
      <div className="bg-slate-50/80 px-4 sm:px-6 py-2.5 border-b border-slate-100 shrink-0">
        <div className="grid grid-cols-4 gap-2">
          {PHASES.map((p, idx) => {
            const isCompleted = idx < currentPhaseIndex || isReviewPhase;
            const isCurrent = idx === currentPhaseIndex && !isReviewPhase;
            const Icon = p.icon;

            return (
              <div key={p.key} className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                      isCompleted
                        ? "bg-emerald-500 text-white"
                        : isCurrent
                        ? "bg-orange-500 text-white ring-2 ring-orange-200"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {isCompleted ? <Check size={11} /> : idx + 1}
                  </div>
                  <span
                    className={`text-[11px] font-bold truncate hidden sm:inline ${
                      isCurrent ? "text-slate-900 font-black" : "text-slate-500"
                    }`}
                  >
                    {p.title}
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isCompleted
                        ? "bg-emerald-500 w-full"
                        : isCurrent
                        ? "bg-orange-500 w-2/3"
                        : "w-0"
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Main Body ── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 overscroll-contain">
        {/* If in Review Phase: Show Structured Confirmation Screen */}
        {isReviewPhase ? (
          <div className="max-w-2xl mx-auto space-y-5 animate-in fade-in duration-200">
            {/* Confirmation Banner */}
            <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 rounded-3xl p-5 sm:p-6 text-white shadow-sm space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-100 bg-white/20 px-2.5 py-0.5 rounded-full inline-block">
                Final Step • Review & Confirm
              </span>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                Does this reflect your authentic thinking?
              </h3>
              <p className="text-xs text-white/90 leading-relaxed font-medium">
                Here is what the AI synthesized from your discovery conversation. You have full control: you can edit your purpose statement, vision, or adjust your career preferences before generating your final AI thesis.
              </p>
            </div>

            {/* Section 1: What I Understood About Your Passions */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-2">
                <Flame size={16} className="text-orange-500" />
                <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                  1. What I Understood About Your Passions
                </h4>
              </div>

              {discoveryState.explicitInsights?.length > 0 ? (
                <div className="space-y-1.5">
                  {discoveryState.explicitInsights.map((item, i) => (
                    <div key={i} className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-start gap-2">
                      <CheckCircle2 size={13} className="text-orange-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Top stated passion: {assessment?.topPassions?.[0]?.name || "Continuous learning and real-world problem solving"}
                </p>
              )}

              {/* Inferred Patterns vs Uncertainties */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/80 text-xs space-y-1">
                  <span className="font-bold text-amber-900 block text-[11px] uppercase">
                    ✨ Patterns Inferred by AI
                  </span>
                  <p className="text-slate-700 text-[11px] leading-relaxed">
                    {discoveryState.inferredPatterns?.[0] || "Shows natural motivation towards turning concepts into demonstrable solutions."}
                  </p>
                </div>

                <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200/80 text-xs space-y-1">
                  <span className="font-bold text-blue-900 block text-[11px] uppercase">
                    ❓ Unverified / Open to Exploration
                  </span>
                  <p className="text-slate-700 text-[11px] leading-relaxed">
                    {discoveryState.uncertainties?.[0] || "Specific career path can be tested through 14-day discovery experiments without locking in early."}
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2: Editable Draft Purpose Statement */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target size={16} className="text-amber-500" />
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                    2. Draft Purpose Statement (Why It Matters)
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setEditMode(!editMode)}
                  className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 size={12} />
                  <span>{editMode ? "Done Editing" : "Edit Statement"}</span>
                </button>
              </div>

              {editMode ? (
                <div className="space-y-2">
                  <textarea
                    rows={3}
                    value={editablePurpose}
                    onChange={(e) => setEditablePurpose(e.target.value)}
                    className="w-full p-3 rounded-xl border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs sm:text-sm bg-amber-50/30"
                    placeholder="Refine your purpose statement in your own words..."
                  />
                  <span className="text-[10px] text-slate-500 block">
                    Tip: State what you enjoy doing, what values guide you, and what impact you want to create.
                  </span>
                </div>
              ) : (
                <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-100 text-xs sm:text-sm font-bold text-slate-900 leading-relaxed italic">
                  "{editablePurpose || assessment?.purposeStatement || "My purpose is to apply continuous learning and technology to solve meaningful real-world challenges."}"
                </div>
              )}
            </div>

            {/* Section 3: Editable Draft Vision Statement */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Compass size={16} className="text-indigo-600" />
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                    3. Draft Vision Statement (3-5 Year Horizon)
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setEditMode(!editMode)}
                  className="text-xs font-bold text-indigo-700 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 size={12} />
                  <span>{editMode ? "Done Editing" : "Edit Statement"}</span>
                </button>
              </div>

              {editMode ? (
                <div className="space-y-2">
                  <textarea
                    rows={3}
                    value={editableVision}
                    onChange={(e) => setEditableVision(e.target.value)}
                    className="w-full p-3 rounded-xl border border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm bg-indigo-50/30"
                    placeholder="Refine your 3-5 year vision in your own words..."
                  />
                </div>
              ) : (
                <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100 text-xs sm:text-sm font-bold text-slate-900 leading-relaxed italic">
                  "{editableVision || assessment?.visionStatement || "My vision is to master end-to-end execution over the next 3–5 years and contribute to innovative solutions."}"
                </div>
              )}
            </div>

            {/* Section 4: Potential Career Directions Feedback */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award size={16} className="text-emerald-600" />
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                    4. Potential Career Directions
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-slate-500">
                  Mark what you would like to explore
                </span>
              </div>

              <div className="space-y-2">
                {(
                  Array.isArray(assessment?.careerDirections) && assessment.careerDirections.length > 0
                    ? assessment.careerDirections.map((c) => c.title)
                    : [
                        assessment?.topPassions?.[0]?.name ? `${assessment.topPassions[0].name} Specialist` : "Professional Domain Specialist",
                        "Strategic Systems & Project Associate",
                        "Venture Builder & Innovation Lead",
                      ]
                ).map((title) => {
                  const currentPref = careerPreferences[title] || "exploring";
                  return (
                    <div
                      key={title}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div>
                        <span className="text-xs font-black text-slate-900 block">{title}</span>
                        <span className="text-[11px] text-slate-500">Includes 14-day discovery micro-experiment</span>
                      </div>
                      <div className="flex items-center gap-1.5 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setCareerPreferences((p) => ({ ...p, [title]: "interested" }))}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                            currentPref === "interested"
                              ? "bg-emerald-600 text-white font-black"
                              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          👍 Interested
                        </button>
                        <button
                          type="button"
                          onClick={() => setCareerPreferences((p) => ({ ...p, [title]: "exploring" }))}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                            currentPref === "exploring"
                              ? "bg-amber-500 text-white font-black"
                              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          🔍 Exploring
                        </button>
                        <button
                          type="button"
                          onClick={() => setCareerPreferences((p) => ({ ...p, [title]: "not_interested" }))}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                            currentPref === "not_interested"
                              ? "bg-rose-600 text-white font-black"
                              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          ✕ Not For Me
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Additional Student Reflection Notes */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-2">
              <label className="text-xs font-black text-slate-900 block">
                Any additional context or reflection you'd like to include? (Optional)
              </label>
              <input
                type="text"
                value={studentNote}
                onChange={(e) => setStudentNote(e.target.value)}
                placeholder="e.g., I'm especially keen on learning React and participating in hackathons this semester..."
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
              >
                ← Back to Discovery Conversation
              </button>

              <button
                type="button"
                onClick={handleFinalConfirm}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs transition flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/20 active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                <Sparkles size={16} />
                <span>Confirm & Synthesize AI Thesis Report ✨</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ) : (
          /* Conversational Chat Feed */
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Concept Explanation Card (Hinglish + Simple English) */}
            {latestAiTurn.contextHelp && (
              <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50/60 p-4 rounded-2xl border border-orange-200/80 text-xs text-orange-950 space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-1.5 font-black text-orange-900 text-[11px] uppercase tracking-wider">
                  <Lightbulb size={14} className="text-orange-600 shrink-0" />
                  <span>Discovery Guide • Easy Explanation</span>
                </div>
                <p className="leading-relaxed font-medium text-slate-800">
                  {latestAiTurn.contextHelp}
                </p>
              </div>
            )}

            {/* Conversation Messages */}
            <div className="space-y-3 pt-2">
              {chatHistory.map((msg, idx) => {
                const isAi = msg.sender === "ai";
                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-2.5 ${isAi ? "justify-start" : "justify-end"}`}
                  >
                    {isAi && (
                      <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-2xs text-xs font-black">
                        AI
                      </div>
                    )}

                    <div
                      className={`p-3.5 rounded-2xl text-xs sm:text-sm max-w-[85%] leading-relaxed ${
                        isAi
                          ? "bg-white border border-slate-200 text-slate-900 shadow-2xs rounded-tl-xs"
                          : "bg-slate-900 text-white font-medium rounded-tr-xs"
                      }`}
                    >
                      {msg.message}
                    </div>

                    {!isAi && (
                      <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 text-xs font-bold">
                        You
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Typing / Loading indicator */}
              {isSubmitting && (
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-white p-3 rounded-2xl border border-slate-200 w-fit">
                  <div className="w-3.5 h-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  <span>AI is understanding your response...</span>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Suggested Quick Options */}
            {latestAiTurn.quickOptions?.length > 0 && !isSubmitting && (
              <div className="pt-2 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Quick Suggestions (Or type in your own words below):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {latestAiTurn.quickOptions.map((opt, oIdx) => {
                    const isSelected = selectedOption === opt || inputText === opt;
                    return (
                      <button
                        key={oIdx}
                        type="button"
                        onClick={() => handleSelectOption(opt)}
                        className={`text-xs px-3 py-2 rounded-xl border text-left transition active:scale-[0.98] cursor-pointer ${
                          isSelected
                            ? "bg-orange-50 border-orange-500 text-orange-950 font-bold ring-1 ring-orange-500/20"
                            : "bg-white border-slate-200 text-slate-700 hover:border-orange-300 hover:bg-slate-50"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Fixed Bottom Input Toolbar (When Not in Review Mode) ── */}
      {!isReviewPhase && (
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-white shrink-0">
          <form onSubmit={handleSend} className="max-w-2xl mx-auto flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                setSelectedOption("");
              }}
              placeholder="Type your authentic answer or select an option above..."
              disabled={isSubmitting}
              className="flex-1 p-3 rounded-2xl border border-slate-200 text-xs sm:text-sm bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
            />
            <button
              type="submit"
              disabled={isSubmitting || (!inputText.trim() && !selectedOption.trim())}
              className="px-4 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 shrink-0"
            >
              <span>Send</span>
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
