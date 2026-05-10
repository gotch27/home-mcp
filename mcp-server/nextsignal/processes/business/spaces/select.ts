import { businessProcess, forbidden, forwardFault, requireUser, validateWith, value } from "@gotch/nextsignal";
import type { ProcessContext } from "@gotch/nextsignal";
import { requireHomeUser } from "@/nextsignal/processes/business/context";
import type { AppServices } from "@/nextsignal/services";
import type { SpaceDetails } from "@/nextsignal/services/spaces";
import { spacesSelectInputSchema, type SpacesSelectInput } from "@/nextsignal/schemas";

export const spacesSelect = businessProcess<SpacesSelectInput, SpaceDetails, AppServices>({
  name: "spaces.select",
  metadata: {
    description: "Selects the active home space for the authenticated user.",
    tags: ["spaces", "business"]
  },
  auth: requireUser(),
  validate: validateWith(spacesSelectInputSchema),
  handle: spacesSelectHandle
});

async function spacesSelectHandle(ctx: ProcessContext<AppServices>, input: SpacesSelectInput) {
  const userResult = await requireHomeUser(ctx);
  if (!userResult.ok) return forwardFault(userResult);
  const user = userResult.data!;

  const space = await ctx.services.spaces.select({
    userId: user.id,
    spaceId: input.spaceId
  });

  if (!space) {
    await ctx.logger.warn({
      message: "User attempted to select a space they are not a member of.",
      process: ctx.metadata.processName,
      correlationId: ctx.metadata.correlationId,
      data: { userId: user.id, spaceId: input.spaceId }
    });
    return forbidden("You are not a member of that home space.");
  }

  await ctx.logger.info({
    message: "Selected active home space.",
    process: ctx.metadata.processName,
    correlationId: ctx.metadata.correlationId,
    data: { userId: user.id, spaceId: space.id }
  });

  return value(space);
}
