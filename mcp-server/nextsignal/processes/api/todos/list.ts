import { allowAnonymous, apiProcess, validateWith, value } from "@gotch/nextsignal";
import type { AppServices } from "@/nextsignal/services";
import { todoListInputSchema, type TodoListInput } from "@/nextsignal/schemas";
import type { TodoItem } from "@/nextsignal/domain/home";

export const todoListApi = apiProcess<TodoListInput, TodoItem[], AppServices>({
  name: "todos.list",
  metadata: {
    description: "Lists todos, optionally scoped to a family member.",
    tags: ["todos", "api"],
    owner: "home",
    version: "0.1.0"
  },
  auth: allowAnonymous(),
  validate: validateWith(todoListInputSchema),
  async handle(ctx, input) {
    return value(await ctx.services.todos.list(input));
  }
});
