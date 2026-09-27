"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { detectAccountIntent, looksLikeCredential } from "@riomed/backend/core/intent/account";
import { Search } from "lucide-react";
import { BorderBeam } from "@/components/ui/border-beam-search";

interface HomeComposerProps {
  initialQuery?: string;
  autoFocus?: boolean;
}

export function HomeComposer({ initialQuery = "", autoFocus = false }: HomeComposerProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      document.getElementById("composer-input")?.focus();
      return;
    }
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
        autoFocus={autoFocus}
        placeholder="Describe what you need — a test, or prompt 'create account' or 'access dashboard'..."
        className="flex-1 bg-transparent border-none outline-none text-[#12262B] text-sm sm:text-base placeholder:text-[#4B6560]/60 min-h-[44px]"
      />
      <BorderBeam
        size="line"
        colorVariant="colorful"
        duration={3.1}
        borderRadius={14}
        theme="dark"
        className="shrink-0 rounded-xl overflow-hidden"
      >
        <button
          type="submit"
          aria-label="Search"
          className="min-h-[44px] h-11 px-4 sm:px-5 rounded-xl bg-[#0E6B5C] text-white flex items-center justify-center gap-2 hover:bg-[#0A5347] active:scale-[0.98] transition font-semibold text-sm shadow-xs cursor-pointer"
        >
          <Search className="w-4 h-4 shrink-0 text-white" strokeWidth={2.4} aria-hidden="true" />
          <span>Search</span>
        </button>
      </BorderBeam>
    </form>
  );
}
