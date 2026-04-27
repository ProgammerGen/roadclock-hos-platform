import { Outlet, Link, createRootRoute } from "@tanstack/react-router";
import { HOSProvider } from "@/contexts/HOSContext";
import { AppShell } from "@/components/app/AppShell";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This route is off your current trip plan.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "RoadClock — FMCSA Hours of Service Tracker" },
      {
        name: "description",
        content:
          "Modern, automatic Hours of Service tracking for interstate truck drivers. FMCSA-compliant logs, break alerts, and shift management.",
      },
      { name: "author", content: "RoadClock" },
      { property: "og:title", content: "RoadClock — FMCSA HOS Tracker" },
      {
        property: "og:description",
        content:
          "Automatic HOS tracking, break alerts, and electronic logs for truck drivers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap",
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootComponent() {
  return (
    <HOSProvider>
      <AppShell>
        <Outlet />
      </AppShell>
      <Toaster />
    </HOSProvider>
  );
}
