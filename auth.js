// ============================================================
// PIRABEL — AUTH SUPABASE (v3)
// Comptes synchronisés multi-appareils
// ============================================================

window.PirabelAuth = (function() {
  'use strict';

  let supabase = null;
  let currentUser = null;
  let currentProfile = null;
  let initialized = false;
  let initPromise = null;

  // ============================================================
  // INITIALIZATION
  // ============================================================
  function init() {
    if (initPromise) return initPromise;

    initPromise = (async () => {
      // Wait for Supabase library to load
      while (!window.supabase || !window.supabase.createClient) {
        await new Promise(r => setTimeout(r, 50));
      }

      supabase = window.supabase.createClient(
        window.PIRABEL_CONFIG.SUPABASE_URL,
        window.PIRABEL_CONFIG.SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        }
      );

      // Check current session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        currentUser = session.user;
        await loadProfile();
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          currentUser = session.user;
          await loadProfile();
        } else if (event === 'SIGNED_OUT') {
          currentUser = null;
          currentProfile = null;
        }
      });

      initialized = true;
      return true;
    })();

    return initPromise;
  }

  function getCurrentMonth() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  async function loadProfile() {
    if (!currentUser) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single();

    if (error) {
      console.error('Erreur chargement profil:', error);
      return null;
    }

    // Auto-reset monthly counter if new month
    const cm = getCurrentMonth();
    if (data.monthly_reset_month !== cm) {
      const { data: updated } = await supabase
        .from('profiles')
        .update({ monthly_usage: 0, monthly_reset_month: cm })
        .eq('id', currentUser.id)
        .select()
        .single();
      currentProfile = updated || data;
    } else {
      currentProfile = data;
    }

    // Auto-downgrade if plan expired
    if (currentProfile.plan_expires_at && new Date(currentProfile.plan_expires_at) < new Date() &&
        currentProfile.plan !== 'free') {
      const { data: updated } = await supabase
        .from('profiles')
        .update({ plan: 'free', plan_expires_at: null, plan_activated_at: null })
        .eq('id', currentUser.id)
        .select()
        .single();
      if (updated) currentProfile = updated;
    }

    return currentProfile;
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  async function register(email, password, name) {
    await init();
    email = (email || '').trim().toLowerCase();
    if (!email || !password || !name) throw new Error('Tous les champs sont requis');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email invalide');
    if (password.length < 6) throw new Error('Mot de passe : 6 caractères minimum');

    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: { name: name.trim() }
      }
    });

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        throw new Error('Un compte existe déjà avec cet email');
      }
      throw new Error(error.message);
    }

    if (!data.user) throw new Error('Erreur lors de la création du compte');

    currentUser = data.user;
    // Wait a bit for the trigger to create the profile
    await new Promise(r => setTimeout(r, 500));
    await loadProfile();

    return currentProfile;
  }

  async function login(email, password) {
    await init();
    email = (email || '').trim().toLowerCase();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Email ou mot de passe incorrect');
      }
      if (error.message.includes('Email not confirmed')) {
        throw new Error('Email non confirmé. Vérifie ta boîte mail.');
      }
      throw new Error(error.message);
    }

    currentUser = data.user;
    await loadProfile();
    return currentProfile;
  }

  async function logout() {
    await init();
    await supabase.auth.signOut();
    currentUser = null;
    currentProfile = null;
  }

  async function resetPassword(email) {
    await init();
    email = (email || '').trim().toLowerCase();
    if (!email) throw new Error('Email requis');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/auth.html?mode=reset'
    });

    if (error) throw new Error(error.message);
    return true;
  }

  async function updatePassword(newPassword) {
    await init();
    if (newPassword.length < 6) throw new Error('Mot de passe : 6 caractères minimum');

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
    return true;
  }

  function getCurrentUser() {
    if (!currentProfile) return null;
    // Return data in the same shape as before for compatibility
    return {
      id: currentProfile.id,
      email: currentProfile.email,
      name: currentProfile.name,
      plan: currentProfile.plan,
      planActivatedAt: currentProfile.plan_activated_at ? new Date(currentProfile.plan_activated_at).getTime() : null,
      planExpiresAt: currentProfile.plan_expires_at ? new Date(currentProfile.plan_expires_at).getTime() : null,
      monthlyUsage: currentProfile.monthly_usage || 0,
      paygCredits: currentProfile.payg_credits || 0,
      totalImagesProcessed: currentProfile.total_images_processed || 0,
      createdAt: currentProfile.created_at ? new Date(currentProfile.created_at).getTime() : Date.now()
    };
  }

  async function refreshProfile() {
    if (!currentUser) return null;
    return await loadProfile();
  }

  async function updateUser(updates) {
    if (!currentUser) throw new Error('Non connecté');

    // Map JS camelCase to DB snake_case
    const dbUpdates = {};
    if ('plan' in updates) dbUpdates.plan = updates.plan;
    if ('planActivatedAt' in updates) dbUpdates.plan_activated_at = updates.planActivatedAt ? new Date(updates.planActivatedAt).toISOString() : null;
    if ('planExpiresAt' in updates) dbUpdates.plan_expires_at = updates.planExpiresAt ? new Date(updates.planExpiresAt).toISOString() : null;
    if ('monthlyUsage' in updates) dbUpdates.monthly_usage = updates.monthlyUsage;
    if ('paygCredits' in updates) dbUpdates.payg_credits = updates.paygCredits;
    if ('totalImagesProcessed' in updates) dbUpdates.total_images_processed = updates.totalImagesProcessed;
    if ('name' in updates) dbUpdates.name = updates.name;

    const { data, error } = await supabase
      .from('profiles')
      .update(dbUpdates)
      .eq('id', currentUser.id)
      .select()
      .single();

    if (error) {
      console.error('Erreur update:', error);
      throw new Error('Impossible de sauvegarder');
    }

    currentProfile = data;
    return getCurrentUser();
  }

  async function activatePlan(planId, txData) {
    if (!currentUser) throw new Error('Non connecté');
    const plan = window.PIRABEL_CONFIG.PLANS[planId];
    if (!plan) throw new Error('Plan invalide');

    // Refresh profile first to get latest data
    await loadProfile();

    const updates = {};

    if (planId === 'payg' || planId === 'payg10') {
      updates.payg_credits = (currentProfile.payg_credits || 0) + plan.quota;
    } else if (planId === 'pass3j' || planId === 'monthly') {
      const now = Date.now();
      const currentExpires = currentProfile.plan_expires_at && new Date(currentProfile.plan_expires_at).getTime() > now
        ? new Date(currentProfile.plan_expires_at).getTime()
        : now;
      updates.plan = planId;
      updates.plan_activated_at = new Date(now).toISOString();
      updates.plan_expires_at = new Date(currentExpires + plan.duration).toISOString();
    }

    // Update profile
    const { data: updatedProfile, error: profileError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', currentUser.id)
      .select()
      .single();

    if (profileError) {
      console.error('Erreur activation:', profileError);
      throw new Error('Erreur lors de l\'activation');
    }

    currentProfile = updatedProfile;

    // Insert transaction record
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: currentUser.id,
        plan_id: planId,
        plan_name: plan.name,
        amount: plan.price,
        currency: 'XOF',
        transaction_id: txData.transactionId || ('tx_' + Date.now()),
        method: txData.method || 'kkiapay',
        status: 'completed'
      });

    if (txError) console.warn('Erreur enreg transaction:', txError);

    return getCurrentUser();
  }

  function getEffectivePlan() {
    if (!currentProfile) return { type: 'guest', batch: false };

    const now = Date.now();
    const expiresAt = currentProfile.plan_expires_at ? new Date(currentProfile.plan_expires_at).getTime() : null;

    if (expiresAt && expiresAt > now && (currentProfile.plan === 'pass3j' || currentProfile.plan === 'monthly')) {
      const pc = window.PIRABEL_CONFIG.PLANS[currentProfile.plan];
      return {
        type: currentProfile.plan,
        name: pc.name,
        icon: pc.icon,
        unlimited: true,
        batch: pc.batch,
        expiresAt: expiresAt,
        remainingMs: expiresAt - now
      };
    }

    if (currentProfile.payg_credits && currentProfile.payg_credits > 0) {
      return {
        type: 'payg',
        name: 'Pay-as-you-go',
        icon: 'credit-card',
        unlimited: false,
        batch: false,
        credits: currentProfile.payg_credits,
        freeRemaining: Math.max(0, window.PIRABEL_CONFIG.FREE_QUOTA - (currentProfile.monthly_usage || 0))
      };
    }

    const fr = Math.max(0, window.PIRABEL_CONFIG.FREE_QUOTA - (currentProfile.monthly_usage || 0));
    return {
      type: 'free',
      name: 'Gratuit',
      icon: 'gift',
      unlimited: false,
      batch: false,
      freeRemaining: fr,
      monthlyUsed: currentProfile.monthly_usage || 0,
      monthlyTotal: window.PIRABEL_CONFIG.FREE_QUOTA
    };
  }

  function canProcess() {
    const p = getEffectivePlan();
    if (p.type === 'guest') return false;
    if (p.unlimited) return true;
    if (p.type === 'payg' && p.credits > 0) return true;
    return p.freeRemaining > 0;
  }

  async function consumeImage() {
    if (!currentProfile) return false;
    const plan = getEffectivePlan();
    const updates = {};

    updates.total_images_processed = (currentProfile.total_images_processed || 0) + 1;

    if (plan.unlimited) {
      // No counter for unlimited
    } else if (plan.freeRemaining > 0) {
      updates.monthly_usage = (currentProfile.monthly_usage || 0) + 1;
    } else if (plan.type === 'payg' && plan.credits > 0) {
      updates.payg_credits = currentProfile.payg_credits - 1;
    } else {
      return false;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', currentUser.id)
      .select()
      .single();

    if (!error && data) {
      currentProfile = data;
      // Enregistrer dans les stats quotidiennes
      try { await recordDailyStat(0); } catch (e) {}
    }
    return !error;
  }

  async function getTransactions() {
    if (!currentUser) return [];
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Erreur transactions:', error);
      return [];
    }
    return (data || []).map(t => ({
      id: t.transaction_id,
      planId: t.plan_id,
      planName: t.plan_name,
      amount: t.amount,
      currency: t.currency,
      date: new Date(t.created_at).getTime(),
      method: t.method,
      status: t.status
    }));
  }

  async function requireAuth(redirectUrl) {
    await init();
    if (!currentProfile) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = redirectUrl || ('auth.html?next=' + next);
      return null;
    }
    return getCurrentUser();
  }

  // ============================================================
  // FONCTIONNALITÉS PRO (parrainage, codes promo, stats)
  // ============================================================

  // Récupérer les infos parrainage de l'utilisateur
  function getReferralInfo() {
    if (!currentProfile) return null;
    return {
      code: currentProfile.referral_code,
      count: currentProfile.referral_count || 0,
      referredBy: currentProfile.referred_by,
      shareUrl: window.location.origin + '/auth.html?ref=' + (currentProfile.referral_code || '')
    };
  }

  // Appliquer un code de parrainage (à l'inscription)
  async function applyReferralCode(code) {
    if (!currentUser) throw new Error('Non connecté');
    const { data, error } = await supabase.rpc('apply_referral', {
      p_referral_code: code.trim().toUpperCase()
    });
    if (error) throw new Error(error.message);
    if (!data.success) throw new Error(data.error);
    await loadProfile();
    return data;
  }

  // Utiliser un code promo
  async function redeemPromoCode(code) {
    if (!currentUser) throw new Error('Non connecté');
    const { data, error } = await supabase.rpc('redeem_promo_code', {
      p_code: code.trim().toUpperCase()
    });
    if (error) throw new Error(error.message);
    if (!data.success) throw new Error(data.error);
    await loadProfile();
    return data;
  }

  // Stats quotidiennes (pour graphiques)
  async function recordDailyStat(amount = 0) {
    if (!currentUser) return;
    const today = new Date().toISOString().split('T')[0];

    // Try to update existing
    const { data: existing } = await supabase
      .from('user_stats_daily')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('date', today)
      .single();

    if (existing) {
      await supabase
        .from('user_stats_daily')
        .update({
          images_processed: existing.images_processed + 1,
          amount_spent: existing.amount_spent + amount
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('user_stats_daily')
        .insert({
          user_id: currentUser.id,
          date: today,
          images_processed: 1,
          amount_spent: amount
        });
    }
  }

  // Récupérer les stats des 30 derniers jours
  async function getStats30Days() {
    if (!currentUser) return [];
    const date30 = new Date();
    date30.setDate(date30.getDate() - 30);

    const { data, error } = await supabase
      .from('user_stats_daily')
      .select('*')
      .eq('user_id', currentUser.id)
      .gte('date', date30.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) {
      console.error('Erreur stats:', error);
      return [];
    }
    return data || [];
  }

  // Calculer les économies réalisées (basées sur usage gratuit)
  function getSavings() {
    if (!currentProfile) return 0;
    const totalImages = currentProfile.total_images_processed || 0;
    // Si l'utilisateur avait payé 50F par image, il aurait payé X
    const wouldHavePaid = totalImages * 50;
    // Stats : économies = ce qu'il aurait payé - ce qu'il a vraiment payé
    return wouldHavePaid;
  }

  // Export public API
  return {
    init,
    register,
    login,
    logout,
    resetPassword,
    updatePassword,
    getCurrentUser,
    refreshProfile,
    updateUser,
    activatePlan,
    getEffectivePlan,
    canProcess,
    consumeImage,
    getTransactions,
    requireAuth,
    // Nouvelles fonctions
    getReferralInfo,
    applyReferralCode,
    redeemPromoCode,
    recordDailyStat,
    getStats30Days,
    getSavings
  };
})();
