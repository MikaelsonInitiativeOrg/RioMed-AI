/**
 * Synthetic demo data (PRD 15.1). Facility names are fictional and marked source="demo".
 * No real patients, no real facilities. Re-run any time: it wipes and recreates everything.
 */
import { PrismaClient } from "@prisma/client";
import { PLACES } from "../src/core/geo";
import { lagosTime } from "../src/core/intent/time";

const prisma = new PrismaClient();

const PRICES_NAIRA: Record<string, number> = {
  MALARIA_MP: 2500, WIDAL: 3000, FBC: 5000, PCV: 1500, HIV: 3000, HBSAG: 3500, HCV: 5000,
  FBS: 2000, HBA1C: 8000, LIPID: 10000, URINALYSIS: 2000, PREGNANCY: 2000, GENOTYPE: 3500,
  BLOOD_GROUP: 1500, LFT: 12000, EUCR: 12000, XRAY_CHEST: 15000, ULTRASOUND: 12000, COVID19: 20000,
};
const BASIC = ["MALARIA_MP", "WIDAL", "FBC", "PCV", "FBS", "URINALYSIS", "PREGNANCY", "GENOTYPE", "BLOOD_GROUP", "HIV"];
const ALL = Object.keys(PRICES_NAIRA);

// Deterministic pseudo-random so coordinates and prices are stable between seeds.
let s = 42;
const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);

interface Spec { name: string; area: string; type: string; ownership: string; partner: boolean; tests?: string[]; operational?: boolean }

const SPECS: Spec[] = [
  { name: "Alausa Diagnostics Centre", area: "Alausa", type: "diagnostic_centre", ownership: "private", partner: true, tests: ALL },
  { name: "Opebi Family Clinic", area: "Opebi", type: "clinic", ownership: "private", partner: true, tests: BASIC },
  { name: "Allen Avenue Medical Laboratory", area: "Allen", type: "laboratory", ownership: "private", partner: true, tests: [...BASIC, "LIPID", "LFT", "EUCR", "HBSAG", "HCV", "HBA1C"] },
  { name: "GRA Ikeja Specialist Hospital", area: "GRA Ikeja", type: "hospital", ownership: "private", partner: true, tests: ALL },
  { name: "Ikeja Primary Health Centre", area: "Ikeja", type: "primary_health_centre", ownership: "public", partner: true, tests: ["MALARIA_MP", "PCV", "HIV", "PREGNANCY", "URINALYSIS", "GENOTYPE"] },
  { name: "Ogba Community Lab", area: "Ogba", type: "laboratory", ownership: "private", partner: true, tests: BASIC },
  { name: "Maryland Imaging & Labs", area: "Maryland", type: "diagnostic_centre", ownership: "private", partner: true, tests: [...BASIC, "XRAY_CHEST", "ULTRASOUND"] },
  { name: "Yaba Central Laboratory", area: "Yaba", type: "laboratory", ownership: "private", partner: true, tests: [...BASIC, "LIPID", "HBSAG"] },
  { name: "Akoka Campus Health Clinic", area: "Akoka", type: "clinic", ownership: "public", partner: true, tests: ["MALARIA_MP", "WIDAL", "PCV", "FBC", "COVID19"] },
  { name: "Ebute Metta Diagnostics", area: "Ebute Metta", type: "diagnostic_centre", ownership: "private", partner: true, tests: [...BASIC, "XRAY_CHEST", "ULTRASOUND", "EUCR"] },
  { name: "Surulere Wellness Lab", area: "Surulere", type: "laboratory", ownership: "private", partner: true, tests: BASIC },
  { name: "Lekki Coastal Diagnostics", area: "Lekki", type: "diagnostic_centre", ownership: "private", partner: true, tests: ALL },
  // Listed-only (registry, no booking).
  { name: "Agege General Hospital (demo)", area: "Agege", type: "hospital", ownership: "public", partner: false },
  { name: "Oshodi Health Post", area: "Oshodi", type: "primary_health_centre", ownership: "public", partner: false },
  { name: "Ilupeju Medical Centre", area: "Ilupeju", type: "clinic", ownership: "private", partner: false },
  { name: "Gbagada Community Hospital", area: "Gbagada", type: "hospital", ownership: "public", partner: false },
  { name: "Ketu Mother & Child Clinic", area: "Ketu", type: "clinic", ownership: "private", partner: false },
  { name: "Ojota Primary Health Centre", area: "Ojota", type: "primary_health_centre", ownership: "public", partner: false },
  { name: "Magodo Medical Laboratory", area: "Magodo", type: "laboratory", ownership: "private", partner: false },
  { name: "Mushin Primary Health Centre", area: "Mushin", type: "primary_health_centre", ownership: "public", partner: false },
  { name: "Yaba Mainland Clinic", area: "Yaba", type: "clinic", ownership: "private", partner: false },
  { name: "Ikeja Old Road Clinic (closed)", area: "Ikeja", type: "clinic", ownership: "private", partner: false, operational: false },
  { name: "Ikoyi Specialist Clinic", area: "Ikoyi", type: "clinic", ownership: "private", partner: false },
  { name: "Victoria Island Diagnostics", area: "Victoria Island", type: "diagnostic_centre", ownership: "private", partner: false },
  { name: "Lagos Island Maternity Centre", area: "Lagos Island", type: "hospital", ownership: "public", partner: false },
  { name: "Festac Town Health Centre", area: "Festac", type: "primary_health_centre", ownership: "public", partner: false },
  { name: "Ajah Community Lab", area: "Ajah", type: "laboratory", ownership: "private", partner: false },
];

