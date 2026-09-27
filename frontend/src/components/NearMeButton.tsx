"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LocateFixed, Loader2 } from "lucide-react";

/**
 * "Use my location": requests the device position automatically on mount (with
 * tap-to-retry fallback), then reloads the search with lat/lng. The position is
 * rounded on the server (~100 m), used for this search and the live Google Maps
 * lookup, and never stored.
 */
export function NearMeButton({ query, auto = true }: { query: string; auto?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "locating" | "ready" | "error">("idle");
  const [found, setFound] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const autoTried = useRef(false);
  const interacted = useRef(false);

  // Any touch of the search box cancels the automatic jump to "near me" results.
  useEffect(() => {
    const mark = (e: Event) => {
      if (e.target instanceof HTMLElement && e.target.closest("[data-search-box], form[role=search]")) interacted.current = true;
    };
    for (const t of ["focusin", "pointerdown", "paste", "input", "keydown"]) document.addEventListener(t, mark, true);
    return () => {
      for (const t of ["focusin", "pointerdown", "paste", "input", "keydown"]) document.removeEventListener(t, mark, true);
    };
  }, []);

  function locate(fromAuto = false) {
    if (!("geolocation" in navigator)) {
      setState("error");
      setMessage("This browser can't share your location. Choose an area instead.");
      return;
    }
    setState("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(3);
        const lng = pos.coords.longitude.toFixed(3);
        const q = query.trim() || "hospitals, clinics and health centres near me";
        const href = `/?q=${encodeURIComponent(q)}&lat=${lat}&lng=${lng}`;
        // Never pull someone away while they use the search box (tapped, typed or pasted since
        // the page loaded): an automatic fix waits for a tap instead.
        const el = document.activeElement;
        const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el.value.trim().length > 0 || el.matches("[data-search-box]") : false;
        if (fromAuto) {
          // Automatic: offer the result, then move only if the person leaves the page alone for a
          // moment. Any tap, typing or paste in the search box cancels it, so pasting never gets lost.
          setFound(href);
          setState("ready");
          if (!typing && !interacted.current) {
            setTimeout(() => {
              const now = document.activeElement;
              const busy = now instanceof HTMLInputElement && (now.matches("[data-search-box]") || now.value.trim().length > 0);
              if (!interacted.current && !busy) router.push(href);
            }, 3000);
          }
          return;
        }
        router.push(href);
      },
      (err) => {
        setState("error");
        setMessage(
          err.code === err.PERMISSION_DENIED
            ? "Location access was blocked. Allow it in your browser settings, or choose an area instead."
            : "Couldn't get your location. Check that location is on, or choose an area instead.",
        );
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 5 * 60_000 },
    );
  }

  // Automatic request on mount so no tap is needed. Guarded to run once
  // (StrictMode double-effect) and never retries by itself on denial.
  useEffect(() => {
    if (auto && !autoTried.current) {
      autoTried.current = true;
      locate(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => (found ? router.push(found) : locate())}
        disabled={state === "locating"}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-white shadow-sm transition-colors duration-150 hover:bg-primary-strong disabled:opacity-70 sm:w-auto"
      >
        {state === "locating" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <LocateFixed className="h-4 w-4" aria-hidden />}
        {state === "locating" ? "Finding your location…" : state === "ready" ? "Show clinics closest to me" : "Use my location"}
      </button>
      <details className="text-xs text-subtle-foreground">
        <summary className="inline-flex min-h-[32px] items-center underline underline-offset-2">How your location is used</summary>
        <p className="mt-1 leading-relaxed">
          Your browser asks before sharing it. It&apos;s rounded to about 100 m, used only for this search and the Google Maps lookup, and never saved. Your name and account are never sent to Google.
        </p>
      </details>
      {state === "error" && (
        <p role="alert" className="text-sm text-warning-foreground">
          {message}
        </p>
      )}
    </div>
  );
}
