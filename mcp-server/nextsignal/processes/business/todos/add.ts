import { allowAnonymous, businessProcess, validateWith, value } from "@gotch/nextsignal";
import type { ProcessContext } from "@gotch/nextsignal";
import type { AppServices } from "@/nextsignal/services";
import { todoAddInputSchema, type TodoAddInput } from "@/nextsignal/schemas";
import type { HomeChangeNotification, TodoItem } from "@/nextsignal/domain/home";

export type TodoAddOutput = {
  todo: TodoItem;
  todos: TodoItem[];
};

export const todoAdd = businessProcess<TodoAddInput, TodoAddOutput, AppServices>({
  name: "todos.add",
  metadata: {
    description: "Adds a todo and notifies the family.",
    tags: ["todos", "business"],
    owner: "home",
    version: "0.1.0"
  },
  auth: allowAnonymous(),
  validate: validateWith(todoAddInputSchema),
  handle: todoAddHandle
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

  try {
    await ctx.services.email.sendFamilyChangeNotification(
      createTodoAddNotification(input, { todo, todos }),
      ctx.logger
    );
  } catch (error) {
    await ctx.logger.error({
      message: "Failed to send todo add notification email.",
      process: ctx.metadata.processName,
      correlationId: ctx.metadata.correlationId,
      error
    });
  }

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

function createTodoAddNotification(input: TodoAddInput, data: TodoAddOutput): HomeChangeNotification {
  return {
    domain: "todos",
    action: "add",
    changedBy: input.changedBy,
    summary: `${input.changedBy ?? "Someone"} added a todo for ${data.todo.assignee}.`,
    details: [`Todo: ${data.todo.title}`],
    snapshot: {
      todos: data.todos
    },
    changedAt: new Date().toISOString()
  };
}
