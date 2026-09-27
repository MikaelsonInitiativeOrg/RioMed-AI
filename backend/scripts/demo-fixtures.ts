/** Demo data for walkthroughs: Ada gets one completed booking with a result PDF and one unpaid hold.
 *  Run: npx tsx --conditions=react-server scripts/demo-fixtures.ts  (writes to the configured DB) */
import { prisma } from "../src/server/db";
import { checkIn, confirmPaid, holdSlot, uploadResult } from "../src/server/booking";

const ada = { userId: "usr_patient_ada", role: "patient" as const };
const staff = { userId: "usr_staff_alausa", role: "facility_staff" as const, facilityId: "fac_001" };

// Minimal valid one-page PDF saying "DEMO RESULT (synthetic)".
const PDF = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 60>>stream
BT /F1 14 Tf 20 70 Td (DEMO RESULT - synthetic data) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R>>
%%EOF`;

async function slot(facilityId: string, hoursAhead: number) {
  return prisma.slot.findFirst({ where: { facilityId, used: 0, start: { gt: new Date(Date.now() + hoursAhead * 3600_000) } }, orderBy: { start: "asc" } });
}

async function main() {
  const s1 = await slot("fac_001", 3);
  const done = await holdSlot(ada, { slotId: s1!.id, testCode: "MALARIA_MP" });
  await confirmPaid(done.id); // demo fixture: as if the facility confirmed the transfer
  await checkIn(staff, done.id);
  await uploadResult(staff, done.id, { name: "malaria-result-demo.pdf", bytes: new TextEncoder().encode(PDF) });
  const s2 = await slot("fac_003", 26);
  const held = await holdSlot(ada, { slotId: s2!.id, testCode: "FBC" });
  console.log(JSON.stringify({ completed: done.id, held: held.id }));
}

main().finally(() => prisma.$disconnect());
