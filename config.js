// ============================================================
// PIRABEL REMOVER v4 — CONFIGURATION GLOBALE
// ============================================================

window.PIRABEL_CONFIG = {
  // Supabase
  SUPABASE_URL: 'https://jrpivfbbtzaistbzommb.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpycGl2ZmJidHphaXN0YnpvbW1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNTgyMzAsImV4cCI6MjA5MzYzNDIzMH0.uckr4_-hePk0KvGmeUdpCry-RMyGkjFJ-8A00t775Fo',

  // Kkiapay
  KKIAPAY_PUBLIC_KEY: 'b2eb482323475fd10352bf47457b00e0d5af0c34',
  KKIAPAY_SANDBOX: false,

  // Plans avec PACK PAYG (nouvelle feature : -20% si achat de 10)
  PLANS: {
    free: {
      id: 'free', name: 'Gratuit', icon: 'gift',
      price: 0, quota: 10, duration: null, batch: false,
      desc: '10 images par mois'
    },
    payg: {
      id: 'payg', name: '1 image', icon: 'credit-card',
      price: 50, quota: 1, duration: null, batch: false,
      desc: '50 FCFA = 1 image',
      popular: false
    },
    payg10: {
      id: 'payg10', name: 'Pack 10 images', icon: 'package',
      price: 400, quota: 10, duration: null, batch: false,
      desc: '400 FCFA = 10 images (-20%)',
      popular: true,
      badge: 'Économise 100 F'
    },
    pass3j: {
      id: 'pass3j', name: 'Pass 3 jours', icon: 'zap',
      price: 200, quota: Infinity,
      duration: 3 * 24 * 60 * 60 * 1000, batch: true,
      desc: 'Illimité pendant 72h',
      popular: false
    },
    monthly: {
      id: 'monthly', name: 'Mensuel', icon: 'diamond',
      price: 5000, quota: Infinity,
      duration: 30 * 24 * 60 * 60 * 1000, batch: true,
      desc: 'Illimité pendant 30 jours',
      popular: false
    }
  },

  FREE_QUOTA: 10,
  APP_VERSION: '5.0.0',

  // Référral
  REFERRAL_BONUS: 5, // 5 images par parrainage

  // Filtres et features
  ENABLE_FILTERS: true,
  ENABLE_CROP: true,
  ENABLE_RESIZE: true,
  ENABLE_WATERMARK: true,
  ENABLE_REFERRAL: true,
  ENABLE_PROMO_CODES: true,
  ENABLE_STATS: true,

  // Nouvelles features v5
  ENABLE_STICKERS: true,
  ENABLE_ANNOTATIONS: true,
  ENABLE_ADJUSTMENTS: true,
  ENABLE_PRESETS: true,
  ENABLE_QUICK_EXPORT: true,
  ENABLE_REUSE: true,
  ENABLE_NEWSLETTER: true,
  ENABLE_RATING: true,
  ENABLE_THEME: true,
  ENABLE_I18N: true
};
