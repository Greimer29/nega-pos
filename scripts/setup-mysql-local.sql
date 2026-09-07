-- Ejecutar como usuario con privilegios (ej. root):
--   mysql -u root -p < scripts/setup-mysql-local.sql
--
-- Crea la base y el usuario que espera apps/api/.env.example

CREATE DATABASE IF NOT EXISTS nega_pos
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS nega_pos_test
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS nega_pos_central
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS nega_pos_central_test
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'nega_pos'@'localhost' IDENTIFIED BY 'nega_pos';
CREATE USER IF NOT EXISTS 'nega_pos'@'127.0.0.1' IDENTIFIED BY 'nega_pos';

GRANT ALL PRIVILEGES ON nega_pos.* TO 'nega_pos'@'localhost';
GRANT ALL PRIVILEGES ON nega_pos.* TO 'nega_pos'@'127.0.0.1';
GRANT ALL PRIVILEGES ON nega_pos_test.* TO 'nega_pos'@'localhost';
GRANT ALL PRIVILEGES ON nega_pos_test.* TO 'nega_pos'@'127.0.0.1';
GRANT ALL PRIVILEGES ON nega_pos_central.* TO 'nega_pos'@'localhost';
GRANT ALL PRIVILEGES ON nega_pos_central.* TO 'nega_pos'@'127.0.0.1';
GRANT ALL PRIVILEGES ON nega_pos_central_test.* TO 'nega_pos'@'localhost';
GRANT ALL PRIVILEGES ON nega_pos_central_test.* TO 'nega_pos'@'127.0.0.1';

-- Necesario para provisionar empresas (CREATE DATABASE nega_pos_t_*)
GRANT CREATE ON *.* TO 'nega_pos'@'localhost';
GRANT CREATE ON *.* TO 'nega_pos'@'127.0.0.1';

FLUSH PRIVILEGES;
