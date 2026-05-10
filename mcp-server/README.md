# mcp-server

Generated with the NextSignal basic Next.js scaffold.

## Start

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`.

## Environments

Configuration starts with `config/default.json`, then overlays env vars with the `NEXTSIGNAL_` prefix from `nextsignal/config.ts`.

For local development, copy `.env.example` to `.env.local`. Next.js loads `.env.local` automatically.

For production on Vercel, set the same `NEXTSIGNAL_` variables in Vercel Project Settings for the Production environment, including `NEXTSIGNAL_APP__ENVIRONMENT=production`. The deploy runs `pnpm build`, so it uses Vercel's production environment variables rather than a local env file.

Use double underscores for nested config paths, for example `NEXTSIGNAL_DATABASE__URL` maps to `database.url`.

## Worker

This starter does not configure a recurring scheduler yet, but the worker entry is present so you know where production background runtime code belongs.

```bash
pnpm worker
```

## Shape

- `nextsignal/app.ts` is the composition root.
- `nextsignal/processes` contains API and business processes.
- `nextsignal/adapters` contains auth, logger, scheduler, and validation wiring.
- `nextsignal/services` is the app-owned service/data-access boundary.
- `config/default.json` and `.env.example` show configuration conventions.
