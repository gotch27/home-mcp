import { z } from "zod";
import { dispatchMcpTool } from "@/nextsignal/mcp/tools/context";
import { toMcpToolResult } from "@/nextsignal/mcp/result";
import type { NextSignalMcpTool } from "@/nextsignal/mcp/types";
import type { TodoAddInput, TodoCompleteInput, TodoListInput } from "@/nextsignal/schemas";

const assigneeUserIdSchema = z.string().min(1);
const spaceIdSchema = z.string().min(1);

export const todoTools: NextSignalMcpTool[] = [
  {
    register(server, { app }) {
      server.registerTool(
        "todo_list",
        {
          title: "List Todos",
          description: "Lists todos in the requested home space, optionally filtered by a deterministic assignee userId from space_list_members.",
          inputSchema: {
            spaceId: spaceIdSchema,
            assigneeUserId: assigneeUserIdSchema.optional(),
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
          description: "Adds a todo assigned to a member of the requested home space. Use space_list_members first with the same spaceId to get the deterministic assigneeUserId.",
          inputSchema: {
            spaceId: spaceIdSchema,
            title: z.string().min(1),
            assigneeUserId: assigneeUserIdSchema
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
          description: "Completes open todos in the requested home space by id or title, optionally scoped by assigneeUserId from space_list_members, then emails other space members.",
          inputSchema: {
            spaceId: spaceIdSchema,
            id: z.string().min(1).optional(),
            title: z.string().min(1).optional(),
            assigneeUserId: assigneeUserIdSchema.optional()
          }
        },
        async (input, extra) => toMcpToolResult(await dispatchMcpTool<TodoCompleteInput>(app, "todos.complete", input, extra))
      );
    }
  }
];
