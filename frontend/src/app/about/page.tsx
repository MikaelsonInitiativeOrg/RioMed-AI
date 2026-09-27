import { RED_FLAG_STATUS } from "@riomed/backend/core/intent";
import { getEvalReport } from "@riomed/backend/server/evalReport";

export const dynamic = "force-dynamic";

type Acc = Record<string, number>;
interface Report {
  generatedAt: string;
  cases: number;
  baseline: { accuracy: Acc; emergencyMissed: string[]; falseEmergency: string[] };
  llm: null | { provider: string; model?: string; accuracy: Acc; fallbacks: number; latencyMs: { p50: number; p95: number } };
}

async function loadReport(): Promise<Report | null> {
  return getEvalReport() as unknown as Report;
}

const FIELDS: Array<[string, string]> = [
  ["intent", "Intent"],
  ["tests", "Tests"],
  ["locationQuery", "Area"],
  ["day", "Day"],
  ["part", "Time of day"],
  ["all", "All fields right"],
];

export default async function About() {
  const report = await loadReport();
  const mode = (process.env.AI_PROVIDER ?? "mock").toLowerCase();

  return (
    <article className="space-y-6 text-sm leading-relaxed max-w-2xl mx-auto">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0A5347]">
          How RioMed uses AI, and where it doesn&apos;t
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[#4B6560]">
          Transparency report on safety boundaries, evaluation metrics, and clinical safeguards.
        </p>
      </div>

      {/* AI Scope and Guardrails */}
      <section className="rounded-2xl border border-[#E3E0D6] bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div>
          <h2 className="font-heading text-base font-bold text-[#0A5347]">What the AI does</h2>
          <p className="mt-1 text-[#4B6560]">
            One job: turn a free-text request, in English, Nigerian English or Pidgin, into a structured search. That search holds test codes from our catalogue,
            a place name and a time window. The output is checked against a strict schema, and any test code the model makes up is thrown away.
          </p>
        </div>

        <div className="pt-3 border-t border-[#F0EEE7]">
          <h2 className="font-heading text-base font-bold text-[#0A5347]">What it never does</h2>
          <ul className="mt-2 space-y-2 text-[#4B6560]">
            <li className="flex items-start gap-2">
              <span className="text-[#0E6B5C] font-bold">✓</span>
              <span><strong className="text-[#12262B]">Invent facilities, prices or opening times:</strong> Everything you see comes from the database.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#0E6B5C] font-bold">✓</span>
              <span><strong className="text-[#12262B]">Choose map coordinates:</strong> A place name is looked up in a gazetteer, and unknown places are never guessed.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#0E6B5C] font-bold">✓</span>
              <span><strong className="text-[#12262B]">Diagnose or prescribe:</strong> Does not suggest tests from symptoms, give doses or interpret results.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#0E6B5C] font-bold">✓</span>
              <span><strong className="text-[#12262B]">Decide emergencies:</strong> Emergency phrases are checked by fixed rules before the AI runs, and point to 112.</span>
            </li>
          </ul>
        </div>

        <div className="rounded-xl bg-[#F7F5F0] p-3.5 text-xs text-[#4B6560] border border-[#E3E0D6]">
          Current mode:{" "}
          <strong className="text-[#12262B]">
            {mode === "mock" ? "mock (rule-based parser, no AI inference)" : mode}
          </strong>
          . If the AI is slow (over 1.5 s), rate-limited or down, a rule-based parser takes over and search keeps working. The emergency list is{" "}
          <span className="font-semibold text-[#0A5347]">
            {RED_FLAG_STATUS === "draft-pending-clinician-review" ? "a draft pending clinician review" : "clinician-reviewed"}
          </span>.
        </div>
      </section>

      {/* AI Evaluation Metrics */}
      <section className="rounded-2xl border border-[#E3E0D6] bg-white p-5 sm:p-6 shadow-xs space-y-3">
        <h2 className="font-heading text-base font-bold text-[#0A5347]">Model Evaluation &amp; Accuracy</h2>
        {!report ? (
          <p className="text-[#4B6560]">No evaluation report yet. Run <code>npm run eval</code>.</p>
        ) : (
          <>
            <p className="text-xs text-[#8B9490]">
              Evaluated against {report.cases} hand-labelled prompts (plain English, Nigerian English, Pidgin, misspellings, emergencies, symptom-only and prompt injection). Run {report.generatedAt.slice(0, 16).replace("T", " ")} UTC.
            </p>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-[#E3E0D6] text-[#4B6560]">
                    <th className="py-2 pr-3 font-semibold">Field accuracy</th>
                    <th className="py-2 pr-3 font-semibold">Rule-based baseline</th>
                    {report.llm && (
                      <th className="py-2 font-semibold text-[#0A5347]">
                        LLM ({report.llm.provider}
                        {report.llm.model ? ` · ${report.llm.model}` : ""})
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EEE7]">
                  {FIELDS.map(([k, label]) => (
                    <tr key={k}>
                      <td className="py-2 pr-3 font-medium text-[#12262B]">{label}</td>
                      <td className="py-2 pr-3 tabular-nums font-mono text-[#4B6560]">
                        {report.baseline.accuracy[k]}%
                      </td>
                      {report.llm && (
                        <td className="py-2 tabular-nums font-mono font-bold text-[#0E6B5C]">
                          {report.llm.accuracy[k]}%
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pt-2 text-xs text-[#8B9490] leading-normal border-t border-[#F0EEE7] space-y-1">
              <p>
                Emergencies missed by the rule layer:{" "}
                <span className="font-semibold text-[#4B6560]">{report.baseline.emergencyMissed.length}</span>.
                False emergency alerts:{" "}
                <span className="font-semibold text-[#4B6560]">{report.baseline.falseEmergency.length}</span>.
              </p>
              {report.llm && (
                <p>
                  LLM latency p50: <span className="font-mono font-semibold">{report.llm.latencyMs.p50} ms</span>, p95:{" "}
                  <span className="font-mono font-semibold">{report.llm.latencyMs.p95} ms</span>, with {report.llm.fallbacks} fallbacks.
                </p>
              )}
            </div>
          </>
        )}
      </section>

      {/* Privacy and Data Protection */}
      <section className="rounded-2xl border border-[#E3E0D6] bg-white p-5 sm:p-6 shadow-xs space-y-2">
        <h2 className="font-heading text-base font-bold text-[#0A5347]">Data and privacy in this demo</h2>
        <p className="text-[#4B6560]">
          Facilities and patients are synthetic. Payments use Paystack test mode, or a clearly labelled simulation. Only your typed text goes to the AI provider,
          never your account, phone number or location. Result files are served only to their owner and to the uploading facility, through links that expire after 5 minutes, and every view is logged.
        </p>
      </section>
    </article>
  );
}
