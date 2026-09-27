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
    <div className="rounded-2xl border border-dashed border-border-strong bg-surface/70 p-6 sm:p-8 text-center backdrop-blur-xs">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
        {icon || (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        )}
      </div>
      <h3 className="text-base font-semibold text-foreground sm:text-lg">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {hint && <p className="mt-2 text-xs text-subtle-foreground">{hint}</p>}
      {actionHref && actionLabel && (
        <div className="mt-4">
          <Link
            href={actionHref}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-strong focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2"
          >
            {actionLabel}
          </Link>
        </div>
      )}
    </div>
  );
}
