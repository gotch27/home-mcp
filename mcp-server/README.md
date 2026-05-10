# mcp-server

Generated with the NextSignal basic Next.js scaffold.

## Start

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

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
- `config/default.json` and `.env.*.example` show configuration conventions.
