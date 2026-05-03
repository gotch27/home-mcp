import { toMcpToolResult } from "@/nextsignal/mcp/result";
import type { NextSignalMcpTool } from "@/nextsignal/mcp/types";

export const healthTool: NextSignalMcpTool = {
  register(server, { app }) {
    server.registerTool(
      "health_check",
      {
        title: "Health Check",
        description: "Returns the application health snapshot.",
        inputSchema: {}
      },
      async () => {
        const result = await app.dispatch("health.check", {}, { runtime: "api" });

        return toMcpToolResult(result);
      }
    );
  }
};
