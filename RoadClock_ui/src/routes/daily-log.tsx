import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useHOS } from "@/contexts/HOSContext";
import { DailyLogGrid } from "@/components/app/DailyLogGrid";
import { SegmentEditor } from "@/components/app/SegmentEditor";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { toLocalDateInputValue } from "@/lib/utils";
const createLooseFileRoute = createFileRoute as unknown as (
  path: string,
) => (options: unknown) => unknown;

export const Route = createLooseFileRoute("/daily-log")({
  head: () => ({
    meta: [
      { title: "Driver's Daily Log — RoadClock" },
      {
        name: "description",
        content:
          "FMCSA-style 24-hour Driver's Daily Log grid (Record of Duty Status) — one calendar day, with remarks and totals.",
      },
    ],
  }),
  component: DailyLogPage,
});

function DailyLogPage() {
  const { entries } = useHOS();
  const [date, setDate] = useState(() => toLocalDateInputValue(new Date()));
  const [carrier, setCarrier] = useState("Sunbelt Freight");
  const [office, setOffice] = useState("Dallas, TX");
  const [driver, setDriver] = useState("M. Rodriguez");
  const [coDriver, setCoDriver] = useState("");
  const [vehicles, setVehicles] = useState("123, 20544");
  const [miles, setMiles] = useState("350");
  const [shipNo, setShipNo] = useState("101601");

  const selectedDate = useMemo(() => {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1);
  }, [date]);
  const remarks = useMemo(() => {
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    const end = start.getTime() + 24 * 3_600_000;
    return entries
      .filter(
        (e) =>
          e.startedAt >= start.getTime() && e.startedAt < end && e.location,
      )
      .map((e) => ({ time: e.startedAt, location: e.location! }));
  }, [entries, selectedDate]);

  const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
  const d = String(selectedDate.getDate()).padStart(2, "0");
  const y = selectedDate.getFullYear();

  return (
    <div className="mx-auto max-w-6xl space-y-6 print:max-w-none">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between print:hidden">
        <div>
          <h1 className="font-display text-3xl font-semibold">
            Driver's Daily Log
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One calendar day — 24 hours. FMCSA Record of Duty Status (RODS).
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => window.print()}
        >
          <Printer className="h-4 w-4" /> Print log
        </Button>
      </header>

      <Card className="print:hidden">
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Date">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field label="Total miles driving today">
            <Input
              value={miles}
              onChange={(e) => setMiles(e.target.value)}
              inputMode="numeric"
            />
          </Field>
          <Field label="Vehicle numbers (truck, trailer)">
            <Input
              value={vehicles}
              onChange={(e) => setVehicles(e.target.value)}
            />
          </Field>
          <Field label="Name of carrier">
            <Input
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
            />
          </Field>
          <Field label="Main office address">
            <Input value={office} onChange={(e) => setOffice(e.target.value)} />
          </Field>
          <Field label="Driver's signature (full legal name)">
            <Input value={driver} onChange={(e) => setDriver(e.target.value)} />
          </Field>
          <Field label="Name of co-driver">
            <Input
              value={coDriver}
              onChange={(e) => setCoDriver(e.target.value)}
              placeholder="—"
            />
          </Field>
          <Field label="Pro or shipping no.">
            <Input value={shipNo} onChange={(e) => setShipNo(e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <div className="rounded-xl border border-border bg-card p-6 shadow-card print:border-0 print:shadow-none">
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <div className="font-semibold">
              U.S. DEPARTMENT OF TRANSPORTATION
            </div>
            <div className="mt-3 flex gap-3 font-display text-2xl italic">
              <Cell value={m} sub="MONTH" />
              <Cell value={d} sub="DAY" />
              <Cell value={String(y)} sub="YEAR" />
            </div>
          </div>
          <div className="text-center">
            <div className="font-display text-base font-bold">
              DRIVER'S DAILY LOG
            </div>
            <div className="text-[10px]">(ONE CALENDAR DAY — 24 HOURS)</div>
            <div className="mt-3 font-display text-2xl italic">
              <Cell value={miles} sub="TOTAL MILES DRIVING TODAY" center />
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] leading-tight">
              ORIGINAL — Submit to carrier within 13 days
              <br />
              DUPLICATE — Driver retains possession for eight days
            </div>
            <div className="mt-3 font-display text-2xl italic">
              <Cell
                value={vehicles}
                sub="VEHICLE NUMBERS — (SHOW EACH UNIT)"
                right
              />
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-6 text-xs">
          <div>
            <div className="font-display text-xl italic">
              {carrier || "\u00A0"}
            </div>
            <div className="border-t border-foreground pt-1 text-center text-[10px] font-semibold">
              (NAME OF CARRIER OR CARRIERS)
            </div>
            <div className="mt-3 font-display text-xl italic">
              {office || "\u00A0"}
            </div>
            <div className="border-t border-foreground pt-1 text-center text-[10px] font-semibold">
              (MAIN OFFICE ADDRESS)
            </div>
          </div>
          <div>
            <div className="text-[10px]">
              I certify that these entries are true and correct
            </div>
            <div className="font-display text-xl italic">
              {driver || "\u00A0"}
            </div>
            <div className="border-t border-foreground pt-1 text-center text-[10px] font-semibold">
              (DRIVER'S SIGNATURE IN FULL)
            </div>
            <div className="mt-3 font-display text-xl italic">
              {coDriver || "—"}
            </div>
            <div className="border-t border-foreground pt-1 text-center text-[10px] font-semibold">
              (NAME OF CO-DRIVER)
            </div>
          </div>
        </div>

        <div className="mt-5">
          <DailyLogGrid
            date={selectedDate}
            entries={entries}
            remarks={remarks}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-6 text-xs">
          <div>
            <span className="font-semibold">Pro or Shipping No. </span>
            <span className="font-display italic">{shipNo}</span>
          </div>
          <div className="text-right text-muted-foreground">
            Time base: home terminal time zone
          </div>
        </div>
      </div>

      <SegmentEditor date={selectedDate} />

      <style>{`
        @media print {
          body { background: white; }
          aside, header.sticky, .print\\:hidden { display: none !important; }
          main { padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Cell({
  value,
  sub,
  center,
  right,
}: {
  value: string;
  sub: string;
  center?: boolean;
  right?: boolean;
}) {
  return (
    <div className={center ? "text-center" : right ? "text-right" : ""}>
      <div className="border-b border-foreground pb-0.5">
        {value || "\u00A0"}
      </div>
      <div className="mt-1 text-[10px] font-sans not-italic font-semibold text-foreground">
        ({sub})
      </div>
    </div>
  );
}
