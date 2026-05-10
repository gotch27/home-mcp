import { businessProcess, requireUser, validateWith, value } from "@gotch/nextsignal";
import { requireHomeUser } from "@/nextsignal/processes/business/context";
import type { AppServices } from "@/nextsignal/services";
import type { SpaceSummary } from "@/nextsignal/services/spaces";
import { spacesListInputSchema, type SpacesListInput } from "@/nextsignal/schemas";

export const spacesList = businessProcess<SpacesListInput, SpaceSummary[], AppServices>({
  name: "spaces.list",
  metadata: {
    description: "Lists home spaces for the authenticated user.",
    tags: ["spaces", "business"]
  },
  auth: requireUser(),
  validate: validateWith(spacesListInputSchema),
  async handle(ctx) {
    const userResult = await requireHomeUser(ctx);
    if (!userResult.ok) return userResult;

    const spaces = await ctx.services.spaces.listForUser(userResult.user.id);
    await ctx.logger.info({
      message: "Listed user spaces.",
      process: ctx.metadata.processName,
      correlationId: ctx.metadata.correlationId,
      data: { userId: userResult.user.id, spaceCount: spaces.length }
    });

    return value(spaces);
  }
});
