import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  useHOS,
  STATUS_META,
  fmtHM,
  type DutyStatus,
} from "@/contexts/HOSContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
const createLooseFileRoute = createFileRoute as unknown as (
  path: string,
) => (options: unknown) => unknown;

export const Route = createLooseFileRoute("/logs")({
  head: () => ({
    meta: [
      { title: "Daily Logs — RoadClock" },
      {
        name: "description",
        content:
          "Searchable record of duty status (RODS): driving, on-duty, sleeper, and off-duty entries.",
      },
    ],
  }),
  component: LogsPage,
});

function LogsPage() {
  const { entries } = useHOS();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | DutyStatus>("all");

  const rows = useMemo(() => {
    const now = Date.now();
    return [...entries]
      .reverse()
      .map((e) => ({
        ...e,
        durationMs: (e.endedAt ?? now) - e.startedAt,
      }))
      .filter((e) => {
        if (filter !== "all" && e.status !== filter) return false;
        if (!q) return true;
        const hay =
          `${STATUS_META[e.status].label} ${e.location ?? ""} ${e.note ?? ""}`.toLowerCase();
        return hay.includes(q.toLowerCase());
      });
  }, [entries, q, filter]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Daily Logs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Electronic Record of Duty Status (RODS)
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => toast.success("Log exported (demo)")}
        >
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </header>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search location, note, status…"
                className="pl-9"
              />
            </div>
            <Select
              value={filter}
              onValueChange={(v: string) => setFilter(v as never)}
            >
              <SelectTrigger className="sm:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="driving">Driving</SelectItem>
                <SelectItem value="onduty">On Duty (ND)</SelectItem>
                <SelectItem value="off">Off Duty</SelectItem>
                <SelectItem value="sleeper">Sleeper Berth</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Start</th>
                  <th className="px-4 py-3">End</th>
                  <th className="px-4 py-3 text-right">Duration</th>
                  <th className="px-4 py-3">Location / Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={
                          STATUS_META[r.status].color +
                          " border-transparent font-medium"
                        }
                      >
                        {STATUS_META[r.status].label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs tabular-nums">
                      {new Date(r.startedAt).toLocaleString([], {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs tabular-nums">
                      {r.endedAt ? (
                        new Date(r.endedAt).toLocaleString([], {
                          dateStyle: "short",
                          timeStyle: "short",
                        })
                      ) : (
                        <span className="text-success">— active —</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {fmtHM(r.durationMs)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.location ?? r.note ?? "—"}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-12 text-center text-muted-foreground"
                    >
                      No log entries match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
