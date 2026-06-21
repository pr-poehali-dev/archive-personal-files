CREATE TABLE action_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  username VARCHAR(100),
  action VARCHAR(100) NOT NULL,
  entity VARCHAR(100),
  entity_id INTEGER,
  details TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);