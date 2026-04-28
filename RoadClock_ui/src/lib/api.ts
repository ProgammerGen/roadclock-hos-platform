import type { AlertConfig, DutyStatus, RuleSetId } from "@/contexts/HOSContext";

const DEFAULT_DEV_API_BASE = "http://127.0.0.1:8000/api";
const RAW_API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? DEFAULT_DEV_API_BASE : "");
const API_BASE_ROOT = RAW_API_BASE.replace(/\/$/, "");
const API_BASE = API_BASE_ROOT
  ? API_BASE_ROOT.endsWith("/api")
    ? API_BASE_ROOT
    : `${API_BASE_ROOT}/api`
  : "";

type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

type DriverPayload = {
  id: number;
  name: string;
  carrier_name?: string;
  rule_set_id: RuleSetId;
};

type DutyEntryPayload = {
  id: number;
  status: DutyStatus;
  started_at: string;
  ended_at: string | null;
  location: string;
  note: string;
  manual: boolean;
  signature: string;
};

type AuditEventPayload = {
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
};

type AlertPreferencePayload = {
  id: number;
  driver: number;
  webhook_url: string | null;
  notify_email: string | null;
  approach_limit: boolean;
  break_reminder: boolean;
  weekly: boolean;
  end_of_break: boolean;
  adverse_conditions: boolean;
};

export type ExportRecordPayload = {
  id: number;
  driver: number;
  export_type: "csv" | "pdf";
  status: "pending" | "completed" | "failed";
  from_date: string;
  to_date: string;
  include_manual: boolean;
  certified: boolean;
  signature: string;
  file_name: string;
  metadata: Record<string, unknown>;
  created_at: string;
  completed_at: string | null;
};

type HOSSummaryPayload = {
  driver_id: number;
  rule_set: {
    id: RuleSetId;
    label: string;
    driver_type: "property" | "passenger";
    driving_limit_h: number;
    window_h: number;
    break_after_driving_h: number;
    weekly_limit_h: number;
    weekly_days: 7 | 8;
    reset_h: number;
  };
  current: {
    id: number | null;
    status: DutyStatus;
    started_at: string;
    location: string;
  };
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
};

type ChangeStatusResponsePayload = {
  ok: boolean;
  success: boolean;
  current_status: DutyStatus | null;
  entry: DutyEntryPayload | null;
  summary: HOSSummaryPayload | null;
  reason: string | null;
};

type CanTransitionResponsePayload = {
  ok: boolean;
  reason: string | null;
};

