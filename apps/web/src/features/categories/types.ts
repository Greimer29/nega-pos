export type Category = {
  id: number
  name: string
  active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type CategoryInput = {
  name: string
  sort_order?: number
}

export type CategoryUpdateInput = {
  name?: string
  active?: boolean
  sort_order?: number
}

export type CategoryListResponse = {
  data: {
    categories: Category[]
  }
}

export type CategoryResponse = {
  data: {
    category: Category
  }
}
