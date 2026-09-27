"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * "Use my location": asks the browser for the device position only when tapped, then reloads the
 * search with lat/lng. The position is rounded on the server (~100 m), used for this search and the
 * live Google Maps lookup, and never stored.
 */
export function NearMeButton({ query }: { query: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "locating" | "error">("idle");
  const [message, setMessage] = useState("");

  function locate() {
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
        router.push(`/?q=${encodeURIComponent(q)}&lat=${lat}&lng=${lng}`);
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

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={locate}
        disabled={state === "locating"}
        className="inline-flex min-h-[48px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#0E6B5C] px-5 text-sm font-heading font-bold text-white shadow-xs hover:bg-[#0A5347] disabled:opacity-70"
      >
        <span aria-hidden="true">📍</span>
        {state === "locating" ? "Finding your location…" : "Use my location"}
      </button>
      <p className="text-xs text-[#4B6560]">
        Your location is only used for this search and to find places on Google Maps. It&apos;s rounded to about 100 m and never saved.
      </p>
      {state === "error" && (
        <p role="alert" className="text-sm text-[#8A251C]">
          {message}
        </p>
      )}
    </div>
  );
}
