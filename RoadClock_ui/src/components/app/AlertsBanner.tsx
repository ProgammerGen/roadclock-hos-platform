import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { useHOS } from "@/contexts/HOSContext";

const HOUR = 3_600_000;

export function AlertsBanner() {
  const { remaining, ruleSet, hosReady } = useHOS();

  if (!hosReady) return null;

  const alerts: { tone: "warn" | "danger" | "info"; msg: string }[] = [];
  const drivingLeft = remaining.drivingMs;
  const windowLeft = remaining.windowMs;
  const breakLeft = remaining.breakMs;
  const weekLeft = remaining.weeklyMs;

  if (drivingLeft <= 0)
    alerts.push({
      tone: "danger",
      msg: `${ruleSet.drivingLimitH}-hour driving limit reached. You must take ${ruleSet.resetH} consecutive hours off.`,
    });
  else if (drivingLeft < HOUR)
    alerts.push({
      tone: "warn",
      msg: `Less than 1 hour of driving time remains (${Math.round(drivingLeft / 60000)} min).`,
    });

  if (windowLeft <= 0)
    alerts.push({
      tone: "danger",
      msg: `${ruleSet.windowH}-hour duty window exceeded. Driving prohibited until ${ruleSet.resetH} consecutive hours off.`,
    });
  else if (windowLeft < HOUR)
    alerts.push({
      tone: "warn",
      msg: `${ruleSet.windowH}-hour window closes in ${Math.round(windowLeft / 60000)} min.`,
    });

  if (breakLeft <= 0)
    alerts.push({
      tone: "warn",
      msg: "30-minute break required before continuing to drive.",
    });
  else if (breakLeft < HOUR)
    alerts.push({
      tone: "info",
      msg: `30-min break required in ${Math.round(breakLeft / 60000)} min of driving.`,
    });

  if (weekLeft <= 0)
    alerts.push({
      tone: "danger",
      msg: `${ruleSet.weeklyLimitH}-hour / ${ruleSet.weeklyDays}-day limit reached. 34-hour restart required.`,
    });

  if (!alerts.length) return null;

  return (
    <div className="space-y-2">
      {alerts.map((a, i) => {
        const Icon =
          a.tone === "danger"
            ? AlertCircle
            : a.tone === "warn"
              ? AlertTriangle
              : Info;
        const styles =
          a.tone === "danger"
            ? "border-destructive/40 bg-destructive/10 text-destructive"
            : a.tone === "warn"
              ? "border-warning/40 bg-warning/10 text-warning-foreground"
              : "border-info/40 bg-info/10 text-info";
        return (
          <div
            key={i}
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${styles}`}
            role="alert"
          >
            <Icon className="mt-0.5 h-4.5 w-4.5 shrink-0" />
            <p className="text-sm font-medium">{a.msg}</p>
          </div>
        );
      })}
    </div>
  );
}
