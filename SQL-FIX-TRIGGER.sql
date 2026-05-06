-- ============================================================
-- FIX: handle_new_user trigger - prevent crash on duplicate
-- Execute this in Supabase SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, monthly_reset_month)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    TO_CHAR(NOW(), 'YYYY-MM')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.profiles.name);
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'handle_new_user error for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also make sure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Clean up any orphaned auth users without profiles
-- (users who signed up but profile creation failed)
INSERT INTO public.profiles (id, email, name, monthly_reset_month)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  TO_CHAR(NOW(), 'YYYY-MM')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
