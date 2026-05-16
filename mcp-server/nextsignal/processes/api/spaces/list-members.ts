import { apiProcess, forwardFault, requireUser, validateWith, value } from "@gotch/nextsignal";
import { requireActiveHomeSpace } from "@/nextsignal/processes/business/context";
import type { AppServices } from "@/nextsignal/services";
import { spacesListMembersInputSchema, type SpacesListMembersInput } from "@/nextsignal/schemas";
import type { HomeSpaceMember } from "@/nextsignal/domain/home";

export const spacesListMembersApi = apiProcess<SpacesListMembersInput, HomeSpaceMember[], AppServices>({
  name: "spaces.listMembers",
  metadata: {
    description: "Lists members in the active home space.",
    tags: ["spaces", "api"],
    owner: "home",
    version: "0.1.0"
  },
  auth: requireUser(),
  validate: validateWith(spacesListMembersInputSchema),
  async handle(ctx) {
    const activeResult = await requireActiveHomeSpace(ctx);
    if (!activeResult.ok) return forwardFault(activeResult);
    const activeSpace = activeResult.data!;

    const members = await ctx.services.spaces.listMembers(activeSpace.space.id);
    await ctx.logger.info({
      message: "Listed active space members.",
      process: ctx.metadata.processName,
      correlationId: ctx.metadata.correlationId,
      data: {
        spaceId: activeSpace.space.id,
        memberCount: members.length
      }
    });

    return value(members);
  }
});
