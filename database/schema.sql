CREATE DATABASE IF NOT EXISTS creator_platform
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE creator_platform;

CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('visitor', 'creator', 'admin') NOT NULL DEFAULT 'visitor',
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE categories (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(80) NOT NULL UNIQUE,
  slug       VARCHAR(80) NOT NULL UNIQUE,
  image_path VARCHAR(255) NULL
) ENGINE=InnoDB;

CREATE TABLE creator_profiles (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL UNIQUE,
  category_id INT NOT NULL,
  bio         TEXT NULL,
  location    VARCHAR(100) NULL,
  avatar_path VARCHAR(255) NULL,
  is_approved TINYINT(1) NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB;

CREATE TABLE portfolio_items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  creator_id  INT NOT NULL,
  title       VARCHAR(150) NOT NULL,
  description TEXT NULL,
  image_path  VARCHAR(255) NOT NULL,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES creator_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE commission_requests (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  client_id   INT NOT NULL,
  creator_id  INT NOT NULL,
  title       VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  budget      DECIMAL(10,2) NULL,
  deadline    DATE NULL,
  status      ENUM('pending', 'accepted', 'rejected', 'completed') NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id)  REFERENCES users(id)            ON DELETE CASCADE,
  FOREIGN KEY (creator_id) REFERENCES creator_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE reviews (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  commission_id INT NOT NULL UNIQUE,
  rating        TINYINT NOT NULL,
  comment       TEXT NULL,
  is_visible    TINYINT(1) NOT NULL DEFAULT 1,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (rating BETWEEN 1 AND 5),
  FOREIGN KEY (commission_id) REFERENCES commission_requests(id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO categories (name, slug) VALUES
  ('Painters',        'painters'),
  ('Photographers',   'photographers'),
  ('Craftspeople',    'craftspeople'),
  ('Digital Artists', 'digital-artists');