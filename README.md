# TRINITY CORE v12

Multi-agent control plane with CycleKernel orchestrator, Reality Forge sovereign containers (AES-256-GCM), Omniscience layer, Prometheus/Grafana, and Helm GitOps chart.

## Quick start

```bash
npm install
cp .env.example .env
# optional: XAI_API_KEY, CONTAINER_KEY_BASE64=$(openssl rand -base64 32)
node backend/server.js
```

Open http://localhost:4000/

## Prove success (criteria 1–5)

```bash
./deploy/scripts/prove-success.sh
```

Live Grok (criterion 6) requires outbound HTTPS to `api.x.ai`.

## APIs

| Method | Path |
|--------|------|
| GET | `/health` `/metrics` `/api/omniscience` `/api/reality-forge` |
| POST | `/api/multi-agent-debug` `/api/forge/build` `/api/reality-forge` |
| WS | dispatch, bypass_s1, god_mode, omniscience_v1, reality_forge |

## Stacks

```bash
docker compose up -d --build          # Trinity + Prometheus + Grafana
docker compose -f docker-compose.yml -f docker-compose.control12.yml up -d
helm upgrade --install trinity ./helm/trinity-core
```

## Security

Never commit `.env`. Rotate keys pasted in chat. See SECURITY.md.

## License

MIT
