import { z } from "zod";
import { FAMILY_MEMBER_NAMES, TODO_ASSIGNEES } from "@/nextsignal/domain/home";
import { toMcpToolResult } from "@/nextsignal/mcp/result";
import type { NextSignalMcpTool } from "@/nextsignal/mcp/types";
import type { TodoAddInput, TodoCompleteInput, TodoListInput } from "@/nextsignal/schemas";

const changedBySchema = z.enum(FAMILY_MEMBER_NAMES).optional();
const assigneeSchema = z.enum(TODO_ASSIGNEES);

export const todoTools: NextSignalMcpTool[] = [
  {
    register(server, { app }) {
      server.registerTool(
        "todo_list",
        {
          title: "List Todos",
          description: "Lists todos for everyone or for a family member. Family-member lists include shared todos assigned to all.",
          inputSchema: {
            assignee: assigneeSchema.optional(),
            includeCompleted: z.boolean().optional()
          }
        },
        async (input) => toMcpToolResult(await app.dispatch<TodoListInput>("todos.list", input, { runtime: "api" }))
      );
    }
  },
  {
    register(server, { app }) {
      server.registerTool(
        "todo_add",
        {
          title: "Add Todo",
          description: "Adds a todo for everyone or for a family member, then emails the family.",
          inputSchema: {
            title: z.string().min(1),
            assignee: assigneeSchema,
            changedBy: changedBySchema
          }
        },
        async (input) => toMcpToolResult(await app.dispatch<TodoAddInput>("todos.add", input, { runtime: "api" }))
      );
    }
  },
  {
    register(server, { app }) {
      server.registerTool(
        "todo_complete",
        {
          title: "Complete Todo",
          description: "Completes open todos by id or title, optionally scoped by assignee, then emails the family.",
          inputSchema: {
            id: z.string().min(1).optional(),
            title: z.string().min(1).optional(),
            assignee: assigneeSchema.optional(),
            changedBy: changedBySchema
          }
        },
        async (input) => toMcpToolResult(await app.dispatch<TodoCompleteInput>("todos.complete", input, { runtime: "api" }))
      );
    }
  }
];
