"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { detectAccountIntent, looksLikeCredential } from "@riomed/backend/core/intent/account";
import { Loader2, Search } from "lucide-react";

interface HomeComposerProps {
  initialQuery?: string;
  autoFocus?: boolean;
}

/**
 * The search box. Uncontrolled on purpose: React never rewrites what the person typed or pasted,
 * even if they paste before the page has finished loading on a slow connection. The form is also a
 * plain GET to "/", so it still works before the JavaScript arrives (src/proxy.ts then applies the
 * same credential and account rules on the server).
 */
export function HomeComposer({ initialQuery = "", autoFocus = false }: HomeComposerProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  // A search takes 1–5 s (AI + facilities); show it's working straight away instead of looking stuck.
  const [searching, startSearch] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = inputRef.current;
    const q = (input?.value ?? "").trim();
    if (!q) {
      input?.focus();
      return;
    }
    // Checked in the browser first, so a password or PIN typed here never leaves the device
    // in a URL. The server (src/proxy.ts) applies the same rules again.
    if (looksLikeCredential(q)) {
      if (input) input.value = "";
      router.push("/account?mode=warning");
      return;
    }
    const account = detectAccountIntent(q);
    if (account) {
      router.push(`/account?mode=${account.action === "create" ? "signup" : "access"}&type=${account.type}`);
      return;
    }
    startSearch(() => router.push(`/?q=${encodeURIComponent(q)}`));
  }

  return (
    <form
      action="/"
      method="get"
      onSubmit={handleSubmit}
      role="search"
      className="flex items-center gap-2 rounded-xl border border-border-strong bg-surface p-1.5 pl-4 shadow-sm transition-shadow duration-150 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15"
    >
      <Search className="h-5 w-5 shrink-0 text-subtle-foreground" aria-hidden />
      <label htmlFor="composer-input" className="sr-only">
        Describe what you need: a test, a place, or &quot;create account&quot;
      </label>
      <input
        ref={inputRef}
        id="composer-input"
        name="q"
        type="search"
        enterKeyHint="search"
        defaultValue={initialQuery}
        key={initialQuery}
        maxLength={1000}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        placeholder="e.g. malaria test near Ikeja tomorrow"
        data-search-box=""
        className="min-h-[44px] min-w-0 flex-1 border-none bg-transparent text-base text-foreground outline-none placeholder:text-subtle-foreground [&::-webkit-search-cancel-button]:cursor-pointer"
      />
      <button
        type="submit"
        disabled={searching}
        aria-busy={searching}
        className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-white transition-colors duration-150 hover:bg-primary-strong disabled:opacity-80"
      >
        {searching && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {searching ? "Searching…" : "Search"}
      </button>
    </form>
  );
}
