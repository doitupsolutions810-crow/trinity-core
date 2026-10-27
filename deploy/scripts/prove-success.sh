#!/usr/bin/env bash
set -euo pipefail
PORT="${PORT:-4000}"
BASE="http://127.0.0.1:${PORT}"
PASS=0; FAIL=0; DEGRADED=0
pass() { echo "  PASS: $1"; PASS=$((PASS+1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL+1)); }
degraded() { echo "  DEGRADED: $1"; DEGRADED=$((DEGRADED+1)); }
echo "=========================================="
echo " TRINITY CORE — PROVE SYSTEM SUCCESS"
echo "=========================================="
node -v >/dev/null 2>&1 && pass "Node $(node -v)" || fail "Node"
[[ -d node_modules/ws ]] && pass "dependencies present" || fail "dependencies"
if curl -sf --max-time 3 "$BASE/health" >/dev/null; then pass "server health"; else fail "server health"; fi
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "$BASE/" || echo 000)
[[ "$code" == "200" ]] && pass "UI HTTP 200" || fail "UI HTTP $code"

# A successful HTTP response or a local role simulation is not proof of swarm execution.
MA=$(curl -sS --max-time 60 -X POST "$BASE/api/multi-agent-debug" -H "Content-Type: application/json" -d '{"objective":"prove-success"}' || true)
if printf '%s' "$MA" | node -e '
let s = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => s += chunk);
process.stdin.on("end", () => {
  try {
    const r = JSON.parse(s);
    process.exit(r.success === true && r.path === "swarm" &&
      typeof r.jobId === "string" && r.jobId.length > 0 ? 0 : 1);
  } catch { process.exit(1); }
});
'; then
  pass "real swarm execution returned success and jobId"
else
  fail "real swarm execution evidence missing (requires success=true, path=swarm, non-empty jobId)"
  printf '%s\n' "$MA"
fi

[[ -d /tmp/trinity-ledger || -d data/ledger ]] && pass "ledger directory exists" || fail "ledger"
curl -sf --max-time 3 "$BASE/metrics" | grep -q trinity_ && pass "prometheus metrics" || fail "prometheus metrics"
H=$(curl -sf --max-time 3 "$BASE/health" || true)
echo "$H" | grep -q grokEnabled && echo "  INFO: grokEnabled present (live Grok needs host network to api.x.ai)" || true
# Hosted Actions availability is operational metadata, not proof of product execution.
degraded "GitHub-hosted runner availability is tracked separately from execution evidence"
echo "=========================================="
echo " RESULT: $PASS passed, $FAIL failed, $DEGRADED degraded"
if [[ "$FAIL" -eq 0 ]]; then echo " SYSTEM SUCCESS (local checks passed; swarm evidence explicitly verified)"; exit 0; else echo " SYSTEM NOT READY"; exit 1; fi
