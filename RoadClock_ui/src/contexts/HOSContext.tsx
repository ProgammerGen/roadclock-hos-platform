import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  canTransitionDriverStatus,
  changeDriverStatus,
  createDutyEntry,
  ensureDefaultDriver,
  fetchAlertPreference,
  fetchAuditEvents,
  fetchDutyEntries,
  fetchHOSSummary,
  patchDutyEntry,
  removeDutyEntry,
  setDriverRuleSet,
  upsertAlertPreference,
} from "@/lib/api";

export type DutyStatus = "off" | "sleeper" | "driving" | "onduty";

export interface DutyEntry {
  id: string;
  status: DutyStatus;
  startedAt: number;
  endedAt?: number;
  note?: string;
  location?: string;
  manual?: boolean;
  signature?: string;
}

export interface AuditEvent {
  id: string;
  at: number;
  kind:
    | "status_change"
    | "manual_entry"
    | "alert"
    | "edit"
    | "export"
    | "rule_change";
  message: string;
  meta?: Record<string, string | number | boolean | undefined>;
}

export type RuleSetId =
  | "property_70_8"
  | "property_60_7"
  | "passenger_70_8"
  | "passenger_60_7";

export interface RuleSet {
  id: RuleSetId;
  label: string;
  driverType: "property" | "passenger";
  drivingLimitH: number;
  windowH: number;
  breakAfterDrivingH: number;
  weeklyLimitH: number;
  weeklyDays: 7 | 8;
  resetH: number;
}

export const RULE_SETS: Record<RuleSetId, RuleSet> = {
  property_70_8: {
    id: "property_70_8",
    label: "Property — 11/14, 70h/8d",
    driverType: "property",
    drivingLimitH: 11,
    windowH: 14,
    breakAfterDrivingH: 8,
    weeklyLimitH: 70,
    weeklyDays: 8,
    resetH: 10,
  },
  property_60_7: {
    id: "property_60_7",
    label: "Property — 11/14, 60h/7d",
    driverType: "property",
    drivingLimitH: 11,
    windowH: 14,
    breakAfterDrivingH: 8,
    weeklyLimitH: 60,
    weeklyDays: 7,
    resetH: 10,
  },
  passenger_70_8: {
    id: "passenger_70_8",
    label: "Passenger — 10/15, 70h/8d",
    driverType: "passenger",
    drivingLimitH: 10,
    windowH: 15,
    breakAfterDrivingH: 8,
    weeklyLimitH: 70,
    weeklyDays: 8,
    resetH: 8,
  },
  passenger_60_7: {
    id: "passenger_60_7",
    label: "Passenger — 10/15, 60h/7d",
    driverType: "passenger",
    drivingLimitH: 10,
    windowH: 15,
    breakAfterDrivingH: 8,
    weeklyLimitH: 60,
    weeklyDays: 7,
    resetH: 8,
  },
};

export interface AlertConfig {
  webhookUrl?: string;
  notifyEmail?: string;
  approachLimit: boolean;
  breakReminder: boolean;
  weekly: boolean;
  endOfBreak: boolean;
}

const DEFAULT_ALERTS: AlertConfig = {
  approachLimit: true,
  breakReminder: true,
  weekly: true,
  endOfBreak: true,
};

export interface TransitionResult {
  ok: boolean;
  reason?: string;
}

interface HOSSummary {
  driving_ms: number;
  on_duty_ms: number;
  cumulative_driving_since_break_ms: number;
  weekly_on_duty_ms: number;
  last_reset_at: string | null;
  remaining: {
    driving_ms: number;
    window_ms: number;
    break_ms: number;
    weekly_ms: number;
  };
}

interface ChangeStatusResponse {
  ok: boolean;
  success: boolean;
  current_status: DutyStatus | null;
  entry: {
    id: number;
    status: DutyStatus;
    started_at: string;
    ended_at: string | null;
    note: string;
    location: string;
    manual: boolean;
    signature: string;
  } | null;
  summary: HOSSummary | null;
  reason: string | null;
}

interface HOSCtx {
  driver: {
    id: number | null;
    name: string;
    carrierName: string;
  };
  current: DutyEntry;
  entries: DutyEntry[];
  audit: AuditEvent[];
  hosReady: boolean;
  ruleSet: RuleSet;
  setRuleSetId: (id: RuleSetId) => void;
  alerts: AlertConfig;
  setAlerts: (a: AlertConfig) => void;

