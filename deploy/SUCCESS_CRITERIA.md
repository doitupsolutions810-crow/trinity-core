# Success criteria

Required system success = criteria 1-5. Everything else is optional or degraded.

## Required (must pass locally)

1. GET /health status ok
2. GET / HTTP 200
3. POST /api/multi-agent-debug completed with 4 agents
4. Ledger directory exists
5. GET /metrics exposes trinity_* series

## Optional (do not fail the system)

6. Live Grok when the host can reach api.x.ai
7. GitHub-hosted Actions (`ubuntu-latest` / `ubuntu-24.04` / `ubuntu-slim`)
8. GitHub App installation token (lab mode uses PAT/local; production still fail-closed)

## Degraded mode (explicitly allowed)

Hosted jobs that finish in ~3s with `runner_id: 0` and empty `runner_name` are an **Actions assignment miss**, not a Trinity failure.

Acceptable substitutes:

- `./deploy/scripts/prove-success.sh` on the host
- swarm coordinator `GET /health` + a four-role job on swarm-vm-runner
- self-hosted runner labeled `self-hosted,linux,control12` when a VM is online

Run: `./deploy/scripts/prove-success.sh`
