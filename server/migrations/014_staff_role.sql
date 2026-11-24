-- Migration 014: the role "staff" (сотрудник администрации). It can publish announcements and events, answer
-- appeals and see group results; the administrator still creates the accounts.
DO $$
DECLARE c record;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint WHERE conrelid = 'users'::regclass AND contype = 'c'
           AND pg_get_constraintdef(oid) LIKE '%student%teacher%admin%' LOOP
    EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('student', 'teacher', 'admin', 'staff'));
