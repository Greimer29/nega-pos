import MetodoPagoRequeridoException from '#exceptions/metodo_pago_requerido_exception'
import PagosVentaInvalidosException from '#exceptions/pagos_venta_invalidos_exception'
import { prepareSalePaymentLines } from '#utils/sale_payment_lines'
import { test } from '@japa/runner'

test.group('prepareSalePaymentLines', () => {
  test('uses the legacy single-method fields to cover the total', ({ assert }) => {
    const payments = prepareSalePaymentLines(
      {
        payment_method_code: ' cash ',
        currency_code: ' ves ',
        usd_rate: 40,
      },
      20
    )

    assert.deepEqual(payments, [
      {
        payment_method_code: 'cash',
        amount_usd: 20,
        currency_code: ' ves ',
        usd_rate: 40,
      },
    ])
  })

  test('normalizes split payment methods without changing their order or amounts', ({ assert }) => {
    const payments = prepareSalePaymentLines(
      {
        payments: [
          { payment_method_code: ' cash ', amount_usd: 12 },
          { payment_method_code: ' transfer ', amount_usd: 8 },
        ],
      },
      20
    )

    assert.deepEqual(
      payments.map(({ payment_method_code, amount_usd }) => ({ payment_method_code, amount_usd })),
      [
        { payment_method_code: 'cash', amount_usd: 12 },
        { payment_method_code: 'transfer', amount_usd: 8 },
      ]
    )
  })

  test('requires a method when no payment lines are supplied', ({ assert }) => {
    assert.throws(() => prepareSalePaymentLines({}, 20), MetodoPagoRequeridoException)
  })

  test('rejects split payments that do not allocate the full total', ({ assert }) => {
    assert.throws(
      () =>
        prepareSalePaymentLines(
          {
            payments: [
              { payment_method_code: 'cash', amount_usd: 10 },
              { payment_method_code: 'transfer', amount_usd: 5 },
            ],
          },
          20
        ),
      PagosVentaInvalidosException
    )
  })

  test('rejects duplicate methods after trimming whitespace', ({ assert }) => {
    assert.throws(
      () =>
        prepareSalePaymentLines(
          {
            payments: [
              { payment_method_code: 'cash', amount_usd: 10 },
              { payment_method_code: ' cash ', amount_usd: 10 },
            ],
          },
          20
        ),
      PagosVentaInvalidosException
    )
  })

  test('rejects empty methods and non-positive payment amounts', ({ assert }) => {
    assert.throws(
      () =>
        prepareSalePaymentLines({ payments: [{ payment_method_code: ' ', amount_usd: 20 }] }, 20),
      MetodoPagoRequeridoException
    )
    assert.throws(
      () =>
        prepareSalePaymentLines(
          {
            payments: [
              { payment_method_code: 'cash', amount_usd: 20 },
              { payment_method_code: 'transfer', amount_usd: 0 },
            ],
          },
          20
        ),
      PagosVentaInvalidosException
    )
  })
})
