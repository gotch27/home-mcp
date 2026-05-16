import { z } from "zod";
import { dispatchMcpTool } from "@/nextsignal/mcp/tools/context";
import { toMcpToolResult } from "@/nextsignal/mcp/result";
import type { NextSignalMcpTool } from "@/nextsignal/mcp/types";
import type {
  ShoppingAddItemInput,
  ShoppingClearItemsInput,
  ShoppingListItemsInput
} from "@/nextsignal/schemas";

const shoppingAddItemSchema = {
  name: z.string().min(1),
  quantity: z.string().min(1).optional(),
  store: z.string().min(1).optional()
};

const spaceIdSchema = z.string().min(1);

export const shoppingTools: NextSignalMcpTool[] = [
  {
    register(server, { app }) {
      server.registerTool(
        "shopping_list_items",
        {
          title: "List Shopping Items",
          description: "Lists current shopping items in the requested home space, optionally filtered by store.",
          inputSchema: {
            spaceId: spaceIdSchema,
            store: z.string().min(1).optional()
          }
        },
        async (input, extra) => toMcpToolResult(await dispatchMcpTool<ShoppingListItemsInput>(app, "shopping.listItems", input, extra))
      );
    }
  },
  {
    register(server, { app }) {
      server.registerTool(
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
          }
        },
        async (input, extra) => toMcpToolResult(await dispatchMcpTool<ShoppingAddItemInput>(app, "shopping.addItem", input, extra))
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
            ids: z.array(z.string().min(1)).optional(),
            names: z.array(z.string().min(1)).optional(),
            store: z.string().min(1).optional()
          }
        },
        async (input, extra) => toMcpToolResult(await dispatchMcpTool<ShoppingClearItemsInput>(app, "shopping.clearItems", input, extra))
      );
    }
  }
];
