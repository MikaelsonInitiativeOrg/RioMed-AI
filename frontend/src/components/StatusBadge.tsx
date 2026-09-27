import { STATUS_LABEL } from "@/lib/format";

export function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABEL[status] ?? status;

  let style = "bg-[#EAEAE4] text-[#4B6560]"; // default

  switch (status) {
    case "CONFIRMED":
    case "RESULT_AVAILABLE":
      style = "bg-[#CDE8E1] text-[#0A5347]";
      break;
    case "HELD":
    case "PENDING_PAYMENT":
      style = "bg-[#FFF4E5] text-[#8A6212]";
      break;
    case "CHECKED_IN":
      style = "bg-[#EAEAE4] text-[#4B6560]";
      break;
    case "COMPLETED":
      style = "bg-[#CDE8E1]/60 text-[#0A5347]";
      break;
    case "CANCELLED_BY_PATIENT":
    case "CANCELLED_BY_FACILITY":
      style = "bg-[#FBE9E7] text-[#8A251C]";
      break;
    case "REFUNDED":
      style = "bg-[#FFF4E5] text-[#8A6212]";
      break;
    case "EXPIRED":
    case "NO_SHOW":
    default:
      style = "bg-[#EAEAE4] text-[#4B6560]";
      break;
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-tight uppercase ${style}`}
    >
      {label}
    </span>
  );
}
