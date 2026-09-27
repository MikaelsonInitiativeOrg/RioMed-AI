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

const FIELDS: Array<[string, string]> = [["intent", "Intent"], ["tests", "Tests"], ["locationQuery", "Area"], ["day", "Day"], ["part", "Time of day"], ["all", "All fields right"]];

export default async function About() {
  const report = await loadReport();
  const mode = (process.env.AI_PROVIDER ?? "mock").toLowerCase();
  return (
    <article className="space-y-5 text-sm leading-6">
      <h1 className="text-xl font-bold text-emerald-950">How RioMed uses AI, and where it doesn&apos;t</h1>
      <section className="rounded-xl bg-white border p-4 space-y-2">
        <h2 className="font-semibold">What the AI does</h2>
        <p>
          One job: turn a free-text request, in English, Nigerian English or Pidgin, into a structured search. That search holds test codes from our catalogue,
          a place name and a time window. The output is checked against a strict schema, and any test code the model makes up is thrown away.
        </p>
        <h2 className="font-semibold pt-2">What it never does</h2>
        <ul className="list-disc pl-5">
          <li>Invent facilities, prices or opening times. Everything you see comes from the database.</li>
          <li>Choose map coordinates. A place name is looked up in a gazetteer, and unknown places are never guessed.</li>
          <li>Diagnose, suggest tests from symptoms, give doses or interpret results.</li>
          <li>Decide emergencies. Emergency phrases are checked by fixed rules before the AI runs, and point to 112.</li>
        </ul>
        <p className="text-xs text-slate-600">
          Current mode: <strong>{mode === "mock" ? "mock (rule-based parser, no AI inference)" : mode}</strong>. If the AI is slow (over 1.5 s), rate-limited or down, a rule-based parser takes over and search keeps working.
          The emergency list is {RED_FLAG_STATUS === "draft-pending-clinician-review" ? "a draft pending clinician review" : "clinician-reviewed"}.
        </p>
      </section>

      <section className="rounded-xl bg-white border p-4">
        <h2 className="font-semibold">Evaluation</h2>
        {!report ? (
          <p>No evaluation report yet. Run <code>npm run eval</code>.</p>
        ) : (
          <>
            <p className="text-xs text-slate-600">
              {report.cases} hand-labelled prompts (plain English, Nigerian English, Pidgin, misspellings, emergencies, symptom-only and prompt injection). Run {report.generatedAt.slice(0, 16).replace("T", " ")} UTC.
            </p>
            <div className="overflow-x-auto">
              <table className="mt-2 w-full text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-1 pr-2">Field accuracy</th>
                    <th className="py-1 pr-2">Rule-based baseline</th>
                    {report.llm && <th className="py-1">LLM ({report.llm.provider}{report.llm.model ? ` · ${report.llm.model}` : ""})</th>}
                  </tr>
                </thead>
                <tbody>
                  {FIELDS.map(([k, label]) => (
                    <tr key={k} className="border-b last:border-0">
                      <td className="py-1 pr-2">{label}</td>
                      <td className="py-1 pr-2 tabular-nums">{report.baseline.accuracy[k]}%</td>
                      {report.llm && <td className="py-1 tabular-nums font-semibold">{report.llm.accuracy[k]}%</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-600">
              Emergencies missed by the rule layer: {report.baseline.emergencyMissed.length}. False emergency alerts: {report.baseline.falseEmergency.length}.
              {report.llm && <> LLM latency p50 {report.llm.latencyMs.p50} ms, p95 {report.llm.latencyMs.p95} ms, with {report.llm.fallbacks} fallbacks.</>}
            </p>
          </>
        )}
      </section>

      <section className="rounded-xl bg-white border p-4 space-y-1">
        <h2 className="font-semibold">Data and privacy in this demo</h2>
        <p>
          Facilities and patients are synthetic. Payments use Paystack test mode, or a clearly labelled simulation. Only your typed text goes to the AI provider,
          never your account, phone number or location. Result files are served only to their owner and to the uploading facility, through links that expire after 5 minutes, and every view is logged.
        </p>
      </section>
    </article>
  );
}
