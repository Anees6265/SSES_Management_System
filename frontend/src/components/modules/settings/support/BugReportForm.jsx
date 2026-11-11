/* eslint-disable react/prop-types */
import { useState, useRef, useMemo, useEffect } from "react";
import {
  MdBugReport,
  MdCloudUpload,
  MdDeleteOutline,
  MdSend,
  MdCheckCircle,
  MdLaptopMac,
  MdPhone,
  MdEmail,
  MdArrowForward,
} from "react-icons/md";
import { toast } from "react-toastify";
import { useCreateSupportTicketMutation } from "../../../../redux/api/authApi";
import SelectDropdown from "../../../shared/form-fields/SelectDropdown";
import {
  ISSUE_TYPES,
  PORTAL_MODULES,
  SEVERITY_OPTIONS,
  captureEnvironmentInfo,
} from "./supportConstants";

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const BugReportForm = ({
  developers = [],
  reporter = {},
  initialTargetDeveloper = "both",
  onTicketCreated,
  onViewTickets,
}) => {
  const fileRef = useRef(null);
  const [type, setType] = useState("bug");
  const [severity, setSeverity] = useState("medium");
  const [module, setModule] = useState("Task Management");
  const [targetDeveloper, setTargetDeveloper] = useState(initialTargetDeveloper || "both");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [screenshots, setScreenshots] = useState([]);
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [lastCreatedTicket, setLastCreatedTicket] = useState(null);

  const [createTicket, { isLoading }] = useCreateSupportTicketMutation();
  const envInfo = useMemo(() => captureEnvironmentInfo(), []);

  useEffect(() => {
    if (initialTargetDeveloper) {
      setTargetDeveloper(initialTargetDeveloper);
    }
  }, [initialTargetDeveloper]);

  const handleFiles = async (fileList) => {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;

    const remaining = 3 - screenshots.length;
    if (remaining <= 0) {
      toast.warn("Maximum 3 screenshots allowed per ticket");
      return;
    }

    const validFiles = incoming.slice(0, remaining).filter((f) => {
      if (!/^image\/(png|jpeg|jpg|webp|gif)$/i.test(f.type)) {
        toast.error(`${f.name}: Only PNG, JPG, WEBP, or GIF images are allowed`);
        return false;
      }
      if (f.size > 4 * 1024 * 1024) {
        toast.error(`${f.name}: File size must be under 4 MB`);
        return false;
      }
      return true;
    });

    if (!validFiles.length) return;
    const base64List = await Promise.all(validFiles.map(fileToBase64));
    setScreenshots((prev) => [...prev, ...base64List]);
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles = [];
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const blob = item.getAsFile();
        if (blob) imageFiles.push(blob);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      await handleFiles(imageFiles);
      toast.info("Screenshot pasted from clipboard");
    }
  };

  const handleReset = () => {
    setType("bug");
    setSeverity("medium");
    setModule("Task Management");
    setTargetDeveloper("both");
    setSubject("");
    setDescription("");
    setPageUrl("");
    setScreenshots([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim()) {
      toast.error("Please enter an issue title / summary");
      return;
    }
    if (!description.trim()) {
      toast.error("Please describe what went wrong or steps to reproduce");
      return;
    }

    try {
      const res = await createTicket({
        source: "bug_report",
        type,
        severity,
        module,
        targetDeveloper,
        subject: subject.trim(),
        description: description.trim(),
        pageUrl: pageUrl.trim() || window.location.origin,
        screenshots,
        environmentInfo: includeDiagnostics ? envInfo : {},
      }).unwrap();

      setLastCreatedTicket(res?.data || null);
      toast.success(res?.message || "Bug report submitted & sent to developers!");
      handleReset();
      onTicketCreated?.(res?.data);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to submit bug report");
    }
  };

  const selectedSeverityObj = SEVERITY_OPTIONS.find((s) => s.value === severity) || SEVERITY_OPTIONS[1];

  return (
    <div className="space-y-5" onPaste={handlePaste}>
      {/* Confirmation Receipt Banner */}
      {lastCreatedTicket && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <MdCheckCircle size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-black text-emerald-950">
                  Ticket {lastCreatedTicket.ticketCode} Logged Successfully!
                </h4>
                {lastCreatedTicket.emailDelivery?.sent && (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white text-emerald-700 border border-emerald-300">
                    Email Sent to Developers
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-800 mt-0.5">
                Assigned to <strong>{(lastCreatedTicket.assignedToNames || []).join(" & ")}</strong>. You can track replies and live resolution status in the Support Tickets tab.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onViewTickets}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shrink-0 transition cursor-pointer shadow-xs"
          >
            <span>Track Ticket</span>
            <MdArrowForward size={15} />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Main Form Column */}
        <div className="lg:col-span-8 space-y-5">
          {/* Step 1: Classification */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-5 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-orange-500 text-white text-xs font-black flex items-center justify-center">
                  1
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Issue Type &amp; Priority</h3>
                  <p className="text-xs text-slate-500">Help developers categorize and prioritize the fix</p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full border border-orange-200">
                Step 1
              </span>
            </div>

            {/* Issue Type Grid */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {ISSUE_TYPES.map((item) => {
                  const active = type === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setType(item.value)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        active
                          ? "bg-orange-50/70 border-orange-500 ring-2 ring-orange-500/15"
                          : "bg-slate-50/60 border-slate-200 hover:border-orange-300 hover:bg-white"
                      }`}
                    >
                      <p className={`text-xs font-extrabold ${active ? "text-orange-700" : "text-slate-800"}`}>
                        {item.label}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{item.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Module & Severity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Affected Portal Module
                </label>
                <SelectDropdown
                  value={module}
                  onChange={setModule}
                  options={PORTAL_MODULES}
                  buttonClassName="w-full px-3.5 py-2.5 bg-white border border-slate-200 hover:border-orange-400 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 flex items-center justify-between gap-2 shadow-2xs transition cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Notify &amp; Assign Developer
                </label>
                <SelectDropdown
                  value={targetDeveloper}
                  onChange={setTargetDeveloper}
                  options={[
                    { value: "both", label: "Both: Anees Khan & Himanshu Vishwakarma" },
                    ...developers.map((d) => ({ value: d.id, label: `${d.name} (${d.email})` })),
                  ]}
                  buttonClassName="w-full px-3.5 py-2.5 bg-white border border-slate-200 hover:border-orange-400 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 flex items-center justify-between gap-2 shadow-2xs transition cursor-pointer"
                />
              </div>
            </div>

            {/* Severity */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Severity Level
                </label>
                <span className="text-[11px] text-slate-500 font-medium">{selectedSeverityObj.hint}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SEVERITY_OPTIONS.map((sev) => {
                  const active = severity === sev.value;
                  return (
                    <button
                      key={sev.value}
                      type="button"
                      onClick={() => setSeverity(sev.value)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer ${
                        active ? sev.activePill : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${sev.dot}`} />
                      <span>{sev.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Step 2: Bug Details & Screenshots */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-orange-500 text-white text-xs font-black flex items-center justify-center">
                  2
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Bug Details &amp; Screenshots</h3>
                  <p className="text-xs text-slate-500">Explain exact steps, error messages, or upload screenshots</p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full border border-orange-200">
                Step 2
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Issue Title / Summary <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Task status not shifting from In Progress to Completed on Student Task Board"
                maxLength={200}
                required
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Detailed Description / Steps to Reproduce <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder={`1. Which page / action triggered the error?\n2. What error message appeared?\n3. What was expected vs actual behavior?`}
                maxLength={6000}
                required
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition shadow-2xs resize-y"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Page / Route Where Issue Occurred <span className="text-slate-400 normal-case font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={pageUrl}
                onChange={(e) => setPageUrl(e.target.value)}
                placeholder="e.g. /task-management or /student/task-board"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition shadow-2xs"
              />
            </div>

            {/* Screenshot Dropzone */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Attach Screenshots <span className="text-slate-400 normal-case font-normal">(Up to 3 images · Ctrl+V paste supported)</span>
                </label>
                <span className="text-[10px] font-bold text-slate-400">{screenshots.length}/3</span>
              </div>

              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFiles(e.dataTransfer.files);
                }}
                className="border-2 border-dashed border-slate-200 hover:border-orange-400 bg-slate-50/70 hover:bg-orange-50/30 rounded-xl p-5 text-center transition cursor-pointer"
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  multiple
                  onChange={(e) => {
                    handleFiles(e.target.files);
                    e.target.value = "";
                  }}
                  className="hidden"
                />
                <MdCloudUpload size={26} className="mx-auto text-orange-500 mb-1.5" />
                <p className="text-xs font-bold text-slate-700">
                  Click to upload, drag &amp; drop, or press <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px]">Ctrl+V</kbd> to paste screenshot
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, WEBP up to 4MB each</p>
              </div>

              {screenshots.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mt-3">
                  {screenshots.map((src, idx) => (
                    <div
                      key={idx}
                      className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video"
                    >
                      <img src={src} alt={`Screenshot ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setScreenshots((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-rose-600 text-white shadow-sm opacity-90 hover:opacity-100 transition cursor-pointer"
                        title="Remove Screenshot"
                      >
                        <MdDeleteOutline size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sticky Summary & Diagnostics Column */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-4">
          {/* Reporter & Diagnostics Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <MdLaptopMac size={16} className="text-orange-500" />
                Ticket Context
              </span>
              <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeDiagnostics}
                  onChange={(e) => setIncludeDiagnostics(e.target.checked)}
                  className="rounded text-orange-500 accent-orange-500 cursor-pointer"
                />
                <span>Attach Browser Info</span>
              </label>
            </div>

            <div className="space-y-2 text-xs bg-slate-50 rounded-xl p-3 border border-slate-100">
              <div className="flex justify-between gap-2">
                <span className="text-slate-400 font-semibold">Reporter:</span>
                <span className="font-bold text-slate-800 truncate">{reporter.name || "Logged-in User"}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400 font-semibold">Role / Dept:</span>
                <span className="font-bold text-slate-700 uppercase">
                  {reporter.role || "Staff"} {reporter.department ? `· ${reporter.department}` : ""}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400 font-semibold">Email:</span>
                <span className="font-semibold text-slate-700 truncate">{reporter.email || "—"}</span>
              </div>
              {includeDiagnostics && (
                <>
                  <div className="border-t border-slate-200/70 pt-2 mt-2 flex justify-between gap-2">
                    <span className="text-slate-400 font-semibold">Browser:</span>
                    <span className="font-semibold text-slate-700">{envInfo.browser}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400 font-semibold">System:</span>
                    <span className="font-semibold text-slate-700">
                      {envInfo.platform} ({envInfo.screenResolution})
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="bg-orange-50/70 border border-orange-200/70 rounded-xl p-3 text-[11px] text-orange-900 space-y-1">
              <p className="font-extrabold flex items-center gap-1.5">
                <MdEmail size={14} className="text-orange-600" />
                Instant Email Dispatch
              </p>
              <p className="text-orange-800/90 leading-relaxed">
                Submitting this form saves a tracked support ticket AND sends an instant alert email directly to{" "}
                <strong>
                  {targetDeveloper === "anees"
                    ? "aneeskhan@ssism.org"
                    : targetDeveloper === "himanshu"
                    ? "himanshuvish@ssism.org"
                    : "aneeskhan@ssism.org & himanshuvish@ssism.org"}
                </strong>
                .
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting &amp; Sending Mail...</span>
                </>
              ) : (
                <>
                  <MdSend size={16} />
                  <span>Submit Bug Report &amp; Email Devs</span>
                </>
              )}
            </button>
          </div>

          {/* Emergency Call Box (System-Themed Luminous Escalation Card) */}
          <div className="bg-gradient-to-br from-orange-50 via-white to-amber-50/70 border border-orange-200/90 rounded-2xl p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-2xs shrink-0">
                  <MdBugReport size={17} />
                </span>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-color)]">
                    Production Blocker?
                  </h4>
                  <p className="text-[10px] font-bold text-orange-700">Direct Developer Hotline</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                Urgent
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              If the server is down, login is blocked, or there is an urgent deployment issue, call directly:
            </p>
            <div className="space-y-2 pt-1">
              {developers.map((d) => (
                <a
                  key={d.id}
                  href={d.telHref}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white hover:bg-orange-50/60 border border-orange-100 hover:border-orange-300 transition shadow-2xs text-xs group"
                >
                  <div>
                    <p className="font-extrabold text-[var(--text-color)] group-hover:text-orange-700 transition-colors">
                      {d.name}
                    </p>
                    <p className="text-[10px] font-medium text-slate-500">
                      {d.id === "anees" ? "Deployment & Full-Stack" : "Full-Stack Lead"}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 font-bold text-orange-600 bg-orange-50 border border-orange-200/80 px-2.5 py-1 rounded-lg">
                    <MdPhone size={14} />
                    {d.mobile}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default BugReportForm;

