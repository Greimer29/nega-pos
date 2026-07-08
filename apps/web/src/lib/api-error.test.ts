import axios from 'axios'
import { describe, expect, it } from 'vitest'

import {
  apiErrorDetailsIncludeField,
  formatApiErrorDetails,
  formatValidationDetails,
  getApiError,
  getApiErrorMessage,
} from './api-error'

function axiosErrorWithBody(status: number, body: unknown) {
  return new axios.AxiosError('Request failed', String(status), undefined, undefined, {
    status,
    data: body,
    statusText: 'Error',
    headers: {},
    config: {} as never,
  })
}

describe('formatApiErrorDetails', () => {
  it('formats Vine validation array', () => {
    const details = [
      {
        message: 'The password field must have at least 8 characters',
        rule: 'minLength',
        field: 'password',
        meta: { min: 8 },
      },
    ]

    expect(formatApiErrorDetails(details)).toEqual([
      'The password field must have at least 8 characters',
    ])
  })

  it('formats legacy record object', () => {
    expect(formatApiErrorDetails({ email: 'Email inválido' })).toEqual(['email: Email inválido'])
  })

  it('formats stock insuficiente array', () => {
    const details = [
      {
        material_id: 1,
        name: 'Tela A',
        stock_actual: 5,
        consumo_proyectado: 7,
        faltante: 2,
      },
    ]

    expect(formatApiErrorDetails(details)).toEqual([
      'Tela A: faltan 2 unidades (stock 5, consumo 7)',
    ])
  })

  it('formats stock insuficiente devolucion array', () => {
    const details = [
      {
        material_id: 2,
        material_name: 'Hilo B',
        required: '10.0000',
        available: '3.0000',
      },
    ]

    expect(formatApiErrorDetails(details)).toEqual([
      'Hilo B: se requieren 10.0000 y hay 3.0000 disponibles',
    ])
  })

  it('returns empty array for unknown details', () => {
    expect(formatApiErrorDetails(null)).toEqual([])
    expect(formatApiErrorDetails([])).toEqual([])
    expect(formatApiErrorDetails([{ foo: 'bar' }])).toEqual([])
  })
})

describe('apiErrorDetailsIncludeField', () => {
  it('matches Vine validation field names', () => {
    const details = [
      {
        message: 'The selected chart is invalid',
        field: 'chart',
      },
    ]

    expect(apiErrorDetailsIncludeField(details, 'chart')).toBe(true)
    expect(apiErrorDetailsIncludeField(details, 'email')).toBe(false)
  })

  it('matches legacy record keys', () => {
    expect(apiErrorDetailsIncludeField({ chart: 'Valor inválido' }, 'chart')).toBe(true)
    expect(apiErrorDetailsIncludeField({ email: 'Email inválido' }, 'chart')).toBe(false)
  })
})

describe('getApiErrorMessage', () => {
  it('returns detail messages instead of generic validation text', () => {
    const error = axiosErrorWithBody(422, {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Los datos enviados no son válidos',
        details: [
          {
            message: 'The password field must have at least 8 characters',
            field: 'password',
          },
        ],
      },
    })

    expect(getApiErrorMessage(error)).toBe('The password field must have at least 8 characters')
  })

  it('joins multiple detail lines', () => {
    const error = axiosErrorWithBody(422, {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Los datos enviados no son válidos',
        details: [
          { message: 'Error en password', field: 'password' },
          { message: 'Error en email', field: 'email' },
        ],
      },
    })

    expect(getApiErrorMessage(error)).toBe('Error en password\nError en email')
  })

  it('falls back to api error message when there are no details', () => {
    const error = axiosErrorWithBody(401, {})

    expect(getApiErrorMessage(error)).toBe('Debe iniciar sesión para acceder a este recurso.')
  })

  it('uses structured error body from axios response', () => {
    const error = axiosErrorWithBody(404, {
      error: {
        code: 'USER_NOT_FOUND',
        message: 'Usuario no encontrado',
      },
    })

    expect(getApiError(error).message).toBe('Usuario no encontrado')
    expect(getApiErrorMessage(error)).toBe('Usuario no encontrado')
  })

  it('reads top-level message when error wrapper is missing', () => {
    const error = axiosErrorWithBody(404, {
      message: 'Usuario no encontrado',
      code: 'USER_NOT_FOUND',
    })

    expect(getApiError(error).message).toBe('Usuario no encontrado')
    expect(getApiErrorMessage(error)).toBe('Usuario no encontrado')
  })

  it('reads top-level Vine messages when error wrapper is missing', () => {
    const error = axiosErrorWithBody(422, {
      message: 'Validation failed',
      messages: [
        {
          message: 'The email field must be a valid email address',
          field: 'email',
        },
      ],
    })

    expect(getApiErrorMessage(error)).toBe('The email field must be a valid email address')
  })

  it('reads legacy top-level errors record when error wrapper is missing', () => {
    const error = axiosErrorWithBody(422, {
      errors: {
        email: 'Email inválido',
      },
    })

    expect(getApiErrorMessage(error)).toBe('email: Email inválido')
  })
})

describe('formatApiErrorDetails mixed arrays', () => {
  it('formats mixed validation detail arrays', () => {
    const details = [
      { message: 'Error en email', field: 'email' },
      { foo: 'bar' },
      'Texto adicional',
    ]

    expect(formatApiErrorDetails(details)).toEqual(['Error en email', 'Texto adicional'])
  })
})

describe('formatValidationDetails', () => {
  it('joins detail lines with middle dot', () => {
    expect(
      formatValidationDetails([
        { message: 'Error A', field: 'a' },
        { message: 'Error B', field: 'b' },
      ])
    ).toBe('Error A · Error B')
  })
})
