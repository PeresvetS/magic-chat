-- create_tables.sql

CREATE TABLE phone_numbers (
  id SERIAL PRIMARY KEY,
  phone_number TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  is_banned BOOLEAN DEFAULT FALSE,
  ban_type TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  messages_sent_today INTEGER DEFAULT 0,
  messages_sent_total INTEGER DEFAULT 0,
  contacts_reached_today INTEGER DEFAULT 0,
  contacts_reached_total INTEGER DEFAULT 0,
  daily_limit INTEGER,
  total_limit INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  max_inactivity_time INTEGER DEFAULT 3600000
);

CREATE TABLE parsed_users (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL,
  group_username TEXT,
  group_link TEXT,
  user_id INTEGER NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  bio TEXT,
  category TEXT,
  parsed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP,
  has_channel BOOLEAN DEFAULT FALSE,
  is_processed BOOLEAN DEFAULT FALSE,
  processing_status TEXT
);

CREATE TABLE admins (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL,
  username TEXT,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE parsing_campaigns (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  groups TEXT,
  audience_description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TEXT,
  max_users INTEGER,
  depth INTEGER,
  total_parsed INTEGER DEFAULT 0,
  processed_count INTEGER DEFAULT 0,
  is_fully_processed BOOLEAN DEFAULT FALSE
);

CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_repeating BOOLEAN DEFAULT FALSE,
  duration_days INTEGER
);

CREATE TABLE user_limits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  parsing_limit INTEGER,
  phones_limit INTEGER,
  campaigns_limit INTEGER,
  contacts_limit INTEGER,
  leads_limit INTEGER
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  username TEXT,
  is_banned BOOLEAN DEFAULT FALSE,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);