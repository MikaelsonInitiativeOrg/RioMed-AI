import Link from "next/link";
import { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  icon?: ReactNode;
  hint?: string;
}

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  icon,
  hint,
}: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-emerald-900/20 bg-white/70 p-6 sm:p-8 text-center backdrop-blur-xs">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
        {icon || (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        )}
      </div>
      <h3 className="text-base font-semibold text-emerald-950 sm:text-lg">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">{description}</p>
      {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
      {actionHref && actionLabel && (
        <div className="mt-4">
          <Link
            href={actionHref}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            {actionLabel}
          </Link>
        </div>
      )}
    </div>
  );
}
