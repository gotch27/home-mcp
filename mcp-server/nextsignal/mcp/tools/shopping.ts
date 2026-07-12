import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { dispatchMcpTool } from "@/nextsignal/mcp/tools/context";
import { toMcpToolResult } from "@/nextsignal/mcp/result";
import type { NextSignalMcpTool, NextSignalMcpToolContext } from "@/nextsignal/mcp/types";
import { SHOPPING_APP_URI } from "@/nextsignal/mcp/ui/shopping-resource";
import type { ShoppingAddItemOutput } from "@/nextsignal/processes/business/shopping/add-item";
import type { ShoppingClearItemsOutput } from "@/nextsignal/processes/business/shopping/clear-items";
import type { ShoppingUpdateItemsOutput } from "@/nextsignal/processes/business/shopping/update-items";
import type { ShoppingItem } from "@/nextsignal/domain/home";
import type { SpaceSummary } from "@/nextsignal/services/spaces";
import type {
  ShoppingAddItemInput,
  ShoppingClearItemsInput,
  ShoppingListItemsInput,
  ShoppingUpdateItemsInput,
  SpacesListInput
} from "@/nextsignal/schemas";

const shoppingAddItemSchema = {
  name: z.string().min(1),
  quantity: z.string().min(1).optional(),
  store: z.string().min(1).optional()
};

const spaceIdSchema = z.string().min(1);
const itemIdSchema = z.string().min(1);

export const shoppingTools: NextSignalMcpTool[] = [
  {
    register(server, context) {
      registerAppTool(
        server,
        "shopping_list_items",
        {
          title: "List Shopping Items",
          description: "Lists current shopping items in the requested home space, optionally filtered by store.",
          inputSchema: {
            spaceId: spaceIdSchema,
            store: z.string().min(1).optional()
          },
          annotations: { readOnlyHint: true },
          _meta: {
            ui: { resourceUri: SHOPPING_APP_URI }
          }
        },
        async (input, extra) => listShoppingItems(context, input, extra)
      );
    }
  },
  {
    register(server, context) {
      registerAppTool(
        server,
        "shopping_add_item",
        {
          title: "Add Shopping Item",
          description: "Adds one or more items to the requested home space shopping list and emails other space members once.",
          inputSchema: {
            spaceId: spaceIdSchema,
            name: z.string().min(1).optional(),
            quantity: z.string().min(1).optional(),
            store: z.string().min(1).optional(),
            items: z.array(z.object(shoppingAddItemSchema)).min(1).optional()
          },
          annotations: { readOnlyHint: false, destructiveHint: false },
          _meta: {
            ui: { resourceUri: SHOPPING_APP_URI }
          }
        },
        async (input, extra) => addShoppingItems(context, input, extra)
      );
    }
  },
  {
    register(server, { app }) {
      server.registerTool(
        "shopping_clear_items",
        {
          title: "Clear Shopping Items",
          description: "Clears requested home space shopping items by id, name, store, or all, then emails other space members.",
          inputSchema: {
            spaceId: spaceIdSchema,
            all: z.boolean().optional(),
            ids: z.array(itemIdSchema).optional(),
            names: z.array(z.string().min(1)).optional(),
            store: z.string().min(1).optional()
          },
          annotations: { readOnlyHint: false, destructiveHint: true }
        },
        async (input, extra) => toMcpToolResult(await dispatchMcpTool<ShoppingClearItemsInput>(app, "shopping.clearItems", input, extra))
      );
    }
  },
  {
    register(server, context) {
      registerAppTool(
        server,
        "shopping_ui_update_items",
        {
          title: "Update Shopping Items from UI",
          description: "Updates shopping item quantities, stores, or space from the interactive shopping UI.",
          inputSchema: {
            spaceId: spaceIdSchema,
            itemIds: z.array(itemIdSchema).min(1),
            targetSpaceId: spaceIdSchema.optional(),
            updates: z.array(z.object({
              id: itemIdSchema,
              quantity: z.string().min(1).max(40).optional(),
              store: z.string().max(120).nullable().optional()
            })).min(1).optional()
          },
          annotations: { readOnlyHint: false, destructiveHint: false },
          _meta: {
            ui: {
              resourceUri: SHOPPING_APP_URI,
              visibility: ["app"]
            }
          }
        },
        async (input, extra) => updateShoppingItems(context, input, extra)
      );
    }
  },
  {
    register(server, context) {
      registerAppTool(
        server,
        "shopping_ui_clear_items",
        {
          title: "Clear Selected Shopping Items from UI",
          description: "Clears explicitly selected items from the interactive shopping list.",
          inputSchema: {
            spaceId: spaceIdSchema,
            ids: z.array(itemIdSchema).min(1)
          },
          annotations: { readOnlyHint: false, destructiveHint: true },
          _meta: {
            ui: {
              resourceUri: SHOPPING_APP_URI,
              visibility: ["app"]
            }
          }
        },
        async (input, extra) => clearShoppingItemsFromUi(context, input, extra)
      );
    }
  }
];

