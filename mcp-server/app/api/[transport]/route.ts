import { createNextSignalMcpHandler } from "@/nextsignal/mcp/create-handler";
import { verifyWorkOSBearerToken } from "@/nextsignal/mcp/workos-auth";
import { withMcpAuth } from "mcp-handler";

export const runtime = "nodejs";
export const maxDuration = 60;

const mcpHandler = createNextSignalMcpHandler();

const authenticatedHandler = withMcpAuth(
  mcpHandler,
  async (_req, bearerToken) => {
    if (!bearerToken) return undefined;

    return verifyWorkOSBearerToken(bearerToken);
  },
  {
    required: true,
    resourceMetadataPath: "/.well-known/oauth-protected-resource"
  }
);

export { authenticatedHandler as DELETE, authenticatedHandler as GET, authenticatedHandler as POST };
