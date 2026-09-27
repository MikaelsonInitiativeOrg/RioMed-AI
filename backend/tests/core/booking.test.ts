import { describe, it, expect } from "vitest";
import {
  APPOINTMENT_STATUSES,
  type AppointmentStatus,
  canTransition,
  assertTransition,
  InvalidTransitionError,
  releasesCapacity,
  acquiresCapacity,
  HOLD_MINUTES,
  MAX_ACTIVE_HOLDS_PER_PATIENT,
  generateBookingReference,
  isSlotBookable,
} from "@/core/booking";
import { mulberry32, randInt, pick } from "./_helpers";

const ALLOWED: Record<AppointmentStatus, AppointmentStatus[]> = {
  HELD: ["PENDING_PAYMENT", "CONFIRMED", "EXPIRED", "CANCELLED_BY_PATIENT"],
  PENDING_PAYMENT: ["CONFIRMED", "EXPIRED", "CANCELLED_BY_PATIENT"],
  EXPIRED: ["CONFIRMED", "REFUNDED"],
  CONFIRMED: ["CHECKED_IN", "CANCELLED_BY_PATIENT", "CANCELLED_BY_FACILITY", "NO_SHOW"],
  CHECKED_IN: ["COMPLETED", "RESULT_AVAILABLE"],
  COMPLETED: ["RESULT_AVAILABLE"],
  CANCELLED_BY_PATIENT: ["REFUNDED"],
  CANCELLED_BY_FACILITY: ["REFUNDED"],
  NO_SHOW: [],
  REFUNDED: [],
  RESULT_AVAILABLE: [],
};

const REF_RE = /^RM-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;

describe("booking constants", () => {
  it("has exactly the eleven statuses", () => {
    expect([...APPOINTMENT_STATUSES]).toEqual([
      "HELD",
      "PENDING_PAYMENT",
      "CONFIRMED",
      "CHECKED_IN",
      "COMPLETED",
      "RESULT_AVAILABLE",
      "EXPIRED",
      "CANCELLED_BY_PATIENT",
      "CANCELLED_BY_FACILITY",
      "NO_SHOW",
      "REFUNDED",
    ]);
  });
  it("hold is 15 minutes and max 2 active holds", () => {
    expect(HOLD_MINUTES).toBe(15);
    expect(MAX_ACTIVE_HOLDS_PER_PATIENT).toBe(2);
  });
});

describe("canTransition: full table", () => {
  for (const from of APPOINTMENT_STATUSES) {
    for (const to of APPOINTMENT_STATUSES) {
      const allowed = ALLOWED[from].includes(to);
      it(`${from} -> ${to} is ${allowed ? "allowed" : "rejected"}`, () => {
        expect(canTransition(from, to)).toBe(allowed);
      });
    }
  }

  it("rejects every X -> X", () => {
    for (const s of APPOINTMENT_STATUSES) expect(canTransition(s, s)).toBe(false);
  });

  it("terminal states have no outgoing transitions", () => {
    for (const from of ["NO_SHOW", "REFUNDED", "RESULT_AVAILABLE"] as const) {
      for (const to of APPOINTMENT_STATUSES) expect(canTransition(from, to)).toBe(false);
    }
  });

  it("rejects unknown statuses without throwing", () => {
    const bogus = "PAID" as unknown as AppointmentStatus;
    expect(canTransition(bogus, "CONFIRMED")).toBe(false);
    expect(canTransition("HELD", bogus)).toBe(false);
  });
});

describe("assertTransition", () => {
  it("does not throw for every allowed transition", () => {
    for (const from of APPOINTMENT_STATUSES) {
      for (const to of ALLOWED[from]) expect(() => assertTransition(from, to)).not.toThrow();
    }
  });

  it("throws InvalidTransitionError for every rejected transition", () => {
    for (const from of APPOINTMENT_STATUSES) {
      for (const to of APPOINTMENT_STATUSES) {
        if (ALLOWED[from].includes(to)) continue;
        let caught: unknown;
        try {
          assertTransition(from, to);
        } catch (e) {
          caught = e;
        }
        expect(caught, `${from}->${to}`).toBeInstanceOf(InvalidTransitionError);
        expect(caught).toBeInstanceOf(Error);
      }
    }
  });
});

describe("booking state machine properties", () => {
  it("random walks from HELD only ever take allowed steps and end in a terminal or stuck state", () => {
    const rng = mulberry32(42);
    for (let walk = 0; walk < 500; walk++) {
      let s: AppointmentStatus = "HELD";
      const seen: AppointmentStatus[] = [s];
      for (let step = 0; step < 20; step++) {
        const next = APPOINTMENT_STATUSES.filter((t) => canTransition(s, t));
        if (next.length === 0) break;
        const t = pick(rng, next);
        expect(ALLOWED[s]).toContain(t);
        s = t;
        seen.push(s);
      }
      // RESULT_AVAILABLE is only reachable after CHECKED_IN
      if (seen.includes("RESULT_AVAILABLE")) expect(seen).toContain("CHECKED_IN");
      // CHECKED_IN is only reachable after CONFIRMED
      if (seen.includes("CHECKED_IN")) expect(seen).toContain("CONFIRMED");
    }
  });
});

