import { dispatchMcpTool } from "@/nextsignal/mcp/tools/context";
import { toMcpToolResult } from "@/nextsignal/mcp/result";
import type { NextSignalMcpTool } from "@/nextsignal/mcp/types";
import type { SpacesListMembersInput } from "@/nextsignal/schemas";

export const spaceTools: NextSignalMcpTool[] = [
  {
    register(server, { app }) {
      server.registerTool(
        "space_list_members",
        {
          title: "List Space Members",
          description: "Lists members in the active home space. Use the returned userId as todo_add assigneeUserId.",
          inputSchema: {}
        },
        async (input, extra) => toMcpToolResult(await dispatchMcpTool<SpacesListMembersInput>(app, "spaces.listMembers", input, extra))
      );
    }
  }
];
