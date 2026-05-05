import type { LoggerAdapter } from "@gotch/nextsignal";
import type { LogEntry } from "@gotch/nextsignal";
import { nextsignalLogs } from "@/nextsignal/db/schema";
import { getDb } from "@/nextsignal/services/database";

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
    const db = await getDb();
    await db.insert(nextsignalLogs).values({
      id: crypto.randomUUID(),
      level,
      message: entry.message,
      process: entry.process ?? null,
      correlationId: entry.correlationId ?? null,
      data: entry.data ?? null,
      error: serializeError(entry.error) ?? null
    });
  } catch {
    // Logging must not break application work.
  }
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
