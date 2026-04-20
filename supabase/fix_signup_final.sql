-- ============================================================
-- Final signup fix — run this in Supabase SQL Editor
-- Fixes the trigger that creates user_profiles on registration
-- ============================================================

-- Drop all existing user_profiles INSERT policies (any name)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'user_profiles' AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON user_profiles', pol.policyname);
  END LOOP;
END;
$$;

-- Recreate the trigger function cleanly
DROP TRIGGER  IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user()    CASCADE;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    'contributor'   -- always contributor; admins elevate roles manually
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log but never block signup
    RAISE LOG 'handle_new_user error for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

ALTER FUNCTION handle_new_user() OWNER TO postgres;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Single clean INSERT policy that works during signup
-- (auth.uid() is NULL when the trigger fires, so WITH CHECK (true) is required)
CREATE POLICY "up_insert_trigger"
  ON user_profiles
  FOR INSERT
  WITH CHECK (true);

-- Verify
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'user_profiles' AND cmd = 'INSERT';
-- Should return exactly one row: up_insert_trigger
