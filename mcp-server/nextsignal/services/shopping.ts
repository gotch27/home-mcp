import { getSql } from "@/nextsignal/services/database";
import type { ShoppingItem } from "@/nextsignal/domain/home";

type ShoppingItemRow = {
  id: string;
  name: string;
  quantity: string;
  store: string | null;
  created_at: Date | string;
};

export type ListShoppingItemsInput = {
  store?: string;
};

export type AddShoppingItemInput = {
  name: string;
  quantity?: string;
  store?: string;
};

export type ClearShoppingItemsInput = {
  all?: boolean;
  ids?: string[];
  names?: string[];
  store?: string;
};

export const shoppingService = {
  async listItems(input: ListShoppingItemsInput = {}): Promise<ShoppingItem[]> {
    const sql = await getSql();
    const store = normalizeOptionalText(input.store)?.toLowerCase();
    const rows = await sql<ShoppingItemRow[]>`
      SELECT id, name, quantity, store, created_at
      FROM home_shopping_items
      WHERE (${store === undefined} OR lower(coalesce(store, '')) = ${store ?? ""})
      ORDER BY created_at ASC
    `;

    return rows.map(mapShoppingItem);
  },

  async addItem(input: AddShoppingItemInput): Promise<ShoppingItem> {
    const sql = await getSql();
    const id = crypto.randomUUID();
    const name = input.name.trim();
    const quantity = normalizeOptionalText(input.quantity) ?? "1";
    const store = normalizeOptionalText(input.store) ?? null;
    const [row] = await sql<ShoppingItemRow[]>`
      INSERT INTO home_shopping_items (id, name, quantity, store)
      VALUES (${id}, ${name}, ${quantity}, ${store})
      RETURNING id, name, quantity, store, created_at
    `;

    return mapShoppingItem(row);
  },

  async clearItems(input: ClearShoppingItemsInput): Promise<ShoppingItem[]> {
    const sql = await getSql();
    const ids = input.ids?.map((id) => id.trim()).filter(Boolean) ?? [];
    const names = input.names?.map((name) => name.trim().toLowerCase()).filter(Boolean) ?? [];
    const store = normalizeOptionalText(input.store)?.toLowerCase();
    const rows = await sql<ShoppingItemRow[]>`
      DELETE FROM home_shopping_items
      WHERE (
        ${input.all === true}
        OR (${ids.length > 0} AND id = ANY(${ids}::text[]))
        OR (${names.length > 0} AND lower(name) = ANY(${names}::text[]))
      )
      AND (${store === undefined} OR lower(coalesce(store, '')) = ${store ?? ""})
      RETURNING id, name, quantity, store, created_at
    `;

    return rows.map(mapShoppingItem);
  }
};

function mapShoppingItem(row: ShoppingItemRow): ShoppingItem {
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    store: row.store,
    createdAt: toIso(row.created_at)
  };
}

function normalizeOptionalText(value: string | undefined) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
