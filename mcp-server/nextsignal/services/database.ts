import postgres from "postgres";
import { config } from "@/nextsignal/config";

let sqlClient: postgres.Sql | undefined;
let schemaReady: Promise<void> | undefined;

export async function getSql() {
  await config.load();

  if (!sqlClient) {
    const url = readString("database.url") ?? process.env.DATABASE_URL;
    if (!url) {
      throw new Error("Missing database URL. Set config `database.url`, NEXTSIGNAL_DATABASE__URL, or DATABASE_URL.");
    }

    sqlClient = postgres(url, {
      max: Number(config.get("database.maxconnections", 3)),
      ssl: readBoolean("database.ssl", true) ? "require" : false,
      onnotice: ignoreExpectedSchemaNotice
    });
  }

  schemaReady ??= ensureHomeSchema(sqlClient);
  await schemaReady;

  return sqlClient;
}

async function ensureHomeSchema(sql: postgres.Sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS home_shopping_items (
      id text PRIMARY KEY,
      name text NOT NULL,
      quantity text NOT NULL,
      store text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS home_shopping_items_created_at_idx
    ON home_shopping_items (created_at)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS home_todos (
      id text PRIMARY KEY,
      title text NOT NULL,
      assignee text NOT NULL,
      completed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS home_todos_open_assignee_idx
    ON home_todos (assignee, completed_at, created_at)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS nextsignal_logs (
      id text PRIMARY KEY,
      level text NOT NULL,
      message text NOT NULL,
      process text,
      correlation_id text,
      data jsonb,
      error jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS nextsignal_logs_created_at_idx
    ON nextsignal_logs (created_at DESC)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS nextsignal_logs_correlation_id_idx
    ON nextsignal_logs (correlation_id)
  `;
}

function ignoreExpectedSchemaNotice(notice: postgres.Notice) {
  if (notice.code === "42P07") return;
  console.info(notice);
}

function readString(path: string) {
  const value = config.get<string | undefined>(path);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readBoolean(path: string, fallback: boolean) {
  const value = config.get<boolean | string | undefined>(path);
  if (value === undefined) return fallback;
  if (typeof value === "boolean") return value;
  return value.toLowerCase() === "true";
}
