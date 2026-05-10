import { authFail, forbidden, forwardFault, systemFail, value, type ProcessContext, type Result } from "@gotch/nextsignal";
import type { AuthUser } from "@/nextsignal/adapters/auth";
import type { ActiveHomeSpace, HomeUser } from "@/nextsignal/domain/home";
import type { AppServices } from "@/nextsignal/services";

export async function requireHomeUser(ctx: ProcessContext<AppServices>): Promise<Result<HomeUser>> {
  const userResult = await ctx.auth.requireUser?.(ctx) as Awaited<ReturnType<NonNullable<typeof ctx.auth.requireUser>>> | undefined;
  if (!userResult?.ok) {
    await ctx.logger.warn({
      message: "Authenticated user required.",
      process: ctx.metadata.processName,
      correlationId: ctx.metadata.correlationId
    });
    return authFail("Authentication required.");
  }

  const authUser = userResult.data as AuthUser;

  try {
    const user = await ctx.services.users.ensureFromWorkOS({ workosUserId: authUser.id });
    return value(user);
  } catch (error) {
    await ctx.logger.error({
      message: "Failed to ensure WorkOS user.",
      process: ctx.metadata.processName,
      correlationId: ctx.metadata.correlationId,
      data: { userId: authUser.id },
      error
    });
    return systemFail(error);
  }
}

export async function requireActiveHomeSpace(ctx: ProcessContext<AppServices>): Promise<Result<ActiveHomeSpace>> {
  const userResult = await requireHomeUser(ctx);
  if (!userResult.ok) return forwardFault(userResult);
  const user = userResult.data;

  if (!user) {
    return systemFail(new Error("Home user requirement returned no data."));
  }

  const activeSpace = await ctx.services.spaces.getActiveForUser(user.id);
  if (!activeSpace) {
    await ctx.logger.warn({
      message: "User has no active home space.",
      process: ctx.metadata.processName,
      correlationId: ctx.metadata.correlationId,
      data: { userId: user.id }
    });
    return forbidden("Create or join a home space before using this tool.");
  }

  return value(activeSpace);
}
