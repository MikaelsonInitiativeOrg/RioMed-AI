"use client";

import { useState } from "react";
import { signInAction } from "@/app/actions";
import { RioMedLogo } from "@/components/Logo";

interface ChatAccountFlowProps {
  initialPrompt?: string;
  initialMode?: "create" | "pin";
  targetRole?: "patient" | "facility_staff";
  demoUsers?: Array<{ id: string; name: string; role: string }>;
}

export function ChatAccountFlow({
  initialMode = "create",
  targetRole = "patient",
  demoUsers = [
    { id: "usr_patient_ada", name: "Ada Obi (Patient)", role: "patient" },
    { id: "usr_patient_tunde", name: "Tunde Bakare (Patient)", role: "patient" },
    { id: "usr_staff_alausa", name: "Alausa Diagnostics Desk", role: "facility_staff" },
    { id: "usr_staff_yaba", name: "Yaba Central Lab Desk", role: "facility_staff" },
  ],
}: ChatAccountFlowProps) {
  const [mode, setMode] = useState<"create" | "pin">(initialMode);
  const [role, setRole] = useState<"patient" | "facility_staff">(targetRole);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("1234");
  const [showPinModal, setShowPinModal] = useState(initialMode === "pin");
  const [accountCreated, setAccountCreated] = useState(false);
  const [createdUser, setCreatedUser] = useState<string>("");

  const filteredUsers = demoUsers.filter((u) => u.role === role);
  const [selectedUserId, setSelectedUserId] = useState<string>(
    filteredUsers[0]?.id ?? demoUsers[0].id
  );

  function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setAccountCreated(true);
    setCreatedUser(username.trim());
    // Auto transition to pin modal or access state
    setTimeout(() => {
      setMode("pin");
      setShowPinModal(true);
    }, 1000);
  }

  return (
    <div className="w-full space-y-4">
      {/* Assistant Response Bubble */}
      <div className="flex items-start gap-3">
        <div className="mt-1 shrink-0">
          <RioMedLogo size={28} />
        </div>

        <div className="flex-1 min-w-0 space-y-4">
          <div className="rounded-2xl rounded-bl-xs border border-[#E3E0D6] bg-white p-4 sm:p-5 text-sm text-[#12262B] shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#F0EEE7] pb-2.5">
              <span className="font-heading font-bold text-sm text-[#0A5347] flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0A5347] text-white text-xs">
                  {role === "patient" ? "👤" : "🏥"}
                </span>
                {mode === "create"
                  ? "Account Registration"
                  : "Dashboard Access with PIN"}
              </span>
              <span className="rounded-full bg-[#CDE8E1] px-2.5 py-0.5 text-[11px] font-bold text-[#0A5347]">
                SECURE
              </span>
            </div>

            {mode === "create" ? (
              <div>
                <p className="text-sm text-[#12262B]">
                  I&apos;ll help you create your RioMed account. Please choose your role and enter your username and password below:
                </p>

                {accountCreated ? (
                  <div className="mt-4 rounded-xl border border-[#0E6B5C]/30 bg-[#F3FAF8] p-4 text-center space-y-2">
                    <p className="font-heading font-bold text-sm text-[#0A5347]">
                      ✓ Account successfully registered for {createdUser}!
                    </p>
                    <p className="text-xs text-[#4B6560]">
                      Your 4-digit PIN is set to <strong className="font-mono text-[#0A5347]">{pin || "1234"}</strong>. You can now prompt &quot;access dashboard&quot; anytime.
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMode("pin");
                          setShowPinModal(true);
                        }}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#0E6B5C] px-5 py-2 text-xs font-heading font-bold text-white shadow-xs hover:bg-[#0A5347] transition"
                      >
                        Access {role === "patient" ? "Patient" : "Clinic"} Dashboard with PIN →
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleCreateAccount} className="mt-4 space-y-3.5">
                    {/* Role selector */}
                    <div>
                      <label className="block text-xs font-semibold text-[#4B6560] mb-1">
                        Account Type
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setRole("patient");
                            const u = demoUsers.find((x) => x.role === "patient");
                            if (u) setSelectedUserId(u.id);
                          }}
                          className={`rounded-xl border p-2.5 text-xs font-heading font-bold text-left transition ${
                            role === "patient"
                              ? "border-[#0E6B5C] bg-[#F3FAF8] text-[#0A5347]"
                              : "border-[#E3E0D6] bg-white text-[#4B6560] hover:bg-[#F7F5F0]"
                          }`}
                        >
                          👤 Patient Account
                          <span className="block text-[11px] font-normal text-[#8B9490] mt-0.5">
                            Book tests &amp; view results
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setRole("facility_staff");
                            const u = demoUsers.find((x) => x.role === "facility_staff");
                            if (u) setSelectedUserId(u.id);
                          }}
                          className={`rounded-xl border p-2.5 text-xs font-heading font-bold text-left transition ${
                            role === "facility_staff"
                              ? "border-[#0E6B5C] bg-[#F3FAF8] text-[#0A5347]"
                              : "border-[#E3E0D6] bg-white text-[#4B6560] hover:bg-[#F7F5F0]"
                          }`}
                        >
                          🏥 Clinic / Facility Desk
                          <span className="block text-[11px] font-normal text-[#8B9490] mt-0.5">
                            Front desk &amp; schedule management
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Username */}
                    <div>
                      <label className="block text-xs font-semibold text-[#4B6560] mb-1">
                        Username / Email / Phone
                      </label>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder={
                          role === "patient"
                            ? "e.g. ada.obi or 08012345678"
                            : "e.g. grace.lab.desk or staff@grace.com"
                        }
                        className="w-full min-h-[44px] rounded-xl border border-[#E3E0D6] px-3.5 py-2 text-sm text-[#12262B] focus:border-[#0E6B5C] focus:outline-none focus:ring-2 focus:ring-[#0E6B5C]/20"
                      />
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-xs font-semibold text-[#4B6560] mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a secure password"
                        className="w-full min-h-[44px] rounded-xl border border-[#E3E0D6] px-3.5 py-2 text-sm text-[#12262B] focus:border-[#0E6B5C] focus:outline-none focus:ring-2 focus:ring-[#0E6B5C]/20"
                      />
                    </div>

                    {/* Quick Access 4-digit PIN */}
                    <div>
                      <label className="block text-xs font-semibold text-[#4B6560] mb-1">
                        4-Digit Dashboard Access PIN
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="1234"
                        className="w-full min-h-[44px] rounded-xl border border-[#E3E0D6] px-3.5 py-2 text-sm text-[#12262B] font-mono tracking-widest text-center focus:border-[#0E6B5C] focus:outline-none focus:ring-2 focus:ring-[#0E6B5C]/20"
                      />
                      <p className="mt-1 text-[11px] text-[#8B9490]">
                        Used when you prompt &quot;access dashboard&quot; to quickly unlock your records.
                      </p>
                    </div>

                    <button
                      type="submit"
                      className="w-full min-h-[44px] rounded-xl bg-[#0E6B5C] font-heading font-bold text-white text-sm hover:bg-[#0A5347] transition shadow-xs mt-2"
                    >
                      Create Account &amp; Save PIN
                    </button>

                    <div className="pt-2 text-center text-xs text-[#4B6560]">
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setMode("pin");
                          setShowPinModal(true);
                        }}
                        className="font-bold text-[#0E6B5C] underline hover:text-[#0A5347]"
                      >
                        Prompt &quot;access dashboard&quot; or enter PIN
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-[#12262B]">
                  To access your {role === "patient" ? "Patient" : "Clinic"} Dashboard, enter your 4-digit PIN below:
                </p>

                <button
                  type="button"
                  onClick={() => setShowPinModal(true)}
                  className="w-full min-h-[48px] rounded-xl bg-[#0E6B5C] font-heading font-bold text-white text-sm hover:bg-[#0A5347] transition shadow-xs flex items-center justify-center gap-2"
                >
                  <span>🔐 Enter PIN to Unlock Dashboard</span>
                </button>

                <div className="text-center text-xs text-[#4B6560]">
                  Need a new account instead?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("create")}
                    className="font-bold text-[#0E6B5C] underline hover:text-[#0A5347]"
                  >
                    Prompt &quot;create account&quot;
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PIN POPUP MODAL */}
      {showPinModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-md rounded-2xl border border-[#E3E0D6] bg-white p-6 shadow-xl">
            {/* Close */}
            <button
              type="button"
              onClick={() => setShowPinModal(false)}
              className="absolute top-4 right-4 text-[#4B6560] hover:text-[#12262B] p-1 rounded-lg text-lg min-h-[36px] min-w-[36px] flex items-center justify-center"
              aria-label="Close modal"
            >
              ✕
            </button>

            {/* Modal Header */}
            <div className="mb-5 text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A5347] text-white">
                <svg width="24" height="24" viewBox="0 0 48 48">
                  <path
                    d="M9 25h6l3-9 5 17 4-14 3 6h9"
                    stroke="#F3FAF8"
                    strokeWidth="3.4"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="37" cy="25" r="4.4" fill="#8FE0CE" />
                </svg>
              </div>
              <h2 className="font-heading text-xl font-bold text-[#0A5347]">
                Access {role === "patient" ? "Patient" : "Clinic"} Dashboard
              </h2>
              <p className="mt-1 text-xs text-[#4B6560]">
                Enter your 4-digit PIN to load your records and schedule.
              </p>
            </div>

            {/* Role Switcher in Modal */}
            <div className="mb-4 flex rounded-xl border border-[#E3E0D6] bg-[#F7F5F0] p-1">
              <button
                type="button"
                onClick={() => {
                  setRole("patient");
                  const u = demoUsers.find((x) => x.role === "patient");
                  if (u) setSelectedUserId(u.id);
                }}
                className={`flex-1 rounded-lg py-2 text-xs font-heading font-bold transition ${
                  role === "patient"
                    ? "bg-white text-[#0A5347] shadow-xs"
                    : "text-[#4B6560] hover:text-[#12262B]"
                }`}
              >
                👤 Patient Dashboard
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole("facility_staff");
                  const u = demoUsers.find((x) => x.role === "facility_staff");
                  if (u) setSelectedUserId(u.id);
                }}
                className={`flex-1 rounded-lg py-2 text-xs font-heading font-bold transition ${
                  role === "facility_staff"
                    ? "bg-white text-[#0A5347] shadow-xs"
                    : "text-[#4B6560] hover:text-[#12262B]"
                }`}
              >
                🏥 Clinic / Facility Desk
              </button>
            </div>

            {/* PIN Form submitting directly to signInAction */}
            <form action={signInAction} className="space-y-4">
              <input
                type="hidden"
                name="next"
                value={role === "patient" ? "/dashboard" : "/staff"}
              />

              <div>
                <label className="block text-xs font-semibold text-[#4B6560] mb-1.5">
                  Select {role === "patient" ? "Patient" : "Clinic"} Profile
                </label>
                <div className="space-y-1.5">
                  {filteredUsers.map((u) => (
                    <label
                      key={u.id}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer text-xs transition ${
                        selectedUserId === u.id
                          ? "border-[#0E6B5C] bg-[#F3FAF8]"
                          : "border-[#E3E0D6] bg-white hover:bg-[#F7F5F0]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="userId"
                        value={u.id}
                        checked={selectedUserId === u.id}
                        onChange={() => setSelectedUserId(u.id)}
                        className="accent-[#0E6B5C]"
                      />
                      <span className="font-semibold text-[#12262B]">{u.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4B6560] mb-1">
                  Enter 4-digit PIN
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  defaultValue="1234"
                  placeholder="• • • •"
                  className="w-full min-h-[48px] rounded-xl border border-[#E3E0D6] px-4 py-2 text-xl text-[#12262B] font-mono tracking-widest text-center focus:border-[#0E6B5C] focus:outline-none focus:ring-2 focus:ring-[#0E6B5C]/20"
                />
                <p className="mt-1 text-[11px] text-[#8B9490] text-center">
                  Demo PIN is pre-filled (1234). Tap unlock to load dashboard.
                </p>
              </div>

              <button
                type="submit"
                className="w-full min-h-[48px] rounded-xl bg-[#0E6B5C] font-heading font-bold text-white text-sm hover:bg-[#0A5347] transition shadow-xs"
              >
                Unlock {role === "patient" ? "Patient Dashboard" : "Clinic Desk"} →
              </button>

              <div className="pt-1 text-center text-xs text-[#4B6560]">
                Need to create a new profile?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setShowPinModal(false);
                    setMode("create");
                  }}
                  className="font-bold text-[#0E6B5C] underline hover:text-[#0A5347]"
                >
                  Register account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
