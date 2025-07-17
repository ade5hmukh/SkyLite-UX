import type { Priority, Prisma } from "@prisma/client";
import type { JsonObject } from "type-fest";

// User types
export type User = Prisma.UserGetPayload<Record<string, never>>;
export type UserWithTodos = Prisma.UserGetPayload<{
  include: {
    todoColumn: {
      include: {
        todos: true;
      };
    };
  };
}>;

// Todo types
export type Todo = Prisma.TodoGetPayload<Record<string, never>>;
export type TodoWithUser = Prisma.TodoGetPayload<{
  include: {
    todoColumn: {
      include: {
        user: {
          select: {
            id: true;
            name: true;
            avatar: true;
          };
        };
      };
    };
  };
}>;

// Todo Column types
export type TodoColumn = Omit<Prisma.TodoColumnGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        avatar: true;
      };
    };
    todos: true;
    _count: {
      select: {
        todos: true;
      };
    };
  };
}>, "todos" | "createdAt" | "updatedAt"> & {
  todos?: Prisma.TodoGetPayload<Record<string, never>>[];
  createdAt: string;
  updatedAt: string;
};

export type TodoColumnBasic = Pick<TodoColumn, "id" | "name"> & {
  user?: {
    id: string;
    name: string;
    avatar: string | null;
  };
};

// Base types for lists
export interface BaseListItem {
  id: string;
  name: string;
  checked: boolean;
  order: number;
  notes: string | null;
}

// Shopping List types
export type ShoppingList = {
  id: string;
  name: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  items: readonly ShoppingListItem[];
  _count?: {
    items: number;
  };
  source?: "native" | "integration";
  integrationId?: string;
  integrationName?: string;
  integrationIcon?: string | null;
};

export type ShoppingListItem = BaseListItem & {
  quantity: number;
  unit: string | null;
  label: string | null;
  food: string | null;
  integrationData?: JsonObject;
  source?: "native" | "integration";
  integrationId?: string;
};

export type ShoppingListWithItems = Prisma.ShoppingListGetPayload<{
  include: { items: true };
}>;
export type ShoppingListWithItemsAndCount = Prisma.ShoppingListGetPayload<{
  include: {
    items: true;
    _count: { select: { items: true } };
  };
}>;

// Integration types
export type Integration = {
  id: string;
  name: string;
  type: string;
  service: string;
  apiKey: string | null;
  baseUrl: string | null;
  icon: string | null;
  enabled: boolean;
  settings: JsonObject | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateIntegrationInput = Omit<Integration, "id" | "createdAt" | "updatedAt">;
export type UpdateIntegrationInput = Partial<CreateIntegrationInput>;

// Create types for forms
export type CreateUserInput = Omit<User, "id" | "createdAt" | "updatedAt">;
export type CreateTodoInput = Omit<Todo, "id" | "createdAt" | "updatedAt">;
export type CreateShoppingListInput = Omit<ShoppingList, "id" | "createdAt" | "updatedAt" | "items">;
export type CreateShoppingListItemInput = Omit<ShoppingListItem, "id" | "shoppingListId">;

// Update types
export type UpdateTodoInput = Partial<Omit<Todo, "id" | "createdAt" | "updatedAt">>;
export type UpdateShoppingListItemInput = Partial<CreateShoppingListItemInput>;

// Todo List types
export type TodoList = {
  id: string;
  name: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  isDefault: boolean;
  items: readonly TodoListItem[];
  _count?: {
    items: number;
  };
};

export type TodoListItem = BaseListItem & {
  description: string;
  priority: Priority;
  dueDate: Date | null;
  todoColumnId: string;
  shoppingListId: string;
};

// Re-export Priority enum
export type { Priority };
