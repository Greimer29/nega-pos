import {
  calcularConsumoProyectado,
  evaluarConsumoVsStock,
  evaluarStockInsuficiente,
  formatCantidadMovimiento,
  formatCantidadReversion,
} from '#services/order_stock'
import { test } from '@japa/runner'

test.group('OrderStock unit', () => {
  test('calcularConsumoProyectado multiplies quantity por prenda by total', ({ assert }) => {
    assert.equal(calcularConsumoProyectado('2.500', 100), 250)
    assert.equal(calcularConsumoProyectado('0.150', 200), 30)
  })

  test('formatCantidadMovimiento returns negative consumption', ({ assert }) => {
    assert.equal(formatCantidadMovimiento(250), '-250.000')
  })

  test('formatCantidadReversion inverts salida movement', ({ assert }) => {
    assert.equal(formatCantidadReversion('-250.000'), '250.000')
  })

  test('evaluarStockInsuficiente lists materials below required stock', ({ assert }) => {
    const receta = [
      {
        materialId: 1,
        materialNombre: 'Jersey',
        quantityPerGarment: '2.000',
      },
      {
        materialId: 2,
        materialNombre: 'Hilo',
        quantityPerGarment: '0.100',
      },
    ]

    const stock = new Map<number, number>([
      [1, 150],
      [2, 50],
    ])

    const faltantes = evaluarStockInsuficiente(receta, 100, stock)

    assert.lengthOf(faltantes, 1)
    assert.equal(faltantes[0].material_id, 1)
    assert.equal(faltantes[0].stock_actual, 150)
    assert.equal(faltantes[0].consumo_proyectado, 200)
    assert.equal(faltantes[0].faltante, 50)
  })

  test('evaluarConsumoVsStock compares aggregated consumption directly', ({ assert }) => {
    const consumo = new Map([
      [
        1,
        {
          materialId: 1,
          materialNombre: 'Tela',
          cantidadTotal: 30,
        },
      ],
    ] as const)

    const faltantes = evaluarConsumoVsStock(consumo, new Map([[1, 25]]))

    assert.lengthOf(faltantes, 1)
    assert.equal(faltantes[0].consumo_proyectado, 30)
    assert.equal(faltantes[0].stock_actual, 25)
  })

  test('evaluarStockInsuficiente returns empty when stock is enough', ({ assert }) => {
    const receta = [
      {
        materialId: 1,
        materialNombre: 'Jersey',
        quantityPerGarment: '2.000',
      },
    ]

    const stock = new Map<number, number>([[1, 200]])
    const faltantes = evaluarStockInsuficiente(receta, 100, stock)

    assert.lengthOf(faltantes, 0)
  })
})
