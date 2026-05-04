import { allowAnonymous, distributedProcess, ok, validateWith, value } from "@gotch/nextsignal";
import type { ProcessContext, Result } from "@gotch/nextsignal";
import type { AppServices } from "@/nextsignal/services";
import {
  homeChangeNotificationSchema,
  shoppingAddItemInputSchema,
  type ShoppingAddItemInput
} from "@/nextsignal/schemas";
import type { HomeChangeNotification, ShoppingItem } from "@/nextsignal/domain/home";

export type ShoppingAddItemOutput = {
  item: ShoppingItem;
  items: ShoppingItem[];
};

export const shoppingAddItem = distributedProcess<ShoppingAddItemInput, ShoppingAddItemOutput, HomeChangeNotification, AppServices>({
  name: "shopping.addItem",
  metadata: {
    description: "Adds a shopping item and notifies the family.",
    tags: ["shopping", "distributed"],
    owner: "home",
    version: "0.1.0"
  },
  transient: homeChangeNotificationSchema,
  auth: allowAnonymous(),
  validate: validateWith(shoppingAddItemInputSchema),
  handle: shoppingAddItemHandle,
  map: shoppingAddItemMap,
  async work(ctx, notification) {
    await ctx.logger.info({
      message: "Processing shopping add notification.",
      process: ctx.metadata.processName,
      correlationId: ctx.metadata.correlationId,
      data: {
        action: notification.action,
        changedBy: notification.changedBy,
        itemCount: notification.snapshot.shoppingItems?.length ?? 0
      }
    });

    await ctx.services.email.sendFamilyChangeNotification(notification, ctx.logger);

    await ctx.logger.info({
      message: "Shopping add notification processed.",
      process: ctx.metadata.processName,
      correlationId: ctx.metadata.correlationId,
      data: {
        action: notification.action
      }
    });

    return ok();
  }
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

function shoppingAddItemMap(
  _ctx: unknown,
  input: ShoppingAddItemInput,
  result: Result<ShoppingAddItemOutput>
): HomeChangeNotification {
  const data = result.data;
  const item = data?.item;

  return {
    domain: "shopping",
    action: "add",
    changedBy: input.changedBy,
    summary: `${input.changedBy ?? "Someone"} added ${item?.name ?? input.name} to the shopping list.`,
    details: [
      `Quantity: ${item?.quantity ?? input.quantity ?? "1"}`,
      `Store: ${item?.store ?? input.store ?? "Any"}`
    ],
    snapshot: {
      shoppingItems: data?.items ?? []
    },
    changedAt: new Date().toISOString()
  };
}
