import { cn } from "@/lib/utils";

type Tone =
  | "green"
  | "amber"
  | "red"
  | "blue"
  | "slate"
  | "violet"
  | "brand";

const tones: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  blue: "bg-sky-50 text-sky-700 ring-sky-600/20",
  slate: "bg-slate-100 text-slate-600 ring-slate-500/20",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/20",
  brand: "bg-brand-50 text-brand-700 ring-brand-600/20",
};

export function Badge({
  tone = "slate",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export const invoiceStatusTone = {
  paid: "green",
  pending: "amber",
  overdue: "red",
  draft: "slate",
  "partially-paid": "blue",
} as const;

export const bidStatusTone = {
  open: "green",
  "closing-soon": "amber",
  evaluation: "violet",
  awarded: "brand",
  closed: "slate",
  draft: "slate",
} as const;
