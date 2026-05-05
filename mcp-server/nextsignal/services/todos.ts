import { and, asc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { homeTodos } from "@/nextsignal/db/schema";
import { getDb } from "@/nextsignal/services/database";
import type { TodoAssignee, TodoItem } from "@/nextsignal/domain/home";

export type ListTodosInput = {
  assignee?: TodoAssignee;
  includeCompleted?: boolean;
};

export type AddTodoInput = {
  title: string;
  assignee: TodoAssignee;
};

export type CompleteTodoInput = {
  id?: string;
  title?: string;
  assignee?: TodoAssignee;
};

export const todosService = {
  async list(input: ListTodosInput = {}): Promise<TodoItem[]> {
    const db = await getDb();
    const assignee = input.assignee;
    const completionCondition = input.includeCompleted === true ? undefined : isNull(homeTodos.completedAt);
    const assigneeCondition = !assignee || assignee === "all"
      ? undefined
      : or(eq(homeTodos.assignee, assignee), eq(homeTodos.assignee, "all"));
    const rows = await db
      .select()
      .from(homeTodos)
      .where(and(completionCondition, assigneeCondition))
      .orderBy(sql`${homeTodos.completedAt} ASC NULLS FIRST`, asc(homeTodos.createdAt));

    return rows.map(mapTodo);
  },

  async add(input: AddTodoInput): Promise<TodoItem> {
    const db = await getDb();
    const id = crypto.randomUUID();
    const title = input.title.trim();
    const [row] = await db
      .insert(homeTodos)
      .values({ id, title, assignee: input.assignee })
      .returning();

    return mapTodo(row);
  },

  async complete(input: CompleteTodoInput): Promise<TodoItem[]> {
    const db = await getDb();
    const id = normalizeOptionalText(input.id);
    const title = normalizeOptionalText(input.title)?.toLowerCase();
    const assignee = input.assignee;
    const matchConditions = [
      id ? eq(homeTodos.id, id) : undefined,
      title ? eq(sql<string>`lower(${homeTodos.title})`, title) : undefined
    ].filter(Boolean);
    const assigneeCondition = !assignee || assignee === "all"
      ? undefined
      : or(eq(homeTodos.assignee, assignee), eq(homeTodos.assignee, "all"));
    const rows = await db
      .update(homeTodos)
      .set({ completedAt: new Date() })
      .where(and(isNull(homeTodos.completedAt), or(...matchConditions), assigneeCondition))
      .returning();

    return rows.map(mapTodo);
  }
};

function mapTodo(row: typeof homeTodos.$inferSelect): TodoItem {
  return {
    id: row.id,
    title: row.title,
    assignee: row.assignee,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString()
  };
}

function normalizeOptionalText(value: string | undefined) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
