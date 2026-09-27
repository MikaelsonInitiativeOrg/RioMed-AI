/**
 * Facility self-registration + universal location smoke test (shared DB).
 * Registers a clinic in Abuja, finds it from a prompt, books it, then removes only what it created.
 * Run: npm run smoke:facility --workspace @riomed/backend
 */
import { prisma } from "../src/server/db";
import { signUp } from "../src/server/accounts";
import { searchWithIntent } from "../src/server/search";
import { parseDeterministic } from "../src/core/intent";
import { holdSlot } from "../src/server/booking";
import { listFacilityAppointments, findUser } from "../src/server/queries";
import { geocodePlace } from "../src/server/geocode";

function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) process.exitCode = 1;
}

async function main() {
  const tag = Date.now().toString(36);
  const abuja = await geocodePlace("Wuse 2, Abuja");
  check("geocodes a place outside Lagos", !!abuja && abuja.lat > 8.9 && abuja.lat < 9.2, abuja ? `${abuja.name} ${abuja.lat.toFixed(3)},${abuja.lng.toFixed(3)}` : "none");
  const nairobi = await geocodePlace("Westlands, Nairobi");
  check("geocodes a place outside Nigeria", !!nairobi && nairobi.lat < 0 && nairobi.lng > 36, nairobi ? `${nairobi.lat.toFixed(3)},${nairobi.lng.toFixed(3)}` : "none");

  const reg = await signUp({
    username: `wuse_${tag}`, password: "abuja-clinic-2026", pin: "5831", displayName: "Smoke Admin", type: "facility",
    email: `wuse_${tag}@example.com`,
    registration: { name: `Smoke Test Clinic ${tag}`, type: "clinic", address: "Aminu Kano Crescent, Wuse 2, Abuja, Nigeria", phone: "", prices: { MALARIA_MP: "2800" }, bankName: "Demo Bank", accountNumber: "0000000099", accountName: "Smoke Test Clinic" },
  });
  check("new facility account is active at once", reg.ok && reg.status === "active" && reg.role === "facility_admin", reg.ok ? "" : reg.error);
  if (!reg.ok) return;
  const admin = await findUser(reg.userId);
  const facilityId = admin?.facilityId ?? "";
  const cleanup = async () => {
    await prisma.appointment.deleteMany({ where: { facilityId } });
    await prisma.slot.deleteMany({ where: { facilityId } });
    await prisma.facilityTest.deleteMany({ where: { facilityId } });
    await prisma.user.deleteMany({ where: { OR: [{ facilityId }, { username: { startsWith: `pat_${tag}` } }] } });
    await prisma.emailMessage.deleteMany({ where: { OR: [{ facilityId }, { toAddress: { endsWith: `${tag}@example.com` } }] } });
    await prisma.facility.deleteMany({ where: { id: facilityId, source: "self_registered" } });
  };
  try {
    const f = await prisma.facility.findUnique({ where: { id: facilityId }, include: { _count: { select: { slots: true, tests: true } } } });
    check("facility listed as partner, self-registered, with slots", !!f && f.isPartner && f.source === "self_registered" && f._count.slots > 0 && f._count.tests === 1, f ? `${f._count.slots} slots, area ${f.area}` : "");

    const intent = parseDeterministic("malaria test in Abuja");
    const found = await searchWithIntent(intent);
    const hit = found.results.find((r) => r.id === facilityId);
    check("prompt 'malaria test in Abuja' finds it", !!hit && !!hit.nextSlot, hit ? `${hit.distanceKm.toFixed(1)} km, ₦${(hit.minPriceKobo ?? 0) / 100}` : `place ${found.place?.name ?? "none"}, ${found.results.length} results`);

    const pat = await signUp({ username: `pat_${tag}`, password: "patient-pass-2026", pin: "6720", displayName: "Smoke Patient", type: "patient", email: `pat_${tag}@example.com` });
    if (pat.ok) {
      const slot = await prisma.slot.findFirst({ where: { facilityId, start: { gt: new Date(Date.now() + 3 * 60 * 60_000) } }, orderBy: { start: "asc" } });
      const held = slot ? await holdSlot({ userId: pat.userId, role: "patient" }, { slotId: slot.id, testCode: "MALARIA_MP" }) : null;
      check("a patient can book it", !!held);
      const desk = await listFacilityAppointments({ userId: reg.userId, role: "facility_admin", facilityId }, { referenceQuery: "" });
      check("the booking shows on the facility's own desk", !!desk && desk.facility?.id === facilityId, desk ? `${desk.appointments.length} on today's list` : "no desk");
    }
  } finally {
    await cleanup();
    check("cleanup removed the test facility", !(await prisma.facility.findUnique({ where: { id: facilityId } })));
  }
}

main().finally(() => prisma.$disconnect());
