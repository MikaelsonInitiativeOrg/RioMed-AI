"use client";

import { useState } from "react";
import { signInAction } from "@/app/actions";

interface AccountDashboardModalProps {
  isOpen: boolean;
  initialMode?: "create" | "pin";
  onClose: () => void;
  targetRole?: "patient" | "facility_staff";
  demoUsers?: Array<{ id: string; name: string; role: string }>;
}

export function AccountDashboardModal({
  isOpen,
  initialMode = "pin",
  onClose,
  targetRole = "patient",
  demoUsers = [
    { id: "usr_patient_ada", name: "Ada (demo patient)", role: "patient" },
    { id: "usr_patient_tunde", name: "Tunde (demo patient)", role: "patient" },
    { id: "usr_staff_alausa", name: "Staff, Alausa Diagnostics", role: "facility_staff" },
    { id: "usr_staff_yaba", name: "Staff, Yaba Central Lab", role: "facility_staff" },
  ],
}: AccountDashboardModalProps) {
  const [mode, setMode] = useState<"create" | "pin">(initialMode);
  const [role, setRole] = useState<"patient" | "facility_staff">(targetRole);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [createdSuccess, setCreatedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredUsers = demoUsers.filter((u) => u.role === role);
  const defaultUser = filteredUsers[0] ?? demoUsers[0];

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please provide both username and password.");
      return;
    }
    setError(null);
    setCreatedSuccess(true);
    // Switch to PIN entry after a brief moment
    setTimeout(() => {
      setMode("pin");
      setCreatedSuccess(false);
    }, 1200);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-[#E3E0D6] bg-white p-6 shadow-xl">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
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
            {mode === "create" ? "Create RioMed Account" : "Access Dashboard"}
          </h2>
          <p className="mt-1 text-xs text-[#4B6560]">
            {mode === "create"
              ? "Register a patient or clinic account to manage tests and records."
              : "Enter your PIN or credentials to load your dashboard."}
          </p>
        </div>

        {/* Role Toggle */}
        <div className="mb-4 flex rounded-xl border border-[#E3E0D6] bg-[#F7F5F0] p-1">
          <button
            type="button"
            onClick={() => setRole("patient")}
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
            onClick={() => setRole("facility_staff")}
            className={`flex-1 rounded-lg py-2 text-xs font-heading font-bold transition ${
              role === "facility_staff"
                ? "bg-white text-[#0A5347] shadow-xs"
                : "text-[#4B6560] hover:text-[#12262B]"
            }`}
          >
            🏥 Clinic / Facility Desk
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-lg bg-[#FBE9E7] p-2.5 text-xs text-[#8A251C]">
            {error}
          </div>
        )}

        {createdSuccess && (
          <div className="mb-3 rounded-lg bg-[#F3FAF8] border border-[#0E6B5C]/30 p-2.5 text-xs text-[#0A5347] font-semibold text-center">
            ✓ Account created for {username}! Loading PIN verification…
          </div>
        )}

        {/* MODE 1: CREATE ACCOUNT */}
        {mode === "create" ? (
          <form onSubmit={handleCreate} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#4B6560] mb-1">
                Username / Email / Phone
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={role === "patient" ? "e.g. ada.obi or 08012345678" : "e.g. grace.lab.desk"}
                className="w-full min-h-[44px] rounded-xl border border-[#E3E0D6] px-3.5 py-2 text-sm text-[#12262B] focus:border-[#0E6B5C] focus:outline-none focus:ring-2 focus:ring-[#0E6B5C]/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4B6560] mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose a password"
                className="w-full min-h-[44px] rounded-xl border border-[#E3E0D6] px-3.5 py-2 text-sm text-[#12262B] focus:border-[#0E6B5C] focus:outline-none focus:ring-2 focus:ring-[#0E6B5C]/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4B6560] mb-1">
                4-digit Quick Access PIN
              </label>
              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="e.g. 1234"
                className="w-full min-h-[44px] rounded-xl border border-[#E3E0D6] px-3.5 py-2 text-sm text-[#12262B] font-mono tracking-widest text-center focus:border-[#0E6B5C] focus:outline-none focus:ring-2 focus:ring-[#0E6B5C]/20"
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[44px] rounded-xl bg-[#0E6B5C] font-heading font-bold text-white text-sm hover:bg-[#0A5347] transition shadow-xs mt-2"
            >
              Create Account &amp; Continue
            </button>

            <div className="pt-2 text-center text-xs text-[#4B6560]">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("pin")}
                className="font-bold text-[#0E6B5C] underline hover:text-[#0A5347]"
              >
                Access dashboard with PIN
              </button>
            </div>
          </form>
        ) : (
          /* MODE 2: PIN / DASHBOARD ACCESS */
          <form action={signInAction} className="space-y-4">
            <input type="hidden" name="userId" value={defaultUser?.id ?? ""} />
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
                    className="flex items-center gap-2.5 p-2.5 rounded-xl border border-[#E3E0D6] hover:bg-[#F3FAF8] cursor-pointer text-xs"
                  >
                    <input
                      type="radio"
                      name="userId"
                      value={u.id}
                      defaultChecked={u.id === defaultUser?.id}
                      className="accent-[#0E6B5C]"
                    />
                    <span className="font-semibold text-[#12262B]">{u.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4B6560] mb-1">
                Enter your 4-digit PIN
              </label>
              <input
                type="password"
                maxLength={4}
                required
                defaultValue="1234"
                placeholder="• • • •"
                className="w-full min-h-[48px] rounded-xl border border-[#E3E0D6] px-4 py-2 text-lg text-[#12262B] font-mono tracking-widest text-center focus:border-[#0E6B5C] focus:outline-none focus:ring-2 focus:ring-[#0E6B5C]/20"
              />
              <p className="mt-1 text-[11px] text-[#8B9490] text-center">
                Demo PIN is pre-filled. Tap unlock to load {role === "patient" ? "patient dashboard" : "clinic schedule"}.
              </p>
            </div>

            <button
              type="submit"
              className="w-full min-h-[48px] rounded-xl bg-[#0E6B5C] font-heading font-bold text-white text-sm hover:bg-[#0A5347] transition shadow-xs"
            >
              Unlock {role === "patient" ? "Patient Dashboard" : "Clinic Desk"} →
            </button>

            <div className="pt-1 text-center text-xs text-[#4B6560]">
              Need a new account?{" "}
              <button
                type="button"
                onClick={() => setMode("create")}
                className="font-bold text-[#0E6B5C] underline hover:text-[#0A5347]"
              >
                Create an account
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
