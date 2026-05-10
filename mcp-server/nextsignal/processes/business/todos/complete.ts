import { allowAnonymous, businessProcess, notFound, validateWith, value } from "@gotch/nextsignal";
import type { ProcessContext } from "@gotch/nextsignal";
import type { AppServices } from "@/nextsignal/services";
import { todoCompleteInputSchema, type TodoCompleteInput } from "@/nextsignal/schemas";
import type { HomeChangeNotification, TodoItem } from "@/nextsignal/domain/home";

export type TodoCompleteOutput = {
  completedTodos: TodoItem[];
  todos: TodoItem[];
};

export const todoComplete = businessProcess<TodoCompleteInput, TodoCompleteOutput, AppServices>({
  name: "todos.complete",
  metadata: {
    description: "Completes todos by id or title and notifies the family.",
    tags: ["todos", "business"],
    owner: "home",
    version: "0.1.0"
  },
  auth: allowAnonymous(),
  validate: validateWith(todoCompleteInputSchema),
  handle: todoCompleteHandle
});

async function todoCompleteHandle(ctx: ProcessContext<AppServices>, input: TodoCompleteInput) {
  await ctx.logger.info({
    message: "Completing todos.",
    process: ctx.metadata.processName,
    correlationId: ctx.metadata.correlationId,
    data: {
      byId: Boolean(input.id),
      byTitle: Boolean(input.title),
      assignee: input.assignee,
      changedBy: input.changedBy
    }
  });

  const completedTodos = await ctx.services.todos.complete(input);
  if (completedTodos.length === 0) {
    await ctx.logger.warn({
      message: "No open todos matched completion request.",
      process: ctx.metadata.processName,
      correlationId: ctx.metadata.correlationId,
      data: {
        byId: Boolean(input.id),
        byTitle: Boolean(input.title),
        assignee: input.assignee
      }
    });

    return notFound("No open todos matched the completion request.");
  }

  const todos = await ctx.services.todos.list();
  try {
    await ctx.services.email.sendFamilyChangeNotification(
      createTodoCompleteNotification(input, { completedTodos, todos }),
      ctx.logger
    );
  } catch (error) {
    await ctx.logger.error({
      message: "Failed to send todo completion notification email.",
      process: ctx.metadata.processName,
      correlationId: ctx.metadata.correlationId,
      error
    });
  }

  await ctx.logger.info({
    message: "Todos completed.",
    process: ctx.metadata.processName,
    correlationId: ctx.metadata.correlationId,
    data: {
      completedCount: completedTodos.length,
      todoCount: todos.length
    }
  });

  return value({ completedTodos, todos });
}

function createTodoCompleteNotification(
  input: TodoCompleteInput,
  data: TodoCompleteOutput
): HomeChangeNotification {
  const count = data.completedTodos.length;

  return {
    domain: "todos",
    action: "complete",
    changedBy: input.changedBy,
    summary: `${input.changedBy ?? "Someone"} completed ${count} todo${count === 1 ? "" : "s"}.`,
    details: data.completedTodos.map((todo) => `${todo.title} (${todo.assignee})`),
    snapshot: {
      todos: data.todos
    },
    changedAt: new Date().toISOString()
  };
}
