import { Client } from "@upstash/qstash";
import type { QueueAdapter } from "@gotch/nextsignal";
import { config } from "@/nextsignal/config";

export const queueAdapter: QueueAdapter = {
  async publish(message) {
    await config.load();

    const workerUrl = readWorkerUrl();
    if (!workerUrl) {
      throw new Error("Missing queue worker URL. Set config `queue.workerurl` to your public /api/queue/nextsignal URL.");
    }

    const token = readString("queue.qstash.token") ?? process.env.QSTASH_TOKEN;
    if (!token) {
      throw new Error("Missing QStash token. Set config `queue.qstash.token`, NEXTSIGNAL_QUEUE__QSTASH__TOKEN, or QSTASH_TOKEN.");
    }

    const client = new Client({ token });
    await client.publishJSON({
      url: workerUrl,
      body: message,
      retries: Number(config.get("queue.qstash.retries", 3)),
      deduplicationId: buildDeduplicationId(message.metadata.correlationId, message.process)
    });
  },

  subscribe() {
    throw new Error("QStash queue delivery uses /api/queue/nextsignal and does not support the persistent NextSignal worker host.");
  }
};

function readString(path: string) {
  const value = config.get<string | undefined>(path);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readWorkerUrl() {
  const value = readString("queue.workerurl");
  if (!value) return undefined;

  if (value.includes("https://https://") || value.includes("http://http://")) {
    throw new Error(`Invalid queue worker URL: remove the duplicate protocol from ${value}.`);
  }

  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`Invalid queue worker URL protocol: ${url.protocol}`);
  }

  return url.toString();
}

function buildDeduplicationId(correlationId: string, processName: string) {
  return `${correlationId}-${processName.replaceAll(".", "-")}`;
}
