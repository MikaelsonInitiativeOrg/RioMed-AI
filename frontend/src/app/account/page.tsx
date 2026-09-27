import { redirect } from "next/navigation";
import { getDeviceUserSummary, listSignupFacilities } from "@riomed/backend/server/accounts";
import { CredentialWarningDialog, ForgotDialog, PasswordDialog, PendingDialog, PinDialog, ResetDialog, SignUpDialog } from "@/components/AccountDialog";
import { getDeviceUserId, getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

/** Account popup: /account?mode=signup|access|warning&type=patient|facility&next=/path */
export default async function AccountPage(props: PageProps<"/account">) {
  const sp = await props.searchParams;
  const mode = one(sp.mode) ?? "access";
  const type = one(sp.type) === "facility" ? "facility" : "patient";
  const nextRaw = one(sp.next) ?? "/";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";

  if (mode === "warning") return <CredentialWarningDialog />;
  if (mode === "forgot") return <ForgotDialog />;
  if (mode === "reset") return <ResetDialog token={one(sp.token) ?? ""} />;
  if (mode === "signup") return <SignUpDialog type={type} facilities={type === "facility" ? await listSignupFacilities() : []} />;

  // "access dashboard": already unlocked -> straight in; remembered device -> PIN; else password.
  const user = await getSessionUser();
  if (user?.pending) return <PendingDialog />;
  if (user) {
    redirect(next !== "/" ? next : user.role === "patient" ? "/dashboard" : user.role === "operator" ? "/operator" : "/staff");
  }
  const deviceUserId = await getDeviceUserId();
  const device = deviceUserId ? await getDeviceUserSummary(deviceUserId) : null;
  if (device?.username) return <PinDialog next={next} who={`${device.name} (@${device.username})`} />;
  return <PasswordDialog next={next} />;
}
