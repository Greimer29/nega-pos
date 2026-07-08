SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM movimientos_inventario;
DELETE FROM compra_items;
DELETE FROM compras;
DELETE FROM materiales;
DELETE FROM proveedores;
SET FOREIGN_KEY_CHECKS = 1;
SELECT 'compras' AS tbl, COUNT(*) AS n FROM compras
UNION ALL SELECT 'proveedores', COUNT(*) FROM proveedores
UNION ALL SELECT 'materiales', COUNT(*) FROM materiales;
