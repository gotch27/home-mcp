import nodemailer from "nodemailer";
import type { LoggerAdapter } from "@gotch/nextsignal";
import { config } from "@/nextsignal/config";
import type { FamilyMember, HomeChangeNotification } from "@/nextsignal/domain/home";

type SmtpConfig = {
  host: string;
  port: number | string;
  secure?: boolean | string;
  user?: string;
  pass?: string;
};

type SenderConfig = {
  name: string;
  email: string;
};

export const emailService = {
  async sendFamilyChangeNotification(notification: HomeChangeNotification, logger?: LoggerAdapter): Promise<void> {
    await config.load();

    const members = readFamilyMembers();
    const recipients = members.map((member) => member.email).filter(Boolean);
    if (recipients.length === 0) {
      throw new Error("Missing family email recipients in config `family.members`.");
    }

    const smtp = readSmtpConfig();
    const from = config.require<SenderConfig>("notifications.from");
    await logger?.info({
      message: "Sending family change notification email.",
      data: {
        domain: notification.domain,
        action: notification.action,
        changedBy: notification.changedBy,
        recipientCount: recipients.length,
        recipients,
        from: from.email,
        smtpHost: smtp.host,
        smtpPort: Number(smtp.port)
      }
    });

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: Number(smtp.port),
      secure: readBoolean(smtp.secure, false),
      auth: smtp.user && smtp.pass ? { user: smtp.user, pass: smtp.pass } : undefined
    });

    const info = await transporter.sendMail({
      from: `"${from.name}" <${from.email}>`,
      to: recipients,
      subject: `[Home] ${notification.domain === "shopping" ? "Shopping list" : "Todo list"} updated`,
      text: renderTextNotification(notification),
      html: renderHtmlNotification(notification)
    });

    await logger?.info({
      message: "Family change notification email sent.",
      data: {
        domain: notification.domain,
        action: notification.action,
        recipientCount: recipients.length,
        recipients,
        from: from.email,
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response
      }
    });
  }
};

function readSmtpConfig(): SmtpConfig {
  const smtp = config.require<SmtpConfig>("email.smtp");

  return {
    ...smtp,
    user: readString("email.smtp.user"),
    pass: readString("email.smtp.pass")
  };
}

function readFamilyMembers(): FamilyMember[] {
  const members = config.require<FamilyMember[]>("family.members");
  if (Array.isArray(members)) return members;

  throw new Error("Invalid config `family.members`. Provide an array in config/default.json.");
}

function renderTextNotification(notification: HomeChangeNotification) {
  const lines = [
    notification.summary,
    "",
    ...notification.details.map((detail) => `- ${detail}`),
    "",
    ...renderTextSnapshot(notification)
  ];

  return lines.join("\n");
}

function renderTextSnapshot(notification: HomeChangeNotification) {
  if (notification.domain === "shopping") {
    const items = notification.snapshot.shoppingItems ?? [];
    return [
      "Current shopping list:",
      ...(items.length === 0 ? ["- Empty"] : items.map((item) => `- ${item.name} x ${item.quantity}${item.store ? `, ${item.store}` : ""}`))
    ];
  }

  const todos = notification.snapshot.todos ?? [];
  return [
    "Open todos:",
    ...(todos.length === 0 ? ["- Empty"] : todos.map((todo) => `- ${todo.title} (${todo.assignee})`))
  ];
}

function renderHtmlNotification(notification: HomeChangeNotification) {
  const detailItems = notification.details.map((detail) => `<li>${escapeHtml(detail)}</li>`).join("");
  const snapshotItems = renderTextSnapshot(notification)
    .slice(1)
    .map((line) => `<li>${escapeHtml(line.replace(/^- /, ""))}</li>`)
    .join("");

  return [
    `<p>${escapeHtml(notification.summary)}</p>`,
    detailItems ? `<ul>${detailItems}</ul>` : "",
    `<p><strong>${notification.domain === "shopping" ? "Current shopping list" : "Open todos"}:</strong></p>`,
    `<ul>${snapshotItems}</ul>`
  ].join("");
}

function readString(path: string) {
  const value = config.get<string | undefined>(path);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readBoolean(value: boolean | string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  if (typeof value === "boolean") return value;
  return value.toLowerCase() === "true";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
