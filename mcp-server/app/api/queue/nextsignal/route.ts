import { Receiver } from "@upstash/qstash";
import type { QueueMessage } from "@gotch/nextsignal";
import { app } from "@/nextsignal/app";
import { config } from "@/nextsignal/config";
import { loggerAdapter } from "@/nextsignal/adapters/logger";

export const runtime = "nodejs";

export async function POST(request: Request) {
  await config.load();

  const body = await request.text();
  const verification = await verifyQStashRequest(request, body).catch((error: unknown) => ({
    ok: false as const,
    error: error instanceof Error ? error.message : "Invalid Upstash signature."
  }));
  if (!verification.ok) {
    await loggerAdapter.warn({
      message: "Rejected queue worker request.",
      data: {
        reason: verification.error
      }
    });

    return Response.json({ error: verification.error }, { status: 401 });
  }

  let message: QueueMessage;
  try {
    message = JSON.parse(body) as QueueMessage;
  } catch {
    await loggerAdapter.warn({
      message: "Rejected invalid queue worker JSON."
    });

    return Response.json({ error: "Invalid queue message JSON." }, { status: 400 });
  }

  await loggerAdapter.info({
    message: "Queue worker message received.",
    process: message.process,
    correlationId: message.metadata.correlationId,
    data: {
      caller: message.metadata.caller,
      createdAt: message.metadata.createdAt
    }
  });

  const result = await app.runWorkerMessage(message);

  await loggerAdapter.info({
    message: "Queue worker message completed.",
    process: message.process,
    correlationId: message.metadata.correlationId,
    data: {
      ok: result.ok,
      kind: result.meta.kind
    }
  });

  return Response.json(result, { status: result.ok ? 202 : 500 });
}

async function verifyQStashRequest(request: Request, body: string) {
  if (!readBoolean("queue.qstash.verifySignatures", true)) {
    return { ok: true as const };
  }

  const signature = request.headers.get("upstash-signature");
  if (!signature) {
    return { ok: false as const, error: "Missing Upstash signature." };
  }

  const receiver = new Receiver({
    currentSigningKey: readString("queue.qstash.currentsigningkey") ?? process.env.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: readString("queue.qstash.nextsigningkey") ?? process.env.QSTASH_NEXT_SIGNING_KEY
  });

  await receiver.verify({
    signature,
    body,
    url: readString("queue.workerurl") ?? request.url,
    upstashRegion: request.headers.get("upstash-region") ?? undefined,
    clockTolerance: Number(config.get("queue.qstash.clocktolerance", 30))
  });

  return { ok: true as const };
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
