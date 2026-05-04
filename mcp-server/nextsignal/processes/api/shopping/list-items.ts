import { allowAnonymous, apiProcess, validateWith, value } from "@gotch/nextsignal";
import type { AppServices } from "@/nextsignal/services";
import { shoppingListItemsInputSchema, type ShoppingListItemsInput } from "@/nextsignal/schemas";
import type { ShoppingItem } from "@/nextsignal/domain/home";

export const shoppingListItemsApi = apiProcess<ShoppingListItemsInput, ShoppingItem[], AppServices>({
  name: "shopping.listItems",
  metadata: {
    description: "Lists current shopping items.",
    tags: ["shopping", "api"],
    owner: "home",
    version: "0.1.0"
  },
  auth: allowAnonymous(),
  validate: validateWith(shoppingListItemsInputSchema),
  async handle(ctx, input) {
    return value(await ctx.services.shopping.listItems(input));
  }
});
