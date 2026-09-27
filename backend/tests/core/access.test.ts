import { describe, it, expect } from "vitest";
import { can, type Actor, type Action, type Subject } from "@/core/access";
import { APPOINTMENT_STATUSES, type AppointmentStatus } from "@/core/booking";

const ACTIONS: Action[] = [
  "booking:create",
  "appointment:view",
  "appointment:checkin",
  "result:upload",
  "result:view",
];

const patient: Actor = { userId: "p1", role: "patient" };
const otherPatient: Actor = { userId: "p2", role: "patient" };
const staffA: Actor = { userId: "s1", role: "facility_staff", facilityId: "fA" };
const adminA: Actor = { userId: "a1", role: "facility_admin", facilityId: "fA" };
const staffB: Actor = { userId: "s2", role: "facility_staff", facilityId: "fB" };
const adminB: Actor = { userId: "a2", role: "facility_admin", facilityId: "fB" };
const operator: Actor = { userId: "o1", role: "operator" };

const subj = (status: AppointmentStatus = "CONFIRMED"): Subject => ({
  patientUserId: "p1",
  facilityId: "fA",
  status,
});

const UPLOAD_OK: AppointmentStatus[] = ["CHECKED_IN", "COMPLETED", "RESULT_AVAILABLE"];

describe("access: deny by default (SEC-007)", () => {
  it("denies a null or undefined actor for every action", () => {
    for (const action of ACTIONS) {
      expect(can(null, action, subj())).toBe(false);
      expect(can(undefined, action, subj())).toBe(false);
    }
  });

  it("denies a null or undefined subject for every actor and action", () => {
    for (const actor of [patient, staffA, adminA, operator]) {
      for (const action of ACTIONS) {
        expect(can(actor, action, null)).toBe(false);
        expect(can(actor, action, undefined)).toBe(false);
      }
    }
  });

  it("denies an unknown role", () => {
    const weird = { userId: "p1", role: "superuser", facilityId: "fA" } as unknown as Actor;
    const empty = { userId: "p1", role: "", facilityId: "fA" } as unknown as Actor;
    for (const action of ACTIONS) {
      for (const status of APPOINTMENT_STATUSES) {
        expect(can(weird, action, subj(status))).toBe(false);
        expect(can(empty, action, subj(status))).toBe(false);
      }
    }
  });

  it("denies an unknown action", () => {
    for (const actor of [patient, staffA, adminA, operator]) {
      for (const action of ["result:delete", "", "booking:*", "appointment:view "]) {
        expect(can(actor, action as unknown as Action, subj("CHECKED_IN"))).toBe(false);
      }
    }
  });

  it("denies an empty userId", () => {
    const emptyPatient: Actor = { userId: "", role: "patient" };
    expect(can(emptyPatient, "booking:create", { patientUserId: "" })).toBe(false);
    expect(can(emptyPatient, "appointment:view", { patientUserId: "", facilityId: "fA" })).toBe(false);
    expect(can(emptyPatient, "result:view", { patientUserId: "", facilityId: "fA", status: "RESULT_AVAILABLE" })).toBe(false);
    const emptyStaff: Actor = { userId: "", role: "facility_staff", facilityId: "fA" };
    expect(can(emptyStaff, "appointment:view", subj())).toBe(false);
    expect(can(emptyStaff, "appointment:checkin", subj("CONFIRMED"))).toBe(false);
    const emptyOperator: Actor = { userId: "", role: "operator" };
    expect(can(emptyOperator, "appointment:view", subj())).toBe(false);
  });

  it("denies staff/admin with no facilityId every facility-scoped action", () => {
    for (const role of ["facility_staff", "facility_admin"] as const) {
      for (const facilityId of [undefined, null, ""]) {
        const actor: Actor = { userId: "s9", role, facilityId };
        for (const action of ACTIONS) {
          for (const status of APPOINTMENT_STATUSES) {
            expect(can(actor, action, subj(status))).toBe(false);
            // the undefined === undefined trap: subject without facilityId either
            expect(can(actor, action, { patientUserId: "p1", status })).toBe(false);
          }
        }
      }
    }
  });

  it("denies cross-facility access for every action and status", () => {
    for (const actor of [staffB, adminB]) {
      for (const action of ACTIONS) {
        for (const status of APPOINTMENT_STATUSES) {
          expect(can(actor, action, subj(status))).toBe(false);
        }
      }
    }
  });

  it("denies facility-scoped access when the subject has no facilityId", () => {
    for (const actor of [staffA, adminA]) {
      for (const action of ACTIONS) {
        expect(can(actor, action, { patientUserId: "p1", status: "CHECKED_IN" })).toBe(false);
      }
    }
  });
});

