import type { LoggerAdapter } from "@gotch/nextsignal";
import type { LogEntry } from "@gotch/nextsignal";
import { getSql } from "@/nextsignal/services/database";

export const loggerAdapter: LoggerAdapter = {
  async debug(entry) {
    await writeLog("debug", entry);
  },
  async info(entry) {
    await writeLog("info", entry);
  },
  async warn(entry) {
    await writeLog("warn", entry);
  },
  async error(entry) {
    await writeLog("error", entry);
  }
};

type LogLevel = "debug" | "info" | "warn" | "error";

async function writeLog(level: LogLevel, entry: LogEntry) {
  try {
    const sql = await getSql();
    await sql`
      INSERT INTO nextsignal_logs (id, level, message, process, correlation_id, data, error)
      VALUES (
        ${crypto.randomUUID()},
        ${level},
        ${entry.message},
        ${entry.process ?? null},
        ${entry.correlationId ?? null},
        ${toJson(entry.data)},
        ${toJson(serializeError(entry.error))}
      )
    `;
  } catch {
    // Logging must not break application work.
  }
}

function toJson(value: unknown) {
  return value === undefined ? null : JSON.stringify(value);
}

function serializeError(error: unknown): unknown {
  if (!error) return undefined;
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  return error;
}
