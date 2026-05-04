import { allowAnonymous, distributedProcess, notFound, ok, validateWith, value } from "@gotch/nextsignal";
import type { ProcessContext, Result } from "@gotch/nextsignal";
import type { AppServices } from "@/nextsignal/services";
import {
  homeChangeNotificationSchema,
  todoCompleteInputSchema,
  type TodoCompleteInput
} from "@/nextsignal/schemas";
import type { HomeChangeNotification, TodoItem } from "@/nextsignal/domain/home";

export type TodoCompleteOutput = {
  completedTodos: TodoItem[];
  todos: TodoItem[];
};

export const todoComplete = distributedProcess<TodoCompleteInput, TodoCompleteOutput, HomeChangeNotification, AppServices>({
  name: "todos.complete",
  metadata: {
    description: "Completes todos by id or title and notifies the family.",
    tags: ["todos", "distributed"],
    owner: "home",
    version: "0.1.0"
  },
  transient: homeChangeNotificationSchema,
  auth: allowAnonymous(),
  validate: validateWith(todoCompleteInputSchema),
  handle: todoCompleteHandle,
  map: todoCompleteMap,
  async work(ctx, notification) {
    await ctx.logger.info({
      message: "Processing todo completion notification.",
      process: ctx.metadata.processName,
      correlationId: ctx.metadata.correlationId,
      data: {
        action: notification.action,
        changedBy: notification.changedBy,
        completedCount: notification.details.length
      }
    });

    await ctx.services.email.sendFamilyChangeNotification(notification, ctx.logger);

    await ctx.logger.info({
      message: "Todo completion notification processed.",
      process: ctx.metadata.processName,
      correlationId: ctx.metadata.correlationId,
      data: {
        action: notification.action
      }
    });

    return ok();
  }
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

function todoCompleteMap(
  _ctx: unknown,
  input: TodoCompleteInput,
  result: Result<TodoCompleteOutput>
): HomeChangeNotification {
  const data = result.data;
  const count = data?.completedTodos.length ?? 0;

  return {
    domain: "todos",
    action: "complete",
    changedBy: input.changedBy,
    summary: `${input.changedBy ?? "Someone"} completed ${count} todo${count === 1 ? "" : "s"}.`,
    details: data?.completedTodos.map((todo) => `${todo.title} (${todo.assignee})`) ?? [],
    snapshot: {
      todos: data?.todos ?? []
    },
    changedAt: new Date().toISOString()
  };
}
