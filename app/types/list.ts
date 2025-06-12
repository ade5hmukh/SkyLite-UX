export type ListItem = {
  id: string;
  name: string;
  checked?: boolean;
  quantity?: number;
  unit?: string | null;
  notes?: string | null;
  order: number;
  shoppingListId: string;
  [key: string]: any; // Allow for additional properties
};

export type List = {
  readonly id: string;
  readonly name: string;
  readonly items: readonly ListItem[];
  readonly order: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly _count?: {
    readonly items: number;
  };
};
