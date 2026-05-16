import { z } from "zod";

// Put shared schemas here when multiple processes or routes use them.
// The starter uses Zod, but NextSignal only needs the adapter contract.
// You can replace Zod later without changing process lifecycle semantics.
export const healthInputSchema = z.object({}).passthrough();

export type HealthInput = z.infer<typeof healthInputSchema>;

export const todoAssigneeUserIdSchema = z.string().trim().min(1);

export const ensureCurrentUserInputSchema = z.object({}).passthrough();

export const spacesListInputSchema = z.object({}).passthrough();

export const spacesListMembersInputSchema = z.object({}).passthrough();

export const spacesCreateInputSchema = z.object({
  name: z.string().trim().min(1).max(80)
});

export const spacesJoinInputSchema = z.object({
  code: z.string().trim().min(4).max(32)
});

export const spacesSelectInputSchema = z.object({
  spaceId: z.string().min(1)
});

export const shoppingListItemsInputSchema = z.object({
  store: z.string().min(1).optional()
});

export const shoppingAddItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.string().min(1).optional(),
  store: z.string().min(1).optional()
});

export const shoppingAddItemInputSchema = shoppingAddItemSchema.extend({
  name: z.string().min(1).optional(),
  items: z.array(shoppingAddItemSchema).min(1).optional()
}).refine(
  (input) => Boolean(input.name || input.items?.length),
  { message: "Provide either a single item with `name`, or bulk items with `items`." }
);

export const shoppingClearItemsInputSchema = z.object({
  all: z.boolean().optional(),
  ids: z.array(z.string().min(1)).optional(),
  names: z.array(z.string().min(1)).optional(),
  store: z.string().min(1).optional()
}).refine(
  (input) => input.all === true || (input.ids?.length ?? 0) > 0 || (input.names?.length ?? 0) > 0,
  { message: "Provide `all: true`, at least one id, or at least one name." }
);

export const todoListInputSchema = z.object({
  assigneeUserId: todoAssigneeUserIdSchema.optional(),
  includeCompleted: z.boolean().optional()
});

export const todoAddInputSchema = z.object({
  title: z.string().min(1),
  assigneeUserId: todoAssigneeUserIdSchema
});

export const todoCompleteInputSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  assigneeUserId: todoAssigneeUserIdSchema.optional()
}).refine(
  (input) => Boolean(input.id || input.title),
  { message: "Provide either `id` or `title`." }
);

const shoppingItemSchema = z.object({
  id: z.string(),
  spaceId: z.string(),
  name: z.string(),
  quantity: z.string(),
  store: z.string().nullable(),
  createdAt: z.string()
});

const todoItemSchema = z.object({
  id: z.string(),
  spaceId: z.string(),
  title: z.string(),
  assigneeUserId: todoAssigneeUserIdSchema,
  assigneeDisplayName: z.string(),
  completedAt: z.string().nullable(),
  createdAt: z.string()
});

export const homeChangeNotificationSchema = z.object({
  domain: z.enum(["shopping", "todos"]),
  action: z.string(),
  spaceName: z.string(),
  changedBy: z.string(),
  summary: z.string(),
  details: z.array(z.string()),
  snapshot: z.object({
    shoppingItems: z.array(shoppingItemSchema).optional(),
    todos: z.array(todoItemSchema).optional()
  }),
  changedAt: z.string()
});

export type ShoppingListItemsInput = z.infer<typeof shoppingListItemsInputSchema>;
export type ShoppingAddItemInput = z.infer<typeof shoppingAddItemInputSchema>;
export type ShoppingClearItemsInput = z.infer<typeof shoppingClearItemsInputSchema>;
export type TodoListInput = z.infer<typeof todoListInputSchema>;
export type TodoAddInput = z.infer<typeof todoAddInputSchema>;
export type TodoCompleteInput = z.infer<typeof todoCompleteInputSchema>;
export type HomeChangeNotificationInput = z.infer<typeof homeChangeNotificationSchema>;
export type EnsureCurrentUserInput = z.infer<typeof ensureCurrentUserInputSchema>;
export type SpacesListInput = z.infer<typeof spacesListInputSchema>;
export type SpacesListMembersInput = z.infer<typeof spacesListMembersInputSchema>;
export type SpacesCreateInput = z.infer<typeof spacesCreateInputSchema>;
export type SpacesJoinInput = z.infer<typeof spacesJoinInputSchema>;
export type SpacesSelectInput = z.infer<typeof spacesSelectInputSchema>;
