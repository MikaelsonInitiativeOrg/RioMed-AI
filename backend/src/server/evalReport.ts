import "server-only";
import report from "../../eval/report.json";

export type EvalReport = typeof report;

/** The committed AI-010 evaluation report (regenerate with `npm run eval`). */
export function getEvalReport(): EvalReport {
  return report;
}
