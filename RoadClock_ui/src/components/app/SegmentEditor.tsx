import { useMemo, useState } from "react";
import {
  useHOS,
  STATUS_META,
  type DutyStatus,
  type DutyEntry,
} from "@/contexts/HOSContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const STATUSES: DutyStatus[] = ["off", "sleeper", "driving", "onduty"];

interface FormState {
  status: DutyStatus;
  start: string;
  end: string;
  location: string;
  note: string;
  active: boolean;
}

function fmtTime(ts: number, dayStart: number) {
  const clamped = Math.max(dayStart, Math.min(dayStart + 24 * 3_600_000, ts));
  const d = new Date(clamped);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function parseTime(hhmm: string, dayStart: number): number {
  const [h, m] = hhmm.split(":").map(Number);
  return dayStart + ((h ?? 0) * 60 + (m ?? 0)) * 60_000;
}

interface SegmentEditorProps {
  date: Date;
}

export function SegmentEditor({ date }: SegmentEditorProps) {
  const { entries, addManualEntry, updateEntry, deleteEntry } = useHOS();

  const dayStart = useMemo(() => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, [date]);
  const dayEnd = dayStart + 24 * 3_600_000;

  const dayEntries = useMemo(
    () =>
      entries
        .filter(
          (e) => (e.endedAt ?? Date.now()) > dayStart && e.startedAt < dayEnd,
        )
        .sort((a, b) => a.startedAt - b.startedAt),
    [entries, dayStart, dayEnd],
  );

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    status: "off",
    start: "00:00",
    end: "01:00",
    location: "",
    note: "",
    active: false,
  });
  const [error, setError] = useState<string | null>(null);

  const openNew = () => {
    setEditingId(null);
    setForm({
      status: "off",
      start: "00:00",
      end: "01:00",
      location: "",
      note: "",
      active: false,
    });
    setError(null);
    setOpen(true);
  };

  const openEdit = (e: DutyEntry) => {
    setEditingId(e.id);
    setForm({
      status: e.status,
      start: fmtTime(e.startedAt, dayStart),
      end: e.endedAt ? fmtTime(e.endedAt, dayStart) : "",
      location: e.location ?? "",
      note: e.note ?? "",
      active: !e.endedAt,
    });
    setError(null);
    setOpen(true);
  };

  const submit = async () => {
    const startedAt = parseTime(form.start, dayStart);
    let endedAt: number | undefined;
    if (form.active) {
      endedAt = undefined;
    } else {
      if (!form.end) {
        setError("End time is required (or mark Active).");
        return;
      }
      endedAt = parseTime(form.end, dayStart);
      if (endedAt <= startedAt) {
        setError("End time must be after start time.");
        return;
      }
    }

    if (editingId) {
      try {
        await updateEntry(editingId, {
          status: form.status,
          startedAt,
          endedAt,
          location: form.location || undefined,
          note: form.note || undefined,
        });
        toast.success("Segment updated");
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Failed to update segment.",
        );
        return;
      }
    } else {
      try {
        await addManualEntry({
          status: form.status,
          startedAt,
          endedAt,
          location: form.location || undefined,
          note: form.note || undefined,
        });
        toast.success("Segment added");
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Failed to add segment.",
        );
        return;
      }
    }
    setOpen(false);
  };

  const doDelete = async (id: string) => {
    try {
      await deleteEntry(id);
      toast.success("Segment deleted");
      setConfirmDelete(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete segment.",
      );
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card print:hidden">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold">
            Edit duty segments
          </h3>
          <p className="text-xs text-muted-foreground">
            Add, edit, or delete entries for{" "}
            {date.toLocaleDateString([], { dateStyle: "medium" })}. The grid
            above updates automatically.
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Add segment
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Start</th>
              <th className="px-3 py-2.5">End</th>
              <th className="px-3 py-2.5">Location</th>
              <th className="px-3 py-2.5">Note</th>
              <th className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {dayEntries.map((e) => (
              <tr key={e.id} className="hover:bg-muted/30">
                <td className="px-3 py-2.5">
                  <Badge
                    variant="outline"
                    className={
                      STATUS_META[e.status].color +
                      " border-transparent font-medium"
                    }
                  >
                    {STATUS_META[e.status].label}
                  </Badge>
                </td>
                <td className="px-3 py-2.5 font-mono tabular-nums">
                  {fmtTime(e.startedAt, dayStart)}
                </td>
                <td className="px-3 py-2.5 font-mono tabular-nums">
                  {e.endedAt ? (
                    fmtTime(e.endedAt, dayStart)
                  ) : (
                    <span className="text-success">active</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">
                  {e.location ?? "—"}
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">
                  {e.note ?? "—"}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(e)}
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setConfirmDelete(e.id)}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {dayEntries.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-sm text-muted-foreground"
                >
                  No segments on this day yet. Click "Add segment" to create
                  one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit segment" : "Add segment"}
            </DialogTitle>
            <DialogDescription>
              Times are in your home terminal time zone, on{" "}
              {date.toLocaleDateString([], { dateStyle: "medium" })}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Duty status</Label>
              <Select
                value={form.status}
                onValueChange={(v: string) =>
                  setForm((f) => ({ ...f, status: v as DutyStatus }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_META[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="seg-start">Start time</Label>
                <Input
                  id="seg-start"
                  type="time"
                  value={form.start}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm((f) => ({ ...f, start: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="seg-end">End time</Label>
                <Input
                  id="seg-end"
                  type="time"
                  value={form.end}
                  disabled={form.active}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm((f) => ({ ...f, end: e.target.value }))
                  }
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm((f) => ({ ...f, active: e.target.checked }))
                }
                className="h-4 w-4 rounded border-border accent-primary"
              />
              Mark as active (no end time — currently in this status)
            </label>

            <div className="space-y-1.5">
              <Label htmlFor="seg-loc">Location</Label>
              <Input
                id="seg-loc"
                value={form.location}
                placeholder="e.g. Baltimore, MD"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm((f) => ({ ...f, location: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="seg-note">Remarks / note</Label>
              <Input
                id="seg-note"
                value={form.note}
                placeholder="e.g. Lunch, fueling, delivery stop"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm((f) => ({ ...f, note: e.target.value }))
                }
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit}>
              {editingId ? "Save changes" : "Add segment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(v: boolean) => !v && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this segment?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the entry from your log. The action is
              recorded in the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && doDelete(confirmDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
