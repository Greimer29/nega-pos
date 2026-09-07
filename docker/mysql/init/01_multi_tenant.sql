-- First-boot MySQL grants for local docker-compose.
-- Creates central DB and allows the app user to CREATE DATABASE (tenant DBs).

CREATE DATABASE IF NOT EXISTS nega_pos_central CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS nega_pos_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON *.* TO 'nega_pos'@'%';
FLUSH PRIVILEGES;
