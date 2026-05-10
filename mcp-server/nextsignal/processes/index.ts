import { healthApi } from "@/nextsignal/processes/api/health";
import { pruneLogsApi } from "@/nextsignal/processes/api/logs/prune";
import { shoppingListItemsApi } from "@/nextsignal/processes/api/shopping/list-items";
import { todoListApi } from "@/nextsignal/processes/api/todos/list";
import { healthBusiness } from "@/nextsignal/processes/business/health";
import { shoppingAddItem } from "@/nextsignal/processes/business/shopping/add-item";
import { shoppingClearItems } from "@/nextsignal/processes/business/shopping/clear-items";
import { todoAdd } from "@/nextsignal/processes/business/todos/add";
import { todoComplete } from "@/nextsignal/processes/business/todos/complete";

// Register every process here. Process names must be unique.
//
// Suggested folders:
// - api: route-facing processes
// - business: reusable application logic
// - distributed: queue-backed work
// - recurring: scheduled work
export const processes = [
  healthApi,
  pruneLogsApi,
  shoppingListItemsApi,
  todoListApi,
  healthBusiness,
  shoppingAddItem,
  shoppingClearItems,
  todoAdd,
  todoComplete
];
