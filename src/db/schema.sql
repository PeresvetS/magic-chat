-- Complete and Optimized Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username VARCHAR(255) UNIQUE,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  is_banned BOOLEAN DEFAULT FALSE,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admins table
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  is_repeating BOOLEAN DEFAULT FALSE,
  duration_days INTEGER
);

-- User limits table
CREATE TABLE IF NOT EXISTS user_limits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parsing_limit INTEGER,
  phones_limit INTEGER,
  campaigns_limit INTEGER,
  contacts_limit INTEGER,
  leads_limit INTEGER
);

-- Phone numbers table
CREATE TABLE IF NOT EXISTS phone_numbers (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  is_banned BOOLEAN DEFAULT FALSE,
  ban_type VARCHAR(20),
  is_premium BOOLEAN DEFAULT FALSE,
  is_authenticated BOOLEAN DEFAULT FALSE,
  messages_sent_today INTEGER DEFAULT 0,
  messages_sent_total INTEGER DEFAULT 0,
  contacts_reached_today INTEGER DEFAULT 0,
  contacts_reached_total INTEGER DEFAULT 0,
  daily_limit INTEGER DEFAULT 40,
  total_limit INTEGER,
  max_inactivity_time INTEGER DEFAULT 3600, -- Default to 1 hour in seconds
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parsing campaigns table
CREATE TABLE IF NOT EXISTS parsing_campaigns (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  groups TEXT,
  audience_description TEXT,
  status VARCHAR(50),
  max_users INTEGER,
  depth INTEGER,
  total_parsed INTEGER DEFAULT 0,
  processed_count INTEGER DEFAULT 0,
  is_fully_processed BOOLEAN DEFAULT FALSE,
  last_parsed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- statistic conacts table
CREATE TABLE phone_number_contacts (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL,
  user_id VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(phone_number, user_id)
);

-- Parsed users table
CREATE TABLE IF NOT EXISTS parsed_users (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES parsing_campaigns(id) ON DELETE CASCADE,
  group_username VARCHAR(255),
  group_link VARCHAR(255),
  user_id BIGINT NOT NULL,
  username VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  bio TEXT,
  category VARCHAR(100),
  parsed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP,
  has_channel BOOLEAN DEFAULT FALSE,
  is_processed BOOLEAN DEFAULT FALSE,
  processing_status VARCHAR(50)
);

-- Message stats table
CREATE TABLE message_stats (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  tokens_used INTEGER NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_phone_numbers_user_id ON phone_numbers(user_id);
CREATE INDEX idx_phone_numbers_is_authenticated ON phone_numbers(is_authenticated);
CREATE INDEX idx_parsing_campaigns_user_id ON parsing_campaigns(user_id);
CREATE INDEX idx_parsed_users_campaign_id ON parsed_users(campaign_id);
CREATE INDEX idx_parsed_users_user_id ON parsed_users(user_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_end_date ON subscriptions(end_date);
CREATE INDEX idx_phone_numbers_phone_number ON phone_numbers(phone_number);
CREATE INDEX idx_parsing_campaigns_status ON parsing_campaigns(status);
CREATE INDEX idx_parsed_users_username ON parsed_users(username);

-- Create a function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to phone_numbers table
CREATE TRIGGER update_phone_numbers_updated_at
BEFORE UPDATE ON phone_numbers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to parsing_campaigns table
CREATE TRIGGER update_parsing_campaigns_updated_at
BEFORE UPDATE ON parsing_campaigns
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add new column is_authenticated to phone_numbers table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='phone_numbers' AND column_name='is_authenticated') THEN
    ALTER TABLE phone_numbers ADD COLUMN is_authenticated BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  bitrix_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  source VARCHAR(255),
  status VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index
CREATE INDEX idx_leads_bitrix_id ON leads(bitrix_id);
CREATE INDEX idx_leads_phone ON leads(phone);