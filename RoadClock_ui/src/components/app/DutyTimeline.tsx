import { useHOS, STATUS_META, type DutyStatus } from "@/contexts/HOSContext";
import { useMemo, type CSSProperties } from "react";

const ROWS: DutyStatus[] = ["off", "sleeper", "driving", "onduty"];

export function DutyTimeline() {
  const { entries } = useHOS();

  const segments = useMemo(() => {
    const now = Date.now();
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const start = dayStart.getTime();
    const end = start + 24 * 3_600_000;
    return entries
      .map((e) => ({ ...e, endedAt: e.endedAt ?? now }))
      .filter((e) => e.endedAt > start && e.startedAt < end)
      .map((e) => ({
        status: e.status,
        leftPct:
          ((Math.max(e.startedAt, start) - start) / (24 * 3_600_000)) * 100,
        widthPct:
          ((Math.min(e.endedAt, end) - Math.max(e.startedAt, start)) /
            (24 * 3_600_000)) *
          100,
      }));
  }, [entries]);

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-semibold">
            Today's Duty Status
          </h3>
          <p className="text-xs text-muted-foreground">
            FMCSA-style 24-hour grid
          </p>
        </div>
        <div className="hidden gap-3 text-xs sm:flex">
          {ROWS.map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={barStyle(s)}
                aria-hidden
              />
              {STATUS_META[s].label}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        {ROWS.map((row) => (
          <div key={row} className="flex items-center gap-3">
            <div className="w-20 shrink-0 text-right text-xs font-medium text-muted-foreground">
              {STATUS_META[row].label}
            </div>
            <div
              className="relative h-7 flex-1 rounded-md"
              style={{ backgroundColor: "var(--muted)" }}
            >
              {segments
                .filter((s) => s.status === row)
                .map((s, i) => (
                  <div
                    key={i}
                    className="absolute top-0 h-full rounded-md"
                    style={{
                      ...barStyle(row),
                      left: `${s.leftPct}%`,
                      width: `${Math.max(s.widthPct, 0.3)}%`,
                    }}
                  />
                ))}
            </div>
          </div>
        ))}
        <div className="flex items-center gap-3 pt-2">
          <div className="w-20" />
          <div className="flex flex-1 justify-between text-[10px] text-muted-foreground">
            {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((h) => (
              <span key={h}>{String(h).padStart(2, "0")}</span>
            ))}
          </div>
        </div>
      </div>

      {segments.length === 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          No duty entries overlap today yet.
        </p>
      )}
    </div>
  );
}

function barStyle(s: DutyStatus): CSSProperties {
  switch (s) {
    case "driving":
      return { backgroundColor: "var(--success)" };
    case "onduty":
      return { backgroundColor: "var(--accent)" };
    case "sleeper":
      return { backgroundColor: "var(--info)" };
    case "off":
      return {
        backgroundColor: "var(--muted-foreground)",
        opacity: 0.45,
      };
  }
}
