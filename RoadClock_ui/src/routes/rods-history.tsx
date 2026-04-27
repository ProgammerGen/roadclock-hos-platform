import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildPrintablePDFHTML,
  downloadFile,
  exportCSV,
  fmtHM,
  useHOS,
} from "@/contexts/HOSContext";
import { DailyLogGrid } from "@/components/app/DailyLogGrid";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  createExportRecord,
  fetchExportRecords,
  type ExportRecordPayload,
} from "@/lib/api";
import { toLocalDateInputValue } from "@/lib/utils";
import { CalendarDays, FileSpreadsheet, FileText, History } from "lucide-react";
import { toast } from "sonner";

const DAY_MS = 24 * 3_600_000;

function startOfLocalDay(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}
const createLooseFileRoute = createFileRoute as unknown as (
  path: string,
) => (options: unknown) => unknown;

export const Route = createLooseFileRoute("/rods-history")({
  head: () => ({
    meta: [
      { title: "RODS History — RoadClock" },
      {
        name: "description",
        content:
          "Full historical RODS sheets with graph previews and one-click CSV/PDF downloads.",
      },
    ],
  }),
  component: RODSHistoryPage,
});

function RODSHistoryPage() {
  const { entries, ruleSet, driver } = useHOS();
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [savedExports, setSavedExports] = useState<ExportRecordPayload[]>([]);
  const [loadingSavedExports, setLoadingSavedExports] = useState(false);

  const historyDays = useMemo(() => {
    const now = Date.now();
    const byDay = new Map<
      string,
      {
        dateKey: string;
        entryCount: number;
        drivingMs: number;
        onDutyMs: number;
      }
    >();

    for (const entry of entries) {
      const segStart = entry.startedAt;
      const segEnd = entry.endedAt ?? now;
      if (segEnd <= segStart) continue;

      let cursor = startOfLocalDay(segStart);
      while (cursor < segEnd) {
        const dayEnd = cursor + DAY_MS;
        const overlapStart = Math.max(segStart, cursor);
        const overlapEnd = Math.min(segEnd, dayEnd);
        if (overlapEnd > overlapStart) {
          const key = toLocalDateInputValue(new Date(cursor));
          const row = byDay.get(key) ?? {
            dateKey: key,
            entryCount: 0,
            drivingMs: 0,
            onDutyMs: 0,
          };
          row.entryCount += 1;
          if (entry.status === "driving") {
            row.drivingMs += overlapEnd - overlapStart;
          }
          if (entry.status === "onduty") {
            row.onDutyMs += overlapEnd - overlapStart;
          }
          byDay.set(key, row);
        }
        cursor = dayEnd;
      }
    }

    return Array.from(byDay.values()).sort((a, b) =>
      b.dateKey.localeCompare(a.dateKey),
    );
  }, [entries]);

  useEffect(() => {
    if (historyDays.length === 0) {
      setSelectedDateKey(null);
      return;
    }
    setSelectedDateKey((prev) => {
      if (prev && historyDays.some((day) => day.dateKey === prev)) {
        return prev;
      }
      return historyDays[0].dateKey;
    });
  }, [historyDays]);

  useEffect(() => {
    if (!driver.id) {
      setSavedExports([]);
      return;
    }

    let active = true;
    setLoadingSavedExports(true);
    void fetchExportRecords(driver.id)
      .then((rows) => {
        if (!active) return;
        setSavedExports(
          rows.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          ),
        );
      })
      .catch((error) => {
        console.error("Failed to load export history:", error);
      })
      .finally(() => {
        if (active) setLoadingSavedExports(false);
      });

    return () => {
      active = false;
    };
  }, [driver.id]);

  const selectedDate = useMemo(
    () => (selectedDateKey ? parseDateKey(selectedDateKey) : null),
    [selectedDateKey],
  );

  const selectedDayEntries = useMemo(() => {
    if (!selectedDate) return [];
    const dayStart = startOfLocalDay(selectedDate.getTime());
    const dayEnd = dayStart + DAY_MS;
    const now = Date.now();

    return entries
      .map((entry) => {
        const end = entry.endedAt ?? now;
        return {
          ...entry,
          startedAt: Math.max(entry.startedAt, dayStart),
          endedAt: Math.min(end, dayEnd),
        };
      })
      .filter((entry) => (entry.endedAt ?? dayEnd) > entry.startedAt)
      .sort((a, b) => a.startedAt - b.startedAt);
  }, [entries, selectedDate]);

  const remarks = useMemo(
    () =>
      selectedDayEntries
        .filter((entry) => entry.location)
        .map((entry) => ({
          time: entry.startedAt,
          location: entry.location!,
        })),
    [selectedDayEntries],
  );

  const recordExport = useCallback(
    async (exportType: "csv" | "pdf", fileName: string) => {
      if (!driver.id || !selectedDateKey) return;

      try {
        const record = await createExportRecord({
          driverId: driver.id,
          exportType,
          fromDate: selectedDateKey,
          toDate: selectedDateKey,
          fileName,
          includeManual: true,
          certified: true,
          signature: "RODS-AUTO",
          status: "completed",
          metadata: {
            source: "rods-history",
            entries: selectedDayEntries.length,
          },
        });
        setSavedExports((previous) => [record, ...previous]);
      } catch (error) {
        console.error("Failed to save export record:", error);
        toast.error("Downloaded, but failed to save export history record.");
      }
    },
    [driver.id, selectedDateKey, selectedDayEntries.length],
  );

  const onDownloadCSV = useCallback(async () => {
    if (!selectedDateKey || selectedDayEntries.length === 0) {
      toast.error("No RODS entries available for this day.");
      return;
    }

    const fileName = `rods-${selectedDateKey}.csv`;
    const csv = exportCSV(selectedDayEntries, {
      name: driver.name,
      carrier: driver.carrierName,
      signature: "RODS-AUTO",
    });
    downloadFile(fileName, csv, "text/csv");
    toast.success("RODS CSV downloaded.");
    await recordExport("csv", fileName);
  }, [
    driver.carrierName,
    driver.name,
    recordExport,
    selectedDateKey,
    selectedDayEntries,
  ]);

  const onDownloadPDF = useCallback(async () => {
    if (!selectedDateKey || selectedDayEntries.length === 0) {
      toast.error("No RODS entries available for this day.");
      return;
    }

    const fileName = `rods-${selectedDateKey}.pdf`;
    const html = buildPrintablePDFHTML(
      selectedDayEntries,
      {
        name: driver.name,
        carrier: driver.carrierName,
        signature: "RODS-AUTO",
      },
      ruleSet,
    );
    const popup = window.open("", "_blank", "width=900,height=1000");
    if (!popup) {
      toast.error("Pop-up blocked. Allow pop-ups to print PDF.");
      return;
    }
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    toast.success("PDF print window opened.");
    await recordExport("pdf", fileName);
  }, [
    driver.carrierName,
    driver.name,
    recordExport,
    ruleSet,
    selectedDateKey,
    selectedDayEntries,
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">RODS History</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Full daily log history with FMCSA-style RODS graph preview and
            per-day downloads.
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5">
          <History className="h-3.5 w-3.5" />
          {historyDays.length} day{historyDays.length === 1 ? "" : "s"}
        </Badge>
      </header>

      <div className="grid gap-6 lg:grid-cols-[290px_minmax(0,1fr)]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Saved Days</CardTitle>
            <CardDescription>
              Pick a date to preview that day&apos;s RODS graph.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {historyDays.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                No history yet. Add duty entries from Dashboard or Daily Logs.
              </div>
            )}

            {historyDays.map((day) => {
              const active = day.dateKey === selectedDateKey;
              const dateLabel = parseDateKey(day.dateKey).toLocaleDateString(
                [],
                {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                },
              );

              return (
                <button
                  key={day.dateKey}
                  type="button"
                  onClick={() => setSelectedDateKey(day.dateKey)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                    active
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="font-medium">{dateLabel}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {day.entryCount} entries · Drive {fmtHM(day.drivingMs)} · On
                    duty {fmtHM(day.onDutyMs)}
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Daily RODS Graph</CardTitle>
                <CardDescription>
                  {selectedDate
                    ? selectedDate.toLocaleDateString([], {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Select a day from history"}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => void onDownloadCSV()}
                  disabled={!selectedDate || selectedDayEntries.length === 0}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Download CSV
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => void onDownloadPDF()}
                  disabled={!selectedDate || selectedDayEntries.length === 0}
                >
                  <FileText className="h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedDate && (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Select a date to view the full RODS graph.
              </div>
            )}

            {selectedDate && selectedDayEntries.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No entries found for this day.
              </div>
            )}

            {selectedDate && selectedDayEntries.length > 0 && (
              <DailyLogGrid
                date={selectedDate}
                entries={selectedDayEntries}
                remarks={remarks}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Saved Download History</CardTitle>
          <CardDescription>
            Records saved when a user downloads RODS files from this tab.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSavedExports && (
            <div className="text-sm text-muted-foreground">
              Loading history…
            </div>
          )}

          {!loadingSavedExports && savedExports.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              No saved downloads yet.
            </div>
          )}

          {!loadingSavedExports && savedExports.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Generated</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">File</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {savedExports.map((record) => (
                    <tr key={record.id}>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(record.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-medium uppercase">
                        {record.export_type}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                          {record.from_date}
                        </span>
                      </td>
                      <td className="px-4 py-3">{record.file_name || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{record.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
