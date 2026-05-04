import { z } from "zod";
import { FAMILY_MEMBER_NAMES, TODO_ASSIGNEES } from "@/nextsignal/domain/home";

// Put shared schemas here when multiple processes or routes use them.
// The starter uses Zod, but NextSignal only needs the adapter contract.
// You can replace Zod later without changing process lifecycle semantics.
export const healthInputSchema = z.object({}).passthrough();

export type HealthInput = z.infer<typeof healthInputSchema>;

export const familyMemberNameSchema = z.enum(FAMILY_MEMBER_NAMES);
export const todoAssigneeSchema = z.enum(TODO_ASSIGNEES);

export const shoppingListItemsInputSchema = z.object({
  store: z.string().min(1).optional()
});

export const shoppingAddItemInputSchema = z.object({
  name: z.string().min(1),
  quantity: z.string().min(1).optional(),
  store: z.string().min(1).optional(),
  changedBy: familyMemberNameSchema.optional()
});

export const shoppingClearItemsInputSchema = z.object({
  all: z.boolean().optional(),
  ids: z.array(z.string().min(1)).optional(),
  names: z.array(z.string().min(1)).optional(),
  store: z.string().min(1).optional(),
  changedBy: familyMemberNameSchema.optional()
}).refine(
  (input) => input.all === true || (input.ids?.length ?? 0) > 0 || (input.names?.length ?? 0) > 0,
  { message: "Provide `all: true`, at least one id, or at least one name." }
);

export const todoListInputSchema = z.object({
  assignee: todoAssigneeSchema.optional(),
  includeCompleted: z.boolean().optional()
});

export const todoAddInputSchema = z.object({
  title: z.string().min(1),
  assignee: todoAssigneeSchema,
  changedBy: familyMemberNameSchema.optional()
});

export const todoCompleteInputSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  assignee: todoAssigneeSchema.optional(),
  changedBy: familyMemberNameSchema.optional()
}).refine(
  (input) => Boolean(input.id || input.title),
  { message: "Provide either `id` or `title`." }
);

const shoppingItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  quantity: z.string(),
  store: z.string().nullable(),
  createdAt: z.string()
});

const todoItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  assignee: todoAssigneeSchema,
  completedAt: z.string().nullable(),
  createdAt: z.string()
});

export const homeChangeNotificationSchema = z.object({
  domain: z.enum(["shopping", "todos"]),
  action: z.string(),
  changedBy: familyMemberNameSchema.optional(),
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
