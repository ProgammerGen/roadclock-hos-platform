import { useState } from "react";
import { Play, Pause, Bed, Briefcase } from "lucide-react";
import { useHOS, type DutyStatus } from "@/contexts/HOSContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const ACTIONS = [
  {
    status: "driving" as DutyStatus,
    label: "Start Driving",
    icon: Play,
    variant: "default",
    confirm: "Begin a driving period?",
  },
  {
    status: "onduty" as DutyStatus,
    label: "On Duty",
    icon: Briefcase,
    variant: "secondary",
    confirm: "Switch to On Duty (not driving)?",
  },
  {
    status: "off" as DutyStatus,
    label: "Take Break",
    icon: Pause,
    variant: "outline",
    confirm: "Switch to Off Duty / Break?",
  },
  {
    status: "sleeper" as DutyStatus,
    label: "Sleeper Berth",
    icon: Bed,
    variant: "outline",
    confirm: "Begin Sleeper Berth rest?",
  },
];

export function StatusActions() {
  const { current, changeStatus, canTransition, validateTransition } = useHOS();
  const [pending, setPending] = useState<DutyStatus | null>(null);
  const [checking, setChecking] = useState<DutyStatus | null>(null);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ACTIONS.map(({ status, label, icon: Icon, variant, confirm }) => {
        const active = current.status === status;
        const guard = canTransition(status);
        const blocked = !active && !guard.ok;
        return (
          <AlertDialog
            key={status}
            open={pending === status}
            onOpenChange={(o: boolean) => !o && setPending(null)}
          >
            <AlertDialogTrigger asChild>
              <Button
                variant={variant as never}
                disabled={active || checking === status}
                onClick={async () => {
                  setChecking(status);
                  try {
                    const backendGuard = await validateTransition(status);
                    if (!backendGuard.ok) {
                      toast.error("Status change blocked", {
                        description:
                          backendGuard.reason ??
                          "The backend rejected this status change.",
                        duration: 6000,
                      });
                      return;
                    }
                    setPending(status);
                  } finally {
                    setChecking((currentStatus) =>
                      currentStatus === status ? null : currentStatus,
                    );
                  }
                }}
                className={cn(
                  "h-auto flex-col gap-2 py-4 text-sm font-semibold",
                  status === "driving" &&
                    "border-primary-foreground/20 bg-primary-foreground/12 text-primary-foreground hover:bg-primary-foreground/18",
                  status === "onduty" &&
                    "border-transparent bg-accent text-accent-foreground hover:bg-accent/90",
                  status === "off" &&
                    "border-transparent bg-primary-foreground text-foreground hover:bg-primary-foreground/90",
                  status === "sleeper" &&
                    "border-transparent bg-info text-info-foreground hover:bg-info/90",
                  active && "ring-2 ring-primary-foreground/35",
                )}
                title={blocked ? guard.reason : undefined}
              >
                <Icon className="h-5 w-5" />
                {label}
                {active && (
                  <span className="text-[10px] font-normal opacity-70">
                    CURRENT
                  </span>
                )}
                {blocked && (
                  <span className="text-[10px] font-normal text-destructive">
                    BLOCKED
                  </span>
                )}
                {checking === status && (
                  <span className="text-[10px] font-normal opacity-70">
                    CHECKING
                  </span>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Change duty status</AlertDialogTitle>
                <AlertDialogDescription>
                  {confirm} This will be recorded in your daily log.
                  {blocked && guard.reason
                    ? ` Current warning: ${guard.reason}`
                    : ""}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    const r = await changeStatus(status);
                    if (r.ok) {
                      toast.success(`Status changed to ${label}`);
                    } else {
                      toast.error("Status change blocked", {
                        description:
                          r.reason ??
                          "The backend rejected this status change.",
                        duration: 6000,
                      });
                    }
                    setPending(null);
                  }}
                >
                  Yes, {label}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        );
      })}
    </div>
  );
}
