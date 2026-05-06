// ============================================================
// PIRABEL — APP EDIT FEATURES v5
// Filtres, crop, resize, watermark, stickers, annotations,
// réglages avancés, presets sauvegardés
// ============================================================

(function() {
  'use strict';

  if (!document.getElementById('toggleEditBtn')) return;

  const E = window.PirabelImageEdit;
  if (!E) return;

  // ============================================================
  // TOGGLE PANEL
  // ============================================================

  const toggleBtn = document.getElementById('toggleEditBtn');
  const editPanel = document.getElementById('editPanel');

  toggleBtn.addEventListener('click', () => {
    const isHidden = editPanel.style.display === 'none';
    editPanel.style.display = isHidden ? 'block' : 'none';
    toggleBtn.textContent = isHidden ? 'Masquer' : 'Afficher';
  });

  // ============================================================
  // SUB TABS
  // ============================================================

  document.querySelectorAll('.edit-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.edit-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.edit-panel').forEach(p => p.style.display = 'none');
      tab.classList.add('active');
      const panel = document.getElementById('editPanel-' + tab.dataset.edittab);
      if (panel) {
        panel.style.display = 'block';
        panel.classList.add('active');
      }
      // Deactivate annotation mode when switching tabs
      if (tab.dataset.edittab !== 'annotate') {
        deactivateAnnotationMode();
      }
      if (tab.dataset.edittab !== 'stickers') {
        deactivateStickerMode();
      }
    });
  });

  // ============================================================
  // HELPERS
  // ============================================================

  function getCanvas() {
    return document.getElementById('imgCanvas');
  }

  function pushHistory() {
    const canvas = getCanvas();
    if (!canvas || !window.appHistory) return;
    const ctx = canvas.getContext('2d');
    window.appHistory.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  }

  function replaceCanvas(newCanvas) {
    const canvas = getCanvas();
    if (!canvas) return;
    canvas.width = newCanvas.width;
    canvas.height = newCanvas.height;
    const overlay = document.getElementById('overlay');
    if (overlay) {
      overlay.width = newCanvas.width;
      overlay.height = newCanvas.height;
    }
    const ctx = canvas.getContext('2d');
    ctx.drawImage(newCanvas, 0, 0);
  }

  function showToast(msg, kind) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast' + (kind ? ' ' + kind : '');
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
  }

  // ============================================================
  // FILTRES
  // ============================================================

  let selectedFilter = null;
  const filterGrid = document.getElementById('filterGrid');

  if (filterGrid) {
    Object.entries(E.FILTERS).forEach(([id, f]) => {
      const item = document.createElement('div');
      item.className = 'filter-item';
      item.dataset.filter = id;
      item.innerHTML = `<span class="filter-icon">${f.icon}</span><span class="filter-name">${f.name}</span>`;
      item.addEventListener('click', () => {
        document.querySelectorAll('.filter-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        selectedFilter = id;
        document.getElementById('applyFilterBtn').disabled = false;
      });
      filterGrid.appendChild(item);
    });
  }

  const applyFilterBtn = document.getElementById('applyFilterBtn');
  if (applyFilterBtn) {
    applyFilterBtn.addEventListener('click', () => {
      if (!selectedFilter) return;
      const canvas = getCanvas();
      if (!canvas || canvas.width === 0) { showToast('Charge d\'abord une image', 'error'); return; }
      pushHistory();
      const filtered = E.applyFilter(canvas, selectedFilter);
      replaceCanvas(filtered);
      showToast('Filtre applique', 'success');
    });
  }

  // ============================================================
  // CROP
  // ============================================================

  let selectedCrop = null;
  const cropGrid = document.getElementById('cropGrid');

  if (cropGrid) {
    Object.entries(E.CROP_RATIOS).forEach(([id, c]) => {
      const item = document.createElement('div');
      item.className = 'crop-item';
      item.dataset.crop = id;
      item.innerHTML = `<span class="crop-icon">${c.icon}</span><span class="crop-name">${c.name}</span>`;
      item.addEventListener('click', () => {
        document.querySelectorAll('.crop-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        selectedCrop = id;
        document.getElementById('applyCropBtn').disabled = false;
        const canvas = getCanvas();
        const info = document.getElementById('cropInfo');
        if (canvas && c.ratio) {
          const w = canvas.width, h = canvas.height;
          let cw, ch;
          if (w / h > c.ratio) { ch = h; cw = Math.round(h * c.ratio); }
          else { cw = w; ch = Math.round(w / c.ratio); }
          info.textContent = `Sera recadré en ${cw} × ${ch} px`;
        } else {
          info.textContent = 'Le recadrage libre garde la taille actuelle';
        }
      });
      cropGrid.appendChild(item);
    });
  }

  const applyCropBtn = document.getElementById('applyCropBtn');
  if (applyCropBtn) {
    applyCropBtn.addEventListener('click', () => {
      if (!selectedCrop) return;
      const canvas = getCanvas();
      if (!canvas || canvas.width === 0) { showToast('Charge d\'abord une image', 'error'); return; }
      const c = E.CROP_RATIOS[selectedCrop];
      if (!c.ratio) { showToast('Crop libre - garde la taille actuelle', 'info'); return; }
      pushHistory();
      const w = canvas.width, h = canvas.height;
      let cw, ch, cx, cy;
      if (w / h > c.ratio) { ch = h; cw = Math.round(h * c.ratio); cx = Math.round((w - cw) / 2); cy = 0; }
      else { cw = w; ch = Math.round(w / c.ratio); cx = 0; cy = Math.round((h - ch) / 2); }
      const cropped = E.cropImage(canvas, cx, cy, cw, ch);
      replaceCanvas(cropped);
      showToast(`Recadre en ${cw} x ${ch}`, 'success');
    });
  }

  // ============================================================
  // RESIZE
  // ============================================================

  const resizeGrid = document.getElementById('resizeGrid');

  if (resizeGrid) {
    Object.entries(E.RESIZE_PRESETS).forEach(([id, p]) => {
      const item = document.createElement('div');
      item.className = 'resize-item';
      item.dataset.resize = id;
      item.innerHTML = `<span class="resize-name">${p.name}</span><div class="resize-size">${p.width} × ${p.height}</div>`;
      item.addEventListener('click', () => {
        document.querySelectorAll('.resize-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        document.getElementById('resizeW').value = p.width;
        document.getElementById('resizeH').value = p.height;
      });
      resizeGrid.appendChild(item);
    });
  }

  const applyResizeBtn = document.getElementById('applyResizeBtn');
  if (applyResizeBtn) {
    applyResizeBtn.addEventListener('click', () => {
      const canvas = getCanvas();
      if (!canvas || canvas.width === 0) { showToast('Charge d\'abord une image', 'error'); return; }
      const w = parseInt(document.getElementById('resizeW').value, 10);
      const h = parseInt(document.getElementById('resizeH').value, 10);
      if (!w || !h || w < 50 || h < 50 || w > 8000 || h > 8000) { showToast('Tailles invalides (50-8000)', 'error'); return; }
      pushHistory();
      const resized = E.resizeImage(canvas, w, h, 'cover');
      replaceCanvas(resized);
      showToast(`Redimensionne en ${w} x ${h}`, 'success');
    });
  }

  // ============================================================
  // WATERMARK
  // ============================================================

  const opacitySlider = document.getElementById('wmOpacity');
  const opacityVal = document.getElementById('wmOpacityVal');

  if (opacitySlider) {
    opacitySlider.addEventListener('input', () => {
      opacityVal.textContent = opacitySlider.value + '%';
    });
  }

  const applyWatermarkBtn = document.getElementById('applyWatermarkBtn');
  if (applyWatermarkBtn) {
    applyWatermarkBtn.addEventListener('click', () => {
      const canvas = getCanvas();
      if (!canvas || canvas.width === 0) { showToast('Charge d\'abord une image', 'error'); return; }
      const text = document.getElementById('wmText').value.trim();
      if (!text) { showToast('Entre un texte pour le watermark', 'error'); return; }
      pushHistory();
      const opacity = parseInt(opacitySlider.value, 10) / 100;
      const result = E.addTextWatermark(canvas, {
        text: text,
        position: document.getElementById('wmPosition').value,
        color: `rgba(255, 255, 255, ${opacity})`
      });
      replaceCanvas(result);
      showToast('Watermark ajoute', 'success');
    });
  }

  // ============================================================
  // STICKERS / EMOJIS
  // ============================================================

  let selectedSticker = null;
  let stickerMode = false;
  const stickerGrid = document.getElementById('stickerGrid');
  const stickerCats = document.getElementById('stickerCategories');
  const stickerSizeSlider = document.getElementById('stickerSize');
  const stickerSizeVal = document.getElementById('stickerSizeVal');

  if (stickerGrid && stickerCats) {
    // Category buttons
    const categories = E.STICKER_CATEGORIES;
    const catNames = { smileys: 'Smileys', hands: 'Mains', hearts: 'Coeurs', nature: 'Nature', objects: 'Objets', fun: 'Fun' };
    let activeCategory = 'smileys';

    function renderStickerCategory(catId) {
      stickerGrid.innerHTML = '';
      const emojis = categories[catId] || [];
      emojis.forEach(emoji => {
        const btn = document.createElement('button');
        btn.className = 'sticker-btn' + (selectedSticker === emoji ? ' selected' : '');
        btn.textContent = emoji;
        btn.addEventListener('click', () => {
          document.querySelectorAll('.sticker-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          selectedSticker = emoji;
          activateStickerMode();
          const info = document.getElementById('stickerInfo');
          if (info) info.textContent = `Sticker "${emoji}" sélectionné. Clique sur l'image !`;
        });
        stickerGrid.appendChild(btn);
      });
    }

    Object.entries(catNames).forEach(([id, name]) => {
      const btn = document.createElement('button');
      btn.className = 'btn sticker-cat-btn' + (id === activeCategory ? ' active' : '');
      btn.textContent = name;
      btn.style.fontSize = '11px';
      btn.style.padding = '6px 10px';
      btn.addEventListener('click', () => {
        activeCategory = id;
        document.querySelectorAll('.sticker-cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderStickerCategory(id);
      });
      stickerCats.appendChild(btn);
    });

    renderStickerCategory(activeCategory);
  }

  if (stickerSizeSlider) {
    stickerSizeSlider.addEventListener('input', () => {
      stickerSizeVal.textContent = stickerSizeSlider.value + 'px';
    });
  }

  function activateStickerMode() {
    stickerMode = true;
    const canvas = getCanvas();
    if (canvas) canvas.style.cursor = 'cell';
  }

  function deactivateStickerMode() {
    stickerMode = false;
    selectedSticker = null;
    const canvas = getCanvas();
    if (canvas) canvas.style.cursor = 'crosshair';
  }

  // Listen for clicks on canvas to place stickers
  document.addEventListener('click', function(e) {
    if (!stickerMode || !selectedSticker) return;
    const canvas = getCanvas();
    if (!canvas || e.target !== canvas) return;

    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const x = Math.round((e.clientX - rect.left) * sx);
    const y = Math.round((e.clientY - rect.top) * sy);
    const size = parseInt(stickerSizeSlider.value, 10) || 60;

    pushHistory();
    const result = E.addStickerToCanvas(canvas, selectedSticker, x, y, size);
    replaceCanvas(result);
    showToast('Sticker place', 'success');
  });

  // ============================================================
  // ANNOTATIONS (Draw on image)
  // ============================================================

  let annotationMode = false;
  let annotCanvas = null;
  let annotCtx = null;
  let annotTool = 'pen';
  let annotColor = '#FF0000';
  let annotLineWidth = 4;
  let annotDrawing = false;
  let annotStartPt = null;
  let annotPaths = [];

  // Color palette
  const colorPalette = document.getElementById('colorPalette');
  if (colorPalette) {
    colorPalette.querySelectorAll('.color-swatch').forEach(btn => {
      btn.addEventListener('click', () => {
        colorPalette.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        annotColor = btn.dataset.color;
      });
    });
  }

  // Annotation tool buttons
  document.querySelectorAll('.annotate-tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.annotate-tool-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      annotTool = btn.dataset.tool;
      if (annotTool === 'text') {
        const text = prompt('Texte à ajouter :');
        if (text && annotCanvas) {
          const canvas = getCanvas();
          const rect = canvas.getBoundingClientRect();
          // Place text at center
          annotCtx.font = `bold ${annotLineWidth * 6}px sans-serif`;
          annotCtx.fillStyle = annotColor;
          annotCtx.textAlign = 'center';
          annotCtx.fillText(text, annotCanvas.width / 2, annotCanvas.height / 2);
        }
      }
    });
  });

  // Annotation size slider
  const annotSizeSlider = document.getElementById('annotSize');
  const annotSizeVal = document.getElementById('annotSizeVal');
  if (annotSizeSlider) {
    annotSizeSlider.addEventListener('input', () => {
      annotLineWidth = parseInt(annotSizeSlider.value, 10);
      annotSizeVal.textContent = annotLineWidth + 'px';
    });
  }

  function activateAnnotationMode() {
    const canvas = getCanvas();
    if (!canvas || canvas.width === 0) return;
    annotationMode = true;

    // Create annotation overlay canvas
    if (!annotCanvas || annotCanvas.width !== canvas.width || annotCanvas.height !== canvas.height) {
      annotCanvas = E.createAnnotationLayer(canvas.width, canvas.height);
      annotCtx = annotCanvas.getContext('2d');
    }

    const overlay = document.getElementById('overlay');
    if (overlay) {
      overlay.style.pointerEvents = 'auto';
      overlay.style.cursor = 'crosshair';
    }
  }

  function deactivateAnnotationMode() {
    annotationMode = false;
    const overlay = document.getElementById('overlay');
    if (overlay) {
      overlay.style.pointerEvents = 'none';
      overlay.style.cursor = 'default';
    }
  }

  // Activate when annotations tab is shown
  document.querySelectorAll('.edit-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      if (tab.dataset.edittab === 'annotate') {
        activateAnnotationMode();
      }
    });
  });

  // Annotation drawing on overlay canvas
  const overlay = document.getElementById('overlay');
  if (overlay) {
    function getOverlayCoords(e) {
      const rect = overlay.getBoundingClientRect();
      const sx = overlay.width / rect.width;
      const sy = overlay.height / rect.height;
      const cx = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      const cy = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
      return { x: (cx - rect.left) * sx, y: (cy - rect.top) * sy };
    }

    overlay.addEventListener('pointerdown', function(e) {
      if (!annotationMode || !annotCanvas) return;
      e.preventDefault();
      e.stopPropagation();
      annotDrawing = true;
      annotStartPt = getOverlayCoords(e);
      if (annotTool === 'pen') {
        annotCtx.beginPath();
        annotCtx.moveTo(annotStartPt.x, annotStartPt.y);
      }
      overlay.setPointerCapture(e.pointerId);
    });

    overlay.addEventListener('pointermove', function(e) {
      if (!annotationMode || !annotDrawing || !annotCanvas) return;
      const pt = getOverlayCoords(e);
      const octx = overlay.getContext('2d');

      if (annotTool === 'pen') {
        annotCtx.strokeStyle = annotColor;
        annotCtx.lineWidth = annotLineWidth;
        annotCtx.lineCap = 'round';
        annotCtx.lineJoin = 'round';
        annotCtx.lineTo(pt.x, pt.y);
        annotCtx.stroke();
        // Also draw on overlay for live preview
        octx.clearRect(0, 0, overlay.width, overlay.height);
        octx.drawImage(annotCanvas, 0, 0);
      } else {
        // For shapes, show preview on overlay
        octx.clearRect(0, 0, overlay.width, overlay.height);
        octx.drawImage(annotCanvas, 0, 0);
        octx.strokeStyle = annotColor;
        octx.lineWidth = annotLineWidth;
        octx.lineCap = 'round';
        if (annotTool === 'line') {
          octx.beginPath();
          octx.moveTo(annotStartPt.x, annotStartPt.y);
          octx.lineTo(pt.x, pt.y);
          octx.stroke();
        } else if (annotTool === 'rect') {
          octx.strokeRect(annotStartPt.x, annotStartPt.y, pt.x - annotStartPt.x, pt.y - annotStartPt.y);
        } else if (annotTool === 'circle') {
          const rx = Math.abs(pt.x - annotStartPt.x) / 2;
          const ry = Math.abs(pt.y - annotStartPt.y) / 2;
          const cx = (annotStartPt.x + pt.x) / 2;
          const cy = (annotStartPt.y + pt.y) / 2;
          octx.beginPath();
          octx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          octx.stroke();
        }
      }
    });

    overlay.addEventListener('pointerup', function(e) {
      if (!annotationMode || !annotDrawing || !annotCanvas) return;
      annotDrawing = false;
      const pt = getOverlayCoords(e);

      // For shapes, commit to annotation canvas
      if (annotTool !== 'pen') {
        annotCtx.strokeStyle = annotColor;
        annotCtx.lineWidth = annotLineWidth;
        annotCtx.lineCap = 'round';
        if (annotTool === 'line') {
          annotCtx.beginPath();
          annotCtx.moveTo(annotStartPt.x, annotStartPt.y);
          annotCtx.lineTo(pt.x, pt.y);
          annotCtx.stroke();
        } else if (annotTool === 'rect') {
          annotCtx.strokeRect(annotStartPt.x, annotStartPt.y, pt.x - annotStartPt.x, pt.y - annotStartPt.y);
        } else if (annotTool === 'circle') {
          const rx = Math.abs(pt.x - annotStartPt.x) / 2;
          const ry = Math.abs(pt.y - annotStartPt.y) / 2;
          const cx = (annotStartPt.x + pt.x) / 2;
          const cy = (annotStartPt.y + pt.y) / 2;
          annotCtx.beginPath();
          annotCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          annotCtx.stroke();
        }
      }

      // Update overlay to show annotation
      const octx = overlay.getContext('2d');
      octx.clearRect(0, 0, overlay.width, overlay.height);
      octx.drawImage(annotCanvas, 0, 0);

      try { overlay.releasePointerCapture(e.pointerId); } catch (err) {}
    });
  }

  // Clear annotations
  const clearAnnotBtn = document.getElementById('clearAnnotBtn');
  if (clearAnnotBtn) {
    clearAnnotBtn.addEventListener('click', () => {
      if (annotCanvas) {
        annotCtx.clearRect(0, 0, annotCanvas.width, annotCanvas.height);
        const octx = document.getElementById('overlay').getContext('2d');
        octx.clearRect(0, 0, overlay.width, overlay.height);
      }
      showToast('Annotations effacées');
    });
  }

  // Apply annotations to canvas
  const applyAnnotBtn = document.getElementById('applyAnnotBtn');
  if (applyAnnotBtn) {
    applyAnnotBtn.addEventListener('click', () => {
      const canvas = getCanvas();
      if (!canvas || !annotCanvas) return;
      pushHistory();
      const merged = E.mergeAnnotations(canvas, annotCanvas);
      replaceCanvas(merged);
      // Clear annotations after applying
      annotCtx.clearRect(0, 0, annotCanvas.width, annotCanvas.height);
      const octx = document.getElementById('overlay').getContext('2d');
      octx.clearRect(0, 0, overlay.width, overlay.height);
      deactivateAnnotationMode();
      showToast('Annotations appliquees', 'success');
    });
  }

  // ============================================================
  // RÉGLAGES AVANCÉS (Brightness, Contrast, Saturation)
  // ============================================================

  const adjBrightness = document.getElementById('adjBrightness');
  const adjContrast = document.getElementById('adjContrast');
  const adjSaturation = document.getElementById('adjSaturation');
  const adjBrightnessVal = document.getElementById('adjBrightnessVal');
  const adjContrastVal = document.getElementById('adjContrastVal');
  const adjSaturationVal = document.getElementById('adjSaturationVal');

  if (adjBrightness) {
    adjBrightness.addEventListener('input', () => {
      adjBrightnessVal.textContent = adjBrightness.value + '%';
      previewAdjustments();
    });
  }
  if (adjContrast) {
    adjContrast.addEventListener('input', () => {
      adjContrastVal.textContent = adjContrast.value + '%';
      previewAdjustments();
    });
  }
  if (adjSaturation) {
    adjSaturation.addEventListener('input', () => {
      adjSaturationVal.textContent = adjSaturation.value + '%';
      previewAdjustments();
    });
  }

  function previewAdjustments() {
    const canvas = getCanvas();
    if (!canvas || canvas.width === 0) return;
    const b = parseInt(adjBrightness.value, 10);
    const c = parseInt(adjContrast.value, 10);
    const s = parseInt(adjSaturation.value, 10);
    canvas.style.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;
  }

  const resetAdjustBtn = document.getElementById('resetAdjustBtn');
  if (resetAdjustBtn) {
    resetAdjustBtn.addEventListener('click', () => {
      adjBrightness.value = 100; adjBrightnessVal.textContent = '100%';
      adjContrast.value = 100; adjContrastVal.textContent = '100%';
      adjSaturation.value = 100; adjSaturationVal.textContent = '100%';
      const canvas = getCanvas();
      if (canvas) canvas.style.filter = 'none';
    });
  }

  const applyAdjustBtn = document.getElementById('applyAdjustBtn');
  if (applyAdjustBtn) {
    applyAdjustBtn.addEventListener('click', () => {
      const canvas = getCanvas();
      if (!canvas || canvas.width === 0) { showToast('Charge d\'abord une image', 'error'); return; }
      pushHistory();
      const b = parseInt(adjBrightness.value, 10);
      const c = parseInt(adjContrast.value, 10);
      const s = parseInt(adjSaturation.value, 10);
      canvas.style.filter = 'none';
      const result = E.applyAdjustments(canvas, b, c, s);
      replaceCanvas(result);
      // Reset sliders after applying
      adjBrightness.value = 100; adjBrightnessVal.textContent = '100%';
      adjContrast.value = 100; adjContrastVal.textContent = '100%';
      adjSaturation.value = 100; adjSaturationVal.textContent = '100%';
      showToast('Reglages appliques', 'success');
    });
  }

  // ============================================================
  // PRESETS SAUVEGARDÉS
  // ============================================================

  const presetNameInput = document.getElementById('presetNameInput');
  const savePresetBtn = document.getElementById('savePresetBtn');
  const presetsList = document.getElementById('presetsList');

  function getCurrentConfig() {
    return {
      filter: selectedFilter,
      crop: selectedCrop,
      brightness: adjBrightness ? parseInt(adjBrightness.value, 10) : 100,
      contrast: adjContrast ? parseInt(adjContrast.value, 10) : 100,
      saturation: adjSaturation ? parseInt(adjSaturation.value, 10) : 100,
      watermarkText: document.getElementById('wmText') ? document.getElementById('wmText').value : '',
      watermarkPosition: document.getElementById('wmPosition') ? document.getElementById('wmPosition').value : 'bottom-right',
      watermarkOpacity: opacitySlider ? parseInt(opacitySlider.value, 10) : 70,
      method: document.getElementById('method') ? document.getElementById('method').value : 'patch',
      precision: document.getElementById('presetSize') ? parseInt(document.getElementById('presetSize').value, 10) : 6,
    };
  }

  function applyPresetConfig(config) {
    if (config.filter && config.filter !== 'none') {
      selectedFilter = config.filter;
      document.querySelectorAll('.filter-item').forEach(i => {
        i.classList.toggle('selected', i.dataset.filter === config.filter);
      });
      const applyBtn = document.getElementById('applyFilterBtn');
      if (applyBtn) applyBtn.disabled = false;
    }
    if (config.brightness && adjBrightness) {
      adjBrightness.value = config.brightness;
      adjBrightnessVal.textContent = config.brightness + '%';
    }
    if (config.contrast && adjContrast) {
      adjContrast.value = config.contrast;
      adjContrastVal.textContent = config.contrast + '%';
    }
    if (config.saturation && adjSaturation) {
      adjSaturation.value = config.saturation;
      adjSaturationVal.textContent = config.saturation + '%';
    }
    if (config.watermarkText) {
      const wmText = document.getElementById('wmText');
      if (wmText) wmText.value = config.watermarkText;
    }
    if (config.watermarkPosition) {
      const wmPos = document.getElementById('wmPosition');
      if (wmPos) wmPos.value = config.watermarkPosition;
    }
    if (config.watermarkOpacity && opacitySlider) {
      opacitySlider.value = config.watermarkOpacity;
      opacityVal.textContent = config.watermarkOpacity + '%';
    }
    if (config.method) {
      const method = document.getElementById('method');
      if (method) method.value = config.method;
    }
    if (config.precision) {
      const ps = document.getElementById('presetSize');
      const psVal = document.getElementById('presetSizeVal');
      if (ps) { ps.value = config.precision; psVal.textContent = config.precision + '%'; }
    }
  }

  function renderPresets() {
    if (!presetsList) return;
    const presets = E.loadPresets();
    if (presets.length === 0) {
      presetsList.innerHTML = '<p class="text-tertiary text-sm" style="text-align:center; padding:16px;">Aucun preset sauvegardé</p>';
      return;
    }
    presetsList.innerHTML = '';
    presets.forEach((p, index) => {
      const div = document.createElement('div');
      div.className = 'preset-item';
      div.innerHTML = `
        <div class="preset-info">
          <strong>${p.name}</strong>
          <span class="text-tertiary text-sm">${new Date(p.createdAt).toLocaleDateString('fr-FR')}</span>
        </div>
        <div class="preset-actions">
          <button class="btn" data-load="${index}" style="padding:6px 10px; font-size:11px;">Charger</button>
          <button class="btn btn-danger" data-del="${index}" style="padding:6px 10px; font-size:11px;">X</button>
        </div>
      `;
      presetsList.appendChild(div);
    });

    presetsList.querySelectorAll('[data-load]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.load, 10);
        const presets = E.loadPresets();
        if (presets[idx]) {
          applyPresetConfig(presets[idx].config);
          showToast('Preset charge', 'success');
        }
      });
    });

    presetsList.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.del, 10);
        E.deletePreset(idx);
        renderPresets();
        showToast('Preset supprimé');
      });
    });
  }

  if (savePresetBtn) {
    savePresetBtn.addEventListener('click', () => {
      const name = presetNameInput.value.trim() || ('Preset ' + (E.loadPresets().length + 1));
      E.savePreset(name, getCurrentConfig());
      presetNameInput.value = '';
      renderPresets();
      showToast('Preset sauvegarde', 'success');
    });
  }

  renderPresets();

  // ============================================================
  // AUTO-IA BUTTON
  // ============================================================

  const autoGenericBtn = document.getElementById('autoGenericBtn');
  if (autoGenericBtn) {
    const removeAllBtn = document.createElement('button');
    removeAllBtn.className = 'btn';
    removeAllBtn.innerHTML = 'Auto-IA';
    removeAllBtn.title = 'Détection automatique et suppression';
    removeAllBtn.style.gridColumn = 'span 1';
    autoGenericBtn.parentElement.insertBefore(removeAllBtn, autoGenericBtn.nextSibling);

    removeAllBtn.addEventListener('click', () => {
      const canvas = getCanvas();
      if (!canvas || canvas.width === 0) { showToast('Charge d\'abord une image', 'error'); return; }
      pushHistory();
      const result = E.removeAllLogos(canvas);
      replaceCanvas(result.canvas);
      showToast(`${result.detections.length} logo(s) detecte(s) et supprime(s)`, 'success');
    });
  }

  // ============================================================
  // RATING SYSTEM
  // ============================================================

  let currentRating = 0;
  const ratingStars = document.getElementById('ratingStars');
  const submitRatingBtn = document.getElementById('submitRatingBtn');

  if (ratingStars) {
    ratingStars.querySelectorAll('[data-star]').forEach(star => {
      star.addEventListener('click', () => {
        currentRating = parseInt(star.dataset.star, 10);
        ratingStars.querySelectorAll('[data-star]').forEach(s => {
          s.textContent = parseInt(s.dataset.star, 10) <= currentRating ? '*' : '-';
          s.style.color = parseInt(s.dataset.star, 10) <= currentRating ? 'var(--orange)' : 'var(--text-tertiary)';
        });
        submitRatingBtn.disabled = false;
      });
      star.addEventListener('mouseenter', () => {
        const val = parseInt(star.dataset.star, 10);
        ratingStars.querySelectorAll('[data-star]').forEach(s => {
          s.textContent = parseInt(s.dataset.star, 10) <= val ? '*' : '-';
        });
      });
    });
    ratingStars.addEventListener('mouseleave', () => {
      ratingStars.querySelectorAll('[data-star]').forEach(s => {
        s.textContent = parseInt(s.dataset.star, 10) <= currentRating ? '*' : '-';
        s.style.color = parseInt(s.dataset.star, 10) <= currentRating ? 'var(--orange)' : 'var(--text-tertiary)';
      });
    });
  }

  if (submitRatingBtn) {
    submitRatingBtn.addEventListener('click', async () => {
      if (currentRating === 0) return;
      const comment = document.getElementById('ratingComment').value.trim();

      // Save to localStorage (or Supabase if needed)
      const rating = { stars: currentRating, comment, date: Date.now() };
      localStorage.setItem('pirabel_user_rating', JSON.stringify(rating));

      // Also try to save to Supabase
      try {
        if (window.PirabelAuth && window.PirabelAuth.getCurrentUser()) {
          const user = window.PirabelAuth.getCurrentUser();
          // Would need a ratings table - for now just store locally
        }
      } catch (e) {}

      const successEl = document.getElementById('ratingSuccess');
      successEl.textContent = 'Merci pour ton avis !';
      successEl.classList.add('active');
      submitRatingBtn.disabled = true;
      setTimeout(() => {
        document.getElementById('ratingModal').classList.remove('active');
        successEl.classList.remove('active');
      }, 2000);
    });
  }

  // Open rating modal
  const openRatingBtn = document.getElementById('openRatingBtn');
  if (openRatingBtn) {
    openRatingBtn.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('ratingModal').classList.add('active');
    });
  }

  // ============================================================
  // NEWSLETTER
  // ============================================================

  const openNewsletterBtn = document.getElementById('openNewsletterBtn');
  if (openNewsletterBtn) {
    openNewsletterBtn.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('newsletterModal').classList.add('active');
    });
  }

  const newsletterSubBtn = document.getElementById('newsletterSubBtn');
  if (newsletterSubBtn) {
    newsletterSubBtn.addEventListener('click', () => {
      const email = document.getElementById('newsletterEmail').value.trim();
      const errEl = document.getElementById('newsletterError');
      const sucEl = document.getElementById('newsletterSuccess');
      errEl.classList.remove('active');
      sucEl.classList.remove('active');

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errEl.textContent = 'Email invalide';
        errEl.classList.add('active');
        return;
      }

      // Save locally + could send to Supabase
      const subs = JSON.parse(localStorage.getItem('pirabel_newsletter') || '[]');
      if (!subs.includes(email)) {
        subs.push(email);
        localStorage.setItem('pirabel_newsletter', JSON.stringify(subs));
      }

      sucEl.textContent = 'Inscrit ! Tu recevras nos prochaines actus.';
      sucEl.classList.add('active');
      document.getElementById('newsletterEmail').value = '';
      newsletterSubBtn.disabled = true;
      setTimeout(() => { newsletterSubBtn.disabled = false; }, 3000);
    });
  }

  // ============================================================
  // THEME & LANG TOGGLES
  // ============================================================

  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle && window.PirabelTheme) {
    themeToggle.addEventListener('click', () => {
      window.PirabelTheme.toggleTheme();
    });
  }

  const langToggle = document.getElementById('langToggle');
  if (langToggle && window.PirabelI18n) {
    langToggle.addEventListener('click', () => {
      window.PirabelI18n.toggleLang();
    });
  }

  // ============================================================
  // MODAL CLOSE HANDLERS (for new modals)
  // ============================================================

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = document.getElementById(btn.dataset.close);
      if (modal) modal.classList.remove('active');
    });
  });
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) modal.classList.remove('active');
    });
  });

})();
