import { healthApi } from "@/nextsignal/processes/api/health";
import { shoppingListItemsApi } from "@/nextsignal/processes/api/shopping/list-items";
import { todoListApi } from "@/nextsignal/processes/api/todos/list";
import { healthBusiness } from "@/nextsignal/processes/business/health";
import { shoppingAddItem } from "@/nextsignal/processes/distributed/shopping/add-item";
import { shoppingClearItems } from "@/nextsignal/processes/distributed/shopping/clear-items";
import { todoAdd } from "@/nextsignal/processes/distributed/todos/add";
import { todoComplete } from "@/nextsignal/processes/distributed/todos/complete";

// Register every process here. Process names must be unique.
//
// Suggested folders:
// - api: route-facing processes
// - business: reusable application logic
// - distributed: queue-backed work
// - recurring: scheduled work
export const processes = [
  healthApi,
  shoppingListItemsApi,
  todoListApi,
  healthBusiness,
  shoppingAddItem,
  shoppingClearItems,
  todoAdd,
  todoComplete
];
