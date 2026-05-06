// ============================================================
// PIRABEL — INTERNATIONALISATION (FR/EN)
// ============================================================

window.PirabelI18n = (function() {
  'use strict';

  const translations = {
    fr: {
      // Nav
      'nav.launch': "Lancer l'app",
      'nav.login': 'Connexion',
      'nav.gallery': 'Galerie',
      'nav.help': 'Aide',
      'nav.dashboard': 'Mon espace',
      'nav.logout': 'Deconnexion',

      // App tabs
      'tab.single': 'Une image',
      'tab.batch': 'Lot',
      'tab.gallery': 'Galerie',

      // Dropzone
      'drop.title': 'Choisir une image',
      'drop.hint': 'Touche pour selectionner\nPNG - JPG - WEBP — ou colle (Ctrl+V)',

      // Editor
      'editor.method': 'Methode',
      'editor.method.patch': 'Echantillonner autour',
      'editor.method.blur': 'Flouter la zone',
      'editor.method.edge': 'Etendre les bords',
      'editor.method.pixelate': 'Pixelliser',
      'editor.precision': 'Precision',
      'editor.smooth': 'Adoucir bords',
      'editor.format': 'Format',
      'editor.format.png': 'PNG (sans perte)',
      'editor.format.jpeg': 'JPEG (leger)',
      'editor.format.webp': 'WEBP',

      // Toolbar
      'btn.auto': 'Auto Pirabel',
      'btn.zone': 'Zone large',
      'btn.clear': 'Effacer',
      'btn.reset': 'Nouvelle',
      'btn.apply': 'Appliquer',
      'btn.undo': 'Annuler',
      'btn.compare': 'Avant/Apres',
      'btn.download': 'Telecharger',
      'btn.reuse': 'Reutiliser',
      'btn.quickExport': 'Export rapide',
      'btn.autoIA': 'Auto-IA',

      // Edit panel
      'edit.title': 'Edition avancee',
      'edit.show': 'Afficher',
      'edit.hide': 'Masquer',
      'edit.filters': 'Filtres',
      'edit.crop': 'Recadrer',
      'edit.resize': 'Resize',
      'edit.watermark': 'Watermark',
      'edit.stickers': 'Stickers',
      'edit.annotate': 'Annoter',
      'edit.adjust': 'Reglages',
      'edit.presets': 'Presets',

      // Filters
      'filter.apply': 'Appliquer le filtre',
      'filter.desc': 'Applique un filtre artistique a ton image :',

      // Crop
      'crop.apply': 'Appliquer le recadrage',
      'crop.desc': 'Recadre selon un format :',

      // Resize
      'resize.apply': 'Appliquer le resize',
      'resize.desc': 'Choisis un format :',
      'resize.custom': 'Ou taille personnalisee',

      // Watermark
      'wm.apply': 'Appliquer le watermark',
      'wm.desc': 'Ajoute ton propre watermark :',
      'wm.text': 'Texte',
      'wm.position': 'Position',
      'wm.opacity': 'Opacite',
      'wm.pos.br': 'Bas droite',
      'wm.pos.bl': 'Bas gauche',
      'wm.pos.tr': 'Haut droite',
      'wm.pos.tl': 'Haut gauche',
      'wm.pos.center': 'Centre',

      // Stickers
      'sticker.desc': 'Clique sur un sticker puis clique sur l\'image pour le placer :',
      'sticker.size': 'Taille',
      'sticker.place': 'Placer le sticker',

      // Annotations
      'annotate.desc': 'Dessine directement sur l\'image :',
      'annotate.color': 'Couleur',
      'annotate.size': 'Epaisseur',
      'annotate.tool.pen': 'Stylo',
      'annotate.tool.line': 'Ligne',
      'annotate.tool.rect': 'Rectangle',
      'annotate.tool.circle': 'Cercle',
      'annotate.tool.text': 'Texte',
      'annotate.clear': 'Effacer annotations',
      'annotate.apply': 'Appliquer annotations',

      // Adjustments
      'adjust.desc': 'Regle manuellement l\'apparence de ton image :',
      'adjust.brightness': 'Luminosite',
      'adjust.contrast': 'Contraste',
      'adjust.saturation': 'Saturation',
      'adjust.apply': 'Appliquer les reglages',
      'adjust.reset': 'Reinitialiser',

      // Presets
      'preset.desc': 'Sauvegarde et reutilise tes configurations preferees :',
      'preset.save': 'Sauvegarder config actuelle',
      'preset.name': 'Nom du preset',
      'preset.empty': 'Aucun preset sauvegarde',
      'preset.load': 'Charger',
      'preset.delete': 'Supprimer',

      // Batch
      'batch.info': 'Mode lot -- disponible avec Pass 3 jours ou Mensuel.',
      'batch.select': 'Selectionner plusieurs images',
      'batch.hint': 'Toutes seront traitees en une fois',
      'batch.process': 'Traiter toutes',
      'batch.downloadAll': 'Tout telecharger',
      'batch.clear': 'Vider',

      // Gallery
      'gallery.info': 'Tes 12 dernieres images traitees (stockage local).',
      'gallery.empty': 'Aucune image traitee',
      'gallery.clear': 'Vider la galerie',

      // Quota
      'quota.free': 'Plan gratuit',
      'quota.remaining': '{n} / {total} images restantes',
      'quota.upgrade': 'Passer Pro',
      'quota.recharge': 'Recharger',
      'quota.reached': 'Quota atteint',
      'quota.chooseplan': 'Tu as utilise toutes tes images. Choisis un plan pour continuer :',

      // Quick export
      'quickexport.title': 'Export rapide',
      'quickexport.desc': 'Telecharge en 1 clic dans tous les formats :',
      'quickexport.all': 'Tout telecharger (PNG + JPG + WEBP)',

      // Rating
      'rating.title': 'Ton avis compte !',
      'rating.desc': 'Comment trouves-tu Pirabel Remover ?',
      'rating.submit': 'Envoyer mon avis',
      'rating.thanks': 'Merci pour ton avis !',
      'rating.comment': 'Un commentaire ? (optionnel)',

      // Newsletter
      'newsletter.title': 'Reste informe',
      'newsletter.desc': 'Recois les nouveautes, promos et astuces par email.',
      'newsletter.placeholder': 'Ton adresse email',
      'newsletter.subscribe': "S'inscrire",
      'newsletter.success': 'Inscrit ! Tu recevras nos prochaines actus.',
      'newsletter.error': 'Email invalide',

      // Theme
      'theme.dark': 'Sombre',
      'theme.light': 'Clair',

      // Lang
      'lang.fr': 'FR',
      'lang.en': 'EN',

      // Toasts
      'toast.imagePasted': 'Image collee',
      'toast.selectionCleared': 'Selection effacee',
      'toast.applied': 'Suppression appliquee',
      'toast.undone': 'Annule',
      'toast.nothingToUndo': 'Rien a annuler',
      'toast.downloaded': 'Telecharge',
      'toast.quotaExhausted': 'Quota epuise',
      'toast.filterApplied': 'Filtre applique',
      'toast.cropApplied': 'Recadre',
      'toast.resized': 'Redimensionne',
      'toast.watermarkApplied': 'Watermark ajoute',
      'toast.stickerPlaced': 'Sticker place',
      'toast.annotationsApplied': 'Annotations appliquees',
      'toast.adjustApplied': 'Reglages appliques',
      'toast.presetSaved': 'Preset sauvegarde',
      'toast.presetLoaded': 'Preset charge',
      'toast.presetDeleted': 'Preset supprime',
      'toast.loadImage': 'Charge d\'abord une image',
      'toast.selectZone': 'Selectionne d\'abord une zone',
      'toast.batchPro': 'Mode lot reserve aux plans Pro',
      'toast.galleryClear': 'Galerie videe',
      'toast.exportStarted': 'Export en cours...',
      'toast.allExported': 'Tous les formats exportes',

      // Install
      'install.text': 'Installer comme app',
      'install.btn': 'Installer',

      // Help
      'help.title': 'Comment utiliser',

      // Misc
      'misc.footer.home': 'Accueil',
      'misc.footer.space': 'Mon espace',
    },

    en: {
      // Nav
      'nav.launch': 'Launch app',
      'nav.login': 'Login',
      'nav.gallery': 'Gallery',
      'nav.help': 'Help',
      'nav.dashboard': 'My space',
      'nav.logout': 'Logout',

      // App tabs
      'tab.single': 'Single',
      'tab.batch': 'Batch',
      'tab.gallery': 'Gallery',

      // Dropzone
      'drop.title': 'Choose an image',
      'drop.hint': 'Tap to select\nPNG - JPG - WEBP — or paste (Ctrl+V)',

      // Editor
      'editor.method': 'Method',
      'editor.method.patch': 'Sample around',
      'editor.method.blur': 'Blur area',
      'editor.method.edge': 'Stretch edges',
      'editor.method.pixelate': 'Pixelate',
      'editor.precision': 'Precision',
      'editor.smooth': 'Smooth edges',
      'editor.format': 'Format',
      'editor.format.png': 'PNG (lossless)',
      'editor.format.jpeg': 'JPEG (light)',
      'editor.format.webp': 'WEBP',

      // Toolbar
      'btn.auto': 'Auto Pirabel',
      'btn.zone': 'Wide zone',
      'btn.clear': 'Clear',
      'btn.reset': 'New',
      'btn.apply': 'Apply',
      'btn.undo': 'Undo',
      'btn.compare': 'Before/After',
      'btn.download': 'Download',
      'btn.reuse': 'Reuse',
      'btn.quickExport': 'Quick export',
      'btn.autoIA': 'Auto-AI',

      // Edit panel
      'edit.title': 'Advanced editing',
      'edit.show': 'Show',
      'edit.hide': 'Hide',
      'edit.filters': 'Filters',
      'edit.crop': 'Crop',
      'edit.resize': 'Resize',
      'edit.watermark': 'Watermark',
      'edit.stickers': 'Stickers',
      'edit.annotate': 'Annotate',
      'edit.adjust': 'Adjust',
      'edit.presets': 'Presets',

      // Filters
      'filter.apply': 'Apply filter',
      'filter.desc': 'Apply an artistic filter to your image:',

      // Crop
      'crop.apply': 'Apply crop',
      'crop.desc': 'Crop to a format:',

      // Resize
      'resize.apply': 'Apply resize',
      'resize.desc': 'Choose a format:',
      'resize.custom': 'Or custom size',

      // Watermark
      'wm.apply': 'Apply watermark',
      'wm.desc': 'Add your own watermark:',
      'wm.text': 'Text',
      'wm.position': 'Position',
      'wm.opacity': 'Opacity',
      'wm.pos.br': 'Bottom right',
      'wm.pos.bl': 'Bottom left',
      'wm.pos.tr': 'Top right',
      'wm.pos.tl': 'Top left',
      'wm.pos.center': 'Center',

      // Stickers
      'sticker.desc': 'Click a sticker then click on the image to place it:',
      'sticker.size': 'Size',
      'sticker.place': 'Place sticker',

      // Annotations
      'annotate.desc': 'Draw directly on the image:',
      'annotate.color': 'Color',
      'annotate.size': 'Thickness',
      'annotate.tool.pen': 'Pen',
      'annotate.tool.line': 'Line',
      'annotate.tool.rect': 'Rectangle',
      'annotate.tool.circle': 'Circle',
      'annotate.tool.text': 'Text',
      'annotate.clear': 'Clear annotations',
      'annotate.apply': 'Apply annotations',

      // Adjustments
      'adjust.desc': 'Manually adjust the look of your image:',
      'adjust.brightness': 'Brightness',
      'adjust.contrast': 'Contrast',
      'adjust.saturation': 'Saturation',
      'adjust.apply': 'Apply adjustments',
      'adjust.reset': 'Reset',

      // Presets
      'preset.desc': 'Save and reuse your favorite configurations:',
      'preset.save': 'Save current config',
      'preset.name': 'Preset name',
      'preset.empty': 'No saved presets',
      'preset.load': 'Load',
      'preset.delete': 'Delete',

      // Batch
      'batch.info': 'Batch mode -- available with 3-day Pass or Monthly.',
      'batch.select': 'Select multiple images',
      'batch.hint': 'All will be processed at once',
      'batch.process': 'Process all',
      'batch.downloadAll': 'Download all',
      'batch.clear': 'Clear',

      // Gallery
      'gallery.info': 'Your last 12 processed images (local storage).',
      'gallery.empty': 'No processed images',
      'gallery.clear': 'Clear gallery',

      // Quota
      'quota.free': 'Free plan',
      'quota.remaining': '{n} / {total} images remaining',
      'quota.upgrade': 'Upgrade',
      'quota.recharge': 'Recharge',
      'quota.reached': 'Quota reached',
      'quota.chooseplan': 'You used all your images. Choose a plan to continue:',

      // Quick export
      'quickexport.title': 'Quick export',
      'quickexport.desc': 'Download in 1 click in all formats:',
      'quickexport.all': 'Download all (PNG + JPG + WEBP)',

      // Rating
      'rating.title': 'Your feedback matters!',
      'rating.desc': 'How do you find Pirabel Remover?',
      'rating.submit': 'Submit feedback',
      'rating.thanks': 'Thanks for your feedback!',
      'rating.comment': 'A comment? (optional)',

      // Newsletter
      'newsletter.title': 'Stay updated',
      'newsletter.desc': 'Get news, promos and tips by email.',
      'newsletter.placeholder': 'Your email address',
      'newsletter.subscribe': 'Subscribe',
      'newsletter.success': 'Subscribed! You will receive our next updates.',
      'newsletter.error': 'Invalid email',

      // Theme
      'theme.dark': 'Dark',
      'theme.light': 'Light',

      // Lang
      'lang.fr': 'FR',
      'lang.en': 'EN',

      // Toasts
      'toast.imagePasted': 'Image pasted',
      'toast.selectionCleared': 'Selection cleared',
      'toast.applied': 'Removal applied',
      'toast.undone': 'Undone',
      'toast.nothingToUndo': 'Nothing to undo',
      'toast.downloaded': 'Downloaded',
      'toast.quotaExhausted': 'Quota exhausted',
      'toast.filterApplied': 'Filter applied',
      'toast.cropApplied': 'Cropped',
      'toast.resized': 'Resized',
      'toast.watermarkApplied': 'Watermark added',
      'toast.stickerPlaced': 'Sticker placed',
      'toast.annotationsApplied': 'Annotations applied',
      'toast.adjustApplied': 'Adjustments applied',
      'toast.presetSaved': 'Preset saved',
      'toast.presetLoaded': 'Preset loaded',
      'toast.presetDeleted': 'Preset deleted',
      'toast.loadImage': 'Load an image first',
      'toast.selectZone': 'Select a zone first',
      'toast.batchPro': 'Batch mode for Pro plans only',
      'toast.galleryClear': 'Gallery cleared',
      'toast.exportStarted': 'Exporting...',
      'toast.allExported': 'All formats exported',

      // Install
      'install.text': 'Install as app',
      'install.btn': 'Install',

      // Help
      'help.title': 'How to use',

      // Misc
      'misc.footer.home': 'Home',
      'misc.footer.space': 'My space',
    }
  };

  let currentLang = localStorage.getItem('pirabel_lang') || 'fr';

  function t(key, params) {
    const str = (translations[currentLang] && translations[currentLang][key]) ||
                (translations.fr && translations.fr[key]) || key;
    if (!params) return str;
    return str.replace(/\{(\w+)\}/g, (_, k) => params[k] !== undefined ? params[k] : '{' + k + '}');
  }

  function getLang() { return currentLang; }

  function setLang(lang) {
    if (!translations[lang]) return;
    currentLang = lang;
    localStorage.setItem('pirabel_lang', lang);
    applyTranslations();
    document.documentElement.lang = lang;
  }

  function toggleLang() {
    setLang(currentLang === 'fr' ? 'en' : 'fr');
  }

  function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const val = t(key);
      if (el.tagName === 'INPUT' && el.type !== 'button' && el.type !== 'submit') {
        el.placeholder = val;
      } else {
        el.textContent = val;
      }
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = t(el.dataset.i18nTitle);
    });
    // Update lang toggle buttons
    document.querySelectorAll('.lang-toggle-btn').forEach(btn => {
      btn.textContent = currentLang === 'fr' ? 'EN' : 'FR';
    });
  }

  return { t, getLang, setLang, toggleLang, applyTranslations };
})();
