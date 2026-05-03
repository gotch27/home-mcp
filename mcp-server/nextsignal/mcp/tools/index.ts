import { healthTool } from "@/nextsignal/mcp/tools/health";
import type { NextSignalMcpTool } from "@/nextsignal/mcp/types";

export const mcpTools: NextSignalMcpTool[] = [
  healthTool
];
