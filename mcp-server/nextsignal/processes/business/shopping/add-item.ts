import { businessProcess, forwardFault, requireUser, validateWith, value } from "@gotch/nextsignal";
import type { ProcessContext } from "@gotch/nextsignal";
import { requireActiveHomeSpace } from "@/nextsignal/processes/business/context";
import type { AppServices } from "@/nextsignal/services";
import { shoppingAddItemInputSchema, type ShoppingAddItemInput } from "@/nextsignal/schemas";
import type { ActiveHomeSpace, HomeChangeNotification, ShoppingItem } from "@/nextsignal/domain/home";

export type ShoppingAddItemOutput = {
  item: ShoppingItem;
  items: ShoppingItem[];
};

export const shoppingAddItem = businessProcess<ShoppingAddItemInput, ShoppingAddItemOutput, AppServices>({
  name: "shopping.addItem",
  metadata: {
    description: "Adds a shopping item and notifies the active home space.",
    tags: ["shopping", "business"],
    owner: "home",
    version: "0.1.0"
  },
  auth: requireUser(),
  validate: validateWith(shoppingAddItemInputSchema),
  handle: shoppingAddItemHandle
});

async function shoppingAddItemHandle(ctx: ProcessContext<AppServices>, input: ShoppingAddItemInput) {
  const activeResult = await requireActiveHomeSpace(ctx);
  if (!activeResult.ok) return forwardFault(activeResult);
  const activeSpace = activeResult.data!;

  await ctx.logger.info({
    message: "Adding shopping item.",
    process: ctx.metadata.processName,
    correlationId: ctx.metadata.correlationId,
    data: {
      name: input.name,
      quantity: input.quantity,
      store: input.store,
      spaceId: activeSpace.space.id,
      userId: activeSpace.user.id
    }
  });

  const item = await ctx.services.shopping.addItem({ ...input, spaceId: activeSpace.space.id });
  const items = await ctx.services.shopping.listItems({ spaceId: activeSpace.space.id });
  const recipients = await ctx.services.spaces.listNotificationMembers({
    spaceId: activeSpace.space.id,
    excludeUserId: activeSpace.user.id
  });

  try {
    await ctx.services.email.sendSpaceChangeNotification(
      createShoppingAddNotification(activeSpace, { item, items }),
      recipients,
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
      spaceId: activeSpace.space.id,
      name: item.name,
      store: item.store,
      itemCount: items.length
    }
  });

  return value({ item, items });
}

function createShoppingAddNotification(
  activeSpace: ActiveHomeSpace,
  data: ShoppingAddItemOutput
): HomeChangeNotification {
  return {
    domain: "shopping",
    action: "add",
    spaceName: activeSpace.space.name,
    changedBy: activeSpace.user.displayName,
    summary: `${activeSpace.user.displayName} added ${data.item.name} to the shopping list.`,
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
