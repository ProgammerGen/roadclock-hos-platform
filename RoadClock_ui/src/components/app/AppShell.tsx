import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { useHOS, STATUS_META } from "@/contexts/HOSContext";

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { current } = useHOS();
  const meta = STATUS_META[current.status];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
          <button
            onClick={() => setOpen(true)}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <span
              className={`relative inline-flex h-2.5 w-2.5 rounded-full ${current.status === "driving" ? "bg-success animate-pulse-ring" : current.status === "onduty" ? "bg-accent" : current.status === "sleeper" ? "bg-info" : "bg-muted-foreground"}`}
            />
            <span className="text-sm font-medium">{meta.label}</span>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
