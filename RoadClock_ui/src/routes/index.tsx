import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useHOS, fmtDuration, fmtHM, STATUS_META } from "@/contexts/HOSContext";
import { HOSRing } from "@/components/app/HOSRing";
import { StatusActions } from "@/components/app/StatusActions";
import { AlertsBanner } from "@/components/app/AlertsBanner";
import { DutyTimeline } from "@/components/app/DutyTimeline";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Gauge, CalendarClock } from "lucide-react";
const createLooseFileRoute = createFileRoute as unknown as (
  path: string,
) => (options: unknown) => unknown;

export const Route = createLooseFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — RoadClock HOS" },
      {
        name: "description",
        content:
          "Live FMCSA Hours of Service dashboard: driving, on-duty, break, and weekly limits at a glance.",
      },
    ],
  }),
  component: Dashboard,
});

const HOUR = 3_600_000;

function Dashboard() {
  const {
    current,
    drivingMs,
    onDutyMs,
    weeklyOnDutyMs,
    cumulativeDrivingSinceBreak,
  } = useHOS();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const sinceStatus = now - current.startedAt;
  const meta = STATUS_META[current.status];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-hero p-6 text-primary-foreground shadow-glow sm:p-8">
        <div className="absolute inset-0 grid-pattern opacity-20" aria-hidden />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/70">
              Current Status
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span
                className={`inline-flex h-3 w-3 rounded-full ${current.status === "driving" ? "bg-success animate-pulse-ring" : current.status === "onduty" ? "bg-accent" : current.status === "sleeper" ? "bg-info" : "bg-primary-foreground/60"}`}
              />
              <h1 className="font-display text-3xl font-semibold sm:text-4xl">
                {meta.label}
              </h1>
            </div>
            <p className="mt-1 text-sm text-primary-foreground/70">
              {current.location ? (
                <>
                  <MapPin className="mr-1 inline h-3.5 w-3.5" />
                  {current.location} ·{" "}
                </>
              ) : null}
              Started{" "}
              {new Date(current.startedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="font-mono text-5xl font-semibold tabular-nums tracking-tight sm:text-6xl">
              {fmtDuration(sinceStatus)}
            </div>
            <span className="text-xs font-medium uppercase tracking-widest text-primary-foreground/60">
              elapsed
            </span>
          </div>
        </div>
        <div className="relative mt-6">
          <StatusActions />
        </div>
      </section>

      <AlertsBanner />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <HOSRing
              label="Driving (11h)"
              sublabel={`${fmtHM(drivingMs)} used`}
              used={drivingMs}
              limit={11 * HOUR}
              tone="success"
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <HOSRing
              label="Duty Window (14h)"
              sublabel={`${fmtHM(onDutyMs)} elapsed`}
              used={onDutyMs}
              limit={14 * HOUR}
              tone="accent"
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <HOSRing
              label="Break Counter (8h)"
              sublabel="30-min break required"
              used={cumulativeDrivingSinceBreak}
              limit={8 * HOUR}
              tone="info"
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <HOSRing
              label="Weekly (70h / 8d)"
              sublabel={`${fmtHM(weeklyOnDutyMs)} used`}
              used={weeklyOnDutyMs}
              limit={70 * HOUR}
              tone="primary"
            />
          </CardContent>
        </Card>
      </section>

      <DutyTimeline />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          icon={<Gauge className="h-4.5 w-4.5" />}
          label="Today's miles"
          value="287"
          hint="est. from telemetry"
        />
        <StatTile
          icon={<CalendarClock className="h-4.5 w-4.5" />}
          label="Shift started"
          value={new Date(Date.now() - onDutyMs).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
          hint="after last 10h reset"
        />
        <StatTile
          icon={<MapPin className="h-4.5 w-4.5" />}
          label="Current location"
          value={current.location ?? "—"}
          hint="last logged"
        />
      </section>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="mt-2 font-display text-2xl font-semibold">{value}</div>
      {hint && (
        <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>
      )}
    </div>
  );
}
