import { exportPatientData } from "@riomed/backend/server/queries";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** GET /api/me/export: the signed-in patient's own data as a JSON download (FR-006). */
export async function GET() {
  const data = await exportPatientData(await getSessionUser());
  if (!data) return new Response("Sign in as a patient to export your data.", { status: 401 });
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="riomed-my-data.json"',
      "Cache-Control": "no-store",
    },
  });
}
