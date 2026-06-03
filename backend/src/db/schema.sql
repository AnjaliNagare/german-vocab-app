CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,      -- e.g. 'A1', 'A2', 'B1', 'B2'
  description TEXT
);

INSERT INTO categories (name, description) VALUES
  ('A1', 'Beginner — basic everyday words'),
  ('A2', 'Elementary — simple phrases and expressions'),
  ('B1', 'Intermediate — familiar topics'),
  ('B2', 'Upper Intermediate — complex topics');

CREATE TABLE words (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  german VARCHAR(255) NOT NULL,
  english VARCHAR(255) NOT NULL,
  category_id INT REFERENCES categories(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE review_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  word_id UUID REFERENCES words(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 4),
  reviewed_at TIMESTAMP DEFAULT NOW(),
  next_review_at TIMESTAMP NOT NULL,
  interval_days INT NOT NULL DEFAULT 1,
  ease_factor DECIMAL(4,2) NOT NULL DEFAULT 2.5
);

CREATE INDEX idx_review_logs_next_review ON review_logs(user_id, next_review_at);
CREATE INDEX idx_words_user ON words(user_id);