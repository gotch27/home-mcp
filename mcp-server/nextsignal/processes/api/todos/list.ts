import { apiProcess, requireUser, validateWith, value } from "@gotch/nextsignal";
import { requireActiveHomeSpace } from "@/nextsignal/processes/business/context";
import type { AppServices } from "@/nextsignal/services";
import { todoListInputSchema, type TodoListInput } from "@/nextsignal/schemas";
import type { TodoItem } from "@/nextsignal/domain/home";

export const todoListApi = apiProcess<TodoListInput, TodoItem[], AppServices>({
  name: "todos.list",
  metadata: {
    description: "Lists todos in the active home space, optionally scoped to an assignee.",
    tags: ["todos", "api"],
    owner: "home",
    version: "0.1.0"
  },
  auth: requireUser(),
  validate: validateWith(todoListInputSchema),
  async handle(ctx, input) {
    const activeResult = await requireActiveHomeSpace(ctx);
    if (!activeResult.ok) return activeResult;

    const todos = await ctx.services.todos.list({
      ...input,
      spaceId: activeResult.activeSpace.space.id
    });
    await ctx.logger.info({
      message: "Listed todos.",
      process: ctx.metadata.processName,
      correlationId: ctx.metadata.correlationId,
      data: {
        spaceId: activeResult.activeSpace.space.id,
        todoCount: todos.length
      }
    });

    return value(todos);
  }
});
