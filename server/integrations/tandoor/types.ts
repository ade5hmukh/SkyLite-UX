export interface TandoorShoppingList {
  id: number
  title: string
  created_by: number
  created_at: string
  note: string
  entries: TandoorShoppingListEntry[]
}

export interface TandoorShoppingListEntry {
  id: number
  list_recipe: number | null
  food: {
    id: number
    name: string
    plural_name: string
  }
  unit: {
    id: number
    name: string
    plural_name: string
  } | null
  amount: number
  order: number
  checked: boolean
}

export interface TandoorFood {
  id: number
  name: string
}

export interface TandoorUnit {
  id: number
  name: string
  plural_name: string
} 