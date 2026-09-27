import { FacilityShell } from "@/components/FacilityShell";
import { redirect } from "next/navigation";
import { AlertCircle, CheckCircle2, Info, Plus, Save, Trash2 } from "lucide-react";
import { getSessionUser } from "@/lib/session";
import { getFacilityCatalogue } from "@riomed/backend/server/queries";
import { getTest, TEST_CATALOG } from "@riomed/backend/core/catalog";
import { MAX_PRICE_NAIRA, MIN_PRICE_NAIRA, SUGGESTED_PRICES_NAIRA } from "@riomed/backend/core/facilityRegistration";
import { MAX_TURNAROUND_HOURS, MIN_TURNAROUND_HOURS } from "@riomed/backend/core/catalogueEdit";
import { formatNaira } from "@riomed/backend/core/money";
import { addTestAction, removeTestAction, updateTestAction } from "./actions";

export const dynamic = "force-dynamic";

// Tests that need fasting beforehand (shown as preparation). Prices and turnaround come from the database.
const FASTING = new Set(["FBS", "LIPID"]);

const INPUT =
  "min-h-[44px] w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-subtle-foreground focus:outline-none focus:ring-2 focus:ring-primary";
const PRIMARY_BTN =
  "inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-strong transition";
const REMOVE_BTN =
  "inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-danger-foreground hover:bg-danger-soft transition";

function one(v: string | string[] | undefined): string | null {
  const s = Array.isArray(v) ? v[0] : v;
  return s ? s.slice(0, 300) : null;
}