async function main() {
  await prisma.auditEvent.deleteMany();
  await prisma.testResult.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.webhookEvent.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.slot.deleteMany();
  await prisma.facilityTest.deleteMany();
  await prisma.user.deleteMany();
  await prisma.facility.deleteMany();

  const now = new Date();
  const lagosToday = new Date(now.getTime() + 3600_000);
  const today = { y: lagosToday.getUTCFullYear(), m: lagosToday.getUTCMonth() + 1, d: lagosToday.getUTCDate() };

  let n = 0;
  for (const spec of SPECS) {
    n++;
    const place = PLACES.find((p) => p.name === spec.area)!;
    const id = `fac_${String(n).padStart(3, "0")}`;
    await prisma.facility.create({
      data: {
        id,
        nhfrId: `DEMO-LA-${String(1000 + n)}`,
        name: spec.name,
        type: spec.type,
        ownership: spec.ownership,
        address: `${10 + Math.floor(rnd() * 90)} Demo Street, ${spec.area}, Lagos`,
        area: spec.area,
        lat: place.lat + (rnd() - 0.5) * 0.012,
        lng: place.lng + (rnd() - 0.5) * 0.012,
        phone: `+234 800 000 ${String(1000 + n).slice(-4)}`,
        operational: spec.operational ?? true,
        isPartner: spec.partner,
        source: "demo",
        sourceSyncedAt: now,
      },
    });
    if (!spec.partner) continue;

    for (const code of spec.tests ?? []) {
      const base = PRICES_NAIRA[code];
      const price = Math.round((base * (0.85 + rnd() * 0.3)) / 100) * 100;
      await prisma.facilityTest.create({
        data: { facilityId: id, testCode: code, priceKobo: price * 100, turnaroundHours: 4 + Math.floor(rnd() * 44) },
      });
    }

    const slots = [];
    for (let day = 0; day < 10; day++) {
      const date = new Date(Date.UTC(today.y, today.m - 1, today.d + day));
      const ymd = { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() };
      if (date.getUTCDay() === 0 && spec.type !== "hospital") continue; // closed Sundays
      for (let hour = 8; hour < 18; hour++) {
        const start = lagosTime(ymd, hour);
        slots.push({ id: `${id}_${ymd.y}${ymd.m}${ymd.d}_${hour}`, facilityId: id, start, end: lagosTime(ymd, hour + 1), capacity: hour === 8 ? 1 : 2 });
      }
    }
    await prisma.slot.createMany({ data: slots });
  }

  await prisma.user.createMany({
    data: [
      { id: "usr_patient_ada", name: "Ada (demo patient)", role: "patient" },
      { id: "usr_patient_tunde", name: "Tunde (demo patient)", role: "patient" },
      { id: "usr_staff_alausa", name: "Staff, Alausa Diagnostics (demo)", role: "facility_staff", facilityId: "fac_001" },
      { id: "usr_staff_yaba", name: "Staff, Yaba Central Laboratory (demo)", role: "facility_staff", facilityId: "fac_008" },
    ],
  });

  const counts = { facilities: await prisma.facility.count(), slots: await prisma.slot.count(), tests: await prisma.facilityTest.count() };
  console.log("Seeded", counts);
}

main().finally(() => prisma.$disconnect());
