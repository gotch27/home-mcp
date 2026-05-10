import { businessProcess, forwardFault, requireUser, validateWith, value } from "@gotch/nextsignal";
import type { ProcessContext } from "@gotch/nextsignal";
import { requireActiveHomeSpace } from "@/nextsignal/processes/business/context";
import type { AppServices } from "@/nextsignal/services";
import { todoAddInputSchema, type TodoAddInput } from "@/nextsignal/schemas";
import type { ActiveHomeSpace, HomeChangeNotification, TodoItem } from "@/nextsignal/domain/home";

export type TodoAddOutput = {
  todo: TodoItem;
  todos: TodoItem[];
};

export const todoAdd = businessProcess<TodoAddInput, TodoAddOutput, AppServices>({
  name: "todos.add",
  metadata: {
    description: "Adds a todo and notifies the active home space.",
    tags: ["todos", "business"],
    owner: "home",
    version: "0.1.0"
  },
  auth: requireUser(),
  validate: validateWith(todoAddInputSchema),
  handle: todoAddHandle
});

async function todoAddHandle(ctx: ProcessContext<AppServices>, input: TodoAddInput) {
  const activeResult = await requireActiveHomeSpace(ctx);
  if (!activeResult.ok) return forwardFault(activeResult);
  const activeSpace = activeResult.data!;

  await ctx.logger.info({
    message: "Adding todo.",
    process: ctx.metadata.processName,
    correlationId: ctx.metadata.correlationId,
    data: {
      title: input.title,
      assignee: input.assignee,
      spaceId: activeSpace.space.id,
      userId: activeSpace.user.id
    }
  });

  const todo = await ctx.services.todos.add({ ...input, spaceId: activeSpace.space.id });
  const todos = await ctx.services.todos.list({ spaceId: activeSpace.space.id });
  const recipients = await ctx.services.spaces.listNotificationMembers({
    spaceId: activeSpace.space.id,
    excludeUserId: activeSpace.user.id
  });

  try {
    await ctx.services.email.sendSpaceChangeNotification(
      createTodoAddNotification(activeSpace, { todo, todos }),
      recipients,
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
      spaceId: activeSpace.space.id,
      assignee: todo.assignee,
      todoCount: todos.length
    }
  });

  return value({ todo, todos });
}

function createTodoAddNotification(activeSpace: ActiveHomeSpace, data: TodoAddOutput): HomeChangeNotification {
  return {
    domain: "todos",
    action: "add",
    spaceName: activeSpace.space.name,
    changedBy: activeSpace.user.displayName,
    summary: `${activeSpace.user.displayName} added a todo for ${data.todo.assignee}.`,
    details: [`Todo: ${data.todo.title}`],
    snapshot: {
      todos: data.todos
    },
    changedAt: new Date().toISOString()
  };
}
