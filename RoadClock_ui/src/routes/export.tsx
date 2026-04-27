import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  useHOS,
  exportCSV,
  downloadFile,
  buildPrintablePDFHTML,
} from "@/contexts/HOSContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck, FileDown, FileText, Fingerprint } from "lucide-react";
import { toast } from "sonner";
import { toLocalDateInputValue } from "@/lib/utils";
const createLooseFileRoute = createFileRoute as unknown as (
  path: string,
) => (options: unknown) => unknown;

export const Route = createLooseFileRoute("/export")({
  head: () => ({
    meta: [
      { title: "ELD Export — RoadClock" },
      {
        name: "description",
        content:
          "Export validated daily logs as CSV or PDF with a digital identity signature for FMCSA RODS submissions.",
      },
    ],
  }),
  component: ExportPage,
});

function ExportPage() {
  const { entries, ruleSet } = useHOS();
  const [name, setName] = useState("M. Rodriguez");
  const [carrier, setCarrier] = useState("Sunbelt Freight");
  const [signature, setSignature] = useState("");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return toLocalDateInputValue(d);
  });
  const [to, setTo] = useState(() => toLocalDateInputValue(new Date()));
  const [includeManual, setIncludeManual] = useState(true);
  const [certified, setCertified] = useState(false);

  const filtered = useMemo(() => {
    const f = new Date(from + "T00:00:00").getTime();
    const t = new Date(to + "T23:59:59").getTime();
    return entries.filter(
      (e) =>
        e.startedAt >= f && e.startedAt <= t && (includeManual || !e.manual),
    );
  }, [entries, from, to, includeManual]);

  const validation = useMemo(() => {
    const issues: string[] = [];
    if (!name.trim()) issues.push("Driver name required.");
    if (!carrier.trim()) issues.push("Carrier required.");
    if (!signature.trim() || signature.trim().length < 6)
      issues.push("Digital identity signature must be at least 6 characters.");
    if (!certified) issues.push("Certification checkbox must be checked.");
    if (filtered.length === 0)
      issues.push("No entries in the selected date range.");
    for (const e of filtered) {
      if (e.endedAt && e.endedAt < e.startedAt)
        issues.push(`Entry ${e.id} has end before start.`);
    }
    return issues;
  }, [name, carrier, signature, certified, filtered]);

  const driver = { name, carrier, signature };

  const onCSV = () => {
    if (validation.length) {
      toast.error(validation[0]);
      return;
    }
    downloadFile(
      `rods-${from}-to-${to}.csv`,
      exportCSV(filtered, driver),
      "text/csv",
    );
    toast.success("CSV exported");
  };
  const onPDF = () => {
    if (validation.length) {
      toast.error(validation[0]);
      return;
    }
    const html = buildPrintablePDFHTML(filtered, driver, ruleSet);
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) {
      toast.error("Pop-up blocked. Allow pop-ups to print PDF.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    toast.success("Print dialog opening — choose 'Save as PDF'");
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent/15 text-accent-foreground">
          <FileDown className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-semibold">ELD Export</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate FMCSA-style RODS exports in CSV or PDF, signed with your
            digital identity.
          </p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Driver & period</CardTitle>
          <CardDescription>
            Selected period: {filtered.length} log entries.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="d-name">Driver name</Label>
            <Input
              id="d-name"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setName(e.target.value)
              }
              maxLength={80}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="d-carrier">Carrier</Label>
            <Input
              id="d-carrier"
              value={carrier}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setCarrier(e.target.value)
              }
              maxLength={80}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="d-from">From</Label>
            <Input
              id="d-from"
              type="date"
              value={from}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFrom(e.target.value)
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="d-to">To</Label>
            <Input
              id="d-to"
              type="date"
              value={to}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setTo(e.target.value)
              }
            />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <Checkbox
              id="manual"
              checked={includeManual}
              onCheckedChange={(v: boolean) => setIncludeManual(!!v)}
            />
            <Label
              htmlFor="manual"
              className="text-sm font-normal text-muted-foreground"
            >
              Include manual entries
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-4.5 w-4.5 text-primary" /> Digital
            identity signature
          </CardTitle>
          <CardDescription>
            Type your driver-license number, ELD pin, or initials. This is a
            placeholder — production should use a verified key.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="e.g. DL-TX-9482310 or M.R."
            className="font-mono"
            maxLength={64}
          />
          <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3">
            <Checkbox
              id="cert"
              checked={certified}
              onCheckedChange={(v: boolean) => setCertified(!!v)}
              className="mt-0.5"
            />
            <Label
              htmlFor="cert"
              className="text-sm font-normal leading-relaxed"
            >
              I certify that these records of duty status are true and correct
              (49 CFR § 395.8). Falsification is a federal violation.
            </Label>
          </div>
        </CardContent>
      </Card>

      {validation.length > 0 && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="font-semibold">Cannot export yet:</div>
          <ul className="mt-1 list-disc pl-5">
            {validation.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ul>
        </div>
      )}
      {validation.length === 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-success/40 bg-success/10 p-4 text-sm text-success">
          <ShieldCheck className="h-4 w-4" /> Ready to export —{" "}
          {filtered.length} entries validated.
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button onClick={onCSV} className="gap-2">
          <FileDown className="h-4 w-4" /> Export CSV
        </Button>
        <Button onClick={onPDF} variant="secondary" className="gap-2">
          <FileText className="h-4 w-4" /> Export PDF (print)
        </Button>
      </div>
    </div>
  );
}
