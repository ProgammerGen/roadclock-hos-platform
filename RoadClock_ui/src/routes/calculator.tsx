import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  useHOS,
  RULE_SETS,
  fmtHM,
  type RuleSetId,
} from "@/contexts/HOSContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
const createLooseFileRoute = createFileRoute as unknown as (
  path: string,
) => (options: unknown) => unknown;

export const Route = createLooseFileRoute("/calculator")({
  head: () => ({
    meta: [
      { title: "Limits Calculator — RoadClock" },
      {
        name: "description",
        content:
          "Interactive FMCSA HOS limits calculator. Pick driver type and rule set to see live remaining limits.",
      },
    ],
  }),
  component: CalculatorPage,
});

const HOUR = 3_600_000;

function CalculatorPage() {
  const {
    ruleSet,
    setRuleSetId,
    drivingMs,
    onDutyMs,
    cumulativeDrivingSinceBreak,
    weeklyOnDutyMs,
  } = useHOS();
  const [extraDrivingH, setExtraDrivingH] = useState(0);
  const [extraOnDutyH, setExtraOnDutyH] = useState(0);

  const drivingTotal = drivingMs + extraDrivingH * HOUR;
  const onDutyTotal = onDutyMs + (extraDrivingH + extraOnDutyH) * HOUR;
  const breakTotal = cumulativeDrivingSinceBreak + extraDrivingH * HOUR;
  const weeklyTotal = weeklyOnDutyMs + (extraDrivingH + extraOnDutyH) * HOUR;

  const items = [
    {
      label: `Driving (${ruleSet.drivingLimitH}h)`,
      used: drivingTotal,
      limit: ruleSet.drivingLimitH * HOUR,
    },
    {
      label: `Duty Window (${ruleSet.windowH}h)`,
      used: onDutyTotal,
      limit: ruleSet.windowH * HOUR,
    },
    {
      label: `Break Counter (${ruleSet.breakAfterDrivingH}h cum. drive)`,
      used: breakTotal,
      limit: ruleSet.breakAfterDrivingH * HOUR,
    },
    {
      label: `Weekly (${ruleSet.weeklyLimitH}h / ${ruleSet.weeklyDays}d)`,
      used: weeklyTotal,
      limit: ruleSet.weeklyLimitH * HOUR,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">
          FMCSA Limits Calculator
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live remaining hours under your active rule set. Use the sliders to
          model "what if I drive more".
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Driver type & rule set</CardTitle>
          <CardDescription>
            Switching the rule set immediately recalculates every limit across
            the app.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Active rule set</Label>
            <Select
              value={ruleSet.id}
              onValueChange={(v: string) => setRuleSetId(v as RuleSetId)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(RULE_SETS).map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
            <div>
              <strong className="text-foreground">
                {ruleSet.driverType === "property"
                  ? "Property-carrying"
                  : "Passenger-carrying"}
              </strong>{" "}
              driver
            </div>
            <div className="mt-1">
              Driving limit {ruleSet.drivingLimitH}h · Duty window{" "}
              {ruleSet.windowH}h · Break after {ruleSet.breakAfterDrivingH}h
              driving · Reset {ruleSet.resetH}h off-duty
            </div>
            <div className="mt-1">
              Weekly cap {ruleSet.weeklyLimitH}h over {ruleSet.weeklyDays} days
              · 34-hour restart available
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What-if model</CardTitle>
          <CardDescription>
            See how additional hours would consume your remaining limits.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <Label>+ Additional driving hours</Label>
              <span className="font-mono tabular-nums">
                {extraDrivingH.toFixed(1)} h
              </span>
            </div>
            <Slider
              value={[extraDrivingH]}
              onValueChange={([v]: number[]) => setExtraDrivingH(v)}
              min={0}
              max={ruleSet.drivingLimitH}
              step={0.25}
            />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <Label>+ Additional on-duty (non-driving) hours</Label>
              <span className="font-mono tabular-nums">
                {extraOnDutyH.toFixed(1)} h
              </span>
            </div>
            <Slider
              value={[extraOnDutyH]}
              onValueChange={([v]: number[]) => setExtraOnDutyH(v)}
              min={0}
              max={ruleSet.windowH}
              step={0.25}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Projected remaining limits</CardTitle>
          <CardDescription>
            Updates in real time as you change rule set or sliders.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {items.map((it) => {
            const remaining = Math.max(0, it.limit - it.used);
            const pct = Math.min(100, (it.used / it.limit) * 100);
            const violation = it.used > it.limit;
            return (
              <div key={it.label}>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <div className="text-sm font-medium">{it.label}</div>
                  <div
                    className={`font-mono text-sm tabular-nums ${violation ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    {fmtHM(it.used)} used ·{" "}
                    <span
                      className={
                        violation
                          ? "text-destructive font-semibold"
                          : "text-foreground font-semibold"
                      }
                    >
                      {violation
                        ? `OVER by ${fmtHM(it.used - it.limit)}`
                        : `${fmtHM(remaining)} left`}
                    </span>
                  </div>
                </div>
                <Progress
                  value={pct}
                  className={
                    violation
                      ? "[&>div]:bg-destructive"
                      : pct > 80
                        ? "[&>div]:bg-warning"
                        : ""
                  }
                />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
