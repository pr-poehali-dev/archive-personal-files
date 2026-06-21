CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  citizen_id INTEGER NOT NULL REFERENCES citizens(id),
  name VARCHAR(255) NOT NULL,
  size INTEGER NOT NULL,
  data TEXT NOT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  uploaded_by INTEGER REFERENCES users(id)
);