import { allowAnonymous, businessProcess, notFound, validateWith, value } from "@gotch/nextsignal";
import type { ProcessContext } from "@gotch/nextsignal";
import type { AppServices } from "@/nextsignal/services";
import { shoppingClearItemsInputSchema, type ShoppingClearItemsInput } from "@/nextsignal/schemas";
import type { HomeChangeNotification, ShoppingItem } from "@/nextsignal/domain/home";

export type ShoppingClearItemsOutput = {
  clearedItems: ShoppingItem[];
  items: ShoppingItem[];
};

export const shoppingClearItems = businessProcess<ShoppingClearItemsInput, ShoppingClearItemsOutput, AppServices>({
  name: "shopping.clearItems",
  metadata: {
    description: "Clears shopping items by id, name, store, or all, then notifies the family.",
    tags: ["shopping", "business"],
    owner: "home",
    version: "0.1.0"
  },
  auth: allowAnonymous(),
  validate: validateWith(shoppingClearItemsInputSchema),
  handle: shoppingClearItemsHandle
});

async function shoppingClearItemsHandle(ctx: ProcessContext<AppServices>, input: ShoppingClearItemsInput) {
  await ctx.logger.info({
    message: "Clearing shopping items.",
    process: ctx.metadata.processName,
    correlationId: ctx.metadata.correlationId,
    data: {
      all: input.all,
      idCount: input.ids?.length ?? 0,
      nameCount: input.names?.length ?? 0,
      store: input.store,
      changedBy: input.changedBy
    }
  });

  const clearedItems = await ctx.services.shopping.clearItems(input);
  if (clearedItems.length === 0) {
    await ctx.logger.warn({
      message: "No shopping items matched clear request.",
      process: ctx.metadata.processName,
      correlationId: ctx.metadata.correlationId,
      data: {
        all: input.all,
        idCount: input.ids?.length ?? 0,
        nameCount: input.names?.length ?? 0,
        store: input.store
      }
    });

    return notFound("No shopping items matched the clear request.");
  }

  const items = await ctx.services.shopping.listItems();
  try {
    await ctx.services.email.sendFamilyChangeNotification(
      createShoppingClearNotification(input, { clearedItems, items }),
      ctx.logger
    );
  } catch (error) {
    await ctx.logger.error({
      message: "Failed to send shopping clear notification email.",
      process: ctx.metadata.processName,
      correlationId: ctx.metadata.correlationId,
      error
    });
  }

  await ctx.logger.info({
    message: "Shopping items cleared.",
    process: ctx.metadata.processName,
    correlationId: ctx.metadata.correlationId,
    data: {
      clearedCount: clearedItems.length,
      itemCount: items.length
    }
  });

  return value({ clearedItems, items });
}

function createShoppingClearNotification(
  input: ShoppingClearItemsInput,
  data: ShoppingClearItemsOutput
): HomeChangeNotification {
  const count = data.clearedItems.length;

  return {
    domain: "shopping",
    action: "clear",
    changedBy: input.changedBy,
    summary: `${input.changedBy ?? "Someone"} cleared ${count} shopping item${count === 1 ? "" : "s"}.`,
    details: data.clearedItems.map((item) => `${item.name} x ${item.quantity}${item.store ? `, ${item.store}` : ""}`),
    snapshot: {
      shoppingItems: data.items
    },
    changedAt: new Date().toISOString()
  };
}
