CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(120) NOT NULL,
  username varchar(32) NOT NULL,
  username_lower varchar(32) NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role varchar(20) NOT NULL CHECK (role IN ('super_admin', 'admin')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz,
  updated_by uuid
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash char(64) PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS reservations (
  reservation_date date PRIMARY KEY,
  customer_name varchar(120) NOT NULL,
  phone varchar(20) NOT NULL,
  event_type varchar(24) NOT NULL CHECK (event_type IN ('wedding', 'engagement', 'circumcision', 'birthday', 'reception', 'other')),
  custom_event_type varchar(80),
  guest_count integer NOT NULL CHECK (guest_count >= 0),
  total_cost numeric(14,2) NOT NULL CHECK (total_cost >= 0),
  advance_payment numeric(14,2) NOT NULL CHECK (advance_payment >= 0 AND advance_payment <= total_cost),
  cook_name varchar(120) NOT NULL DEFAULT '',
  cook_cost numeric(14,2) NOT NULL CHECK (cook_cost >= 0),
  server_count integer NOT NULL CHECK (server_count >= 0),
  cleaning_cost numeric(14,2) NOT NULL CHECK (cleaning_cost >= 0),
  created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_by_name varchar(120) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by_name varchar(120) NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reservations_created_by_idx ON reservations(created_by_user_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action varchar(64) NOT NULL,
  performed_by_user_id uuid,
  performed_by_name varchar(120) NOT NULL,
  reservation_id date,
  previous_reservation_id date,
  target_user_id uuid,
  changed_fields text[],
  snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs(action);

CREATE TABLE IF NOT EXISTS login_attempts (
  attempt_key char(64) PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz
);

