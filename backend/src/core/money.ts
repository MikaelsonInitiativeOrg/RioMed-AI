export function assertKobo(n: number): void {
  if (typeof n !== "number" || !Number.isSafeInteger(n) || n < 0) {
    throw new RangeError(`Invalid kobo amount: ${String(n)}`);
  }
}

export function computeCharge(priceKobo: number, feeKobo = 0): number {
  assertKobo(priceKobo);
  assertKobo(feeKobo);
  const total = priceKobo + feeKobo;
  assertKobo(total);
  return total;
}

export function formatNaira(kobo: number): string {
  assertKobo(kobo);
  const naira = Math.floor(kobo / 100);
  const rest = kobo % 100;
  const whole = naira.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return rest === 0 ? `₦${whole}` : `₦${whole}.${rest.toString().padStart(2, "0")}`;
}
