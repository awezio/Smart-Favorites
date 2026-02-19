-- Add extension_token for browser extension authentication
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS extension_token TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS user_settings_extension_token_idx ON user_settings(extension_token) WHERE extension_token IS NOT NULL;
