import { STATUS_LABEL } from "@/lib/format";

export function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABEL[status] ?? status;

  let style = "bg-border-soft text-muted-foreground"; // default

  switch (status) {
    case "CONFIRMED":
    case "RESULT_AVAILABLE":
      style = "bg-primary-muted text-primary-strong";
      break;
    case "HELD":
    case "PENDING_PAYMENT":
      style = "bg-warning-soft text-warning-foreground";
      break;
    case "CHECKED_IN":
      style = "bg-border-soft text-muted-foreground";
      break;
    case "COMPLETED":
      style = "bg-primary-muted/60 text-primary-strong";
      break;
    case "CANCELLED_BY_PATIENT":
    case "CANCELLED_BY_FACILITY":
      style = "bg-danger-soft text-danger-foreground";
      break;
    case "REFUNDED":
      style = "bg-warning-soft text-warning-foreground";
      break;
    case "EXPIRED":
    case "NO_SHOW":
    default:
      style = "bg-border-soft text-muted-foreground";
      break;
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold tracking-tight uppercase ${style}`}
    >
      {label}
    </span>
  );
}
