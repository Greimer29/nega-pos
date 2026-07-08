export type User = {
  id: number
  email: string
  name: string
  role: string
  active: boolean
  permissions: string[]
  createdAt: string
  updatedAt: string
}

export type VineValidationDetail = {
  message: string
  field?: string
  rule?: string
  meta?: Record<string, unknown>
}

export type StockInsuficienteDetail = {
  material_id: number
  name: string
  stock_actual: number
  consumo_proyectado: number
  faltante: number
}

export type StockInsuficienteDevolucionDetail = {
  material_id: number
  material_name: string
  required: string
  available: string
}

export type ApiErrorDetails =
  | VineValidationDetail[]
  | StockInsuficienteDetail[]
  | StockInsuficienteDevolucionDetail[]
  | Record<string, string | string[]>

export type ApiErrorBody = {
  code: string
  message: string
  details?: ApiErrorDetails
}

export type ApiErrorResponse = {
  error: ApiErrorBody
}

export type AuthUserResponse = {
  data: {
    user: User
  }
}

export type AuthMessageResponse = {
  data: {
    message: string
  }
}
