-- Create Admin User
-- Email: waleed.mohammed2008@gmail.com
-- Password: invBydar333
-- Role: admin

-- This script creates a user and sets their role to admin
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Insert user into auth.users table
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'waleed.mohammed2008@gmail.com',
  crypt('invBydar333', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
  '{}'::jsonb,
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- 2. Insert identity record
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  id,
  format('{"sub":"%s","email":"%s"}', id::text, email)::jsonb,
  'email',
  NOW(),
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'waleed.mohammed2008@gmail.com';

-- Verify the user was created
SELECT
  id,
  email,
  email_confirmed_at,
  raw_app_meta_data->>'role' as role,
  created_at
FROM auth.users
WHERE email = 'waleed.mohammed2008@gmail.com';
