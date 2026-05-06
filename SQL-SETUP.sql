-- ============================================================
-- PIRABEL REMOVER -- COMPLETE SUPABASE SQL SETUP
-- ============================================================
-- Execute this ENTIRE file in the Supabase SQL Editor.
-- Safe to re-run: uses DROP IF EXISTS + CREATE for policies.
-- ============================================================


-- ############################################################
-- 1. PROFILES TABLE
-- ############################################################

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  plan TEXT DEFAULT 'free',
  plan_activated_at TIMESTAMPTZ,
  plan_expires_at TIMESTAMPTZ,
  monthly_usage INT DEFAULT 0,
  monthly_reset_month TEXT,
  payg_credits INT DEFAULT 0,
  total_images_processed INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  referral_code TEXT UNIQUE,
  referred_by TEXT,
  referral_count INT DEFAULT 0,
  bonus_credits INT DEFAULT 0
);

-- Add columns if they don't exist (for existing tables)
DO $$
BEGIN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_count INT DEFAULT 0;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bonus_credits INT DEFAULT 0;
EXCEPTION WHEN others THEN NULL;
END $$;


-- ############################################################
-- 2. PROFILES RLS POLICIES
-- ############################################################

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
CREATE POLICY "Service role can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (TRUE);


-- ############################################################
-- 3. AUTO-CREATE PROFILE ON SIGNUP (TRIGGER)
-- ############################################################

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, monthly_reset_month)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    TO_CHAR(NOW(), 'YYYY-MM')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ############################################################
-- 4. TRANSACTIONS TABLE
-- ############################################################

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id TEXT,
  plan_name TEXT,
  amount INT DEFAULT 0,
  currency TEXT DEFAULT 'XOF',
  transaction_id TEXT,
  method TEXT DEFAULT 'kkiapay',
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own transactions" ON public.transactions;
CREATE POLICY "Users can read own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
CREATE POLICY "Users can insert own transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ############################################################
-- 5. REFERRAL CODE GENERATION FUNCTION + TRIGGER
-- ############################################################

CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_count INT;
BEGIN
  LOOP
    code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    SELECT COUNT(*) INTO exists_count FROM public.profiles WHERE referral_code = code;
    EXIT WHEN exists_count = 0;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.assign_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_assign_referral ON public.profiles;
CREATE TRIGGER profiles_assign_referral
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_referral_code();

-- Back-fill referral codes for existing profiles
UPDATE public.profiles SET referral_code = generate_referral_code() WHERE referral_code IS NULL;


-- ############################################################
-- 6. PROMO CODES TABLE + RLS
-- ############################################################

CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  bonus_credits INT DEFAULT 0,
  bonus_days INT DEFAULT 0,
  max_uses INT DEFAULT 1,
  current_uses INT DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active promo codes" ON public.promo_codes;
CREATE POLICY "Anyone can read active promo codes"
  ON public.promo_codes FOR SELECT
  USING (is_active = TRUE);


-- ############################################################
-- 7. PROMO REDEMPTIONS TABLE + RLS
-- ############################################################

CREATE TABLE IF NOT EXISTS public.promo_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  promo_code TEXT NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, promo_code)
);

ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own redemptions" ON public.promo_redemptions;
CREATE POLICY "Users can view own redemptions"
  ON public.promo_redemptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own redemptions" ON public.promo_redemptions;
CREATE POLICY "Users can insert own redemptions"
  ON public.promo_redemptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ############################################################
-- 8. USER STATS DAILY TABLE + RLS
-- ############################################################

CREATE TABLE IF NOT EXISTS public.user_stats_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  images_processed INT DEFAULT 0,
  amount_spent INT DEFAULT 0,
  UNIQUE(user_id, date)
);

ALTER TABLE public.user_stats_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own stats" ON public.user_stats_daily;
CREATE POLICY "Users can view own stats"
  ON public.user_stats_daily FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own stats" ON public.user_stats_daily;
CREATE POLICY "Users can insert own stats"
  ON public.user_stats_daily FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own stats" ON public.user_stats_daily;
CREATE POLICY "Users can update own stats"
  ON public.user_stats_daily FOR UPDATE
  USING (auth.uid() = user_id);


-- ############################################################
-- 9. REDEEM PROMO CODE FUNCTION
-- ############################################################

CREATE OR REPLACE FUNCTION public.redeem_promo_code(p_code TEXT)
RETURNS JSON AS $$
DECLARE
  promo RECORD;
  user_profile RECORD;
