const mysql = require('mysql2/promise')

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  })

  await connection.query('SET FOREIGN_KEY_CHECKS = 0')
  await connection.query('DELETE FROM movimientos_inventario')
  await connection.query('DELETE FROM compra_items')
  await connection.query('DELETE FROM compras')
  await connection.query('DELETE FROM materiales')
  await connection.query('DELETE FROM proveedores')
  await connection.query('SET FOREIGN_KEY_CHECKS = 1')

  const [compras] = await connection.query('SELECT COUNT(*) AS n FROM compras')
  const [proveedores] = await connection.query('SELECT COUNT(*) AS n FROM proveedores')
  const [materiales] = await connection.query('SELECT COUNT(*) AS n FROM materiales')

  console.log(
    JSON.stringify({
      compras: compras[0].n,
      proveedores: proveedores[0].n,
      materiales: materiales[0].n,
    })
  )

  await connection.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
