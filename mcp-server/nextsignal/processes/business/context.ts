import { authFail, forbidden, systemFail, type ProcessContext, type Result } from "@gotch/nextsignal";
import type { AuthUser } from "@/nextsignal/adapters/auth";
import type { ActiveHomeSpace, HomeUser } from "@/nextsignal/domain/home";
import type { AppServices } from "@/nextsignal/services";

type RequirementFault = Result<never> & { ok: false };
type HomeUserRequirement = RequirementFault | { ok: true; user: HomeUser };
type ActiveHomeSpaceRequirement = RequirementFault | { ok: true; activeSpace: ActiveHomeSpace };

export async function requireHomeUser(ctx: ProcessContext<AppServices>): Promise<HomeUserRequirement> {
  const userResult = await ctx.auth.requireUser?.(ctx) as Awaited<ReturnType<NonNullable<typeof ctx.auth.requireUser>>> | undefined;
  if (!userResult?.ok) {
    await ctx.logger.warn({
      message: "Authenticated user required.",
      process: ctx.metadata.processName,
      correlationId: ctx.metadata.correlationId
    });
    return authFail("Authentication required.") as RequirementFault;
  }

  const authUser = userResult.data as AuthUser;

  try {
    const user = await ctx.services.users.ensureFromWorkOS({ workosUserId: authUser.id });
    return { ok: true as const, user };
  } catch (error) {
    await ctx.logger.error({
      message: "Failed to ensure WorkOS user.",
      process: ctx.metadata.processName,
      correlationId: ctx.metadata.correlationId,
      data: { userId: authUser.id },
      error
    });
    return systemFail(error) as RequirementFault;
  }
}

export async function requireActiveHomeSpace(ctx: ProcessContext<AppServices>): Promise<ActiveHomeSpaceRequirement> {
  const userResult = await requireHomeUser(ctx);
  if (!userResult.ok) return userResult;

  const activeSpace = await ctx.services.spaces.getActiveForUser(userResult.user.id);
  if (!activeSpace) {
    await ctx.logger.warn({
      message: "User has no active home space.",
      process: ctx.metadata.processName,
      correlationId: ctx.metadata.correlationId,
      data: { userId: userResult.user.id }
    });
    return forbidden("Create or join a home space before using this tool.") as RequirementFault;
  }

  return { ok: true, activeSpace };
}
