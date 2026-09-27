"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { detectAccountIntent, looksLikeCredential } from "@riomed/backend/core/intent/account";
import { Search } from "lucide-react";

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
      role="search"
      className="flex items-center gap-2 rounded-xl border border-border-strong bg-surface p-1.5 pl-4 shadow-sm transition-shadow duration-150 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15"
    >
      <Search className="h-5 w-5 shrink-0 text-subtle-foreground" aria-hidden />
      <label htmlFor="composer-input" className="sr-only">
        Describe what you need: a test, a place, or &quot;create account&quot;
      </label>
      <input
        id="composer-input"
        name="q"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        maxLength={1000}
        autoFocus={autoFocus}
        placeholder="e.g. malaria test near Ikeja tomorrow"
        className="min-h-[44px] min-w-0 flex-1 border-none bg-transparent text-base text-foreground outline-none placeholder:text-subtle-foreground"
      />
      <button
        type="submit"
        className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-lg bg-primary px-5 text-sm font-bold text-white transition-colors duration-150 hover:bg-primary-strong"
      >
        Search
      </button>
    </form>
  );
}
