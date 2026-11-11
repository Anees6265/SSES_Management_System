/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import { MdClose, MdSend, MdEmail, MdOpenInNew } from "react-icons/md";
import { toast } from "react-toastify";
import { useSendDirectDeveloperMailMutation } from "../../../../redux/api/authApi";
import SelectDropdown from "../../../shared/form-fields/SelectDropdown";
import { PORTAL_MODULES, SEVERITY_OPTIONS, captureEnvironmentInfo } from "./supportConstants";

const QuickMailModal = ({ isOpen, initialDeveloperId = "both", developers = [], onClose, onSent }) => {
  const [targetDeveloper, setTargetDeveloper] = useState(initialDeveloperId || "both");
  const [module, setModule] = useState("Other");
  const [severity, setSeverity] = useState("medium");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [sendDirectMail, { isLoading }] = useSendDirectDeveloperMailMutation();

  useEffect(() => {
    if (isOpen) {
      setTargetDeveloper(initialDeveloperId || "both");
      setSubject("");
      setMessage("");
      setSeverity("medium");
    }
  }, [isOpen, initialDeveloperId]);

  if (!isOpen) return null;

  const targetEmails =
    targetDeveloper === "anees"
      ? "aneeskhan@ssism.org"
      : targetDeveloper === "himanshu"
      ? "himanshuvish@ssism.org"
      : "aneeskhan@ssism.org,himanshuvish@ssism.org";

  const externalMailtoHref = `mailto:${targetEmails}?subject=${encodeURIComponent(
    subject || "Portal Support Request"
  )}&body=${encodeURIComponent(message || "")}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim()) {
      toast.error("Please enter a subject");
      return;
    }
    if (!message.trim()) {
      toast.error("Please enter your message");
      return;
    }

    try {
      const res = await sendDirectMail({
        targetDeveloper,
        module,
        severity,
        subject: subject.trim(),
        description: message.trim(),
        pageUrl: window.location.href,
        environmentInfo: captureEnvironmentInfo(),
      }).unwrap();

      toast.success(res?.message || "Direct mail sent to developer team!");
      onSent?.(res?.data);
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to send mail. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3.5 sm:p-4 animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative bg-white w-full max-w-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-xs">
              <MdEmail size={20} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                Send Direct Developer Mail
              </h3>
              <p className="text-xs text-slate-500">
                Instantly emails developer inbox & logs a trackable support ticket
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <MdClose size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Send To Developer(s)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: "both", label: "Both Developers", sub: "Fastest Response" },
                ...developers.map((d) => ({ id: d.id, label: d.name, sub: d.email })),
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTargetDeveloper(opt.id)}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    targetDeveloper === opt.id
                      ? "bg-orange-50 border-orange-500 ring-2 ring-orange-500/20"
                      : "bg-white border-slate-200 hover:border-orange-300"
                  }`}
                >
                  <p className="text-xs font-extrabold text-slate-900 truncate">{opt.label}</p>
                  <p className="text-[10px] font-medium text-slate-500 truncate mt-0.5">{opt.sub}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Related Module
              </label>
              <SelectDropdown
                value={module}
                onChange={setModule}
                options={PORTAL_MODULES}
                buttonClassName="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 hover:border-orange-400 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-between gap-2 transition cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Urgency
              </label>
              <SelectDropdown
                value={severity}
                onChange={setSeverity}
                options={SEVERITY_OPTIONS.map((s) => ({ value: s.value, label: `${s.label} Priority` }))}
                buttonClassName="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 hover:border-orange-400 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-between gap-2 transition cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Subject <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Urgent help needed with Level 1B task sync"
              maxLength={200}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-orange-500 focus:bg-white transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Message <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="Describe your question, issue, or request clearly..."
              maxLength={6000}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-orange-500 focus:bg-white transition resize-y"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
            <a
              href={externalMailtoHref}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600 hover:text-orange-600 transition"
            >
              <MdOpenInNew size={15} />
              <span>Open in External Mail App</span>
            </a>

            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-extrabold flex items-center gap-2 shadow-sm transition cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending Email...</span>
                  </>
                ) : (
                  <>
                    <MdSend size={15} />
                    <span>Send Direct Mail</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickMailModal;