describe("capacity truth tables", () => {
  const RELEASE_FROM: AppointmentStatus[] = ["HELD", "PENDING_PAYMENT", "CONFIRMED"];
  const RELEASE_TO: AppointmentStatus[] = ["EXPIRED", "CANCELLED_BY_PATIENT", "CANCELLED_BY_FACILITY"];

  for (const from of APPOINTMENT_STATUSES) {
    for (const to of APPOINTMENT_STATUSES) {
      const rel = RELEASE_FROM.includes(from) && RELEASE_TO.includes(to);
      const acq = from === "EXPIRED" && to === "CONFIRMED";
      it(`${from} -> ${to}: releases=${rel} acquires=${acq}`, () => {
        expect(releasesCapacity(from, to)).toBe(rel);
        expect(acquiresCapacity(from, to)).toBe(acq);
      });
    }
  }

  it("no transition both releases and acquires", () => {
    for (const from of APPOINTMENT_STATUSES)
      for (const to of APPOINTMENT_STATUSES)
        expect(releasesCapacity(from, to) && acquiresCapacity(from, to)).toBe(false);
  });
});

describe("generateBookingReference", () => {
  it("matches the format over many default generations with no ambiguous characters", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 5000; i++) {
      const ref = generateBookingReference();
      expect(ref).toMatch(REF_RE);
      expect(ref.slice(3)).not.toMatch(/[0O1I]/);
      seen.add(ref);
    }
    // 32^8 space: collisions among 5000 are astronomically unlikely
    expect(seen.size).toBe(5000);
  });

  it("uses the injected random source and still matches the format", () => {
    const rng = mulberry32(7);
    const rand = (n: number) => {
      const out = new Uint8Array(n);
      for (let i = 0; i < n; i++) out[i] = randInt(rng, 0, 255);
      return out;
    };
    for (let i = 0; i < 2000; i++) expect(generateBookingReference(rand)).toMatch(REF_RE);
  });

  it("matches the format for extreme byte sources (all 0x00, all 0xFF)", () => {
    const zeros = (n: number) => new Uint8Array(n);
    const ones = (n: number) => new Uint8Array(n).fill(255);
    expect(generateBookingReference(zeros)).toMatch(REF_RE);
    expect(generateBookingReference(ones)).toMatch(REF_RE);
  });

  it("is deterministic for the same byte source", () => {
    const makeRand = () => {
      const rng = mulberry32(99);
      return (n: number) => {
        const out = new Uint8Array(n);
        for (let i = 0; i < n; i++) out[i] = randInt(rng, 0, 255);
        return out;
      };
    };
    expect(generateBookingReference(makeRand())).toBe(generateBookingReference(makeRand()));
  });

  it("different byte sources give different references", () => {
    const a = generateBookingReference((n) => new Uint8Array(n).fill(0));
    const b = generateBookingReference((n) => new Uint8Array(n).fill(77));
    expect(a).not.toBe(b);
  });
});

describe("isSlotBookable", () => {
  const now = new Date("2026-09-27T09:00:00.000Z");
  const plus = (ms: number) => new Date(now.getTime() + ms);
  const MIN = 60_000;

  it("is true at exactly 60 minutes of notice (default)", () => {
    expect(isSlotBookable(plus(60 * MIN), now)).toBe(true);
  });
  it("is false 1 ms short of 60 minutes", () => {
    expect(isSlotBookable(plus(60 * MIN - 1), now)).toBe(false);
  });
  it("is true beyond 60 minutes", () => {
    expect(isSlotBookable(plus(61 * MIN), now)).toBe(true);
    expect(isSlotBookable(plus(24 * 60 * MIN), now)).toBe(true);
  });
  it("is false for past slots and slots starting now", () => {
    expect(isSlotBookable(plus(-MIN), now)).toBe(false);
    expect(isSlotBookable(now, now)).toBe(false);
  });
  it("respects a custom minimum notice", () => {
    expect(isSlotBookable(plus(30 * MIN), now, 30)).toBe(true);
    expect(isSlotBookable(plus(30 * MIN - 1), now, 30)).toBe(false);
    expect(isSlotBookable(plus(90 * MIN), now, 120)).toBe(false);
    expect(isSlotBookable(now, now, 0)).toBe(true);
    expect(isSlotBookable(plus(-1), now, 0)).toBe(false);
  });
});
