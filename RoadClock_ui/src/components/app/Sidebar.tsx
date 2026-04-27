import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ScrollText,
  Truck,
  X,
  Calculator,
  FileDown,
  ClipboardList,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true as const },
  { to: "/logs", label: "Daily Logs", icon: ScrollText, exact: false as const },
  {
    to: "/daily-log",
    label: "Log Sheet (RODS)",
    icon: ClipboardList,
    exact: false as const,
  },
  {
    to: "/calculator",
    label: "Limits Calculator",
    icon: Calculator,
    exact: false as const,
  },
  { to: "/export", label: "ELD Export", icon: FileDown, exact: false as const },
  {
    to: "/rods-history",
    label: "RODS History",
    icon: History,
    exact: false as const,
  },
] as const;

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { location } = useRouterState();
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:translate-x-0 lg:static lg:z-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Main navigation"
      >
        <div className="flex h-16 items-center justify-between gap-3 border-b border-sidebar-border px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-hero shadow-glow">
              <Truck
                className="h-5 w-5 text-primary-foreground"
                strokeWidth={2.5}
              />
            </div>
            <div>
              <div className="font-display text-base font-semibold leading-tight">
                RoadClock
              </div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                FMCSA HOS
              </div>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {nav.map(({ to, label, icon: Icon, exact }) => {
            const isActive = exact
              ? location.pathname === to
              : location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                onClick={onClose}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "h-4.5 w-4.5",
                    isActive && "text-sidebar-primary",
                  )}
                />
                {label}
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="m-3 rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-4">
          <div className="text-xs font-medium text-muted-foreground">
            Driver
          </div>
          <div className="mt-1 font-display text-sm font-semibold">
            M. Rodriguez
          </div>
          <div className="text-xs text-muted-foreground">
            Carrier: Sunbelt Freight
          </div>
        </div>
      </aside>
    </>
  );
}
