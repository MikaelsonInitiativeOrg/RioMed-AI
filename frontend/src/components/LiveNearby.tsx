"use client";

import { useEffect, useState } from "react";

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
export function LiveNearby({ address }: { address: string }) {
  // Results are tagged with the address they belong to; a new address shows "loading" until its own result arrives.
  const [loaded, setLoaded] = useState<{ address: string; state: State } | null>(null);
  const state: State = loaded && loaded.address === address ? loaded.state : { kind: "loading" };

  useEffect(() => {
    let alive = true;
    const setState = (s: State) => alive && setLoaded({ address, state: s });
    fetch(`/api/live-places?address=${encodeURIComponent(address)}`)
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
  }, [address]);

  if (state.kind === "off") return null;

  return (
    <section aria-label="Live nearby facilities" aria-busy={state.kind === "loading"} className="rounded-xl border border-sky-900/15 bg-white p-4">
      <h2 className="font-semibold">More places near {address}</h2>
      <p className="text-xs text-slate-600">Live from Google Maps · not verified by RioMed · booking not available. Call ahead to check which tests they offer.</p>
      {state.kind === "loading" && <p className="mt-3 text-sm text-slate-500 animate-pulse">Searching Google Maps…</p>}
      {state.kind === "error" && <p className="mt-3 text-sm text-amber-800">{state.reason}.</p>}
      {state.kind === "ok" && state.places.length === 0 && <p className="mt-3 text-sm">No live results for this location.</p>}
      {state.kind === "ok" && state.places.length > 0 && (
        <ul className="mt-3 divide-y">
          {state.places.map((p) => (
            <li key={p.placeId} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span>{p.name}</span>
              <a href={p.mapsUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-lg border border-sky-900/20 px-3 py-1.5 text-sky-900 hover:bg-sky-50">
                Open in Google Maps
              </a>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[11px] text-slate-500">Sources: Google Maps</p>
    </section>
  );
}
