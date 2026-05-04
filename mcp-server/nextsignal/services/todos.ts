import { getSql } from "@/nextsignal/services/database";
import type { TodoAssignee, TodoItem } from "@/nextsignal/domain/home";

type TodoRow = {
  id: string;
  title: string;
  assignee: TodoAssignee;
  completed_at: Date | string | null;
  created_at: Date | string;
};

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
    const sql = await getSql();
    const assignee = input.assignee;
    const includeCompleted = input.includeCompleted === true;
    const rows = await sql<TodoRow[]>`
      SELECT id, title, assignee, completed_at, created_at
      FROM home_todos
      WHERE (${includeCompleted} OR completed_at IS NULL)
      AND (
        ${assignee === undefined || assignee === "all"}
        OR assignee = ${assignee ?? "all"}
        OR assignee = 'all'
      )
      ORDER BY completed_at ASC NULLS FIRST, created_at ASC
    `;

    return rows.map(mapTodo);
  },

  async add(input: AddTodoInput): Promise<TodoItem> {
    const sql = await getSql();
    const id = crypto.randomUUID();
    const title = input.title.trim();
    const [row] = await sql<TodoRow[]>`
      INSERT INTO home_todos (id, title, assignee)
      VALUES (${id}, ${title}, ${input.assignee})
      RETURNING id, title, assignee, completed_at, created_at
    `;

    return mapTodo(row);
  },

  async complete(input: CompleteTodoInput): Promise<TodoItem[]> {
    const sql = await getSql();
    const id = normalizeOptionalText(input.id);
    const title = normalizeOptionalText(input.title)?.toLowerCase();
    const assignee = input.assignee;
    const rows = await sql<TodoRow[]>`
      UPDATE home_todos
      SET completed_at = now()
      WHERE completed_at IS NULL
      AND (
        (${id !== undefined} AND id = ${id ?? ""})
        OR (${title !== undefined} AND lower(title) = ${title ?? ""})
      )
      AND (
        ${assignee === undefined || assignee === "all"}
        OR assignee = ${assignee ?? "all"}
        OR assignee = 'all'
      )
      RETURNING id, title, assignee, completed_at, created_at
    `;

    return rows.map(mapTodo);
  }
};

function mapTodo(row: TodoRow): TodoItem {
  return {
    id: row.id,
    title: row.title,
    assignee: row.assignee,
    completedAt: row.completed_at ? toIso(row.completed_at) : null,
    createdAt: toIso(row.created_at)
  };
}

function normalizeOptionalText(value: string | undefined) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
