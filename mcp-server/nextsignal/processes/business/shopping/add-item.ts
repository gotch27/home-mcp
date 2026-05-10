import { allowAnonymous, businessProcess, validateWith, value } from "@gotch/nextsignal";
import type { ProcessContext } from "@gotch/nextsignal";
import type { AppServices } from "@/nextsignal/services";
import { shoppingAddItemInputSchema, type ShoppingAddItemInput } from "@/nextsignal/schemas";
import type { HomeChangeNotification, ShoppingItem } from "@/nextsignal/domain/home";

export type ShoppingAddItemOutput = {
  item: ShoppingItem;
  items: ShoppingItem[];
};

export const shoppingAddItem = businessProcess<ShoppingAddItemInput, ShoppingAddItemOutput, AppServices>({
  name: "shopping.addItem",
  metadata: {
    description: "Adds a shopping item and notifies the family.",
    tags: ["shopping", "business"],
    owner: "home",
    version: "0.1.0"
  },
  auth: allowAnonymous(),
  validate: validateWith(shoppingAddItemInputSchema),
  handle: shoppingAddItemHandle
});

async function shoppingAddItemHandle(ctx: ProcessContext<AppServices>, input: ShoppingAddItemInput) {
  await ctx.logger.info({
    message: "Adding shopping item.",
    process: ctx.metadata.processName,
    correlationId: ctx.metadata.correlationId,
    data: {
      name: input.name,
      quantity: input.quantity,
      store: input.store,
      changedBy: input.changedBy
    }
  });

  const item = await ctx.services.shopping.addItem(input);
  const items = await ctx.services.shopping.listItems();

  try {
    await ctx.services.email.sendFamilyChangeNotification(
      createShoppingAddNotification(input, { item, items }),
      ctx.logger
    );
  } catch (error) {
    await ctx.logger.error({
      message: "Failed to send shopping add notification email.",
      process: ctx.metadata.processName,
      correlationId: ctx.metadata.correlationId,
      error
    });
  }

  await ctx.logger.info({
    message: "Shopping item added.",
    process: ctx.metadata.processName,
    correlationId: ctx.metadata.correlationId,
    data: {
      id: item.id,
      name: item.name,
      store: item.store,
      itemCount: items.length
    }
  });

  return value({ item, items });
}

function createShoppingAddNotification(
  input: ShoppingAddItemInput,
  data: ShoppingAddItemOutput
): HomeChangeNotification {
  return {
    domain: "shopping",
    action: "add",
    changedBy: input.changedBy,
    summary: `${input.changedBy ?? "Someone"} added ${data.item.name} to the shopping list.`,
    details: [
      `Quantity: ${data.item.quantity}`,
      `Store: ${data.item.store ?? "Any"}`
    ],
    snapshot: {
      shoppingItems: data.items
    },
    changedAt: new Date().toISOString()
  };
}
