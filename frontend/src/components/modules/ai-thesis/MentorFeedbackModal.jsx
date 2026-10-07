import { useState } from "react";
import { MessageSquare, X, Check, Plus, Trash2 } from "lucide-react";
import { toast } from "react-toastify";

export default function MentorFeedbackModal({ isOpen, onClose, onSubmit, isSubmitting }) {
  const [comment, setComment] = useState("");
  const [actions, setActions] = useState([""]);

  if (!isOpen) return null;

  const handleAddAction = () => {
    setActions([...actions, ""]);
  };

  const handleActionChange = (index, value) => {
    const updated = [...actions];
    updated[index] = value;
    setActions(updated);
  };

  const handleRemoveAction = (index) => {
    if (actions.length === 1) {
      setActions([""]);
      return;
    }
    setActions(actions.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      toast.error("Please enter mentoring feedback comments.");
      return;
    }
    const cleanActions = actions.map(a => a.trim()).filter(Boolean);
    onSubmit({ comment: comment.trim(), recommendedActions: cleanActions });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative z-10 bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-orange-50 to-amber-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-sm">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">Add Mentor Feedback</h3>
              <p className="text-xs text-slate-500 font-medium">Guide and support the student's purpose & roadmap</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white/80 transition"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Mentor Observation & Guidance <span className="text-orange-500">*</span>
            </label>
            <textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Provide constructive feedback on their passions, purpose alignment, and areas needing development..."
              className="w-full text-xs font-medium border border-slate-200 rounded-2xl p-3.5 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 bg-slate-50/50 transition resize-none"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Recommended Mentoring Actions
              </label>
              <button
                type="button"
                onClick={handleAddAction}
                className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 transition"
              >
                <Plus size={14} /> Add Action
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {actions.map((act, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={act}
                    onChange={(e) => handleActionChange(index, e.target.value)}
                    placeholder={`e.g. Schedule weekly mock interview, join algorithmic group sprint...`}
                    className="flex-1 text-xs font-medium border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-orange-400 bg-slate-50/50 transition"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveAction(index)}
                    className="p-2 text-slate-400 hover:text-rose-500 transition"
                    title="Remove action"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-orange-500/20 disabled:opacity-50"
            >
              <Check size={16} />
              {isSubmitting ? "Saving..." : "Submit Feedback"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
