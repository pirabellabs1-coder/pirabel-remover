# 🚀 Pirabel Remover v4 — SaaS complet avec 10+ nouvelles fonctionnalités

Version finale avec édition d'image avancée, parrainage, codes promo, stats et plus.

## ✨ NOUVELLES FONCTIONNALITÉS (v4)

### 🎨 Édition d'image avancée
1. **🎭 Filtres artistiques** — Noir & blanc, sépia, vintage, vibrant, drama, etc. (10 filtres)
2. **✂️ Recadrage** — Crop avec ratios prédéfinis : Instagram, Story, Facebook, Twitter, Portrait, Paysage
3. **📐 Redimensionnement** — Presets HD, Full HD, 4K, Instagram, Story, Facebook + taille personnalisée
4. **🏷️ Watermark personnel** — Ajoute ton propre texte/logo avec position et opacité ajustables
5. **🤖 Auto-IA suppression** — Détection automatique et suppression multi-logos en 1 clic

### 👤 Engagement & fidélisation
6. **🎁 Programme de parrainage** — Code unique → +5 images gratuites par filleul (parrain ET filleul)
7. **🎫 Codes promo** — Système d'admin avec codes (LANCEMENT, BIENVENUE, PIRABEL2026)
8. **📈 Statistiques personnelles** — Graphiques d'usage 30 jours + économies réalisées

### 💰 Business
9. **🎁 Pack 10 images** — 400F au lieu de 500F (-20%, économise 100F)
10. **💳 Paiement automatique Kkiapay** — Plus besoin de WhatsApp, tout est instantané

### 🛡️ Sécurité (gardée de la v3)
- Comptes synchronisés multi-appareils via Supabase
- Récupération mot de passe par email
- Row Level Security activée
- URL admin secrète

## 📁 Structure des fichiers

```
pirabel-v3-features/
├── index.html              # Landing page
├── auth.html               # Inscription/Connexion (avec code parrainage)
├── app.html                # App avec édition avancée
├── dashboard.html          # Dashboard avec parrainage, promo, stats
├── gm4botz5me8y-pmgr.html  # Admin (URL secrète)
├── styles.css              # Styles globaux
├── app-styles.css          # Styles app + nouvelles features
├── config.js               # Config (clés + plans avec pack)
├── auth.js                 # Auth Supabase + parrainage + promo + stats
├── payment.js              # Module Kkiapay
├── app-logic.js            # Logique principale app
├── image-edit.js           # NEW: Filtres, crop, resize, watermark
├── app-edit.js             # NEW: Logique UI édition avancée
├── manifest.json           # PWA
├── sw.js                   # Service Worker
├── icon-192.png
├── icon-512.png
├── _headers
├── _redirects
├── SQL-FEATURES.sql        # NEW: SQL à exécuter dans Supabase
└── README.md
```

## 🚀 DÉPLOIEMENT — Étapes critiques

### Étape 1 : Exécuter le nouveau SQL dans Supabase ⚠️ IMPORTANT

1. Va sur https://app.supabase.com → ton projet
2. **SQL Editor** → New query
3. **Copie tout le contenu de `SQL-FEATURES.sql`**
4. Clique **Run**
5. ✅ Cela ajoute :
   - Système de parrainage
   - Table de codes promo
   - Table de stats quotidiennes
   - Fonctions RPC pour les utiliser

⚠️ **Sans cette étape, les nouvelles features ne marcheront pas !**

### Étape 2 : Déployer sur Netlify

1. Décompresse `pirabel-v4-features.zip`
2. Va sur https://app.netlify.com → Deploys
3. Glisse le dossier `pirabel-v3-features` complet
4. Attends 30 sec

### Étape 3 : Tester

1. Crée un nouveau compte
2. Va dans le dashboard → vois ton **code de parrainage** (6 caractères)
3. Tu peux tester un code promo : tape **BIENVENUE** → +5 crédits
4. Va dans l'app → ouvre une image → clique "Édition avancée" → teste les filtres

## 💡 Codes promo disponibles (déjà créés)

| Code | Bonus | Limite |
|------|-------|--------|
| `BIENVENUE` | +5 crédits | 1000 utilisations |
| `LANCEMENT` | +10 crédits | 100 utilisations, expire dans 30j |
| `PIRABEL2026` | Pass 3 jours gratuit | 50 utilisations, expire dans 60j |

Tu peux ajouter d'autres codes via le SQL Editor de Supabase :

