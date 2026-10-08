import AIThesisContainer from "../../modules/ai-thesis/AIThesisContainer";
import SecurityHelmet from "../../shared/SecurityHelmet";
import { Sparkles } from "lucide-react";

export default function StudentAIThesis() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <SecurityHelmet title="Passion & Vision — Student Portal" />

      {/* Student Portal Page Header */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-xs">
            <Sparkles size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              My Passion & Vision Thesis
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Discover your core purpose, driving passions, and personalized AI career roadmap.
            </p>
          </div>
        </div>
      </div>

      {/* AI Thesis Container (Student Mode) */}
      <AIThesisContainer isFacultyView={false} />
    </div>
  );
}
