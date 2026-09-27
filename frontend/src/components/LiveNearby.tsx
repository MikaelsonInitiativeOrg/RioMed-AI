"use client";

import { useEffect, useState } from "react";
import { ExternalLink, MapPinned } from "lucide-react";

interface LivePlace {
  placeId: string;
  name: string;
  mapsUrl: string;
}
type State =
  | { kind: "loading" }
  | { kind: "ok"; places: LivePlace[] }
  | { kind: "off" }
  | { kind: "error"; reason: string };

/**
 * FR-027: live nearby facilities from Google Maps (via Gemini). Unverified, not bookable.
 * Google Maps attribution must stay visible directly with the list.
 */
export function LiveNearby({ address, lat, lng }: { address: string; lat?: number; lng?: number }) {
  // Results are tagged with the address they belong to; a new address shows "loading" until its own result arrives.
  const [loaded, setLoaded] = useState<{ address: string; state: State } | null>(null);
  const [attempt, setAttempt] = useState(0); // user-initiated retry only (no automatic retries: quota)
  const key = `${address}|${lat ?? ""},${lng ?? ""}|${attempt}`;
  const state: State = loaded && loaded.address === key ? loaded.state : { kind: "loading" };

  useEffect(() => {
    let alive = true;
    const setState = (s: State) => alive && setLoaded({ address: key, state: s });
    fetch(`/api/live-places?address=${encodeURIComponent(address)}${lat != null && lng != null ? `&lat=${lat}&lng=${lng}` : ""}`)
      .then((r) => r.json())
      .then((d: { status: string; places?: LivePlace[]; reason?: string }) => {
        if (d.status === "ok") setState({ kind: "ok", places: d.places ?? [] });
        else if (d.status === "disabled") setState({ kind: "off" });
        else setState({ kind: "error", reason: d.reason ?? "Live search unavailable" });
      })
      .catch(() => setState({ kind: "error", reason: "Live search unavailable" }));
    return () => {
      alive = false;
    };
  }, [address, lat, lng, key]);

  if (state.kind === "off") return null;

  return (
    <section aria-label="Live nearby facilities" aria-busy={state.kind === "loading"} className="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-border-soft text-muted-foreground">
          <MapPinned className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-foreground">{lat != null ? "More places near you" : `More places near ${address}`}</h2>
          <p className="text-sm text-subtle-foreground">From Google Maps · not verified by RioMed · call ahead, online booking isn&apos;t available</p>
        </div>
      </div>
      {state.kind === "loading" && (
        <ul className="mt-4 space-y-2" aria-label="Loading places">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-12 animate-pulse rounded-lg bg-border-soft" />
          ))}
        </ul>
      )}
      {state.kind === "error" && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="text-sm text-warning-foreground">{state.reason}.</p>
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="inline-flex min-h-[44px] items-center rounded-lg border border-border-strong px-4 text-sm font-bold text-primary hover:bg-primary-soft">
            Try again
          </button>
        </div>
      )}
      {state.kind === "ok" && state.places.length === 0 && <p className="mt-4 text-sm text-muted-foreground">No live results for this location.</p>}
      {state.kind === "ok" && state.places.length > 0 && (
        <ul className="mt-3 divide-y divide-border-soft">
          {state.places.map((p) => (
            <li key={p.placeId} className="flex items-center justify-between gap-3 py-2.5">
              <span className="min-w-0 text-sm font-bold text-foreground">{p.name}</span>
              <a
                href={p.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${p.name} in Google Maps (new tab)`}
                className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-bold text-primary transition-colors hover:bg-primary-soft"
              >
                Directions
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-subtle-foreground">Sources: Google Maps</p>
    </section>
  );
}
