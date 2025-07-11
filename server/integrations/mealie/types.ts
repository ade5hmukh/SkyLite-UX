export interface MealieShoppingList {
  id: string
  name: string
  extras: Record<string, any>
  createdAt: string
  updatedAt: string
  groupId: string
  userId: string
  householdId: string
  listItems: MealieShoppingListItem[]
  labelSettings: MealieLabelSetting[]
  recipeReferences: any[]
}

export interface MealieShoppingListItem {
  id: string | null
  quantity: number
  unit: MealieUnit | null
  food: MealieFood | null
  note: string
  isFood: boolean
  disableAmount: boolean
  display: string
  shoppingListId: string
  checked: boolean
  position: number
  foodId: string | null
  labelId: string | null
  unitId: string | null
  extras: Record<string, any>
  groupId: string
  householdId: string
  label: MealieLabel | null
  recipeReferences: any[]
  createdAt: string
  updatedAt: string
}

export interface MealieUnit {
  id: string
  name: string
  pluralName: string
  description: string
  extras: Record<string, any>
  fraction: boolean
  abbreviation: string
  pluralAbbreviation: string | null
  useAbbreviation: boolean
  aliases: string[]
  createdAt: string
  updatedAt: string
}

export interface MealieFood {
  id: string
  name: string
  pluralName: string | null
  description: string
  extras: Record<string, any>
  labelId: string | null
  aliases: string[]
  householdsWithIngredientFood: any[]
  label: MealieLabel | null
  createdAt: string
  updatedAt: string
}

export interface MealieLabel {
  name: string
  color: string
  groupId: string
  id: string
}

export interface MealieLabelSetting {
  shoppingListId: string
  labelId: string
  position: number
  id: string
  label: MealieLabel
}

export interface PaginatedResponse<T> {
  page: number
  per_page: number
  total: number
  total_pages: number
  items: T[]
  next: string | null
  previous: string | null
}

export interface MealieBulkUpdateResponse {
  createdItems: MealieShoppingListItem[]
  updatedItems: MealieShoppingListItem[]
  deletedItems: MealieShoppingListItem[]
} 