export default async function StaffCataloguePage({ searchParams }: PageProps<"/staff/catalogue">) {
  const actor = await getSessionUser();
  if (!actor) redirect("/account?mode=access&next=/staff/catalogue");
  const catalogue = await getFacilityCatalogue(actor);
  if (!catalogue) redirect(actor.role === "patient" ? "/dashboard" : "/account?mode=access");
  const sp = await searchParams;
  const saved = one(sp.saved);
  const error = one(sp.error);
  const { facility } = catalogue;
  const items = catalogue.tests.map((t) => ({ ...t, name: getTest(t.code)?.name ?? t.code, fasting: FASTING.has(t.code) }));
  const offered = new Set(items.map((i) => i.code));
  const addable = TEST_CATALOG.filter((t) => !offered.has(t.code));

  return (
    <div className="w-full space-y-6 pb-12">
      <FacilityShell facilityName={facility?.name ?? "Your facility"} operatorName={actor.name} active="catalogue">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-heading font-bold text-xl sm:text-2xl text-foreground">Test Catalogue &amp; Live Pricing</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              These prices are what patients see in RioMed search and pay at booking.
            </p>
          </div>
          {facility?.source === "demo" && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-primary-strong bg-primary-muted px-3 py-1 rounded-full">Demo data</span>
            </div>
          )}
        </div>

        {saved && (
          <div role="status" className="flex items-start gap-2 rounded-xl border border-border bg-primary-soft p-4 text-sm text-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span>{saved}</span>
          </div>
        )}
        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-danger-soft bg-danger-soft p-4 text-sm text-danger-foreground">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        )}

        <p className="flex items-start gap-2 rounded-xl bg-accent-soft p-3 text-xs text-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
          <span>
            Price changes apply to new bookings only. Appointments already held or paid keep the price they were booked at. Prices are whole
            naira, ₦{MIN_PRICE_NAIRA.toLocaleString("en-NG")} to ₦{MAX_PRICE_NAIRA.toLocaleString("en-NG")}; turnaround is {MIN_TURNAROUND_HOURS} to{" "}
            {MAX_TURNAROUND_HOURS} hours. A test with active appointments cannot be removed.
          </span>
        </p>

        <section aria-labelledby="offered-heading" className="space-y-3">
          <h2 id="offered-heading" className="font-heading font-semibold text-base text-foreground">
            Tests you offer ({items.length})
          </h2>

          {items.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted-foreground">
              Your facility does not list any tests yet. Add one below so patients can book it.
            </p>
          ) : (
            <>
              <div className="hidden md:grid grid-cols-[1.6fr_140px_120px_auto] gap-3 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <span>Test</span>
                <span>Price (₦)</span>
                <span>Turnaround (hrs)</span>
                <span className="sr-only">Actions</span>
              </div>
              <ul className="space-y-3 md:space-y-0 md:divide-y md:divide-border-soft md:rounded-xl md:border md:border-border md:bg-surface md:shadow-2xs">
                {items.map((item) => {
                  const formId = `edit-${item.code}`;
                  return (
                    <li
                      key={item.code}
                      className="rounded-xl border border-border bg-surface p-4 shadow-2xs md:rounded-none md:border-0 md:shadow-none md:grid md:grid-cols-[1.6fr_140px_120px_auto] md:items-center md:gap-3"
                    >
                      <div className="min-w-0 mb-3 md:mb-0">
                        <p className="font-heading font-semibold text-sm text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Now {formatNaira(item.priceKobo)} · ~{item.turnaroundHours} hrs
                          {item.fasting ? " · fasting required" : ""}
                        </p>
                        <p className="font-mono text-xs text-subtle-foreground">code: {item.code}</p>
                      </div>

                      <form id={formId} action={updateTestAction} className="contents">
                        <input type="hidden" name="testCode" value={item.code} />
                        <label className="block mb-3 md:mb-0">
                          <span className="block text-xs font-semibold text-muted-foreground mb-1 md:sr-only">Price (₦)</span>
                          <input
                            name="price"
                            inputMode="numeric"
                            required
                            defaultValue={String(Math.round(item.priceKobo / 100))}
                            aria-label={`Price in naira for ${item.name}`}
                            className={INPUT}
                          />
                        </label>
                        <label className="block mb-3 md:mb-0">
                          <span className="block text-xs font-semibold text-muted-foreground mb-1 md:sr-only">Turnaround (hours)</span>
                          <input
                            name="turnaroundHours"
                            type="number"
                            inputMode="numeric"
                            min={MIN_TURNAROUND_HOURS}
                            max={MAX_TURNAROUND_HOURS}
                            step={1}
                            required
                            defaultValue={item.turnaroundHours}
                            aria-label={`Turnaround in hours for ${item.name}`}
                            className={INPUT}
                          />
                        </label>
                      </form>

                      <div className="flex gap-2">
                        <button type="submit" form={formId} className={`${PRIMARY_BTN} flex-1 md:flex-none`} aria-label={`Save ${item.name}`}>
                          <Save className="h-4 w-4" aria-hidden />
                          Save
                        </button>
                        <form action={removeTestAction}>
                          <input type="hidden" name="testCode" value={item.code} />
                          <button type="submit" className={REMOVE_BTN} aria-label={`Remove ${item.name}`}>
                            <Trash2 className="h-4 w-4" aria-hidden />
                            <span className="md:sr-only lg:not-sr-only">Remove</span>
                          </button>
                        </form>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>

        <section aria-labelledby="add-heading" className="space-y-3">
          <h2 id="add-heading" className="font-heading font-semibold text-base text-foreground">
            Add a test
          </h2>
          {addable.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted-foreground">
              You already offer every test in the RioMed catalogue.
            </p>
          ) : (
            <form
              action={addTestAction}
              className="rounded-xl border border-border bg-surface p-4 shadow-2xs grid gap-3 md:grid-cols-[1.6fr_140px_120px_auto] md:items-end"
            >
              <label className="block">
                <span className="block text-xs font-semibold text-muted-foreground mb-1">Test</span>
                <select name="testCode" required defaultValue="" className={INPUT}>
                  <option value="" disabled>
                    Choose a test
                  </option>
                  {addable.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.name}
                      {SUGGESTED_PRICES_NAIRA[t.code] ? ` (typical ₦${SUGGESTED_PRICES_NAIRA[t.code].toLocaleString("en-NG")})` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-xs font-semibold text-muted-foreground mb-1">Price (₦)</span>
                <input name="price" inputMode="numeric" required placeholder="e.g. 2,500" className={INPUT} />
              </label>
              <label className="block">
                <span className="block text-xs font-semibold text-muted-foreground mb-1">Turnaround (hours)</span>
                <input
                  name="turnaroundHours"
                  type="number"
                  inputMode="numeric"
                  min={MIN_TURNAROUND_HOURS}
                  max={MAX_TURNAROUND_HOURS}
                  step={1}
                  required
                  placeholder="e.g. 24"
                  className={INPUT}
                />
              </label>
              <button type="submit" className={PRIMARY_BTN}>
                <Plus className="h-4 w-4" aria-hidden />
                Add test
              </button>
            </form>
          )}
        </section>
      </FacilityShell>
    </div>
  );
}
