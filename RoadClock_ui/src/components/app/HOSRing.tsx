import { fmtHM } from "@/contexts/HOSContext";

export function HOSRing({
  used,
  limit,
  label,
  sublabel,
  tone = "primary",
}: {
  used: number;
  limit: number;
  label: string;
  sublabel?: string;
  tone?: "primary" | "accent" | "success" | "info" | "destructive";
}) {
  const pct = Math.min(100, (used / limit) * 100);
  const remaining = Math.max(0, limit - used);
  const radius = 56;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (pct / 100) * circ;
  const stroke = `var(--${tone === "primary" ? "primary" : tone === "accent" ? "accent" : tone === "success" ? "success" : tone === "info" ? "info" : "destructive"})`;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <svg width="140" height="140" className="-rotate-90">
          <circle
            cx="70"
            cy="70"
            r={radius}
            strokeWidth="10"
            stroke="var(--muted)"
            fill="none"
          />
          <circle
            cx="70"
            cy="70"
            r={radius}
            strokeWidth="10"
            stroke={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 600ms ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-mono text-2xl font-semibold tabular-nums">
            {fmtHM(remaining)}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            remaining
          </div>
        </div>
      </div>
      <div className="text-center">
        <div className="text-sm font-semibold">{label}</div>
        {sublabel && (
          <div className="text-xs text-muted-foreground">{sublabel}</div>
        )}
      </div>
    </div>
  );
}
