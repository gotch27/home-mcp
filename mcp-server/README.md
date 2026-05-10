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

### WorkOS AuthKit

The web home page uses WorkOS AuthKit browser sessions. The MCP endpoint uses WorkOS-issued bearer tokens through MCP OAuth resource metadata.

Required local envs:

```bash
NEXTSIGNAL_MCP__RESOURCEURL=http://localhost:3000/api/mcp
NEXTSIGNAL_WORKOS__AUTHKITDOMAIN=https://your-subdomain.authkit.app

NEXTSIGNAL_WORKOS__CLIENTID=client_your_client_id
NEXTSIGNAL_WORKOS__APIKEY=sk_test_your_api_key
NEXTSIGNAL_WORKOS__COOKIEPASSWORD=generate_at_least_32_characters
NEXTSIGNAL_WORKOS__REDIRECTURI=http://localhost:3000/callback
```

For production, use your public HTTPS origin for both `NEXTSIGNAL_MCP__RESOURCEURL` and `NEXTSIGNAL_WORKOS__REDIRECTURI`.

When developing through a tunnel such as ngrok, set `NEXTSIGNAL_WORKOS__REDIRECTURI`
to the tunnel callback URL, for example `https://your-ngrok-domain.ngrok-free.dev/callback`.
The app uses this value as the canonical public origin for AuthKit redirects and sign-out.

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
