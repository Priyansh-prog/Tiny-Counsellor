import { Router } from "express";
import { db } from "../db.js";
import { loadPlannerData } from "../lib/data.js";
import { buildPlan } from "../lib/planner.js";
import { parsePlanRequest } from "../lib/validate.js";
import type { PlanErrorResponse } from "../../../shared/types.js";

export const planRouter = Router();

planRouter.post("/plan", (req, res) => {
  const parsed = parsePlanRequest(req.body);
  if (!parsed.ok) {
    const body: PlanErrorResponse = { ok: false, errors: parsed.errors };
    res.status(400).json(body);
    return;
  }
  try {
    const data = loadPlannerData(db);
    const plan = buildPlan(parsed.request, data, { nowYear: new Date().getFullYear() });
    res.json(plan);
  } catch (err) {
    console.error("POST /api/plan failed:", err);
    res.status(500).json({ ok: false, errors: ["Internal planner error."] } satisfies PlanErrorResponse);
  }
});
