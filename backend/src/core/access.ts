import { isAppointmentStatus, type AppointmentStatus } from "./booking";

export type Role = "patient" | "facility_staff" | "facility_admin" | "operator";

export interface Actor {
  userId: string;
  role: Role;
  facilityId?: string | null;
}

export type Action = "booking:create" | "appointment:view" | "appointment:checkin" | "result:upload" | "result:view";

export interface Subject {
  patientUserId?: string;
  facilityId?: string;
  status?: AppointmentStatus;
}

const ROLES: readonly Role[] = ["patient", "facility_staff", "facility_admin", "operator"];
const UPLOADABLE: readonly AppointmentStatus[] = ["CHECKED_IN", "COMPLETED", "RESULT_AVAILABLE"];

function nonEmpty(s: unknown): s is string {
  return typeof s === "string" && s.length > 0;
}

function isOwner(actor: Actor, subject: Subject): boolean {
  return actor.role === "patient" && nonEmpty(subject.patientUserId) && subject.patientUserId === actor.userId;
}

function isFacilityMember(actor: Actor, subject: Subject): boolean {
  return (
    (actor.role === "facility_staff" || actor.role === "facility_admin") &&
    nonEmpty(actor.facilityId) &&
    nonEmpty(subject.facilityId) &&
    actor.facilityId === subject.facilityId
  );
}

/** Single permission check (SEC-007). Deny by default. */
export function can(actor: Actor | null | undefined, action: Action, subject: Subject | null | undefined): boolean {
  if (!actor || typeof actor !== "object" || !subject || typeof subject !== "object") return false;
  if (!nonEmpty(actor.userId) || !ROLES.includes(actor.role)) return false;

  switch (action) {
    case "booking:create":
      return isOwner(actor, subject);
    case "appointment:view":
      return isOwner(actor, subject) || isFacilityMember(actor, subject) || actor.role === "operator";
    case "appointment:checkin":
      return isFacilityMember(actor, subject) && subject.status === "CONFIRMED";
    case "result:upload":
      return isFacilityMember(actor, subject) && isAppointmentStatus(subject.status) && UPLOADABLE.includes(subject.status);
    case "result:view":
      return isOwner(actor, subject) || isFacilityMember(actor, subject);
    default:
      return false;
  }
}
