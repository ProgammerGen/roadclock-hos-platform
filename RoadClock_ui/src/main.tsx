import {
  Component,
  StrictMode,
  useEffect,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { RouterProvider } from "@tanstack/react-router";
import type { router as appRouter } from "./router";

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("RoadClock render error:", error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-background px-4 py-10 text-foreground">
          <div className="mx-auto max-w-3xl rounded-2xl border border-destructive/30 bg-card p-6 shadow-card">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-destructive">
              App Render Error
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold">
              RoadClock could not render
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              The app crashed during startup or rendering. The first error
              message is shown below.
            </p>
            <pre className="mt-5 overflow-auto rounded-xl bg-muted p-4 font-mono text-xs text-destructive">
              {this.state.error.message}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

type AppRouter = typeof appRouter;

function StartupScreen({
  title,
  message,
  tone = "normal",
}: {
  title: string;
  message: string;
  tone?: "normal" | "error";
}) {
  const titleClass =
    tone === "error" ? "text-destructive" : "text-muted-foreground";

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-card">
        <p
          className={`text-sm font-semibold uppercase tracking-[0.2em] ${titleClass}`}
        >
          {title}
        </p>
        <pre className="mt-5 overflow-auto rounded-xl bg-muted p-4 font-mono text-xs whitespace-pre-wrap">
          {message}
        </pre>
      </div>
    </div>
  );
}

function BootRouter() {
  const [router, setRouter] = useState<AppRouter | null>(null);
  const [startupError, setStartupError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;

    void import("./router")
      .then((mod) => {
        if (active) {
          setRouter(mod.router);
        }
      })
      .catch((error: unknown) => {
        console.error("RoadClock startup error:", error);
        if (active) {
          setStartupError(
            error instanceof Error
              ? error
              : new Error("Unknown startup error while loading router."),
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (startupError) {
    return (
      <StartupScreen
        title="Startup Error"
        message={startupError.message}
        tone="error"
      />
    );
  }

  if (!router) {
    return (
      <StartupScreen title="Loading" message="RoadClock is starting up..." />
    );
  }

  return <RouterProvider router={router} />;
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('Root element "#root" was not found in index.html.');
}

createRoot(rootElement).render(
  <StrictMode>
    <AppErrorBoundary>
      <BootRouter />
    </AppErrorBoundary>
  </StrictMode>,
);