  changeStatus: (
    status: DutyStatus,
    opts?: { note?: string; location?: string; signature?: string },
  ) => Promise<TransitionResult>;
  canTransition: (status: DutyStatus) => TransitionResult;
  validateTransition: (status: DutyStatus) => Promise<TransitionResult>;
  addManualEntry: (
    entry: Omit<DutyEntry, "id"> & { signature?: string },
  ) => Promise<void>;
  updateEntry: (
    id: string,
    patch: Partial<Omit<DutyEntry, "id">>,
  ) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;

  drivingMs: number;
  onDutyMs: number;
  cumulativeDrivingSinceBreak: number;
  weeklyOnDutyMs: number;
  lastResetAt: number;

  remaining: {
    drivingMs: number;
    windowMs: number;
    breakMs: number;
    weeklyMs: number;
  };
}

const Ctx = createContext<HOSCtx | undefined>(undefined);
const STORAGE_KEY = "hos-entries-v2";
const AUDIT_KEY = "hos-audit-v1";
const RULE_KEY = "hos-rule-v1";
const ALERT_KEY = "hos-alerts-v1";
const FIRED_KEY = "hos-alerts-fired-v1";

const HOUR = 3_600_000;

function createId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function loadEntries(): DutyEntry[] {
  return [];
}

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    void 0;
  }
  return fallback;
}

function mapApiDutyEntry(entry: {
  id: number;
  status: DutyStatus;
  started_at: string;
  ended_at: string | null;
  note: string;
  location: string;
  manual: boolean;
  signature: string;
}): DutyEntry {
  return {
    id: String(entry.id),
    status: entry.status,
    startedAt: new Date(entry.started_at).getTime(),
    endedAt: entry.ended_at ? new Date(entry.ended_at).getTime() : undefined,
    note: entry.note || undefined,
    location: entry.location || undefined,
    manual: entry.manual,
    signature: entry.signature || undefined,
  };
}

function applyStatusChangeEntry(
  previousEntries: DutyEntry[],
  nextEntry: DutyEntry,
): DutyEntry[] {
  const normalized = previousEntries
    .map((entry) => {
      if (entry.id === nextEntry.id) {
        return nextEntry;
      }
      if (entry.endedAt === undefined && entry.id !== nextEntry.id) {
        return { ...entry, endedAt: nextEntry.startedAt };
      }
      return entry;
    })
    .filter((entry) => entry.id !== nextEntry.id);

  return [...normalized, nextEntry].sort((a, b) => a.startedAt - b.startedAt);
}

function mapApiAuditEvent(event: {
  id: number;
  at: string;
  kind:
    | "status_change"
    | "manual_entry"
    | "alert"
    | "edit"
    | "export"
    | "rule_change";
  message: string;
  meta: Record<string, string | number | boolean | undefined>;
}): AuditEvent {
  return {
    id: String(event.id),
    at: new Date(event.at).getTime(),
    kind: event.kind,
    message: event.message,
    meta: event.meta,
  };
}

