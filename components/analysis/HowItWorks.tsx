import { Icon } from "@/components/ui/Icon";
import type { ExplanationStep } from "@/types/analysis";

export function HowItWorks({ steps }: { steps: ExplanationStep[] }) {
  return (
    <section>
      <h2 className="section-heading">From unfamiliar to understood</h2>
      <p className="section-description">The planned experience, one step at a time.</p>
      <ol className="how-timeline">{steps.map((step, index) => <li key={step.title}><span className="step-number">{String(index + 1).padStart(2, "0")}</span><div><h3 className="text-base font-semibold">{step.title}</h3><p className="body-copy mt-2">{step.description}</p></div></li>)}</ol>
      <div className="takeaway"><Icon name="sparkles" size={18} /><p>This is a sample walkthrough. For now, you can explore the interface using the example analysis.</p></div>
    </section>
  );
}
