"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { detectAccountIntent, looksLikeCredential } from "@riomed/backend/core/intent/account";

interface HomeComposerProps {
  initialQuery?: string;
}

export function HomeComposer({ initialQuery = "" }: HomeComposerProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    // Checked in the browser first, so a password or PIN typed here never leaves the device
    // in a URL. The server (src/proxy.ts) applies the same rules again.
    if (looksLikeCredential(q)) {
      setQuery("");
      router.push("/account?mode=warning");
      return;
    }
    const account = detectAccountIntent(q);
    if (account) {
      router.push(`/account?mode=${account.action === "create" ? "signup" : "access"}&type=${account.type}`);
      return;
    }
    router.push(`/?q=${encodeURIComponent(q)}`);
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="relative flex items-center gap-2 rounded-2xl border-[1.5px] border-[#E3E0D6] bg-[#F7F5F0] p-1.5 pl-4 shadow-2xs focus-within:border-[#0E6B5C] focus-within:bg-white transition"
      >
        <label htmlFor="composer-input" className="sr-only">
          Describe what you need — a test, a symptom, an area...
        </label>
        <input
          id="composer-input"
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={1000}
          required
          placeholder="Describe what you need — a test, or prompt 'create account' or 'access dashboard'..."
          className="flex-1 bg-transparent border-none outline-none text-[#12262B] text-sm sm:text-base placeholder:text-[#4B6560]/60 min-h-[44px]"
        />
        <button
          type="submit"
          aria-label="Send"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#0E6B5C] text-white flex items-center justify-center hover:bg-[#0A5347] active:scale-[0.98] transition shrink-0 shadow-2xs"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 19V5M5 12l7-7 7 7"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </form>

    </>
  );
}
