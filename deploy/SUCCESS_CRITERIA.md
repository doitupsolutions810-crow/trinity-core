# Success criteria

System success = criteria 1-5. Live Grok is criterion 6 only.

1. GET /health status ok
2. GET / HTTP 200
3. POST /api/multi-agent-debug completed with 4 agents
4. Ledger directory exists
5. GET /metrics exposes trinity_* series
6. Optional live Grok when network reaches api.x.ai

Run: ./deploy/scripts/prove-success.sh
