"use strict";
async function forwardMultiAgent(objective) {
  const base = process.env.SWARM_COORDINATOR_URL;
  if (!base) return null;
  const res = await fetch(`${base.replace(/\/$/, "")}/api/multi-agent-debug`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ objective }),
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`swarm ${res.status}`);
  return res.json();
}
module.exports = { forwardMultiAgent };
