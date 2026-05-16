import { businessProcess, forwardFault, notFound, requireUser, validateWith, value } from "@gotch/nextsignal";
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
      assigneeUserId: input.assigneeUserId,
      spaceId: activeSpace.space.id,
      userId: activeSpace.user.id
    }
  });

  const assignee = await ctx.services.spaces.getMembership(input.assigneeUserId, activeSpace.space.id);
  if (!assignee) {
    await ctx.logger.warn({
      message: "Todo assignee is not a member of the active home space.",
      process: ctx.metadata.processName,
      correlationId: ctx.metadata.correlationId,
      data: {
        assigneeUserId: input.assigneeUserId,
        spaceId: activeSpace.space.id
      }
    });

    return notFound("Todo assignee must be a member of the active home space. Use space_list_members to choose a valid userId.");
  }

  const todo = await ctx.services.todos.add({ ...input, spaceId: activeSpace.space.id });
  const todos = await ctx.services.todos.list({ spaceId: activeSpace.space.id });
  const recipients = assignee.userId === activeSpace.user.id ? [] : [assignee];

  ctx.services.email.sendSpaceChangeNotificationAsync(
    createTodoAddNotification(activeSpace, { todo, todos }),
    recipients,
    ctx.logger
  );

  await ctx.logger.info({
    message: "Todo added.",
    process: ctx.metadata.processName,
    correlationId: ctx.metadata.correlationId,
    data: {
      id: todo.id,
      spaceId: activeSpace.space.id,
      assigneeUserId: todo.assigneeUserId,
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
    summary: `${activeSpace.user.displayName} added a todo for ${data.todo.assigneeDisplayName}.`,
    details: [`Todo: ${data.todo.title}`],
    snapshot: {
      todos: data.todos
    },
    changedAt: new Date().toISOString()
  };
}