BEGIN
  SELECT * INTO user_profile FROM public.profiles WHERE id = auth.uid();
  IF user_profile IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Non connecte');
  END IF;

  SELECT * INTO promo FROM public.promo_codes
  WHERE code = UPPER(p_code) AND is_active = TRUE;

  IF promo IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Code invalide');
  END IF;

  IF promo.expires_at IS NOT NULL AND promo.expires_at < NOW() THEN
    RETURN json_build_object('success', false, 'error', 'Code expire');
  END IF;

  IF promo.current_uses >= promo.max_uses THEN
    RETURN json_build_object('success', false, 'error', 'Code epuise');
  END IF;

  IF EXISTS(SELECT 1 FROM public.promo_redemptions
            WHERE user_id = auth.uid() AND promo_code = UPPER(p_code)) THEN
    RETURN json_build_object('success', false, 'error', 'Tu as deja utilise ce code');
  END IF;

  IF promo.bonus_credits > 0 THEN
    UPDATE public.profiles
    SET payg_credits = payg_credits + promo.bonus_credits
    WHERE id = auth.uid();
  END IF;

  IF promo.bonus_days > 0 THEN
    UPDATE public.profiles
    SET plan = 'pass3j',
        plan_activated_at = NOW(),
        plan_expires_at = COALESCE(
          GREATEST(plan_expires_at, NOW()),
          NOW()
        ) + (promo.bonus_days || ' days')::INTERVAL
    WHERE id = auth.uid();
  END IF;

  INSERT INTO public.promo_redemptions (user_id, promo_code)
  VALUES (auth.uid(), UPPER(p_code));

  UPDATE public.promo_codes
  SET current_uses = current_uses + 1
  WHERE code = UPPER(p_code);

  RETURN json_build_object(
    'success', true,
    'bonus_credits', promo.bonus_credits,
    'bonus_days', promo.bonus_days,
    'description', promo.description
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ############################################################
-- 10. APPLY REFERRAL FUNCTION
-- ############################################################

CREATE OR REPLACE FUNCTION public.apply_referral(p_referral_code TEXT)
RETURNS JSON AS $$
DECLARE
  referrer RECORD;
  user_profile RECORD;
BEGIN
  SELECT * INTO user_profile FROM public.profiles WHERE id = auth.uid();
  IF user_profile IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Non connecte');
  END IF;

  IF user_profile.referral_code = UPPER(p_referral_code) THEN
    RETURN json_build_object('success', false, 'error', 'Tu ne peux pas te parrainer toi-meme');
  END IF;

  IF user_profile.referred_by IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Tu as deja utilise un code de parrainage');
  END IF;

  SELECT * INTO referrer FROM public.profiles WHERE referral_code = UPPER(p_referral_code);
  IF referrer IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Code de parrainage invalide');
  END IF;

  UPDATE public.profiles
  SET referred_by = referrer.id::TEXT,
      payg_credits = payg_credits + 5
  WHERE id = auth.uid();

  UPDATE public.profiles
  SET referral_count = referral_count + 1,
      payg_credits = payg_credits + 5
  WHERE id = referrer.id;

  RETURN json_build_object(
    'success', true,
    'bonus_credits', 5,
    'referrer_name', referrer.name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ############################################################
-- 11. RATINGS TABLE + RLS
-- ############################################################

CREATE TABLE IF NOT EXISTS public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  stars INT NOT NULL CHECK (stars >= 1 AND stars <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own ratings" ON public.ratings;
CREATE POLICY "Users can read own ratings"
  ON public.ratings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own ratings" ON public.ratings;
CREATE POLICY "Users can insert own ratings"
  ON public.ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own ratings" ON public.ratings;
CREATE POLICY "Users can update own ratings"
  ON public.ratings FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can read all ratings" ON public.ratings;
CREATE POLICY "Anyone can read all ratings"
  ON public.ratings FOR SELECT
  USING (TRUE);


-- ############################################################
-- 12. NEWSLETTER SUBSCRIBERS TABLE + RLS
-- ############################################################

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can subscribe to newsletter"
  ON public.newsletter_subscribers FOR INSERT
  WITH CHECK (TRUE);


-- ############################################################
-- 13. SAMPLE PROMO CODES
-- ############################################################

INSERT INTO public.promo_codes (code, description, bonus_credits, bonus_days, max_uses, expires_at)
VALUES
  ('BIENVENUE', 'Bienvenue chez Pirabel - 5 credits offerts', 5, 0, 1000, NULL),
  ('LANCEMENT', 'Code de lancement - 10 credits gratuits', 10, 0, 100, NOW() + INTERVAL '30 days'),
  ('PIRABEL2026', 'Code special 2026 - Pass 3 jours gratuit', 0, 3, 50, NOW() + INTERVAL '60 days')
ON CONFLICT (code) DO UPDATE SET
  description = EXCLUDED.description,
  bonus_credits = EXCLUDED.bonus_credits,
  bonus_days = EXCLUDED.bonus_days,
  max_uses = EXCLUDED.max_uses,
  expires_at = EXCLUDED.expires_at;


-- ============================================================
-- SETUP COMPLETE
-- ============================================================
