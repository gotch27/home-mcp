import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import { homeShoppingItems } from "@/nextsignal/db/schema";
import { getDb } from "@/nextsignal/services/database";
import type { ShoppingItem } from "@/nextsignal/domain/home";

export type ListShoppingItemsInput = {
  spaceId: string;
  store?: string;
};

export type AddShoppingItemInput = {
  spaceId: string;
  name: string;
  quantity?: string;
  store?: string;
};

export type ClearShoppingItemsInput = {
  spaceId: string;
  all?: boolean;
  ids?: string[];
  names?: string[];
  store?: string;
};

export const shoppingService = {
  async listItems(input: ListShoppingItemsInput): Promise<ShoppingItem[]> {
    const db = await getDb();
    const store = normalizeOptionalText(input.store)?.toLowerCase();
    const rows = await db
      .select()
      .from(homeShoppingItems)
      .where(and(
        eq(homeShoppingItems.spaceId, input.spaceId),
        store ? sql`lower(coalesce(${homeShoppingItems.store}, '')) = ${store}` : undefined
      ))
      .orderBy(asc(homeShoppingItems.createdAt));

    return rows.map(mapShoppingItem);
  },

  async addItem(input: AddShoppingItemInput): Promise<ShoppingItem> {
    const db = await getDb();
    const id = crypto.randomUUID();
    const name = input.name.trim();
    const quantity = normalizeOptionalText(input.quantity) ?? "1";
    const store = normalizeOptionalText(input.store) ?? null;
    const [row] = await db
      .insert(homeShoppingItems)
      .values({ id, spaceId: input.spaceId, name, quantity, store })
      .returning();

    return mapShoppingItem(row);
  },

  async clearItems(input: ClearShoppingItemsInput): Promise<ShoppingItem[]> {
    const db = await getDb();
    const ids = input.ids?.map((id) => id.trim()).filter(Boolean) ?? [];
    const names = input.names?.map((name) => name.trim().toLowerCase()).filter(Boolean) ?? [];
    const store = normalizeOptionalText(input.store)?.toLowerCase();
    const matchConditions = [
      ids.length > 0 ? inArray(homeShoppingItems.id, ids) : undefined,
      names.length > 0 ? inArray(sql<string>`lower(${homeShoppingItems.name})`, names) : undefined
    ].filter(Boolean);
    const itemCondition = input.all === true ? undefined : or(...matchConditions);
    const storeCondition = store ? sql`lower(coalesce(${homeShoppingItems.store}, '')) = ${store}` : undefined;
    const rows = await db
      .delete(homeShoppingItems)
      .where(and(eq(homeShoppingItems.spaceId, input.spaceId), itemCondition, storeCondition))
      .returning();

    return rows.map(mapShoppingItem);
  }
};

function mapShoppingItem(row: typeof homeShoppingItems.$inferSelect): ShoppingItem {
  return {
    id: row.id,
    spaceId: row.spaceId,
    name: row.name,
    quantity: row.quantity,
    store: row.store,
    createdAt: row.createdAt.toISOString()
  };
}

function normalizeOptionalText(value: string | undefined) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