type ToolExtra = Parameters<typeof dispatchMcpTool>[3];

type ShoppingView = {
  view: "added" | "list";
  spaceId: string;
  spaces: Array<{ id: string; name: string }>;
  items: ShoppingItem[];
  stores: string[];
};

async function listShoppingItems(
  { app }: NextSignalMcpToolContext,
  input: ShoppingListItemsInput,
  extra: ToolExtra
): Promise<CallToolResult> {
  const result = await dispatchMcpTool<ShoppingListItemsInput>(app, "shopping.listItems", input, extra);
  if (!result.ok) return toMcpToolResult(result);

  const spaces = await listSpaces(app, extra);
  if (!spaces.ok) return spaces.error;

  const items = (result.data ?? []) as ShoppingItem[];
  return shoppingViewResult({
    view: "list",
    spaceId: input.spaceId,
    spaces: spaces.value,
    items,
    stores: distinctStores(items)
  });
}

async function addShoppingItems(
  { app }: NextSignalMcpToolContext,
  input: ShoppingAddItemInput,
  extra: ToolExtra
): Promise<CallToolResult> {
  const result = await dispatchMcpTool<ShoppingAddItemInput>(app, "shopping.addItem", input, extra);
  if (!result.ok) return toMcpToolResult(result);

  const spaces = await listSpaces(app, extra);
  if (!spaces.ok) return spaces.error;

  const data = result.data as ShoppingAddItemOutput;
  return shoppingViewResult({
    view: "added",
    spaceId: input.spaceId,
    spaces: spaces.value,
    items: data.addedItems,
    stores: distinctStores(data.items)
  });
}

async function updateShoppingItems(
  { app }: NextSignalMcpToolContext,
  input: ShoppingUpdateItemsInput,
  extra: ToolExtra
): Promise<CallToolResult> {
  const result = await dispatchMcpTool<ShoppingUpdateItemsInput>(app, "shopping.updateItems", input, extra);
  if (!result.ok) return toMcpToolResult(result);

  const data = result.data as ShoppingUpdateItemsOutput;
  const [spaces, listResult] = await Promise.all([
    listSpaces(app, extra),
    dispatchMcpTool<ShoppingListItemsInput>(app, "shopping.listItems", { spaceId: data.spaceId }, extra)
  ]);
  if (!spaces.ok) return spaces.error;
  if (!listResult.ok) return toMcpToolResult(listResult);

  return shoppingViewResult({
    view: "added",
    spaceId: data.spaceId,
    spaces: spaces.value,
    items: data.items,
    stores: distinctStores((listResult.data ?? []) as ShoppingItem[])
  });
}

async function clearShoppingItemsFromUi(
  { app }: NextSignalMcpToolContext,
  input: { spaceId: string; ids: string[] },
  extra: ToolExtra
): Promise<CallToolResult> {
  const result = await dispatchMcpTool<ShoppingClearItemsInput>(app, "shopping.clearItems", input, extra);
  if (!result.ok) return toMcpToolResult(result);

  const spaces = await listSpaces(app, extra);
  if (!spaces.ok) return spaces.error;

  const data = result.data as ShoppingClearItemsOutput;
  return shoppingViewResult({
    view: "list",
    spaceId: input.spaceId,
    spaces: spaces.value,
    items: data.items,
    stores: distinctStores(data.items)
  });
}

async function listSpaces(
  app: NextSignalMcpToolContext["app"],
  extra: ToolExtra
): Promise<
  | { ok: true; value: Array<{ id: string; name: string }> }
  | { ok: false; error: CallToolResult }
> {
  const result = await dispatchMcpTool<SpacesListInput>(app, "spaces.list", {}, extra);
  if (!result.ok) return { ok: false, error: toMcpToolResult(result) };

  return {
    ok: true,
    value: ((result.data ?? []) as SpaceSummary[]).map((space) => ({
      id: space.id,
      name: space.name
    }))
  };
}

function shoppingViewResult(view: ShoppingView): CallToolResult {
  const spaceName = view.spaces.find((space) => space.id === view.spaceId)?.name ?? "space";
  const verb = view.view === "added" ? "Added" : "Found";

  return {
    structuredContent: view,
    content: [
      {
        type: "text",
        text: `${verb} ${view.items.length} shopping item${view.items.length === 1 ? "" : "s"} in ${spaceName}.\n${JSON.stringify(view.items, null, 2)}`
      }
    ]
  };
}

function distinctStores(items: ShoppingItem[]) {
  return [...new Set(items
    .map((item) => item.store?.trim())
    .filter((store): store is string => Boolean(store)))]
    .sort((left, right) => left.localeCompare(right));
}
