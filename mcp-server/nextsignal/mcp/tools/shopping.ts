import { z } from "zod";
import { FAMILY_MEMBER_NAMES } from "@/nextsignal/domain/home";
import { toMcpToolResult } from "@/nextsignal/mcp/result";
import type { NextSignalMcpTool } from "@/nextsignal/mcp/types";
import type {
  ShoppingAddItemInput,
  ShoppingClearItemsInput,
  ShoppingListItemsInput
} from "@/nextsignal/schemas";

const changedBySchema = z.enum(FAMILY_MEMBER_NAMES).optional();

export const shoppingTools: NextSignalMcpTool[] = [
  {
    register(server, { app }) {
      server.registerTool(
        "shopping_list_items",
        {
          title: "List Shopping Items",
          description: "Lists current shopping items, optionally filtered by store.",
          inputSchema: {
            store: z.string().min(1).optional()
          }
        },
        async (input) => toMcpToolResult(await app.dispatch<ShoppingListItemsInput>("shopping.listItems", input, { runtime: "api" }))
      );
    }
  },
  {
    register(server, { app }) {
      server.registerTool(
        "shopping_add_item",
        {
          title: "Add Shopping Item",
          description: "Adds an item to the shopping list and emails the family.",
          inputSchema: {
            name: z.string().min(1),
            quantity: z.string().min(1).optional(),
            store: z.string().min(1).optional(),
            changedBy: changedBySchema
          }
        },
        async (input) => toMcpToolResult(await app.dispatch<ShoppingAddItemInput>("shopping.addItem", input, { runtime: "api" }))
      );
    }
  },
  {
    register(server, { app }) {
      server.registerTool(
        "shopping_clear_items",
        {
          title: "Clear Shopping Items",
          description: "Clears shopping items by id, name, store, or all, then emails the family.",
          inputSchema: {
            all: z.boolean().optional(),
            ids: z.array(z.string().min(1)).optional(),
            names: z.array(z.string().min(1)).optional(),
            store: z.string().min(1).optional(),
            changedBy: changedBySchema
          }
        },
        async (input) => toMcpToolResult(await app.dispatch<ShoppingClearItemsInput>("shopping.clearItems", input, { runtime: "api" }))
      );
    }
  }
];
