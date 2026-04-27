import { useCallback, useMemo } from "react";
import { type DutyStatus, type DutyEntry } from "@/contexts/HOSContext";

const ROWS: { key: DutyStatus; label: string; sub?: string }[] = [
  { key: "off", label: "Off", sub: "Duty" },
  { key: "sleeper", label: "Sleeper", sub: "Berth" },
  { key: "driving", label: "Driving" },
  { key: "onduty", label: "On Duty", sub: "(Not Driving)" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_LABEL = (h: number) =>
  h === 0 ? "Midnight" : h === 12 ? "Noon" : String(h);

interface DailyLogGridProps {
  date: Date;
  entries: DutyEntry[];
  remarks?: { time: number; location: string }[];
}

export function DailyLogGrid({
  date,
  entries,
  remarks = [],
}: DailyLogGridProps) {
  const dayStart = useMemo(() => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, [date]);
  const dayEnd = dayStart + 24 * 3_600_000;
  const now = Date.now();
  const clipped = useMemo(
    () =>
      entries
        .map((e) => ({ ...e, endedAt: e.endedAt ?? now }))
        .filter((e) => e.endedAt > dayStart && e.startedAt < dayEnd)
        .map((e) => ({
          status: e.status,
          from: Math.max(e.startedAt, dayStart),
          to: Math.min(e.endedAt, dayEnd),
        }))
        .sort((a, b) => a.from - b.from),
    [entries, dayStart, dayEnd, now],
  );
  const totals: Record<DutyStatus, number> = {
    off: 0,
    sleeper: 0,
    driving: 0,
    onduty: 0,
  };
  for (const s of clipped) totals[s.status] += s.to - s.from;
  const fmt = (ms: number) => {
    const h = ms / 3_600_000;
    return h % 1 === 0 ? String(h) : h.toFixed(2).replace(/\.?0+$/, "");
  };
  const W = 960;
  const LABEL_W = 90;
  const TOTAL_W = 60;
  const GRID_W = W - LABEL_W - TOTAL_W;
  const ROW_H = 36;
  const GRID_H = ROW_H * 4;
  const HEAD_H = 22;
  const REM_H = 90;
  const H_TOTAL = HEAD_H + GRID_H + REM_H + 6;

  const xForTime = useCallback(
    (t: number) => LABEL_W + ((t - dayStart) / (24 * 3_600_000)) * GRID_W,
    [LABEL_W, dayStart, GRID_W],
  );

  const yForStatus = useCallback(
    (s: DutyStatus) => {
      const i = ROWS.findIndex((r) => r.key === s);
      return HEAD_H + i * ROW_H + ROW_H / 2;
    },
    [HEAD_H, ROW_H],
  );
  const pathD = useMemo(() => {
    if (clipped.length === 0) return "";
    let d = "";
    let prevY: number | null = null;
    for (const seg of clipped) {
      const x1 = xForTime(seg.from);
      const x2 = xForTime(seg.to);
      const y = yForStatus(seg.status);
      if (prevY === null) {
        d += `M ${x1} ${y} `;
      } else if (prevY !== y) {
        d += `L ${x1} ${prevY} L ${x1} ${y} `;
      }
      d += `L ${x2} ${y} `;
      prevY = y;
    }
    return d;
  }, [clipped, xForTime, yForStatus]);

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card p-3 shadow-card">
      <svg
        viewBox={`0 0 ${W} ${H_TOTAL}`}
        className="block w-full min-w-[760px]"
        role="img"
        aria-label="Driver's Daily Log graph grid"
      >
        {HOURS.map((h) => {
          const x = LABEL_W + (h / 24) * GRID_W;
          return (
            <text
              key={h}
              x={x + GRID_W / 24 / 2}
              y={HEAD_H - 6}
              textAnchor="middle"
              fontSize="9"
              fill="currentColor"
              className="fill-muted-foreground font-medium"
            >
              {HOUR_LABEL(h)}
            </text>
          );
        })}

        {ROWS.map((r, i) => (
          <g key={r.key}>
            <text
              x={LABEL_W - 8}
              y={HEAD_H + i * ROW_H + ROW_H / 2 - (r.sub ? 4 : 0)}
              textAnchor="end"
              fontSize="10"
              className="fill-foreground font-semibold"
            >
              {r.label}
            </text>
            {r.sub && (
              <text
                x={LABEL_W - 8}
                y={HEAD_H + i * ROW_H + ROW_H / 2 + 8}
                textAnchor="end"
                fontSize="8"
                className="fill-muted-foreground"
              >
                {r.sub}
              </text>
            )}
          </g>
        ))}

        {HOURS.map((h) => {
          const x = LABEL_W + (h / 24) * GRID_W;
          const cellW = GRID_W / 24;
          return (
            <g key={`col-${h}`}>
              <rect
                x={x}
                y={HEAD_H}
                width={cellW}
                height={GRID_H}
                fill="none"
                stroke="var(--foreground)"
                strokeOpacity={0.4}
                strokeWidth={0.6}
              />

              {ROWS.map((_, ri) => {
                const rowY = HEAD_H + ri * ROW_H;
                return [1, 2, 3].map((q) => {
                  const tx = x + (cellW * q) / 4;
                  const tickH = q === 2 ? 8 : 5;
                  return (
                    <g key={`t-${h}-${ri}-${q}`}>
                      <line
                        x1={tx}
                        y1={rowY}
                        x2={tx}
                        y2={rowY + tickH}
                        stroke="var(--foreground)"
                        strokeOpacity={0.35}
                        strokeWidth={0.5}
                      />
                      <line
                        x1={tx}
                        y1={rowY + ROW_H - tickH}
                        x2={tx}
                        y2={rowY + ROW_H}
                        stroke="var(--foreground)"
                        strokeOpacity={0.35}
                        strokeWidth={0.5}
                      />
                    </g>
                  );
                });
              })}
            </g>
          );
        })}

        {[0, 1, 2, 3, 4].map((i) => (
          <line
            key={`row-${i}`}
            x1={LABEL_W}
            y1={HEAD_H + i * ROW_H}
            x2={LABEL_W + GRID_W}
            y2={HEAD_H + i * ROW_H}
            stroke="var(--foreground)"
            strokeWidth={i === 0 || i === 4 ? 1.2 : 0.6}
          />
        ))}

        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={2.4}
            strokeLinejoin="miter"
            strokeLinecap="square"
          />
        )}

        <text
          x={LABEL_W + GRID_W + TOTAL_W / 2}
          y={HEAD_H - 12}
          textAnchor="middle"
          fontSize="8"
          className="fill-muted-foreground font-semibold"
        >
          TOTAL
        </text>
        <text
          x={LABEL_W + GRID_W + TOTAL_W / 2}
          y={HEAD_H - 4}
          textAnchor="middle"
          fontSize="8"
          className="fill-muted-foreground font-semibold"
        >
          HOURS
        </text>
        {ROWS.map((r, i) => (
          <text
            key={`tot-${r.key}`}
            x={LABEL_W + GRID_W + TOTAL_W / 2}
            y={HEAD_H + i * ROW_H + ROW_H / 2 + 4}
            textAnchor="middle"
            fontSize="14"
            className="fill-foreground font-bold"
            fontStyle="italic"
          >
            {fmt(totals[r.key])}
          </text>
        ))}
        <text
          x={LABEL_W + GRID_W + TOTAL_W / 2}
          y={HEAD_H + GRID_H + 18}
          textAnchor="middle"
          fontSize="11"
          className="fill-foreground font-bold"
        >
          ={fmt(totals.off + totals.sleeper + totals.driving + totals.onduty)}
        </text>

        <text
          x={LABEL_W - 8}
          y={HEAD_H + GRID_H + 28}
          textAnchor="end"
          fontSize="10"
          className="fill-foreground font-semibold"
        >
          REMARKS
        </text>
        {HOURS.map((h) => {
          const x = LABEL_W + (h / 24) * GRID_W;
          const cellW = GRID_W / 24;
          return (
            <g key={`rem-col-${h}`}>
              <text
                x={x + cellW / 2}
                y={HEAD_H + GRID_H + 16}
                textAnchor="middle"
                fontSize="8"
                className="fill-muted-foreground"
              >
                {HOUR_LABEL(h)}
              </text>
              <line
                x1={x}
                y1={HEAD_H + GRID_H + 22}
                x2={x}
                y2={HEAD_H + GRID_H + 38}
                stroke="var(--foreground)"
                strokeOpacity={0.4}
                strokeWidth={0.5}
              />
              {[1, 2, 3].map((q) => (
                <line
                  key={q}
                  x1={x + (cellW * q) / 4}
                  y1={HEAD_H + GRID_H + 28}
                  x2={x + (cellW * q) / 4}
                  y2={HEAD_H + GRID_H + 38}
                  stroke="var(--foreground)"
                  strokeOpacity={0.3}
                  strokeWidth={0.4}
                />
              ))}
            </g>
          );
        })}
        <line
          x1={LABEL_W}
          y1={HEAD_H + GRID_H + 38}
          x2={LABEL_W + GRID_W}
          y2={HEAD_H + GRID_H + 38}
          stroke="var(--foreground)"
          strokeWidth={1}
        />

        {remarks.map((r, i) => {
          const x = xForTime(r.time);
          const baseY = HEAD_H + GRID_H + 44;
          return (
            <g key={`rem-${i}`}>
              <line
                x1={x}
                y1={HEAD_H + GRID_H + 38}
                x2={x}
                y2={baseY}
                stroke="var(--primary)"
                strokeWidth={1.2}
              />
              <text
                x={x}
                y={baseY + 6}
                fontSize="10"
                className="fill-foreground font-medium"
                transform={`rotate(45 ${x} ${baseY + 6})`}
              >
                {r.location}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
