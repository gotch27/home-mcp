import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { TODO_ASSIGNEES } from "@/nextsignal/domain/home";

export const homeShoppingItems = pgTable(
  "home_shopping_items",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    quantity: text("quantity").notNull(),
    store: text("store"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("home_shopping_items_created_at_idx").on(table.createdAt)
  ]
);

export const homeTodos = pgTable(
  "home_todos",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    assignee: text("assignee", { enum: TODO_ASSIGNEES }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("home_todos_open_assignee_idx").on(table.assignee, table.completedAt, table.createdAt)
  ]
);

export const nextsignalLogs = pgTable(
  "nextsignal_logs",
  {
    id: text("id").primaryKey(),
    level: text("level").notNull(),
    message: text("message").notNull(),
    process: text("process"),
    correlationId: text("correlation_id"),
    data: jsonb("data"),
    error: jsonb("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("nextsignal_logs_created_at_idx").on(table.createdAt),
    index("nextsignal_logs_correlation_id_idx").on(table.correlationId)
  ]
);
