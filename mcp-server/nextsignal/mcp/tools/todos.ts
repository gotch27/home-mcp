import { z } from "zod";
import { dispatchMcpTool } from "@/nextsignal/mcp/tools/context";
import { toMcpToolResult } from "@/nextsignal/mcp/result";
import type { NextSignalMcpTool } from "@/nextsignal/mcp/types";
import type { TodoAddInput, TodoCompleteInput, TodoListInput } from "@/nextsignal/schemas";

const assigneeSchema = z.string().min(1);

export const todoTools: NextSignalMcpTool[] = [
  {
    register(server, { app }) {
      server.registerTool(
        "todo_list",
        {
          title: "List Todos",
          description: "Lists todos in the active home space for everyone or for an assignee. Assignee lists include shared todos assigned to all.",
          inputSchema: {
            assignee: assigneeSchema.optional(),
            includeCompleted: z.boolean().optional()
          }
        },
        async (input, extra) => toMcpToolResult(await dispatchMcpTool<TodoListInput>(app, "todos.list", input, extra))
      );
    }
  },
  {
    register(server, { app }) {
      server.registerTool(
        "todo_add",
        {
          title: "Add Todo",
          description: "Adds a todo for everyone or for an assignee in the active home space, then emails other space members.",
          inputSchema: {
            title: z.string().min(1),
            assignee: assigneeSchema
          }
        },
        async (input, extra) => toMcpToolResult(await dispatchMcpTool<TodoAddInput>(app, "todos.add", input, extra))
      );
    }
  },
  {
    register(server, { app }) {
      server.registerTool(
        "todo_complete",
        {
          title: "Complete Todo",
          description: "Completes open todos in the active home space by id or title, optionally scoped by assignee, then emails other space members.",
          inputSchema: {
            id: z.string().min(1).optional(),
            title: z.string().min(1).optional(),
            assignee: assigneeSchema.optional()
          }
        },
        async (input, extra) => toMcpToolResult(await dispatchMcpTool<TodoCompleteInput>(app, "todos.complete", input, extra))
      );
    }
  }
];