function buildUrl(path: string) {
  return `${API_BASE}${path}`;
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE) {
    throw new Error(
      "VITE_API_BASE_URL is required in production and must point to the Django /api base.",
    );
  }

  const response = await fetch(buildUrl(path), {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    let message = `API ${response.status} ${response.statusText}`;
    try {
      const data = (await response.json()) as {
        detail?: string;
        error?: string;
        reason?: string;
        non_field_errors?: string[];
      };
      const detail =
        data.detail ?? data.reason ?? data.error ?? data.non_field_errors?.[0];
      if (detail) {
        message = `${message}: ${detail}`;
      }
    } catch {
      const text = await response.text();
      if (text) {
        message = `${message}: ${text}`;
      }
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

function toPaginatedResults<T>(data: PaginatedResponse<T> | T[]): T[] {
  return Array.isArray(data) ? data : data.results;
}

export async function ensureDefaultDriver() {
  const listed = await apiRequest<
    PaginatedResponse<DriverPayload> | DriverPayload[]
  >("/drivers/");
  const existing = toPaginatedResults(listed);
  if (existing.length > 0) return existing[0];

  return await apiRequest<DriverPayload>("/drivers/", {
    method: "POST",
    body: JSON.stringify({
      name: "M. Rodriguez",
      carrier_name: "Sunbelt Freight",
      rule_set_id: "property_70_8",
      is_interstate: true,
      cdl_required: true,
      hours_worked: 0,
    }),
  });
}

export async function fetchDutyEntries(driverId: number) {
  const data = await apiRequest<
    PaginatedResponse<DutyEntryPayload> | DutyEntryPayload[]
  >(`/duty-log-entries/?driver_id=${driverId}`);
  return toPaginatedResults(data);
}

export async function fetchAuditEvents(driverId: number) {
  const data = await apiRequest<
    PaginatedResponse<AuditEventPayload> | AuditEventPayload[]
  >(`/audit-events/?driver_id=${driverId}`);
  return toPaginatedResults(data);
}

export async function fetchAlertPreference(driverId: number) {
  const data = await apiRequest<
    PaginatedResponse<AlertPreferencePayload> | AlertPreferencePayload[]
  >(`/alert-preferences/?driver_id=${driverId}`);
  const rows = toPaginatedResults(data);
  return rows[0] ?? null;
}

export async function upsertAlertPreference(
  driverId: number,
  alerts: AlertConfig,
  preferenceId?: number,
) {
  const payload = {
    driver: driverId,
    webhook_url: alerts.webhookUrl || null,
    notify_email: alerts.notifyEmail || null,
    approach_limit: alerts.approachLimit,
    break_reminder: alerts.breakReminder,
    weekly: alerts.weekly,
    end_of_break: alerts.endOfBreak,
  };

  if (preferenceId) {
    return await apiRequest<AlertPreferencePayload>(
      `/alert-preferences/${preferenceId}/`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
  }

  return await apiRequest<AlertPreferencePayload>("/alert-preferences/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function setDriverRuleSet(driverId: number, ruleSetId: RuleSetId) {
  return await apiRequest<{ ok: boolean; rule_set_id: RuleSetId }>(
    `/drivers/${driverId}/set_rule_set/`,
    {
      method: "POST",
      body: JSON.stringify({ rule_set_id: ruleSetId }),
    },
  );
}

export async function changeDriverStatus(
  driverId: number,
  status: DutyStatus,
  opts?: { note?: string; location?: string; signature?: string },
) {
  if (!API_BASE) {
    throw new Error(
      "VITE_API_BASE_URL is required in production and must point to the Django /api base.",
    );
  }

  const response = await fetch(buildUrl("/hos/change-status/"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      driver_id: driverId,
      status,
      note: opts?.note ?? "",
      location: opts?.location ?? "",
      signature: opts?.signature ?? "",
    }),
  });

  const data = (await response
    .json()
    .catch(() => null)) as ChangeStatusResponsePayload | null;

  if (
    data &&
    typeof data.ok === "boolean" &&
    typeof data.success === "boolean"
  ) {
    return data;
  }

  if (!response.ok) {
    throw new Error(`API ${response.status} ${response.statusText}`);
  }

  throw new Error("Unexpected change-status response from the backend.");
}

export async function canTransitionDriverStatus(
  driverId: number,
  status: DutyStatus,
) {
  return await apiRequest<CanTransitionResponsePayload>(
    "/hos/can-transition/",
    {
      method: "POST",
      body: JSON.stringify({
        driver_id: driverId,
        status,
      }),
    },
  );
}

export async function createDutyEntry(
  driverId: number,
  payload: {
    status: DutyStatus;
    startedAt: number;
    endedAt?: number;
    note?: string;
    location?: string;
    manual?: boolean;
    signature?: string;
  },
) {
  return await apiRequest<DutyEntryPayload>("/duty-log-entries/", {
    method: "POST",
    body: JSON.stringify({
      driver: driverId,
      status: payload.status,
      started_at: new Date(payload.startedAt).toISOString(),
      ended_at: payload.endedAt
        ? new Date(payload.endedAt).toISOString()
        : null,
      note: payload.note ?? "",
      location: payload.location ?? "",
      manual: payload.manual ?? false,
      signature: payload.signature ?? "",
      source: payload.manual ? "manual" : "eld",
    }),
  });
}

export async function patchDutyEntry(
  entryId: string,
  patch: Partial<{
    status: DutyStatus;
    startedAt: number;
    endedAt: number;
    note: string;
    location: string;
    manual: boolean;
    signature: string;
  }>,
) {
  const payload: Record<string, unknown> = {};
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.startedAt !== undefined)
    payload.started_at = new Date(patch.startedAt).toISOString();
  if (patch.endedAt !== undefined)
    payload.ended_at = new Date(patch.endedAt).toISOString();
  if (patch.note !== undefined) payload.note = patch.note;
  if (patch.location !== undefined) payload.location = patch.location;
  if (patch.manual !== undefined) payload.manual = patch.manual;
  if (patch.signature !== undefined) payload.signature = patch.signature;

  return await apiRequest<DutyEntryPayload>(`/duty-log-entries/${entryId}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function removeDutyEntry(entryId: string) {
  await apiRequest<null>(`/duty-log-entries/${entryId}/`, {
    method: "DELETE",
  });
}

export async function fetchHOSSummary(driverId: number) {
  return await apiRequest<HOSSummaryPayload>(
    `/drivers/${driverId}/hos-summary/`,
  );
}

export async function fetchExportRecords(driverId: number) {
  const data = await apiRequest<
    PaginatedResponse<ExportRecordPayload> | ExportRecordPayload[]
  >(`/export-records/?driver_id=${driverId}`);
  return toPaginatedResults(data);
}

export async function createExportRecord(payload: {
  driverId: number;
  exportType: "csv" | "pdf";
  fromDate: string;
  toDate: string;
  fileName: string;
  includeManual?: boolean;
  certified?: boolean;
  signature?: string;
  status?: "pending" | "completed" | "failed";
  metadata?: Record<string, unknown>;
}) {
  return await apiRequest<ExportRecordPayload>("/export-records/", {
    method: "POST",
    body: JSON.stringify({
      driver: payload.driverId,
      export_type: payload.exportType,
      status: payload.status ?? "completed",
      from_date: payload.fromDate,
      to_date: payload.toDate,
      include_manual: payload.includeManual ?? true,
      certified: payload.certified ?? true,
      signature: payload.signature ?? "",
      file_name: payload.fileName,
      metadata: payload.metadata ?? {},
    }),
  });
}
