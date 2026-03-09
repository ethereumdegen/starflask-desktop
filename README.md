# Starflask Desktop

Orchestrate your Starflask AI agents from a local dashboard. Org charts, goals, issues, budgets — powered by [Starflask](https://starflask.com) and [Axoniac](https://axoniac.com).

Based on [Paperclip](https://github.com/paperclipai/paperclip) (MIT).

## What is this?

Starflask Desktop is a local Node.js + React app that gives you a Paperclip-style company orchestration layer on top of your existing Starflask agents. Your agents already run via Starflask's backend and session workers — this adds:

- **Org charts** — arrange agents into teams with reporting lines
- **Goals & projects** — cascading objectives that flow down to tasks
- **Issue board** — ticket-based task management with atomic checkout
- **Budget tracking** — map to Starflask credits
- **Audit log** — full run history pulled from Starflask sessions
- **Governance** — approval gates, pause/resume agents

## How it works

1. Enter your **Starflask API key** on first launch
2. Your agents are synced from the Starflask backend
3. Arrange them into an org chart, set goals, create issues
4. When an issue is assigned, it fires a `paperclip_heartbeat` hook on the Starflask agent
5. Starflask's existing session worker picks it up and runs the agent
6. Desktop polls for results and updates issue status

Heartbeats, sessions, integrations, and credits all live in Starflask. The local PGlite DB only stores the orchestration layer (org chart, goals, issues, budget configs).

## Prerequisites

- **Node.js 20+**
- **npm** (bundled with Node.js)
- A **Starflask account** with at least one agent and an API key

## Quickstart

```bash
# 1. Clone the repo
git clone https://github.com/starflask/starflask-desktop.git
cd starflask-desktop

# 2. Install dependencies
npm install

# 3. Start the dev server
npm dev
```

Open **http://localhost:3100** in your browser. On first launch, enter your Starflask API key to connect.

That's it. No database setup needed — an embedded PGlite database is created automatically.

## Running

| Command | Description |
|---------|-------------|
| `npm dev` | Start dev server with hot reload (API + UI on port 3100) |
| `npm dev:once` | Start dev server without file watching |
| `npm dev:server` | Server only (no UI) |
| `npm build` | Build all packages for production |
| `npm typecheck` | Run TypeScript type checking |
| `npm test:run` | Run tests |
| `npm db:generate` | Generate DB migration after schema changes |
| `npm db:migrate` | Apply pending DB migrations |

### Health check

```bash
curl http://localhost:3100/api/health
# → {"status":"ok"}
```

### Reset local database

If you need to start fresh:

```bash
rm -rf ~/.paperclip/instances/default/db
npm dev
```

## Configuration

### Environment variables

Most config is automatic. Override with env vars if needed:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3100` | Server port |
| `HOST` | `127.0.0.1` | Bind address |
| `DATABASE_URL` | _(embedded PGlite)_ | External PostgreSQL URL (optional) |
| `HEARTBEAT_SCHEDULER_ENABLED` | `true` | Enable/disable local heartbeat scheduler |

### Data locations

All local data lives under `~/.paperclip/instances/default/`:

| Path | Contents |
|------|----------|
| `db/` | Embedded PostgreSQL data |
| `data/storage/` | Uploaded files and attachments |
| `data/backups/` | Automatic DB backups (hourly, 30-day retention) |
| `secrets/master.key` | Local encryption key for secrets |

Override the base path with `PAPERCLIP_HOME` and `PAPERCLIP_INSTANCE_ID`.

## Architecture

```
starflask-desktop/
├── packages/
│   ├── db/              # Drizzle ORM schema + PGlite (org charts, issues, goals)
│   ├── shared/          # Shared types, validators, API path constants
│   ├── adapter-utils/   # Adapter type definitions
│   └── adapters/        # Built-in adapters (claude-local, codex, cursor, etc.)
├── server/              # Express REST API + orchestration
│   └── src/
│       ├── adapters/
│       │   └── starflask/   # ← Starflask adapter (fires hooks, polls sessions)
│       ├── routes/          # API endpoints
│       └── services/        # Business logic (heartbeat, issues, agents, etc.)
├── ui/                  # React + Vite + Tailwind dashboard
│   └── src/
│       ├── pages/       # Dashboard, Agents, Issues, OrgChart, Goals, etc.
│       └── components/  # Shared UI components
├── cli/                 # CLI tool (paperclipai)
└── docs/                # API docs and guides
```

### Starflask adapter

The `starflask` adapter (`server/src/adapters/starflask/`) is how Starflask Desktop triggers work on your agents:

1. **Heartbeat fires** → adapter calls `POST /api/agents/{id}/fire_hook` on your Starflask backend
2. **Session created** → Starflask's session worker picks up the job and runs the agentic loop
3. **Adapter polls** → `GET /api/sessions/{id}` until status is `completed` or `failed`
4. **Result mapped** → session summary, tokens, and structured data flow back into the issue

Adapter config fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `starflaskApiUrl` | string | Yes | Starflask backend URL (e.g. `https://api.starflask.com`) |
| `starflaskApiKey` | string | Yes | Your Starflask user API key |
| `starflaskAgentId` | string | Yes | Agent UUID to invoke |
| `personaName` | string | No | Axoniac persona to use for heartbeats |
| `pollIntervalMs` | number | No | How often to poll for results (default: 3000ms) |
| `timeoutMs` | number | No | Max time to wait for completion (default: 300000ms / 5 min) |

### Other adapters

The Paperclip adapters are still available if you want to run local agents alongside Starflask agents:

- `claude_local` — Claude Code CLI
- `codex_local` — OpenAI Codex CLI
- `cursor` — Cursor editor agent
- `opencode_local` — OpenCode CLI
- `openclaw_gateway` — OpenClaw cloud agent
- `process` — arbitrary shell command
- `http` — generic webhook

## API

Base URL: `http://localhost:3100/api`

Key endpoints:

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/companies` | List companies |
| `GET /api/companies/{id}/agents` | List agents in a company |
| `GET /api/companies/{id}/issues` | List issues/tasks |
| `POST /api/agents/{id}/heartbeat/invoke` | Manually trigger a heartbeat |
| `GET /api/companies/{id}/org` | Get org chart |
| `GET /api/companies/{id}/goals` | List goals |

See `docs/api/` for the full API reference.

## Development

### After making schema changes

```bash
# 1. Edit packages/db/src/schema/*.ts
# 2. Generate migration
npm db:generate
# 3. Type check
npm typecheck
```

### Full verification

```bash
npm typecheck && npm test:run && npm build
```

### Docker

```bash
docker build -t starflask-desktop .
docker run --name starflask-desktop \
  -p 3100:3100 \
  -e HOST=0.0.0.0 \
  -v "$(pwd)/data:/paperclip" \
  starflask-desktop
```

Or with Compose:

```bash
docker compose -f docker-compose.quickstart.yml up --build
```

## License

MIT — based on [Paperclip](https://github.com/paperclipai/paperclip) by Paperclip AI.
