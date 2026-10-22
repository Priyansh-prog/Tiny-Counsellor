import type { PlanErrorResponse, PlanRequest, PlanResponse } from "../../shared/types.js";

export type DbHealth = { ready: boolean; migrationVersion: number };
export type HealthResponse = { ok: boolean; db: DbHealth };
export type ClientError = { status: number; errors: string[] };
export type ApiHealthState = { api: "checking" | "ok" | "down"; db?: DbHealth };

export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch("/api/health");
  if (!res.ok) throw new Error(`API responded with status ${res.status}`);
  return res.json();
}

export async function postPlan(req: PlanRequest): Promise<PlanResponse> {
  const res = await fetch("/api/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  const payload = (await res.json().catch(() => null)) as PlanResponse | PlanErrorResponse | null;
  if (!res.ok || !payload || payload.ok !== true) {
    const err: ClientError = {
      status: res.status,
      errors:
        payload && payload.ok === false
          ? payload.errors
          : [
              `Planning failed with HTTP status ${res.status}. The backend may have been restarting or is offline — press "Generate plan" again in a few seconds.`,
            ],
    };
    throw err;
  }
  return payload;
}
