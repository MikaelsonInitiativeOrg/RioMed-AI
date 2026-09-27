"use client";

import { useState } from "react";

interface Dependant {
  id: string;
  name: string;
  relationship: string;
  birthYear: string;
}

export function PrivacyManager({ userName }: { userName: string }) {
  const [dependants, setDependants] = useState<Dependant[]>([
    { id: "dep_1", name: "Chinedu Obi", relationship: "Child", birthYear: "2018" },
    { id: "dep_2", name: "Mama Comfort", relationship: "Parent", birthYear: "1954" },
  ]);

  const [newName, setNewName] = useState("");
  const [newRel, setNewRel] = useState("Child");
  const [newYear, setNewYear] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [exportReady, setExportReady] = useState(false);
  const [deleteRequested, setDeleteRequested] = useState(false);

  function handleAddDependant(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setDependants((prev) => [
      ...prev,
      {
        id: `dep_${Date.now()}`,
        name: newName.trim(),
        relationship: newRel,
        birthYear: newYear || "Unknown",
      },
    ]);
    setNewName("");
    setNewYear("");
    setShowAddForm(false);
  }

  function handleExportData() {
    const data = {
      user: userName,
      exportedAt: new Date().toISOString(),
      regulations: "Nigeria Data Protection Act (NDPA)",
      dependants,
      retentionNotice: "Test result files are stored cryptographically in RioMed Vault.",
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `riomed_data_export_${userName.toLowerCase().replace(/\s+/g, "_")}.json`;
    a.click();
    setExportReady(true);
  }

  return (
    <div className="space-y-6">
      {/* 1. MANAGE DEPENDANTS SECTION */}
      <section className="rounded-2xl border border-[#E3E0D6] bg-white p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading font-bold text-base sm:text-lg text-[#0A5347]">
              Family Dependants
            </h2>
            <p className="text-xs text-[#4B6560]">
              Book tests for children or elderly relatives under your account.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex min-h-[38px] items-center rounded-xl bg-[#F3FAF8] border border-[#0E6B5C]/30 px-3.5 py-1 text-xs font-heading font-bold text-[#0E6B5C] hover:bg-[#CDE8E1]/50 transition"
          >
            {showAddForm ? "Cancel" : "+ Add Dependant"}
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleAddDependant} className="rounded-xl bg-[#F7F5F0] border border-[#E3E0D6] p-4 space-y-3 animate-in fade-in duration-200">
            <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-[#4B6560]">
              Add Family Member
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                required
                placeholder="Full Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="min-h-[40px] rounded-lg border border-[#E3E0D6] bg-white px-3 py-1 text-xs text-[#12262B]"
              />
              <select
                value={newRel}
                onChange={(e) => setNewRel(e.target.value)}
                className="min-h-[40px] rounded-lg border border-[#E3E0D6] bg-white px-3 py-1 text-xs text-[#12262B]"
              >
                <option value="Child">Child</option>
                <option value="Parent">Parent</option>
                <option value="Spouse">Spouse</option>
                <option value="Sibling">Sibling</option>
                <option value="Other">Other</option>
              </select>
              <input
                type="text"
                placeholder="Year of birth (optional)"
                value={newYear}
                onChange={(e) => setNewYear(e.target.value)}
                className="min-h-[40px] rounded-lg border border-[#E3E0D6] bg-white px-3 py-1 text-xs text-[#12262B]"
              />
            </div>
            <button
              type="submit"
              className="min-h-[38px] rounded-lg bg-[#0E6B5C] px-4 py-1.5 text-xs font-heading font-bold text-white shadow-xs hover:bg-[#0A5347]"
            >
              Save Dependant
            </button>
          </form>
        )}

        <div className="space-y-2">
          {dependants.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between p-3 rounded-xl border border-[#E3E0D6] bg-[#F7F5F0] text-xs"
            >
              <div>
                <span className="font-bold text-[#12262B]">{d.name}</span>
                <span className="text-[#4B6560] ml-2">
                  ({d.relationship} · born {d.birthYear})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDependants((prev) => prev.filter((x) => x.id !== d.id))}
                className="text-xs text-[#8A251C] hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 2. DATA EXPORT (PORTABILITY) */}
      <section className="rounded-2xl border border-[#E3E0D6] bg-white p-5 sm:p-6 shadow-2xs space-y-3">
        <h2 className="font-heading font-bold text-base sm:text-lg text-[#0A5347]">
          Data Portability (Export)
        </h2>
        <p className="text-xs text-[#4B6560]">
          Under Section 38 of the NDPA, you have the right to receive your personal data in a structured, commonly used machine-readable format.
        </p>

        <button
          type="button"
          onClick={handleExportData}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#0E6B5C] px-5 py-2 text-xs font-heading font-bold text-white shadow-xs hover:bg-[#0A5347] transition"
        >
          📥 Download Complete Data Archive (JSON)
        </button>

        {exportReady && (
          <p className="text-xs font-semibold text-[#0A5347]">
            ✓ Data archive generated and downloaded to your device.
          </p>
        )}
      </section>

      {/* 3. DATA DELETION & RETENTION */}
      <section className="rounded-2xl border border-[#FBE9E7] bg-white p-5 sm:p-6 shadow-2xs space-y-3">
        <h2 className="font-heading font-bold text-base sm:text-lg text-[#8A251C]">
          Account &amp; Data Deletion
        </h2>
        <p className="text-xs text-[#4B6560] leading-relaxed">
          Requesting deletion will permanently unlink your phone, email, and profile identifiers. Please note: Diagnostic test records and audit trails are legally subject to medical records retention standards (6 years) and rolling 30-day backup cycles.
        </p>

        {deleteRequested ? (
          <div className="rounded-xl bg-[#FBE9E7] p-3 text-xs text-[#8A251C] font-semibold">
            ✓ Deletion request recorded. Your profile will be queued for automated purge within 30 days.
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setDeleteRequested(true)}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#8A251C] bg-white px-5 py-2 text-xs font-heading font-bold text-[#8A251C] hover:bg-[#FBE9E7] transition"
          >
            Request Profile Deletion
          </button>
        )}
      </section>
    </div>
  );
}
