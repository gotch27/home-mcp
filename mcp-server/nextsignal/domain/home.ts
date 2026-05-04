export const FAMILY_MEMBER_NAMES = ["Gorazd", "Marija", "Bojana", "Zvonko"] as const;
export const TODO_ASSIGNEES = [...FAMILY_MEMBER_NAMES, "all"] as const;

export type FamilyMemberName = (typeof FAMILY_MEMBER_NAMES)[number];
export type TodoAssignee = (typeof TODO_ASSIGNEES)[number];

export type FamilyMember = {
  name: FamilyMemberName;
  email: string;
};

export type ShoppingItem = {
  id: string;
  name: string;
  quantity: string;
  store: string | null;
  createdAt: string;
};

export type TodoItem = {
  id: string;
  title: string;
  assignee: TodoAssignee;
  completedAt: string | null;
  createdAt: string;
};

export type HomeChangeNotification = {
  domain: "shopping" | "todos";
  action: string;
  changedBy?: FamilyMemberName;
  summary: string;
  details: string[];
  snapshot: {
    shoppingItems?: ShoppingItem[];
    todos?: TodoItem[];
  };
  changedAt: string;
};
