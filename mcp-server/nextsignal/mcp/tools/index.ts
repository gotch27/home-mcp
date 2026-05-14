import { shoppingTools } from "@/nextsignal/mcp/tools/shopping";
import { todoTools } from "@/nextsignal/mcp/tools/todos";
import type { NextSignalMcpTool } from "@/nextsignal/mcp/types";

export const mcpTools: NextSignalMcpTool[] = [
  ...shoppingTools,
  ...todoTools
];
