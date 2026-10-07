import AIThesisContainer from "../../modules/ai-thesis/AIThesisContainer";
import SecurityHelmet from "../../shared/SecurityHelmet";

export default function StudentAIThesis() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <SecurityHelmet title="Passion & Vision — Student Portal" />

      {/* AI Thesis Container (Student Mode) */}
      <AIThesisContainer isFacultyView={false} />
    </div>
  );
}
