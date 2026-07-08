import MachineService from '#services/machine_service'
import { test } from '@japa/runner'

test.group('MachineService unit', () => {
  test('calcularTotalGastado is exported as static method', ({ assert }) => {
    assert.isFunction(MachineService.calcularTotalGastado)
  })
})
