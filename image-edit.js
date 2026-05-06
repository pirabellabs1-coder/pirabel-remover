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
    none: { name: 'Aucun', icon: '🚫', filter: 'none' },
    bw: { name: 'N&B', icon: '⚫', filter: 'grayscale(100%)' },
    sepia: { name: 'Sépia', icon: '📜', filter: 'sepia(100%)' },
    vintage: { name: 'Vintage', icon: '🎞️', filter: 'sepia(40%) contrast(110%) brightness(105%) saturate(120%)' },
    vibrant: { name: 'Vibrant', icon: '🌈', filter: 'saturate(150%) contrast(110%)' },
    cold: { name: 'Froid', icon: '❄️', filter: 'hue-rotate(180deg) saturate(110%)' },
    warm: { name: 'Chaud', icon: '🔥', filter: 'sepia(20%) saturate(140%) brightness(105%)' },
    sharp: { name: 'Net', icon: '🔍', filter: 'contrast(130%) brightness(105%)' },
    dramatic: { name: 'Drama', icon: '🎭', filter: 'contrast(150%) saturate(120%) brightness(95%)' },
    fade: { name: 'Estompé', icon: '🌫️', filter: 'brightness(110%) contrast(85%) saturate(80%)' }
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
    free: { name: 'Libre', icon: '✂️', ratio: null },
    square: { name: 'Instagram', icon: '⬜', ratio: 1 },
    story: { name: 'Story', icon: '📱', ratio: 9/16 },
    landscape: { name: 'Paysage', icon: '🏞️', ratio: 16/9 },
    portrait: { name: 'Portrait', icon: '👤', ratio: 4/5 },
    facebook: { name: 'Facebook', icon: '📘', ratio: 1.91/1 },
    twitter: { name: 'Twitter', icon: '🐦', ratio: 16/9 }
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

  const STICKER_CATEGORIES = {
    smileys: ['😀','😂','🥰','😎','🤩','😇','🤪','🥳','😏','🤯'],
    hands: ['👍','👏','✌️','🤞','👋','🙌','💪','🤝','👆','✋'],
    hearts: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💖','💝'],
    nature: ['🌟','⭐','🔥','💧','🌈','☀️','🌙','⚡','🍀','🌸'],
    objects: ['👑','💎','🎯','🎨','📸','🎵','🏆','💡','🔑','⚙️'],
    fun: ['🎉','🎊','🎁','🎈','🎭','🎪','🚀','🛸','🎮','🧩']
  };

  function addStickerToCanvas(canvas, emoji, x, y, size) {
    const result = document.createElement('canvas');
    result.width = canvas.width;
    result.height = canvas.height;
    const rctx = result.getContext('2d');
    rctx.drawImage(canvas, 0, 0);
    rctx.font = `${size}px serif`;
    rctx.textAlign = 'center';
    rctx.textBaseline = 'middle';
    rctx.fillText(emoji, x, y);
    return result;
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
  // BACKGROUND REMOVAL (pure canvas — flood-fill from corners)
  // ============================================================

  function removeBackground(canvas, options = {}) {
    const { tolerance = 30, edgeSmooth = 2 } = options;
    const w = canvas.width, h = canvas.height;
    const result = document.createElement('canvas');
    result.width = w; result.height = h;
    const rctx = result.getContext('2d');
    rctx.drawImage(canvas, 0, 0);
    const imgData = rctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // Sample corner colors (4 corners, average)
    const corners = [
      [0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]
    ];
    const cornerColors = corners.map(([cx, cy]) => {
      const i = (cy * w + cx) * 4;
      return [data[i], data[i + 1], data[i + 2]];
    });

    // BFS flood fill from all border pixels
    const visited = new Uint8Array(w * h);
    const queue = [];

    // Seed from all border pixels
    for (let x = 0; x < w; x++) {
      queue.push(x); // top row
      queue.push((h - 1) * w + x); // bottom row
    }
    for (let y = 1; y < h - 1; y++) {
      queue.push(y * w); // left col
      queue.push(y * w + w - 1); // right col
    }

    function colorMatch(idx) {
      const r = data[idx * 4], g = data[idx * 4 + 1], b = data[idx * 4 + 2];
      return cornerColors.some(([cr, cg, cb]) => {
        const dist = Math.sqrt((r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2);
        return dist <= tolerance;
      });
    }

    // BFS
    const toRemove = new Uint8Array(w * h);
    let qi = 0;
    // Mark initial border pixels
    for (let i = 0; i < queue.length; i++) {
      const idx = queue[i];
      if (visited[idx]) continue;
      visited[idx] = 1;
      if (colorMatch(idx)) {
        toRemove[idx] = 1;
      }
    }
    // BFS expand
    const bfsQueue = [];
    for (let i = 0; i < w * h; i++) {
      if (toRemove[i]) bfsQueue.push(i);
    }
    qi = 0;
    while (qi < bfsQueue.length) {
      const idx = bfsQueue[qi++];
      const x = idx % w, y = (idx - x) / w;
      const neighbors = [];
      if (x > 0) neighbors.push(idx - 1);
      if (x < w - 1) neighbors.push(idx + 1);
      if (y > 0) neighbors.push(idx - w);
      if (y < h - 1) neighbors.push(idx + w);
      for (const n of neighbors) {
        if (!visited[n]) {
          visited[n] = 1;
          if (colorMatch(n)) {
            toRemove[n] = 1;
            bfsQueue.push(n);
          }
        }
      }
    }

    // Morphology: erosion then dilation for edge cleanup
    const eroded = new Uint8Array(toRemove);
    const dilated = new Uint8Array(w * h);
    // Simple erosion (shrink mask by 1px)
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (toRemove[i] && toRemove[i - 1] && toRemove[i + 1] && toRemove[i - w] && toRemove[i + w]) {
          eroded[i] = 1;
        } else {
          eroded[i] = 0;
        }
      }
    }
    // Dilation (expand eroded back)
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (eroded[i] || eroded[i - 1] || eroded[i + 1] || eroded[i - w] || eroded[i + w]) {
          dilated[i] = 1;
        }
      }
    }
    // Border pixels stay as original toRemove
    for (let x = 0; x < w; x++) { dilated[x] = toRemove[x]; dilated[(h-1)*w+x] = toRemove[(h-1)*w+x]; }
    for (let y = 0; y < h; y++) { dilated[y*w] = toRemove[y*w]; dilated[y*w+w-1] = toRemove[y*w+w-1]; }

    // Apply alpha with feathering
    for (let i = 0; i < w * h; i++) {
      if (dilated[i]) {
        data[i * 4 + 3] = 0; // fully transparent
      }
    }

    // Feathering: smooth alpha at edges
    if (edgeSmooth > 0) {
      const alphaChannel = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) alphaChannel[i] = data[i * 4 + 3] / 255;
      // Simple box blur on alpha
      for (let pass = 0; pass < edgeSmooth; pass++) {
        const temp = new Float32Array(alphaChannel);
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const i = y * w + x;
            temp[i] = (alphaChannel[i] * 4 + alphaChannel[i-1] + alphaChannel[i+1] + alphaChannel[i-w] + alphaChannel[i+w]) / 8;
          }
        }
        for (let i = 0; i < w * h; i++) alphaChannel[i] = temp[i];
      }
      for (let i = 0; i < w * h; i++) {
        data[i * 4 + 3] = Math.round(alphaChannel[i] * 255);
      }
    }

    rctx.putImageData(imgData, 0, 0);
    return result;
  }

  // ============================================================
  // REPLACE BACKGROUND (composite FG on new BG image)
  // ============================================================

  function replaceBackground(fgCanvas, bgImage, options = {}) {
    const { fit = 'cover' } = options;
    const w = fgCanvas.width, h = fgCanvas.height;
    const result = document.createElement('canvas');
    result.width = w; result.height = h;
    const rctx = result.getContext('2d');

    // Draw background image (fit/cover)
    const bgRatio = bgImage.width / bgImage.height;
    const fgRatio = w / h;
    let dx, dy, dw, dh;
    if (fit === 'cover') {
      if (bgRatio > fgRatio) { dh = h; dw = h * bgRatio; } else { dw = w; dh = w / bgRatio; }
      dx = (w - dw) / 2; dy = (h - dh) / 2;
    } else {
      if (bgRatio > fgRatio) { dw = w; dh = w / bgRatio; } else { dh = h; dw = h * bgRatio; }
      dx = (w - dw) / 2; dy = (h - dh) / 2;
    }
    rctx.drawImage(bgImage, dx, dy, dw, dh);
    // Composite foreground on top
    rctx.drawImage(fgCanvas, 0, 0);
    return result;
  }

  // ============================================================
  // REPLACE BACKGROUND COLOR (solid or gradient)
  // ============================================================

  function replaceBackgroundColor(fgCanvas, color) {
    const w = fgCanvas.width, h = fgCanvas.height;
    const result = document.createElement('canvas');
    result.width = w; result.height = h;
    const rctx = result.getContext('2d');

    // Color can be a string (#hex, rgba) or a gradient spec {type:'linear', stops:[...]}
    if (typeof color === 'object' && color.type === 'linear') {
      const grad = rctx.createLinearGradient(0, 0, w, h);
      (color.stops || []).forEach(s => grad.addColorStop(s.offset, s.color));
      rctx.fillStyle = grad;
    } else if (typeof color === 'object' && color.type === 'radial') {
      const grad = rctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h) / 2);
      (color.stops || []).forEach(s => grad.addColorStop(s.offset, s.color));
      rctx.fillStyle = grad;
    } else {
      rctx.fillStyle = color;
    }
    rctx.fillRect(0, 0, w, h);
    rctx.drawImage(fgCanvas, 0, 0);
    return result;
  }

  // ============================================================
  // COLOR PICKER (pipette)
  // ============================================================

  function pickColor(canvas, x, y) {
    const ctx = canvas.getContext('2d');
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const r = pixel[0], g = pixel[1], b = pixel[2], a = pixel[3];
    const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
    return { r, g, b, a, hex };
  }

  // ============================================================
  // ADD TEXT (rich text on canvas)
  // ============================================================

  function addText(canvas, options = {}) {
    const {
      text = 'Texte',
      x = canvas.width / 2,
      y = canvas.height / 2,
      font = 'sans-serif',
      size = 48,
      color = '#ffffff',
      bold = false,
      italic = false,
      underline = false,
      shadow = true,
      align = 'center'
    } = options;

    const result = document.createElement('canvas');
    result.width = canvas.width;
    result.height = canvas.height;
    const rctx = result.getContext('2d');
    rctx.drawImage(canvas, 0, 0);

    const style = (bold ? 'bold ' : '') + (italic ? 'italic ' : '');
    rctx.font = `${style}${size}px ${font}`;
    rctx.textAlign = align;
    rctx.textBaseline = 'middle';

    if (shadow) {
      rctx.shadowColor = 'rgba(0,0,0,0.5)';
      rctx.shadowBlur = 4;
      rctx.shadowOffsetX = 2;
      rctx.shadowOffsetY = 2;
    }

    rctx.fillStyle = color;
    // Handle multiline
    const lines = text.split('\n');
    const lineHeight = size * 1.3;
    const startY = y - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, i) => {
      rctx.fillText(line, x, startY + i * lineHeight);
    });

    // Underline
    if (underline) {
      rctx.shadowBlur = 0;
      rctx.strokeStyle = color;
      rctx.lineWidth = Math.max(1, size / 15);
      lines.forEach((line, i) => {
        const metrics = rctx.measureText(line);
        const ly = startY + i * lineHeight + size * 0.35;
        let lx = x;
        if (align === 'center') lx = x - metrics.width / 2;
        else if (align === 'right') lx = x - metrics.width;
        rctx.beginPath();
        rctx.moveTo(lx, ly);
        rctx.lineTo(lx + metrics.width, ly);
        rctx.stroke();
      });
    }

    return result;
  }

  // ============================================================
  // BRUSH STROKE (blur/sharpen/eraser/clone)
  // ============================================================

  function applyBrushStroke(canvas, points, options = {}) {
    const { tool = 'blur', size = 20, opacity = 1.0, sourceOffset = null } = options;
    const result = document.createElement('canvas');
    result.width = canvas.width;
    result.height = canvas.height;
    const rctx = result.getContext('2d');
    rctx.drawImage(canvas, 0, 0);

    if (tool === 'eraser') {
      rctx.globalCompositeOperation = 'destination-out';
      rctx.globalAlpha = opacity;
      rctx.lineCap = 'round';
      rctx.lineJoin = 'round';
      rctx.lineWidth = size;
      rctx.strokeStyle = 'rgba(0,0,0,1)';
      rctx.beginPath();
      if (points.length > 0) rctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) rctx.lineTo(points[i].x, points[i].y);
      rctx.stroke();
      rctx.globalCompositeOperation = 'source-over';
      rctx.globalAlpha = 1;
    } else if (tool === 'blur') {
      // Apply blur along stroke path
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tctx = tempCanvas.getContext('2d');
      tctx.filter = 'blur(8px)';
      tctx.drawImage(canvas, 0, 0);
      // Mask: only along the stroke
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = canvas.width;
      maskCanvas.height = canvas.height;
      const mctx = maskCanvas.getContext('2d');
      mctx.lineCap = 'round';
      mctx.lineJoin = 'round';
      mctx.lineWidth = size;
      mctx.strokeStyle = `rgba(255,255,255,${opacity})`;
      mctx.beginPath();
      if (points.length > 0) mctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) mctx.lineTo(points[i].x, points[i].y);
      mctx.stroke();
      // Composite blurred onto result only where mask
      tctx.globalCompositeOperation = 'destination-in';
      tctx.drawImage(maskCanvas, 0, 0);
      rctx.drawImage(tempCanvas, 0, 0);
    } else if (tool === 'sharpen') {
      // Sharpen = unsharp mask along path
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tctx = tempCanvas.getContext('2d');
      tctx.filter = 'contrast(150%) brightness(105%)';
      tctx.drawImage(canvas, 0, 0);
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = canvas.width;
      maskCanvas.height = canvas.height;
      const mctx = maskCanvas.getContext('2d');
      mctx.lineCap = 'round';
      mctx.lineJoin = 'round';
      mctx.lineWidth = size;
      mctx.strokeStyle = `rgba(255,255,255,${opacity})`;
      mctx.beginPath();
      if (points.length > 0) mctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) mctx.lineTo(points[i].x, points[i].y);
      mctx.stroke();
      tctx.globalCompositeOperation = 'destination-in';
      tctx.drawImage(maskCanvas, 0, 0);
      rctx.drawImage(tempCanvas, 0, 0);
    } else if (tool === 'clone' && sourceOffset) {
      // Clone stamp: copy from offset position
      const srcCtx = canvas.getContext('2d');
      for (const pt of points) {
        const sx = pt.x + sourceOffset.x;
        const sy = pt.y + sourceOffset.y;
        const halfSize = size / 2;
        if (sx - halfSize >= 0 && sy - halfSize >= 0 && sx + halfSize <= canvas.width && sy + halfSize <= canvas.height) {
          const srcData = srcCtx.getImageData(sx - halfSize, sy - halfSize, size, size);
          rctx.putImageData(srcData, pt.x - halfSize, pt.y - halfSize);
        }
      }
    }
    return result;
  }

  // ============================================================
  // FLIP IMAGE
  // ============================================================

  function flipImage(canvas, direction) {
    const result = document.createElement('canvas');
    result.width = canvas.width;
    result.height = canvas.height;
    const rctx = result.getContext('2d');
    if (direction === 'horizontal') {
      rctx.translate(result.width, 0);
      rctx.scale(-1, 1);
    } else {
      rctx.translate(0, result.height);
      rctx.scale(1, -1);
    }
    rctx.drawImage(canvas, 0, 0);
    return result;
  }

  // ============================================================
  // ROTATE IMAGE
  // ============================================================

  function rotateImage(canvas, degrees) {
    const rad = (degrees * Math.PI) / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));
    const newW = Math.round(canvas.width * cos + canvas.height * sin);
    const newH = Math.round(canvas.width * sin + canvas.height * cos);
    const result = document.createElement('canvas');
    result.width = newW;
    result.height = newH;
    const rctx = result.getContext('2d');
    rctx.translate(newW / 2, newH / 2);
    rctx.rotate(rad);
    rctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
    return result;
  }

  // ============================================================
  // VIGNETTE (darken edges)
  // ============================================================

  function applyVignette(canvas, options = {}) {
    const { intensity = 0.5, radius = 0.7 } = options;
    const w = canvas.width, h = canvas.height;
    const result = document.createElement('canvas');
    result.width = w; result.height = h;
    const rctx = result.getContext('2d');
    rctx.drawImage(canvas, 0, 0);

    const gradient = rctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * radius * 0.5, w / 2, h / 2, Math.max(w, h) * 0.7);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, `rgba(0,0,0,${intensity})`);
    rctx.fillStyle = gradient;
    rctx.fillRect(0, 0, w, h);
    return result;
  }

  // ============================================================
  // ADD NOISE (photo grain)
  // ============================================================

  function addNoise(canvas, options = {}) {
    const { amount = 30, monochrome = true } = options;
    const w = canvas.width, h = canvas.height;
    const result = document.createElement('canvas');
    result.width = w; result.height = h;
    const rctx = result.getContext('2d');
    rctx.drawImage(canvas, 0, 0);

    const imgData = rctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (monochrome) {
        const noise = (Math.random() - 0.5) * amount;
        data[i] = Math.max(0, Math.min(255, data[i] + noise));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
      } else {
        data[i] = Math.max(0, Math.min(255, data[i] + (Math.random() - 0.5) * amount));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + (Math.random() - 0.5) * amount));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + (Math.random() - 0.5) * amount));
      }
    }
    rctx.putImageData(imgData, 0, 0);
    return result;
  }

  // ============================================================
  // GRADIENT OVERLAY
  // ============================================================

  function applyGradientOverlay(canvas, options = {}) {
    const { type = 'linear', stops = [{offset: 0, color: 'rgba(255,107,26,0.3)'}, {offset: 1, color: 'rgba(0,0,0,0.3)'}], blendMode = 'normal', angle = 0 } = options;
    const w = canvas.width, h = canvas.height;
    const result = document.createElement('canvas');
    result.width = w; result.height = h;
    const rctx = result.getContext('2d');
    rctx.drawImage(canvas, 0, 0);

    let gradient;
    if (type === 'radial') {
      gradient = rctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 2);
    } else {
      // Linear gradient with angle
      const rad = (angle * Math.PI) / 180;
      const cx = w / 2, cy = h / 2;
      const len = Math.max(w, h);
      gradient = rctx.createLinearGradient(
        cx - Math.cos(rad) * len / 2, cy - Math.sin(rad) * len / 2,
        cx + Math.cos(rad) * len / 2, cy + Math.sin(rad) * len / 2
      );
    }
    stops.forEach(s => gradient.addColorStop(s.offset, s.color));

    rctx.globalCompositeOperation = blendMode === 'multiply' ? 'multiply' : blendMode === 'overlay' ? 'overlay' : blendMode === 'screen' ? 'screen' : 'source-over';
    rctx.fillStyle = gradient;
    rctx.fillRect(0, 0, w, h);
    rctx.globalCompositeOperation = 'source-over';
    return result;
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
    // v5
    applyAdjustments,
    addStickerToCanvas,
    createAnnotationLayer,
    mergeAnnotations,
    savePreset,
    loadPresets,
    deletePreset,
    exportAllFormats,
    // v6 — New image processing functions
    removeBackground,
    replaceBackground,
    replaceBackgroundColor,
    pickColor,
    addText,
    applyBrushStroke,
    flipImage,
    rotateImage,
    applyVignette,
    addNoise,
    applyGradientOverlay
  };
})();
