-- Delete from pending_users first
DELETE FROM pending_users WHERE email = 'admin2@gmail.com';

-- Note: We cannot directly insert into auth.users via SQL migration
-- The user needs to be created through the Supabase Auth API
-- I'll provide instructions for manual creation instead