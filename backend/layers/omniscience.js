"use strict";
const fs = require("node:fs");
const path = require("node:path");
const LEDGER = "/tmp/trinity-ledger";
function loadJsonl(file, limit = 80) {
  try {
    if (!fs.existsSync(file)) return [];
    const lines = fs.readFileSync(file, "utf8").trim().split("\n").filter(Boolean);
    return lines.slice(-limit).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}
function loadRecentEvents(limit = 50) { return loadJsonl(path.join(LEDGER, "events.jsonl"), limit); }
function scoreHealth(state, events) {
  const completed = events.filter((e) => e.type === "execution.completed").length;
  const failed = events.filter((e) => e.type === "execution.failed").length;
  const recent = completed + failed;
  const successRate = recent === 0 ? 1 : completed / recent;
  return {
    successRate: Math.round(successRate * 1000) / 1000,
    recentExecutions: recent, completed, failed,
    agentCount: state?.agents?.length || 0,
    bypassActive: Boolean(state?.bypassActive),
    grokEnabled: Boolean(process.env.XAI_API_KEY),
    grade: recent === 0 ? "stable" : successRate >= 0.9 ? "stable" : successRate >= 0.6 ? "degraded" : "critical",
  };
}
function predict(state = {}) {
  const events = loadRecentEvents(50);
  const health = scoreHealth(state, events);
  const forecasts = [];
  if (health.grade === "critical") forecasts.push({ horizon: "near", risk: "high", message: "Failure rate elevated — gate dispatch" });
  else if (!health.grokEnabled) forecasts.push({ horizon: "near", risk: "medium", message: "No XAI_API_KEY — simulation path" });
  else forecasts.push({ horizon: "near", risk: "low", message: "Control plane healthy; live Grok when egress allows" });
  if (health.bypassActive) forecasts.push({ horizon: "mid", risk: "medium", message: "bypass_s1 active — re-attest before prod" });
  return { layer: "OMNISCIENCE_V1", version: "1.1.0", ts: new Date().toISOString(), health, forecasts,
    recommendations: forecasts.filter((f) => f.risk !== "info" && f.risk !== "low").map((f) => f.message) };
}
module.exports = { predict, scoreHealth, loadRecentEvents };
