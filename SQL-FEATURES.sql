-- ============================================================
-- PIRABEL REMOVER v4 — NOUVELLES FONCTIONNALITÉS
-- ============================================================
-- À exécuter dans le SQL Editor de Supabase APRÈS le SQL initial
-- ============================================================

-- 1. Ajouter les colonnes parrainage à profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by TEXT,
  ADD COLUMN IF NOT EXISTS referral_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_credits INT DEFAULT 0;

-- Fonction pour générer un code parrainage unique
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_count INT;
BEGIN
  LOOP
    -- Génère 6 caractères aléatoires majuscules + chiffres
    code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    SELECT COUNT(*) INTO exists_count FROM public.profiles WHERE referral_code = code;
    EXIT WHEN exists_count = 0;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Trigger : générer code parrainage à la création du profil
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

-- Générer des codes pour les profils existants
UPDATE public.profiles SET referral_code = generate_referral_code() WHERE referral_code IS NULL;

-- ============================================================
-- 2. Table promo_codes (codes promo admin)
-- ============================================================

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

-- Table promo_redemptions (qui a utilisé quel code)
CREATE TABLE IF NOT EXISTS public.promo_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  promo_code TEXT NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, promo_code)
);

-- RLS pour promo_codes (lecture publique pour vérifier, admin pour créer)
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active promo codes"
  ON public.promo_codes FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Users can view own redemptions"
  ON public.promo_redemptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own redemptions"
  ON public.promo_redemptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 3. Table user_stats_daily (stats quotidiennes pour graphiques)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_stats_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  images_processed INT DEFAULT 0,
  amount_spent INT DEFAULT 0,
  UNIQUE(user_id, date)
);

ALTER TABLE public.user_stats_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stats"
  ON public.user_stats_daily FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats"
  ON public.user_stats_daily FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
  ON public.user_stats_daily FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- 4. Fonction pour utiliser un code promo
-- ============================================================

CREATE OR REPLACE FUNCTION public.redeem_promo_code(p_code TEXT)
RETURNS JSON AS $$
DECLARE
  promo RECORD;
  user_profile RECORD;
  result JSON;
BEGIN
  -- Vérifier l'utilisateur
  SELECT * INTO user_profile FROM public.profiles WHERE id = auth.uid();
  IF user_profile IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Non connecté');
  END IF;

  -- Vérifier le code
  SELECT * INTO promo FROM public.promo_codes
  WHERE code = UPPER(p_code) AND is_active = TRUE;

  IF promo IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Code invalide');
  END IF;

  -- Vérifier expiration
  IF promo.expires_at IS NOT NULL AND promo.expires_at < NOW() THEN
    RETURN json_build_object('success', false, 'error', 'Code expiré');
  END IF;

  -- Vérifier max uses
  IF promo.current_uses >= promo.max_uses THEN
    RETURN json_build_object('success', false, 'error', 'Code épuisé');
  END IF;

  -- Vérifier si déjà utilisé par cet utilisateur
  IF EXISTS(SELECT 1 FROM public.promo_redemptions
            WHERE user_id = auth.uid() AND promo_code = UPPER(p_code)) THEN
    RETURN json_build_object('success', false, 'error', 'Tu as déjà utilisé ce code');
  END IF;

  -- Appliquer le bonus
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

  -- Enregistrer l'utilisation
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

-- ============================================================
-- 5. Fonction pour appliquer le bonus de parrainage
-- ============================================================

CREATE OR REPLACE FUNCTION public.apply_referral(p_referral_code TEXT)
RETURNS JSON AS $$
DECLARE
  referrer RECORD;
  user_profile RECORD;
BEGIN
  SELECT * INTO user_profile FROM public.profiles WHERE id = auth.uid();
  IF user_profile IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Non connecté');
  END IF;

  -- Ne peut pas se parrainer soi-même
  IF user_profile.referral_code = UPPER(p_referral_code) THEN
    RETURN json_build_object('success', false, 'error', 'Tu ne peux pas te parrainer toi-même');
  END IF;

  -- A déjà été parrainé ?
  IF user_profile.referred_by IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Tu as déjà utilisé un code de parrainage');
  END IF;

  -- Trouver le parrain
  SELECT * INTO referrer FROM public.profiles WHERE referral_code = UPPER(p_referral_code);
  IF referrer IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Code de parrainage invalide');
  END IF;

  -- Donner 5 crédits au filleul
  UPDATE public.profiles
  SET referred_by = referrer.id::TEXT,
      payg_credits = payg_credits + 5
  WHERE id = auth.uid();

  -- Donner 5 crédits au parrain + incrémenter compteur
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

-- ============================================================
-- 6. Insérer quelques codes promo de démo
-- ============================================================

INSERT INTO public.promo_codes (code, description, bonus_credits, max_uses, expires_at)
VALUES
  ('LANCEMENT', '🎉 Code de lancement - 10 crédits gratuits', 10, 100, NOW() + INTERVAL '30 days'),
  ('BIENVENUE', '👋 Bienvenue chez Pirabel - 5 crédits offerts', 5, 1000, NULL),
  ('PIRABEL2026', '🎯 Code spécial 2026 - Pass 3 jours gratuit', 0, 50, NOW() + INTERVAL '60 days')
ON CONFLICT (code) DO NOTHING;

-- Mettre 3 jours de Pass à PIRABEL2026
UPDATE public.promo_codes SET bonus_days = 3 WHERE code = 'PIRABEL2026';