describe("access: booking:create", () => {
  it("allows a patient creating a booking for themself", () => {
    expect(can(patient, "booking:create", { patientUserId: "p1" })).toBe(true);
  });
  it("denies a patient creating a booking for someone else", () => {
    expect(can(otherPatient, "booking:create", { patientUserId: "p1" })).toBe(false);
  });
  it("denies when patientUserId is missing", () => {
    expect(can(patient, "booking:create", {})).toBe(false);
    expect(can(patient, "booking:create", { facilityId: "fA" })).toBe(false);
  });
  it("denies staff, admin and operator even for their own userId", () => {
    expect(can(staffA, "booking:create", { patientUserId: "s1", facilityId: "fA" })).toBe(false);
    expect(can(adminA, "booking:create", { patientUserId: "a1", facilityId: "fA" })).toBe(false);
    expect(can(operator, "booking:create", { patientUserId: "o1" })).toBe(false);
  });
});

describe("access: appointment:view", () => {
  it("allows the owning patient", () => {
    expect(can(patient, "appointment:view", subj())).toBe(true);
  });
  it("denies another patient (changing appointmentId in a URL)", () => {
    expect(can(otherPatient, "appointment:view", subj())).toBe(false);
  });
  it("denies a patient who happens to carry a matching facilityId", () => {
    const sneaky: Actor = { userId: "p2", role: "patient", facilityId: "fA" };
    expect(can(sneaky, "appointment:view", subj())).toBe(false);
  });
  it("allows staff and admin of the same facility", () => {
    for (const status of APPOINTMENT_STATUSES) {
      expect(can(staffA, "appointment:view", subj(status))).toBe(true);
      expect(can(adminA, "appointment:view", subj(status))).toBe(true);
    }
  });
  it("denies staff and admin of another facility", () => {
    expect(can(staffB, "appointment:view", subj())).toBe(false);
    expect(can(adminB, "appointment:view", subj())).toBe(false);
  });
  it("allows an operator", () => {
    expect(can(operator, "appointment:view", subj())).toBe(true);
  });
});

describe("access: appointment:checkin", () => {
  it("allows staff/admin of the same facility only when CONFIRMED", () => {
    for (const actor of [staffA, adminA]) {
      for (const status of APPOINTMENT_STATUSES) {
        expect(can(actor, "appointment:checkin", subj(status))).toBe(status === "CONFIRMED");
      }
    }
  });
  it("denies when status is missing", () => {
    expect(can(staffA, "appointment:checkin", { patientUserId: "p1", facilityId: "fA" })).toBe(false);
  });
  it("denies patient and operator", () => {
    expect(can(patient, "appointment:checkin", subj("CONFIRMED"))).toBe(false);
    expect(can(operator, "appointment:checkin", subj("CONFIRMED"))).toBe(false);
  });
});

describe("access: result:upload", () => {
  it("allows staff/admin of the same facility only in eligible states", () => {
    for (const actor of [staffA, adminA]) {
      for (const status of APPOINTMENT_STATUSES) {
        expect(can(actor, "result:upload", subj(status))).toBe(UPLOAD_OK.includes(status));
      }
    }
  });
  it("denies when status is missing", () => {
    expect(can(adminA, "result:upload", { patientUserId: "p1", facilityId: "fA" })).toBe(false);
  });
  it("denies patient and operator in every state", () => {
    for (const status of APPOINTMENT_STATUSES) {
      expect(can(patient, "result:upload", subj(status))).toBe(false);
      expect(can(operator, "result:upload", subj(status))).toBe(false);
    }
  });
});

describe("access: result:view", () => {
  it("allows the owning patient", () => {
    expect(can(patient, "result:view", subj("RESULT_AVAILABLE"))).toBe(true);
  });
  it("denies another patient", () => {
    expect(can(otherPatient, "result:view", subj("RESULT_AVAILABLE"))).toBe(false);
  });
  it("allows staff and admin of the same facility", () => {
    expect(can(staffA, "result:view", subj("RESULT_AVAILABLE"))).toBe(true);
    expect(can(adminA, "result:view", subj("RESULT_AVAILABLE"))).toBe(true);
  });
  it("denies staff and admin of another facility", () => {
    expect(can(staffB, "result:view", subj("RESULT_AVAILABLE"))).toBe(false);
    expect(can(adminB, "result:view", subj("RESULT_AVAILABLE"))).toBe(false);
  });
  it("never allows an operator (Q12 default), in any state", () => {
    for (const status of APPOINTMENT_STATUSES) {
      expect(can(operator, "result:view", subj(status))).toBe(false);
    }
    const operatorWithFacility: Actor = { userId: "o1", role: "operator", facilityId: "fA" };
    expect(can(operatorWithFacility, "result:view", subj("RESULT_AVAILABLE"))).toBe(false);
  });
});
