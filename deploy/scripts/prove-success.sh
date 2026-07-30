#!/usr/bin/env bash
set -euo pipefail
PORT="${PORT:-4000}"
BASE="http://127.0.0.1:${PORT}"
PASS=0; FAIL=0
pass() { echo "  PASS: $1"; PASS=$((PASS+1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL+1)); }
echo "=========================================="
echo " TRINITY CORE — PROVE SYSTEM SUCCESS"
echo "=========================================="
node -v >/dev/null 2>&1 && pass "Node $(node -v)" || fail "Node"
[[ -d node_modules/ws ]] && pass "dependencies present" || fail "dependencies"
if curl -sf --max-time 3 "$BASE/health" >/dev/null; then pass "server health"; else fail "server health"; fi
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "$BASE/" || echo 000)
[[ "$code" == "200" ]] && pass "UI HTTP 200" || fail "UI HTTP $code"
MA=$(curl -sf --max-time 60 -X POST "$BASE/api/multi-agent-debug" -H "Content-Type: application/json" -d '{"objective":"prove-success"}' || true)
echo "$MA" | grep -q '"success":true\|"status":"completed"' && pass "multi-agent completed (4-role loop)" || fail "multi-agent"
[[ -d /tmp/trinity-ledger || -d data/ledger ]] && pass "ledger directory exists" || fail "ledger"
curl -sf --max-time 3 "$BASE/metrics" | grep -q trinity_ && pass "prometheus metrics" || fail "prometheus metrics"
H=$(curl -sf --max-time 3 "$BASE/health" || true)
echo "$H" | grep -q grokEnabled && echo "  INFO: grokEnabled present (live Grok needs host network to api.x.ai)" || true
echo "=========================================="
echo " RESULT: $PASS passed, $FAIL failed"
if [[ "$FAIL" -eq 0 ]]; then echo " SYSTEM SUCCESS (criteria 1-5)"; exit 0; else echo " SYSTEM NOT READY"; exit 1; fi
