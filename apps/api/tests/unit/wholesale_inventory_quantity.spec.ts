import ConfiguracionMayoristaInvalidaException from '#exceptions/configuracion_mayorista_invalida_exception'
import { formulaMaterialInventoryQuantity, lineInventoryQuantity } from '#utils/wholesale'
import { test } from '@japa/runner'

test.group('lineInventoryQuantity', () => {
  test('keeps detail quantities unchanged', ({ assert }) => {
    assert.equal(lineInventoryQuantity(3, false, '6.000'), 3)
  })

  test.group('formulaMaterialInventoryQuantity', () => {
    test('applies formula consumption per inventory unit to a detail sale', ({ assert }) => {
      assert.equal(formulaMaterialInventoryQuantity(3, false, null, 0.5), 1.5)
    })

    test('scales formula material usage by units in each wholesale package', ({ assert }) => {
      assert.equal(formulaMaterialInventoryQuantity(2, true, '6.000', 0.5), 6)
    })

    test('rejects wholesale formula lines without a valid pack size', ({ assert }) => {
      assert.throws(
        () => formulaMaterialInventoryQuantity(2, true, null, 0.5),
        ConfiguracionMayoristaInvalidaException
      )
    })
  })

  test('converts wholesale packages to inventory units', ({ assert }) => {
    assert.equal(lineInventoryQuantity(3, true, '6.000'), 18)
    assert.equal(lineInventoryQuantity(1.5, true, 4), 6)
  })

  test('rejects wholesale quantities without a valid pack size', ({ assert }) => {
    assert.throws(
      () => lineInventoryQuantity(2, true, null),
      ConfiguracionMayoristaInvalidaException
    )
    assert.throws(() => lineInventoryQuantity(2, true, 1), ConfiguracionMayoristaInvalidaException)
  })
})
