import { apiProcess, forwardFault, requireUser, validateWith, value } from "@gotch/nextsignal";
import { requireActiveHomeSpace } from "@/nextsignal/processes/business/context";
import type { AppServices } from "@/nextsignal/services";
import { shoppingListItemsInputSchema, type ShoppingListItemsInput } from "@/nextsignal/schemas";
import type { ShoppingItem } from "@/nextsignal/domain/home";

export const shoppingListItemsApi = apiProcess<ShoppingListItemsInput, ShoppingItem[], AppServices>({
  name: "shopping.listItems",
  metadata: {
    description: "Lists current shopping items.",
    tags: ["shopping", "api"],
    owner: "home",
    version: "0.1.0"
  },
  auth: requireUser(),
  validate: validateWith(shoppingListItemsInputSchema),
  async handle(ctx, input) {
    const activeResult = await requireActiveHomeSpace(ctx);
    if (!activeResult.ok) return forwardFault(activeResult);
    const activeSpace = activeResult.data!;

    const items = await ctx.services.shopping.listItems({
      ...input,
      spaceId: activeSpace.space.id
    });
    await ctx.logger.info({
      message: "Listed shopping items.",
      process: ctx.metadata.processName,
      correlationId: ctx.metadata.correlationId,
      data: {
        spaceId: activeSpace.space.id,
        itemCount: items.length
      }
    });

    return value(items);
  }
});
