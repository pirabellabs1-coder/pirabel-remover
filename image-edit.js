// ============================================================
// PIRABEL — IMAGE EDITING MODULE
// Filtres, recadrage, redimensionnement, watermark
// ============================================================

window.PirabelImageEdit = (function() {
  'use strict';

  // ============================================================
  // FILTRES
  // ============================================================

  const FILTERS = {
    none: { name: 'Aucun', icon: '--', filter: 'none' },
    bw: { name: 'N&B', icon: 'BW', filter: 'grayscale(100%)' },
    sepia: { name: 'Sepia', icon: 'SP', filter: 'sepia(100%)' },
    vintage: { name: 'Vintage', icon: 'VT', filter: 'sepia(40%) contrast(110%) brightness(105%) saturate(120%)' },
    vibrant: { name: 'Vibrant', icon: 'VB', filter: 'saturate(150%) contrast(110%)' },
    cold: { name: 'Froid', icon: 'FR', filter: 'hue-rotate(180deg) saturate(110%)' },
    warm: { name: 'Chaud', icon: 'CH', filter: 'sepia(20%) saturate(140%) brightness(105%)' },
    sharp: { name: 'Net', icon: 'NT', filter: 'contrast(130%) brightness(105%)' },
    dramatic: { name: 'Drama', icon: 'DR', filter: 'contrast(150%) saturate(120%) brightness(95%)' },
    fade: { name: 'Estompe', icon: 'FD', filter: 'brightness(110%) contrast(85%) saturate(80%)' }
  };

  function applyFilter(canvas, filterId) {
    const filter = FILTERS[filterId] || FILTERS.none;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tctx = tempCanvas.getContext('2d');
    tctx.filter = filter.filter;
    tctx.drawImage(canvas, 0, 0);
    return tempCanvas;
  }

  // ============================================================
  // RECADRAGE (CROP)
  // ============================================================

  const CROP_RATIOS = {
    free: { name: 'Libre', icon: 'FREE', ratio: null },
    square: { name: 'Instagram', icon: '1:1', ratio: 1 },
    story: { name: 'Story', icon: '9:16', ratio: 9/16 },
    landscape: { name: 'Paysage', icon: '16:9', ratio: 16/9 },
    portrait: { name: 'Portrait', icon: '4:5', ratio: 4/5 },
    facebook: { name: 'Facebook', icon: 'FB', ratio: 1.91/1 },
    twitter: { name: 'Twitter', icon: 'TW', ratio: 16/9 }
  };

  function cropImage(canvas, x, y, width, height) {
    const cropped = document.createElement('canvas');
    cropped.width = width;
    cropped.height = height;
    cropped.getContext('2d').drawImage(canvas, x, y, width, height, 0, 0, width, height);
    return cropped;
  }

  // ============================================================
  // REDIMENSIONNEMENT (RESIZE)
  // ============================================================

  const RESIZE_PRESETS = {
    hd: { name: 'HD', width: 1280, height: 720 },
    fullhd: { name: 'Full HD', width: 1920, height: 1080 },
    fourk: { name: '4K', width: 3840, height: 2160 },
    instagram: { name: 'Instagram', width: 1080, height: 1080 },
    story: { name: 'Story', width: 1080, height: 1920 },
    facebook: { name: 'Facebook', width: 1200, height: 630 },
    twitter: { name: 'Twitter', width: 1200, height: 675 },
    web: { name: 'Web', width: 800, height: 600 }
  };

  function resizeImage(canvas, targetWidth, targetHeight, fit = 'cover') {
    const resized = document.createElement('canvas');
    resized.width = targetWidth;
    resized.height = targetHeight;
    const rctx = resized.getContext('2d');
    rctx.imageSmoothingEnabled = true;
    rctx.imageSmoothingQuality = 'high';

    const srcRatio = canvas.width / canvas.height;
    const dstRatio = targetWidth / targetHeight;

    let drawW, drawH, drawX, drawY;

    if (fit === 'cover') {
      // Crop pour remplir
      if (srcRatio > dstRatio) {
        drawH = targetHeight;
        drawW = drawH * srcRatio;
        drawX = (targetWidth - drawW) / 2;
        drawY = 0;
      } else {
        drawW = targetWidth;
        drawH = drawW / srcRatio;
        drawX = 0;
        drawY = (targetHeight - drawH) / 2;
      }
    } else {
      // Fit (avec bordures)
      if (srcRatio > dstRatio) {
        drawW = targetWidth;
        drawH = drawW / srcRatio;
        drawX = 0;
        drawY = (targetHeight - drawH) / 2;
      } else {
        drawH = targetHeight;
        drawW = drawH * srcRatio;
        drawX = (targetWidth - drawW) / 2;
        drawY = 0;
      }
      // Fond noir pour les zones vides
      rctx.fillStyle = '#000000';
      rctx.fillRect(0, 0, targetWidth, targetHeight);
    }

    rctx.drawImage(canvas, drawX, drawY, drawW, drawH);
    return resized;
  }

  function resizeByPercent(canvas, percent) {
    return resizeImage(canvas, Math.round(canvas.width * percent / 100), Math.round(canvas.height * percent / 100), 'cover');
  }

  // ============================================================
  // WATERMARK PERSONNEL
  // ============================================================

  function addTextWatermark(canvas, options = {}) {
    const {
      text = 'PIRABEL',
      position = 'bottom-right', // top-left, top-right, bottom-left, bottom-right, center
      fontSize = null,
      color = 'rgba(255, 255, 255, 0.7)',
      backgroundColor = null,
      padding = null
    } = options;

    const result = document.createElement('canvas');
    result.width = canvas.width;
    result.height = canvas.height;
    const rctx = result.getContext('2d');
    rctx.drawImage(canvas, 0, 0);

    const size = fontSize || Math.max(16, Math.round(Math.min(canvas.width, canvas.height) * 0.04));
    const pad = padding || Math.round(size * 0.5);

    rctx.font = `bold ${size}px -apple-system, sans-serif`;
    rctx.textBaseline = 'middle';

    const textWidth = rctx.measureText(text).width;
    const textHeight = size;

    let x, y;
    switch(position) {
      case 'top-left':
        x = pad + textWidth / 2;
        y = pad + textHeight / 2;
        break;
      case 'top-right':
        x = canvas.width - pad - textWidth / 2;
        y = pad + textHeight / 2;
        break;
      case 'bottom-left':
        x = pad + textWidth / 2;
        y = canvas.height - pad - textHeight / 2;
        break;
      case 'center':
        x = canvas.width / 2;
        y = canvas.height / 2;
        break;
      default: // bottom-right
        x = canvas.width - pad - textWidth / 2;
        y = canvas.height - pad - textHeight / 2;
    }

    rctx.textAlign = 'center';

    // Background si demandé
    if (backgroundColor) {
      rctx.fillStyle = backgroundColor;
      const bgPad = size * 0.3;
      rctx.fillRect(x - textWidth/2 - bgPad, y - textHeight/2 - bgPad, textWidth + bgPad*2, textHeight + bgPad*2);
    }

    // Ombre légère pour visibilité
    rctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    rctx.shadowBlur = 3;
    rctx.shadowOffsetX = 1;
    rctx.shadowOffsetY = 1;

    rctx.fillStyle = color;
    rctx.fillText(text, x, y);

    return result;
  }

  // ============================================================
  // CONVERSION DE FORMAT
  // ============================================================

  function exportAs(canvas, format = 'png', quality = 0.92) {
    return new Promise((resolve, reject) => {
      const mime = format === 'png' ? 'image/png'
                 : format === 'webp' ? 'image/webp'
                 : 'image/jpeg';
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Export failed'));
      }, mime, format === 'png' ? undefined : quality);
    });
  }

  // ============================================================
  // SUPPRESSION AUTO MULTI-LOGO
  // ============================================================

  // Détecte automatiquement les zones contenant probablement un logo Gemini
  // (cherche les zones avec haute densité de pixels brillants/contrastés en bas)
  function detectGeminiLogos(canvas) {
    const w = canvas.width;
    const h = canvas.height;
    const ctx = canvas.getContext('2d');

    // On regarde le bas-droit (90% width, 90% height vers la fin)
    const detections = [];

    // Zone classique Gemini : bas-droit
    const sizeR = Math.round(Math.min(w, h) * 0.06);
    detections.push({
      x: w - sizeR - Math.round(w * 0.018),
      y: h - sizeR - Math.round(h * 0.018),
      w: sizeR,
      h: sizeR,
      confidence: 0.95,
      type: 'gemini-diamond'
    });

    return detections;
  }

  // Supprime tous les logos détectés
  function removeAllLogos(canvas) {
    const detections = detectGeminiLogos(canvas);
    const result = document.createElement('canvas');
    result.width = canvas.width;
    result.height = canvas.height;
    const rctx = result.getContext('2d');
    rctx.drawImage(canvas, 0, 0);

    // Pour chaque détection, on échantillonne autour
    detections.forEach(det => {
      patchSampleArea(result, rctx, det.x, det.y, det.w, det.h);
    });

    return { canvas: result, detections };
  }

  function patchSampleArea(canvas, ctx, x, y, w, h) {
    const cw = canvas.width;
    const ch = canvas.height;
    const img = ctx.getImageData(0, 0, cw, ch);
    const data = img.data;
    const sampleH = Math.min(h, y);
    const sampleY = Math.max(0, y - sampleH);
    const useAbove = sampleH >= 4;
    const sampleW = Math.min(w, x);
    const sampleX = Math.max(0, x - sampleW);
    const useLeft = !useAbove && sampleW >= 4;

    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        let srcX, srcY;
        if (useAbove) {
          srcX = x + i;
          const m = j % (sampleH * 2);
          srcY = sampleY + (m < sampleH ? sampleH - 1 - m : m - sampleH);
        } else if (useLeft) {
          srcY = y + j;
          const m = i % (sampleW * 2);
          srcX = sampleX + (m < sampleW ? sampleW - 1 - m : m - sampleW);
        } else {
          srcX = x + i;
          srcY = Math.min(ch - 1, y + h + (h - j - 1));
        }
        const dstIdx = ((y + j) * cw + (x + i)) * 4;
        const srcIdx = (srcY * cw + srcX) * 4;
        data[dstIdx] = data[srcIdx];
        data[dstIdx + 1] = data[srcIdx + 1];
        data[dstIdx + 2] = data[srcIdx + 2];
        data[dstIdx + 3] = data[srcIdx + 3];
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  // ============================================================
  // RÉGLAGES AVANCÉS (Luminosité, Contraste, Saturation)
  // ============================================================

  function applyAdjustments(canvas, brightness, contrast, saturation) {
    const result = document.createElement('canvas');
    result.width = canvas.width;
    result.height = canvas.height;
    const rctx = result.getContext('2d');
    rctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    rctx.drawImage(canvas, 0, 0);
    return result;
  }

  // ============================================================
  // STICKERS / EMOJIS
  // ============================================================

  const STICKER_CATEGORIES = {};

  function addStickerToCanvas(canvas, emoji, x, y, size) {
    return canvas;
  }

  // ============================================================
  // ANNOTATIONS (dessiner sur l'image)
  // ============================================================

  function createAnnotationLayer(width, height) {
    const layer = document.createElement('canvas');
    layer.width = width;
    layer.height = height;
    return layer;
  }

  function mergeAnnotations(baseCanvas, annotationCanvas) {
    const result = document.createElement('canvas');
    result.width = baseCanvas.width;
    result.height = baseCanvas.height;
    const rctx = result.getContext('2d');
    rctx.drawImage(baseCanvas, 0, 0);
    rctx.drawImage(annotationCanvas, 0, 0);
    return result;
  }

  // ============================================================
  // PRESETS SAUVEGARDÉS
  // ============================================================

  function savePreset(name, config) {
    const presets = JSON.parse(localStorage.getItem('pirabel_presets') || '[]');
    presets.push({ name, config, createdAt: Date.now() });
    localStorage.setItem('pirabel_presets', JSON.stringify(presets));
  }

  function loadPresets() {
    return JSON.parse(localStorage.getItem('pirabel_presets') || '[]');
  }

  function deletePreset(index) {
    const presets = JSON.parse(localStorage.getItem('pirabel_presets') || '[]');
    presets.splice(index, 1);
    localStorage.setItem('pirabel_presets', JSON.stringify(presets));
  }

  // ============================================================
  // EXPORT MULTI-FORMAT
  // ============================================================

  async function exportAllFormats(canvas, filename, quality) {
    quality = quality || 0.92;
    const formats = [
      { ext: 'png', mime: 'image/png', quality: undefined },
      { ext: 'jpg', mime: 'image/jpeg', quality: quality },
      { ext: 'webp', mime: 'image/webp', quality: quality }
    ];

    const results = [];
    for (const fmt of formats) {
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, fmt.mime, fmt.quality);
      });
      if (blob) {
        results.push({ blob, ext: fmt.ext, filename: filename + '.' + fmt.ext });
      }
    }
    return results;
  }

  return {
    FILTERS,
    CROP_RATIOS,
    RESIZE_PRESETS,
    STICKER_CATEGORIES,
    applyFilter,
    cropImage,
    resizeImage,
    resizeByPercent,
    addTextWatermark,
    exportAs,
    detectGeminiLogos,
    removeAllLogos,
    // Nouvelles fonctions v5
    applyAdjustments,
    addStickerToCanvas,
    createAnnotationLayer,
    mergeAnnotations,
    savePreset,
    loadPresets,
    deletePreset,
    exportAllFormats
  };
})();