```sql
INSERT INTO public.promo_codes (code, description, bonus_credits, max_uses, expires_at)
VALUES ('NOEL2026', '🎄 Promo Noël - 20 crédits', 20, 200, NOW() + INTERVAL '30 days');
```

## 🎯 Comment utiliser chaque feature

### 1. Filtres artistiques
- Charger une image → "🎨 Édition avancée" → Onglet "🎭 Filtres" → Choisir un filtre → Appliquer

### 2. Recadrage
- Onglet "✂️ Recadrer" → Choisir un format (Instagram, Story, etc.) → Appliquer

### 3. Resize
- Onglet "📐 Resize" → Choisir un preset OU entrer largeur/hauteur custom → Appliquer

### 4. Watermark
- Onglet "🏷️ Watermark" → Entrer texte → Position → Opacité → Appliquer

### 5. Auto-IA suppression
- Bouton "🤖 Auto-IA" dans la barre d'outils → détecte et supprime auto

### 6. Parrainage
- Dashboard → Section "🎁 Programme de parrainage"
- Copie ton lien et partage-le
- Quand un ami s'inscrit avec ton code → +5 crédits pour chacun

### 7. Codes promo
- Dashboard → Section "🎫 Code promo"
- Tape un code → Activer → bonus appliqué

### 8. Statistiques
- Dashboard → Section "📈 Mes statistiques"
- Graphique 30 jours + métriques (économies, moyenne, pic)

### 9. Pack 10 images (-20%)
- Dashboard → Acheter → "🎁 Pack 10 images" à 400F
- 400F = 10 crédits (au lieu de 500F)

### 10. Paiement automatique
- Tout passe via le widget Kkiapay
- Activation immédiate après paiement
- Plus besoin de contact manuel

## 📊 Voir tes données dans Supabase

Tu peux maintenant voir dans Supabase :
- **Table `profiles`** : utilisateurs + leur code parrainage + crédits
- **Table `transactions`** : tous les paiements
- **Table `promo_codes`** : codes promo créés
- **Table `promo_redemptions`** : qui a utilisé quel code
- **Table `user_stats_daily`** : stats quotidiennes par utilisateur

## 🎨 Stratégie marketing avec ces features

### Pour le lancement
1. **Distribue le code `LANCEMENT`** sur tes réseaux → bonus de 10 crédits gratuits
2. **Code parrainage** → fais un concours "10 parrainages = un Pass 3 jours gratuit"
3. **Pack 10 images** → mets-le en avant : "Économise 20% sur tes images !"

### Pour fidéliser
1. Le **graphique de stats** donne aux utilisateurs un sentiment d'accomplissement
2. Les **filtres et watermarks** font de Pirabel un outil "tout-en-un" (plus juste un suppresseur de logo)
3. Le **système de parrainage** transforme chaque client en ambassadeur

### Pour augmenter les revenus
1. **Pack 10 images** → augmente le panier moyen (400F vs 50F)
2. **Codes promo** → permet des promos ciblées par groupe (influenceurs, partenaires)
3. **Plan Mensuel** → toujours là à 5000F pour les pros

## 🆘 Problèmes courants

**"Le code de parrainage ne marche pas"**
→ Vérifie que tu as bien exécuté `SQL-FEATURES.sql` dans Supabase

**"La section Édition avancée n'apparaît pas"**
→ Vérifie que `image-edit.js` et `app-edit.js` sont bien dans le dossier

**"Erreur lors de l'achat du pack 10"**
→ Vérifie que `payg10` est bien dans `config.js` (devrait être déjà)

**"Les stats ne s'affichent pas"**
→ Normal le 1er jour, attends d'avoir traité quelques images

## 🔐 Sécurité

Toutes les features utilisent **Row Level Security** Supabase :
- ✅ Un utilisateur ne peut voir que ses propres données
- ✅ Les codes promo : lecture publique, modification admin seulement
- ✅ Les fonctions RPC (parrainage, codes promo) sont sécurisées côté serveur

## 💰 Identifiants

```
Site URL    : https://pirabel-re.netlify.app
Admin URL   : https://pirabel-re.netlify.app/gm4botz5me8y-pmgr.html
Admin user  : admin@pirabellabs.com
Admin pwd   : Pirabel2026! (à changer !)

Supabase    : https://jrpivfbbtzaistbzommb.supabase.co
Kkiapay     : b2eb482323475fd10352bf47457b00e0d5af0c34
```

---

**Made by Pirabel Labs · Cotonou, Bénin** 🇧🇯
