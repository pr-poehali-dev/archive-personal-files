CREATE TABLE citizens (
  id SERIAL PRIMARY KEY,
  last_name VARCHAR(100) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  birth_date DATE,
  birth_place VARCHAR(255),
  address TEXT,
  email VARCHAR(255),
  phone VARCHAR(50),
  inn VARCHAR(20),
  snils VARCHAR(20),
  photo TEXT,
  case_number VARCHAR(50) NOT NULL UNIQUE,
  notes TEXT,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);