export function HOSProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<DutyEntry[]>(() => loadEntries());
  const [audit, setAudit] = useState<AuditEvent[]>(() =>
    loadJSON<AuditEvent[]>(AUDIT_KEY, []),
  );
  const [ruleSetId, _setRuleSetId] = useState<RuleSetId>(() =>
    loadJSON<RuleSetId>(RULE_KEY, "property_70_8"),
  );
  const [alerts, _setAlerts] = useState<AlertConfig>(() =>
    loadJSON<AlertConfig>(ALERT_KEY, DEFAULT_ALERTS),
  );
  const [driverId, setDriverId] = useState<number | null>(null);
  const [driverName, setDriverName] = useState("M. Rodriguez");
  const [carrierName, setCarrierName] = useState("Sunbelt Freight");
  const [alertPreferenceId, setAlertPreferenceId] = useState<number | null>(
    null,
  );
  const [hosSummary, setHosSummary] = useState<HOSSummary | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const firedRef = useRef<Record<string, number>>(
    loadJSON<Record<string, number>>(FIRED_KEY, {}),
  );

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const syncFromBackend = useCallback(async (id: number) => {
    const [entryRows, auditRows, alertPreference, summary] = await Promise.all([
      fetchDutyEntries(id),
      fetchAuditEvents(id),
      fetchAlertPreference(id),
      fetchHOSSummary(id),
    ]);

    const mappedEntries = entryRows
      .map(mapApiDutyEntry)
      .sort((a, b) => a.startedAt - b.startedAt);

    const mappedAuditAscending = auditRows.map(mapApiAuditEvent).reverse();

    setEntries(mappedEntries.length > 0 ? mappedEntries : loadEntries());
    setAudit(mappedAuditAscending);
    setHosSummary(summary);
    setBootstrapError(null);

    if (alertPreference) {
      setAlertPreferenceId(alertPreference.id);
      _setAlerts({
        webhookUrl: alertPreference.webhook_url ?? undefined,
        notifyEmail: alertPreference.notify_email ?? undefined,
        approachLimit: alertPreference.approach_limit,
        breakReminder: alertPreference.break_reminder,
        weekly: alertPreference.weekly,
        endOfBreak: alertPreference.end_of_break,
      });
    }
  }, []);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const driver = await ensureDefaultDriver();
        if (!active) return;

        setDriverId(driver.id);
        setDriverName(driver.name ?? "M. Rodriguez");
        setCarrierName(driver.carrier_name ?? "Sunbelt Freight");
        _setRuleSetId(
          (driver.rule_set_id as RuleSetId | undefined) ?? "property_70_8",
        );
        await syncFromBackend(driver.id);
      } catch (error) {
        console.error("Failed to initialize RoadClock backend session:", error);
        if (!active) return;
        setBootstrapError(
          error instanceof Error
            ? error.message
            : "Failed to connect to the Django API.",
        );
      }
    };

    void bootstrap();
    return () => {
      active = false;
    };
  }, [syncFromBackend]);

  useEffect(() => {
    if (typeof window !== "undefined")
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);
  useEffect(() => {
    if (typeof window !== "undefined")
      localStorage.setItem(AUDIT_KEY, JSON.stringify(audit.slice(-500)));
  }, [audit]);
  useEffect(() => {
    if (typeof window !== "undefined")
      localStorage.setItem(RULE_KEY, JSON.stringify(ruleSetId));
  }, [ruleSetId]);
  useEffect(() => {
    if (typeof window !== "undefined")
      localStorage.setItem(ALERT_KEY, JSON.stringify(alerts));
  }, [alerts]);

  const ruleSet = RULE_SETS[ruleSetId];

  const pushAudit = useCallback((evt: Omit<AuditEvent, "id" | "at">) => {
    setAudit((p) => [...p, { id: createId(), at: Date.now(), ...evt }]);
  }, []);

  const setRuleSetId = useCallback(
    (id: RuleSetId) => {
      _setRuleSetId(id);
      pushAudit({
        kind: "rule_change",
        message: `Rule set changed to ${RULE_SETS[id].label}`,
      });
      if (driverId) {
        void setDriverRuleSet(driverId, id)
          .then(() => syncFromBackend(driverId))
          .catch((error) => {
            console.error("Failed to save rule set to backend:", error);
          });
      }
    },
    [driverId, pushAudit, syncFromBackend],
  );

  const setAlerts = useCallback(
    (a: AlertConfig) => {
      _setAlerts(a);
      if (driverId) {
        void upsertAlertPreference(driverId, a, alertPreferenceId ?? undefined)
          .then((saved) => {
            setAlertPreferenceId(saved.id);
          })
          .catch((error) => {
            console.error(
              "Failed to save alert preferences to backend:",
              error,
            );
          });
      }
    },
    [alertPreferenceId, driverId],
  );

  const computed = useMemo(() => {
    const current: DutyEntry = entries[entries.length - 1] ?? {
      id: "init",
      status: "off",
      startedAt: now,
    };

    if (!hosSummary) {
      return {
        current: { ...current, endedAt: undefined } as DutyEntry,
        drivingMs: 0,
        onDutyMs: 0,
        cumulativeDrivingSinceBreak: 0,
        weeklyOnDutyMs: 0,
        lastResetAt: 0,
        remaining: {
          drivingMs: ruleSet.drivingLimitH * HOUR,
          windowMs: ruleSet.windowH * HOUR,
          breakMs: ruleSet.breakAfterDrivingH * HOUR,
          weeklyMs: ruleSet.weeklyLimitH * HOUR,
        },
      };
    }

    const lastResetAt = hosSummary.last_reset_at
      ? new Date(hosSummary.last_reset_at).getTime()
      : 0;

    return {
      current: { ...current, endedAt: undefined } as DutyEntry,
      drivingMs: hosSummary.driving_ms,
      onDutyMs: hosSummary.on_duty_ms,
      cumulativeDrivingSinceBreak: hosSummary.cumulative_driving_since_break_ms,
      weeklyOnDutyMs: hosSummary.weekly_on_duty_ms,
      lastResetAt,
      remaining: {
        drivingMs: hosSummary.remaining.driving_ms,
        windowMs: hosSummary.remaining.window_ms,
        breakMs: hosSummary.remaining.break_ms,
        weeklyMs: hosSummary.remaining.weekly_ms,
      },
    };
  }, [entries, now, hosSummary, ruleSet]);

  const canTransition = useCallback(
    (next: DutyStatus): TransitionResult => {
      const cur = computed.current.status;
      if (cur === next)
        return { ok: false, reason: "You are already in this status." };

      if (!hosSummary) {
        return { ok: true };
      }

      if (next === "driving") {
        if (computed.remaining.drivingMs <= 0)
          return {
            ok: false,
            reason: `${ruleSet.drivingLimitH}-hour driving limit reached. Take ${ruleSet.resetH} consecutive hours off-duty before driving.`,
          };
        if (computed.remaining.windowMs <= 0)
          return {
            ok: false,
            reason: `${ruleSet.windowH}-hour duty window has closed. ${ruleSet.resetH}-hour reset required.`,
          };
        if (computed.remaining.weeklyMs <= 0)
          return {
            ok: false,
            reason: `${ruleSet.weeklyLimitH}-hour / ${ruleSet.weeklyDays}-day limit reached. 34-hour restart required.`,
          };
        if (computed.remaining.breakMs <= 0)
          return {
            ok: false,
            reason: "30-minute break required before continuing to drive.",
          };
        if (cur === "off" || cur === "sleeper") {
          const restDur = Date.now() - computed.current.startedAt;
          if (restDur < 60_000)
            return {
              ok: false,
              reason:
                "You just switched off-duty. Confirm you intended to start driving (wait 1 minute or change to On Duty first).",
            };
        }
      }
      if (next === "onduty" && computed.remaining.windowMs <= 0) {
        return {
          ok: false,
          reason: `${ruleSet.windowH}-hour duty window has closed. Off-duty reset required.`,
        };
      }
      return { ok: true };
    },
    [computed, hosSummary, ruleSet],
  );

  const changeStatus = useCallback(
    async (
      status: DutyStatus,
      opts?: { note?: string; location?: string; signature?: string },
    ): Promise<TransitionResult> => {
      if (!driverId) {
        return { ok: false, reason: "Driver session is not ready yet." };
      }

      try {
        const res: ChangeStatusResponse = await changeDriverStatus(
          driverId,
          status,
          opts,
        );
        if (!res.ok || !res.success) {
          return {
            ok: false,
            reason: res.reason ?? "Status change blocked by the backend.",
          };
        }
        if (res.summary) {
          setHosSummary(res.summary);
        }
        if (res.entry) {
          const mappedEntry = mapApiDutyEntry(res.entry);
          if (res.current_status && mappedEntry.status !== res.current_status) {
            await syncFromBackend(driverId);
            return { ok: true };
          }
          setEntries((previousEntries) =>
            applyStatusChangeEntry(previousEntries, mappedEntry),
          );
        } else if (res.summary) {
          await syncFromBackend(driverId);
        }
        if (!res.summary && !res.entry) {
          await syncFromBackend(driverId);
        }
        return { ok: true };
      } catch (error) {
        console.error("Failed to sync status change with backend:", error);
        return {
          ok: false,
          reason:
            error instanceof Error ? error.message : "Failed to change status.",
        };
      }
    },
    [driverId, syncFromBackend],
  );

  const validateTransition = useCallback(
    async (status: DutyStatus): Promise<TransitionResult> => {
      if (!driverId) {
        return canTransition(status);
      }

      try {
        const result = await canTransitionDriverStatus(driverId, status);
        return {
          ok: result.ok,
          reason: result.reason ?? undefined,
        };
      } catch (error) {
        console.error("Failed to verify transition with backend:", error);
        return canTransition(status);
      }
    },
    [canTransition, driverId],
  );

  const addManualEntry = useCallback(
    async (entry: Omit<DutyEntry, "id"> & { signature?: string }) => {
      if (!driverId) {
        throw new Error("Driver session is not ready yet.");
      }

      await createDutyEntry(driverId, {
        status: entry.status,
        startedAt: entry.startedAt,
        endedAt: entry.endedAt,
        note: entry.note,
        location: entry.location,
        manual: true,
        signature: entry.signature,
      });
      await syncFromBackend(driverId);
    },
    [driverId, syncFromBackend],
  );

  const updateEntry = useCallback(
    async (id: string, patch: Partial<Omit<DutyEntry, "id">>) => {
      if (!driverId) {
        throw new Error("Driver session is not ready yet.");
      }

      await patchDutyEntry(id, patch);
      await syncFromBackend(driverId);
    },
    [driverId, syncFromBackend],
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      if (!driverId) {
        throw new Error("Driver session is not ready yet.");
      }

      await removeDutyEntry(id);
      await syncFromBackend(driverId);
    },
    [driverId, syncFromBackend],
  );
  useEffect(() => {
    const fire = (
      key: string,
      message: string,
      severity: "info" | "warn" | "danger",
    ) => {
      const last = firedRef.current[key] ?? 0;
      if (Date.now() - last < 5 * 60_000) return;
      firedRef.current[key] = Date.now();
      try {
        localStorage.setItem(FIRED_KEY, JSON.stringify(firedRef.current));
      } catch {
        void 0;
      }
      pushAudit({ kind: "alert", message, meta: { severity, key } });
      if (alerts.webhookUrl) {
        fetch(alerts.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key,
            message,
            severity,
            at: new Date().toISOString(),
            ruleSet: ruleSet.id,
            email: alerts.notifyEmail,
          }),
        }).catch(() => {
          void 0;
        });
      }
    };

    const m = (ms: number) => ms / 60_000;
    if (alerts.approachLimit) {
      if (
        m(computed.remaining.drivingMs) <= 60 &&
        computed.remaining.drivingMs > 0
      )
        fire(
          "driving-60",
          `Approaching ${ruleSet.drivingLimitH}h driving limit (${Math.round(m(computed.remaining.drivingMs))} min left).`,
          "warn",
        );
      if (computed.remaining.drivingMs === 0)
        fire(
          "driving-0",
          `${ruleSet.drivingLimitH}-hour driving limit reached.`,
          "danger",
        );
      if (
        m(computed.remaining.windowMs) <= 60 &&
        computed.remaining.windowMs > 0
      )
        fire(
          "window-60",
          `${ruleSet.windowH}h duty window closes in ${Math.round(m(computed.remaining.windowMs))} min.`,
          "warn",
        );
    }
    if (
      alerts.breakReminder &&
      m(computed.remaining.breakMs) <= 30 &&
      computed.remaining.breakMs > 0
    ) {
      fire(
        "break-30",
        `30-minute break required in ${Math.round(m(computed.remaining.breakMs))} min of driving.`,
        "info",
      );
    }
    if (
      alerts.weekly &&
      m(computed.remaining.weeklyMs) <= 120 &&
      computed.remaining.weeklyMs > 0
    ) {
      fire(
        "weekly-2h",
        `Weekly ${ruleSet.weeklyLimitH}h limit nearing — about ${Math.round(m(computed.remaining.weeklyMs) / 60)}h left.`,
        "warn",
      );
    }
    if (alerts.endOfBreak) {
      const cur = computed.current;
      if (
        (cur.status === "off" || cur.status === "sleeper") &&
        Date.now() - cur.startedAt >= 30 * 60_000
      ) {
        fire(
          `endbreak-${cur.id}`,
          "30-minute break complete — you're cleared to drive.",
          "info",
        );
      }
    }
  }, [computed, alerts, ruleSet, pushAudit]);

  if (bootstrapError) {
    return (
      <div className="min-h-screen bg-background px-4 py-10 text-foreground">
        <div className="mx-auto max-w-3xl rounded-2xl border border-destructive/30 bg-card p-6 shadow-card">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-destructive">
            API Connection Error
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold">
            RoadClock could not connect to Django
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            The frontend requires the backend API. Check the Django server,
            `VITE_API_BASE_URL`, and the `/api/` route mount.
          </p>
          <pre className="mt-5 overflow-auto rounded-xl bg-muted p-4 font-mono text-xs text-destructive whitespace-pre-wrap">
            {bootstrapError}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <Ctx.Provider
      value={{
        driver: {
          id: driverId,
          name: driverName,
          carrierName,
        },
        entries,
        audit,
        hosReady: Boolean(hosSummary),
        ruleSet,
        setRuleSetId,
        alerts,
        setAlerts,
        changeStatus,
        canTransition,
        validateTransition,
        addManualEntry,
        updateEntry,
        deleteEntry,
        ...computed,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useHOS() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useHOS must be used within HOSProvider");
  return c;
}

export const STATUS_META: Record<
  DutyStatus,
  { label: string; color: string; ring: string }
> = {
  off: {
    label: "Off Duty",
    color: "bg-muted text-muted-foreground",
    ring: "ring-muted-foreground/30",
  },
  sleeper: {
    label: "Sleeper Berth",
    color: "bg-info/15 text-info",
    ring: "ring-info/40",
  },
  driving: {
    label: "Driving",
    color: "bg-success/15 text-success",
    ring: "ring-success/40",
  },
  onduty: {
    label: "On Duty (ND)",
    color: "bg-accent/20 text-accent-foreground",
    ring: "ring-accent/40",
  },
};

export function fmtDuration(ms: number) {
  ms = Math.max(0, ms);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
export function fmtHM(ms: number) {
  ms = Math.max(0, ms);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function exportCSV(
  entries: DutyEntry[],
  driver: { name: string; carrier: string; signature: string },
) {
  const header = [
    "entry_id",
    "status",
    "start_iso",
    "end_iso",
    "duration_min",
    "location",
    "note",
    "manual",
    "signature",
    "driver",
    "carrier",
  ].join(",");
  const esc = (v: unknown) => {
    const s = (v ?? "").toString().replace(/"/g, '""');
    return /[,"\n]/.test(s) ? `"${s}"` : s;
  };
  const lines = entries.map((e) => {
    const end = e.endedAt ?? Date.now();
    return [
      e.id,
      e.status,
      new Date(e.startedAt).toISOString(),
      new Date(end).toISOString(),
      Math.round((end - e.startedAt) / 60_000),
      e.location ?? "",
      e.note ?? "",
      e.manual ? "yes" : "no",
      driver.signature,
      driver.name,
      driver.carrier,
    ]
      .map(esc)
      .join(",");
  });
  return [header, ...lines].join("\n");
}

export function downloadFile(
  filename: string,
  content: string,
  mime = "text/plain",
) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function buildPrintablePDFHTML(
  entries: DutyEntry[],
  driver: { name: string; carrier: string; signature: string },
  ruleSet: RuleSet,
) {
  const rows = entries
    .map((e) => {
      const end = e.endedAt ?? Date.now();
      const dur = Math.round((end - e.startedAt) / 60_000);
      return `<tr><td>${e.status}</td><td>${new Date(e.startedAt).toLocaleString()}</td><td>${new Date(end).toLocaleString()}</td><td style="text-align:right">${dur} min</td><td>${e.location ?? ""}</td><td>${e.note ?? ""}</td><td>${e.manual ? "✓" : ""}</td></tr>`;
    })
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>RoadClock RODS — ${driver.name}</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; color:#0b1220; padding:32px; }
  h1 { margin:0 0 4px; font-size:22px; }
  .meta { color:#475569; font-size:12px; margin-bottom:16px; }
  table { width:100%; border-collapse:collapse; font-size:11px; }
  th, td { border-bottom:1px solid #e2e8f0; padding:6px 8px; text-align:left; }
  th { background:#f1f5f9; text-transform:uppercase; font-size:10px; letter-spacing:.06em; }
  .sig { margin-top:32px; padding:16px; border:1px dashed #94a3b8; border-radius:8px; }
  .sig-line { font-family: "Courier New", monospace; font-size:14px; margin-top:6px; }
  .badge { display:inline-block; padding:2px 8px; border-radius:999px; background:#0b1220; color:#fff; font-size:10px; }
</style></head><body>
<h1>Electronic Record of Duty Status (RODS)</h1>
<div class="meta">
  <strong>${driver.name}</strong> · ${driver.carrier} · Rule set: <span class="badge">${ruleSet.label}</span><br/>
  Generated ${new Date().toLocaleString()}
</div>
<table><thead><tr><th>Status</th><th>Start</th><th>End</th><th style="text-align:right">Duration</th><th>Location</th><th>Note</th><th>Manual</th></tr></thead><tbody>${rows}</tbody></table>
<div class="sig">
  <div style="font-size:11px;color:#475569;text-transform:uppercase;letter-spacing:.08em">Digital identity signature</div>
  <div class="sig-line">${driver.signature || "— UNSIGNED —"}</div>
  <div style="font-size:11px;color:#475569;margin-top:8px">I certify these records are true and correct (49 CFR § 395.8).</div>
</div>
<script>window.onload = () => setTimeout(() => window.print(), 250);</script>
</body></html>`;
}
