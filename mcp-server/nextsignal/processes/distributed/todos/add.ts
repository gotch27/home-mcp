import { allowAnonymous, distributedProcess, ok, validateWith, value } from "@gotch/nextsignal";
import type { ProcessContext, Result } from "@gotch/nextsignal";
import type { AppServices } from "@/nextsignal/services";
import { homeChangeNotificationSchema, todoAddInputSchema, type TodoAddInput } from "@/nextsignal/schemas";
import type { HomeChangeNotification, TodoItem } from "@/nextsignal/domain/home";

export type TodoAddOutput = {
  todo: TodoItem;
  todos: TodoItem[];
};

export const todoAdd = distributedProcess<TodoAddInput, TodoAddOutput, HomeChangeNotification, AppServices>({
  name: "todos.add",
  metadata: {
    description: "Adds a todo and notifies the family.",
    tags: ["todos", "distributed"],
    owner: "home",
    version: "0.1.0"
  },
  transient: homeChangeNotificationSchema,
  auth: allowAnonymous(),
  validate: validateWith(todoAddInputSchema),
  handle: todoAddHandle,
  map: todoAddMap,
  async work(ctx, notification) {
    await ctx.logger.info({
      message: "Processing todo add notification.",
      process: ctx.metadata.processName,
      correlationId: ctx.metadata.correlationId,
      data: {
        action: notification.action,
        changedBy: notification.changedBy,
        todoCount: notification.snapshot.todos?.length ?? 0
      }
    });

    await ctx.services.email.sendFamilyChangeNotification(notification, ctx.logger);

    await ctx.logger.info({
      message: "Todo add notification processed.",
      process: ctx.metadata.processName,
      correlationId: ctx.metadata.correlationId,
      data: {
        action: notification.action
      }
    });

    return ok();
  }
});

async function todoAddHandle(ctx: ProcessContext<AppServices>, input: TodoAddInput) {
  await ctx.logger.info({
    message: "Adding todo.",
    process: ctx.metadata.processName,
    correlationId: ctx.metadata.correlationId,
    data: {
      title: input.title,
      assignee: input.assignee,
      changedBy: input.changedBy
    }
  });

  const todo = await ctx.services.todos.add(input);
  const todos = await ctx.services.todos.list();

  await ctx.logger.info({
    message: "Todo added.",
    process: ctx.metadata.processName,
    correlationId: ctx.metadata.correlationId,
    data: {
      id: todo.id,
      assignee: todo.assignee,
      todoCount: todos.length
    }
  });

  return value({ todo, todos });
}

function todoAddMap(_ctx: unknown, input: TodoAddInput, result: Result<TodoAddOutput>): HomeChangeNotification {
  const data = result.data;
  const todo = data?.todo;

  return {
    domain: "todos",
    action: "add",
    changedBy: input.changedBy,
    summary: `${input.changedBy ?? "Someone"} added a todo for ${todo?.assignee ?? input.assignee}.`,
    details: [`Todo: ${todo?.title ?? input.title}`],
    snapshot: {
      todos: data?.todos ?? []
    },
    changedAt: new Date().toISOString()
  };
}
