import { createNextSignalMcpHandler } from "@/nextsignal/mcp/create-handler";

export const runtime = "nodejs";

const handler = createNextSignalMcpHandler();

export { handler as GET, handler as POST };
