// ============================================================
// PIRABEL — APP EDIT FEATURES v6
// Sidebar accordion, zoom/pan, all tools, new features
// ============================================================

(function() {
  'use strict';

  const E = window.PirabelImageEdit;
  if (!E) return;

  // ============================================================
  // HELPERS
  // ============================================================

  function getCanvas() { return document.getElementById('imgCanvas'); }

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
    if (overlay) { overlay.width = newCanvas.width; overlay.height = newCanvas.height; }
    canvas.getContext('2d').drawImage(newCanvas, 0, 0);
    updateDimensionsStatus();
  }

  function showToast(msg, kind) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast' + (kind ? ' ' + kind : '');
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
  }

  function setStatus(msg, kind) {
    const el = document.getElementById('status');
    if (el) { el.textContent = msg || ''; el.className = 'ws-status-text' + (kind ? ' ' + kind : ''); }
  }

  function updateDimensionsStatus() {
    const canvas = getCanvas();
    const el = document.getElementById('statusDimensions');
    if (canvas && el && canvas.width > 0) {
      el.textContent = canvas.width + ' x ' + canvas.height + ' px';
    }
  }

  // ============================================================
  // ZOOM & PAN
  // ============================================================

  const ZOOM_LEVELS = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
  let currentZoom = 1;
  let panX = 0, panY = 0;
  let isPanning = false;
  let panStart = { x: 0, y: 0 };
  let spaceHeld = false;

  function setZoom(level) {
    currentZoom = Math.max(0.1, Math.min(4, level));
    const container = document.getElementById('wsCanvasContainer');
    if (container) {
      container.style.transform = `scale(${currentZoom}) translate(${panX}px, ${panY}px)`;
    }
    const label = document.getElementById('zoomLabel');
    if (label) label.textContent = Math.round(currentZoom * 100) + '%';
  }

  function zoomIn() {
    const idx = ZOOM_LEVELS.findIndex(z => z > currentZoom);
    setZoom(idx >= 0 ? ZOOM_LEVELS[idx] : 4);
  }

  function zoomOut() {
    const idx = ZOOM_LEVELS.slice().reverse().findIndex(z => z < currentZoom);
    const actualIdx = idx >= 0 ? ZOOM_LEVELS.length - 1 - idx : -1;
    setZoom(actualIdx >= 0 ? ZOOM_LEVELS[actualIdx] : 0.1);
  }

  function zoomFit() {
    const canvas = getCanvas();
    const viewport = document.getElementById('wsViewport');
    if (!canvas || !viewport || canvas.width === 0) return;
    const vw = viewport.clientWidth - 20;
    const vh = viewport.clientHeight - 20;
    const fitZoom = Math.min(vw / canvas.width, vh / canvas.height, 1);
    panX = 0; panY = 0;
    setZoom(fitZoom);
  }

  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const zoomFitBtn = document.getElementById('zoomFitBtn');
  const panModeBtn = document.getElementById('panModeBtn');

  if (zoomInBtn) zoomInBtn.addEventListener('click', zoomIn);
  if (zoomOutBtn) zoomOutBtn.addEventListener('click', zoomOut);
  if (zoomFitBtn) zoomFitBtn.addEventListener('click', zoomFit);
  if (panModeBtn) {
    panModeBtn.addEventListener('click', () => {
      panModeBtn.classList.toggle('active');
      const vp = document.getElementById('wsViewport');
      if (vp) vp.classList.toggle('panning');
    });
  }

  // Mouse wheel zoom
  const viewport = document.getElementById('wsViewport');
  if (viewport) {
    viewport.addEventListener('wheel', e => {
      if (!getCanvas() || getCanvas().width === 0) return;
      e.preventDefault();
      if (e.deltaY < 0) zoomIn();
      else zoomOut();
    }, { passive: false });

    // Pan with space+drag or when pan mode active
    viewport.addEventListener('pointerdown', e => {
      if (spaceHeld || (panModeBtn && panModeBtn.classList.contains('active'))) {
        isPanning = true;
        panStart = { x: e.clientX - panX, y: e.clientY - panY };
        viewport.setPointerCapture(e.pointerId);
        e.preventDefault();
      }
    });
    viewport.addEventListener('pointermove', e => {
      if (isPanning) {
        panX = e.clientX - panStart.x;
        panY = e.clientY - panStart.y;
        setZoom(currentZoom);
      }
    });
    viewport.addEventListener('pointerup', e => {
      if (isPanning) {
        isPanning = false;
        try { viewport.releasePointerCapture(e.pointerId); } catch(err) {}
      }
    });
  }

  // Space key for pan
  document.addEventListener('keydown', e => {
    if (e.code === 'Space' && !e.target.matches('input,textarea,select')) {
      e.preventDefault();
      spaceHeld = true;
      const vp = document.getElementById('wsViewport');
      if (vp) vp.classList.add('panning');
    }
  });
  document.addEventListener('keyup', e => {
    if (e.code === 'Space') {
      spaceHeld = false;
      if (!panModeBtn || !panModeBtn.classList.contains('active')) {
        const vp = document.getElementById('wsViewport');
        if (vp) vp.classList.remove('panning');
      }
    }
  });

  // Expose zoom for app-logic
  window.pirabelZoom = { setZoom, zoomFit, getZoom: () => currentZoom };

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
        filterGrid.querySelectorAll('.filter-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        selectedFilter = id;
        const btn = document.getElementById('applyFilterBtn');
        if (btn) btn.disabled = false;
      });
      filterGrid.appendChild(item);
    });
  }

  const applyFilterBtn = document.getElementById('applyFilterBtn');
  if (applyFilterBtn) {
    applyFilterBtn.addEventListener('click', () => {
      if (!selectedFilter) return;
      const canvas = getCanvas();
      if (!canvas || canvas.width === 0) { showToast('Charge une image', 'error'); return; }
      pushHistory();
      replaceCanvas(E.applyFilter(canvas, selectedFilter));
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
      item.innerHTML = `<span class="crop-icon">${c.icon}</span><span class="crop-name">${c.name}</span>`;
      item.addEventListener('click', () => {
        cropGrid.querySelectorAll('.crop-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        selectedCrop = id;
        const btn = document.getElementById('applyCropBtn');
        if (btn) btn.disabled = false;
        const canvas = getCanvas();
        const info = document.getElementById('cropInfo');
        if (canvas && c.ratio && info) {
          const w = canvas.width, h = canvas.height;
          let cw, ch;
          if (w / h > c.ratio) { ch = h; cw = Math.round(h * c.ratio); }
          else { cw = w; ch = Math.round(w / c.ratio); }
          info.textContent = cw + ' x ' + ch + ' px';
        } else if (info) {
          info.textContent = 'Taille actuelle conservee';
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
      if (!canvas || canvas.width === 0) { showToast('Charge une image', 'error'); return; }
      const c = E.CROP_RATIOS[selectedCrop];
      if (!c.ratio) { showToast('Crop libre', 'info'); return; }
      pushHistory();
      const w = canvas.width, h = canvas.height;
      let cw, ch, cx, cy;
      if (w / h > c.ratio) { ch = h; cw = Math.round(h * c.ratio); cx = Math.round((w - cw) / 2); cy = 0; }
      else { cw = w; ch = Math.round(w / c.ratio); cx = 0; cy = Math.round((h - ch) / 2); }
      replaceCanvas(E.cropImage(canvas, cx, cy, cw, ch));
      showToast('Recadre ' + cw + 'x' + ch, 'success');
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
      item.innerHTML = `<span class="resize-name">${p.name}</span><div class="resize-size">${p.width}x${p.height}</div>`;
      item.addEventListener('click', () => {
        resizeGrid.querySelectorAll('.resize-item').forEach(i => i.classList.remove('selected'));
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
      if (!canvas || canvas.width === 0) { showToast('Charge une image', 'error'); return; }
      const w = parseInt(document.getElementById('resizeW').value, 10);
      const h = parseInt(document.getElementById('resizeH').value, 10);
      if (!w || !h || w < 50 || h < 50 || w > 8000 || h > 8000) { showToast('Tailles invalides (50-8000)', 'error'); return; }
      pushHistory();
      replaceCanvas(E.resizeImage(canvas, w, h, 'cover'));
      showToast('Redimensionne ' + w + 'x' + h, 'success');
    });
  }

  // ============================================================
  // FLIP & ROTATE
  // ============================================================

  const flipHBtn = document.getElementById('flipHBtn');
  const flipVBtn = document.getElementById('flipVBtn');
  const rotateCCWBtn = document.getElementById('rotateCCWBtn');
  const rotateCWBtn = document.getElementById('rotateCWBtn');
  const rotate180Btn = document.getElementById('rotate180Btn');
  const rotationSlider = document.getElementById('rotationSlider');
  const rotationVal = document.getElementById('rotationVal');
  const applyRotationBtn = document.getElementById('applyRotationBtn');

  if (flipHBtn) flipHBtn.addEventListener('click', () => {
    const c = getCanvas(); if (!c || c.width === 0) return;
    pushHistory(); replaceCanvas(E.flipImage(c, 'horizontal')); showToast('Retourne H', 'success');
  });
  if (flipVBtn) flipVBtn.addEventListener('click', () => {
    const c = getCanvas(); if (!c || c.width === 0) return;
    pushHistory(); replaceCanvas(E.flipImage(c, 'vertical')); showToast('Retourne V', 'success');
  });
  if (rotateCCWBtn) rotateCCWBtn.addEventListener('click', () => {
    const c = getCanvas(); if (!c || c.width === 0) return;
    pushHistory(); replaceCanvas(E.rotateImage(c, -90)); showToast('Rotation -90', 'success');
  });
  if (rotateCWBtn) rotateCWBtn.addEventListener('click', () => {
    const c = getCanvas(); if (!c || c.width === 0) return;
    pushHistory(); replaceCanvas(E.rotateImage(c, 90)); showToast('Rotation +90', 'success');
  });
  if (rotate180Btn) rotate180Btn.addEventListener('click', () => {
    const c = getCanvas(); if (!c || c.width === 0) return;
    pushHistory(); replaceCanvas(E.rotateImage(c, 180)); showToast('Rotation 180', 'success');
  });
  if (rotationSlider) {
    rotationSlider.addEventListener('input', () => {
      if (rotationVal) rotationVal.textContent = rotationSlider.value + '\u00B0';
    });
  }
  if (applyRotationBtn) {
    applyRotationBtn.addEventListener('click', () => {
      const c = getCanvas(); if (!c || c.width === 0) return;
      const deg = parseInt(rotationSlider.value, 10);
      if (deg === 0) { showToast('Rotation 0 - rien a faire', 'info'); return; }
      pushHistory(); replaceCanvas(E.rotateImage(c, deg));
      rotationSlider.value = 0; if (rotationVal) rotationVal.textContent = '0\u00B0';
      showToast('Rotation ' + deg + '\u00B0', 'success');
    });
  }

  // ============================================================
  // PAINT TOOLS (pen, eraser, blur brush, sharpen, line, rect, circle, pipette)
  // ============================================================

  let activePaintTool = 'pen';
  let annotColor = '#FF0000';
  let annotLineWidth = 4;
  let paintOpacity = 1;
  let annotationMode = false;
  let annotCanvas = null;
  let annotCtx = null;
  let annotDrawing = false;
  let annotStartPt = null;

  // Paint tool buttons
  document.querySelectorAll('[data-painttool]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-painttool]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activePaintTool = btn.dataset.painttool;
      activateAnnotationMode();
      if (activePaintTool === 'picker') {
        const canvas = getCanvas();
        if (canvas) canvas.style.cursor = 'crosshair';
      }
    });
  });

  // Color palette
  const colorPalette = document.getElementById('colorPalette');
  if (colorPalette) {
    colorPalette.querySelectorAll('.color-swatch').forEach(btn => {
      btn.addEventListener('click', () => {
        colorPalette.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        annotColor = btn.dataset.color;
        const cp = document.getElementById('customColorPicker');
        if (cp) cp.value = annotColor;
      });
    });
  }

  // Custom color picker
  const customColorPicker = document.getElementById('customColorPicker');
  if (customColorPicker) {
    customColorPicker.addEventListener('input', () => {
      annotColor = customColorPicker.value;
      if (colorPalette) colorPalette.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('active'));
    });
  }

  // Annotation size
  const annotSizeSlider = document.getElementById('annotSize');
  const annotSizeVal = document.getElementById('annotSizeVal');
  if (annotSizeSlider) {
    annotSizeSlider.addEventListener('input', () => {
      annotLineWidth = parseInt(annotSizeSlider.value, 10);
      if (annotSizeVal) annotSizeVal.textContent = annotLineWidth + 'px';
    });
  }

  // Paint opacity
  const paintOpacitySlider = document.getElementById('paintOpacity');
  const paintOpacityVal = document.getElementById('paintOpacityVal');
  if (paintOpacitySlider) {
    paintOpacitySlider.addEventListener('input', () => {
      paintOpacity = parseInt(paintOpacitySlider.value, 10) / 100;
      if (paintOpacityVal) paintOpacityVal.textContent = paintOpacitySlider.value + '%';
    });
  }

  function activateAnnotationMode() {
    const canvas = getCanvas();
    if (!canvas || canvas.width === 0) return;
    annotationMode = true;
    if (!annotCanvas || annotCanvas.width !== canvas.width || annotCanvas.height !== canvas.height) {
      annotCanvas = E.createAnnotationLayer(canvas.width, canvas.height);
      annotCtx = annotCanvas.getContext('2d');
    }
    const overlay = document.getElementById('overlay');
    if (overlay) { overlay.style.pointerEvents = 'auto'; overlay.style.cursor = 'crosshair'; }
  }

  function deactivateAnnotationMode() {
    annotationMode = false;
    const overlay = document.getElementById('overlay');
    if (overlay) { overlay.style.pointerEvents = 'none'; overlay.style.cursor = 'default'; }
  }

  // When paint tools section opens, activate annotation mode
  const paintSection = document.querySelector('.sb-section:has([data-painttool])');
  if (paintSection) {
    paintSection.addEventListener('toggle', () => {
      if (paintSection.open) activateAnnotationMode();
      else deactivateAnnotationMode();
    });
  }

  // Overlay drawing events
  const overlayEl = document.getElementById('overlay');
  if (overlayEl) {
    function getOverlayCoords(e) {
      const rect = overlayEl.getBoundingClientRect();
      const sx = overlayEl.width / rect.width;
      const sy = overlayEl.height / rect.height;
      const cx = e.clientX !== undefined ? e.clientX : (e.touches?.[0]?.clientX || 0);
      const cy = e.clientY !== undefined ? e.clientY : (e.touches?.[0]?.clientY || 0);
      return { x: (cx - rect.left) * sx, y: (cy - rect.top) * sy };
    }

    overlayEl.addEventListener('pointerdown', function(e) {
      if (!annotationMode || !annotCanvas) return;

      // Pipette: pick color on click
      if (activePaintTool === 'picker') {
        const canvas = getCanvas();
        if (!canvas) return;
        const pt = getOverlayCoords(e);
        const color = E.pickColor(canvas, Math.round(pt.x), Math.round(pt.y));
        annotColor = color.hex;
        if (customColorPicker) customColorPicker.value = color.hex;
        if (colorPalette) colorPalette.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('active'));
        showToast('Couleur: ' + color.hex, 'success');
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      annotDrawing = true;
      annotStartPt = getOverlayCoords(e);
      if (activePaintTool === 'pen' || activePaintTool === 'eraser' ||
          activePaintTool === 'blur' || activePaintTool === 'sharpen') {
        annotCtx.beginPath();
        annotCtx.moveTo(annotStartPt.x, annotStartPt.y);
      }
      overlayEl.setPointerCapture(e.pointerId);
    });

    overlayEl.addEventListener('pointermove', function(e) {
      if (!annotationMode || !annotDrawing || !annotCanvas) return;
      const pt = getOverlayCoords(e);
      const octx = overlayEl.getContext('2d');

      if (activePaintTool === 'pen') {
        annotCtx.strokeStyle = annotColor;
        annotCtx.lineWidth = annotLineWidth;
        annotCtx.lineCap = 'round';
        annotCtx.lineJoin = 'round';
        annotCtx.globalAlpha = paintOpacity;
        annotCtx.lineTo(pt.x, pt.y);
        annotCtx.stroke();
        annotCtx.globalAlpha = 1;
        octx.clearRect(0, 0, overlayEl.width, overlayEl.height);
        octx.drawImage(annotCanvas, 0, 0);
      } else if (activePaintTool === 'eraser') {
        annotCtx.globalCompositeOperation = 'destination-out';
        annotCtx.lineWidth = annotLineWidth;
        annotCtx.lineCap = 'round';
        annotCtx.lineTo(pt.x, pt.y);
        annotCtx.stroke();
        annotCtx.globalCompositeOperation = 'source-over';
        octx.clearRect(0, 0, overlayEl.width, overlayEl.height);
        octx.drawImage(annotCanvas, 0, 0);
      } else {
        // Shapes: preview on overlay
        octx.clearRect(0, 0, overlayEl.width, overlayEl.height);
        octx.drawImage(annotCanvas, 0, 0);
        octx.strokeStyle = annotColor;
        octx.lineWidth = annotLineWidth;
        octx.lineCap = 'round';
        octx.globalAlpha = paintOpacity;
        if (activePaintTool === 'line') {
          octx.beginPath();
          octx.moveTo(annotStartPt.x, annotStartPt.y);
          octx.lineTo(pt.x, pt.y);
          octx.stroke();
        } else if (activePaintTool === 'rect') {
          octx.strokeRect(annotStartPt.x, annotStartPt.y, pt.x - annotStartPt.x, pt.y - annotStartPt.y);
        } else if (activePaintTool === 'circle') {
          const rx = Math.abs(pt.x - annotStartPt.x) / 2;
          const ry = Math.abs(pt.y - annotStartPt.y) / 2;
          const cx = (annotStartPt.x + pt.x) / 2;
          const cy = (annotStartPt.y + pt.y) / 2;
          octx.beginPath();
          octx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          octx.stroke();
        }
        octx.globalAlpha = 1;
      }
    });

    overlayEl.addEventListener('pointerup', function(e) {
      if (!annotationMode || !annotDrawing || !annotCanvas) return;
      annotDrawing = false;
      const pt = getOverlayCoords(e);

      // For blur/sharpen: apply brush stroke to main canvas
      if (activePaintTool === 'blur' || activePaintTool === 'sharpen') {
        const canvas = getCanvas();
        if (canvas) {
          pushHistory();
          const points = [annotStartPt, pt];
          const result = E.applyBrushStroke(canvas, points, {
            tool: activePaintTool,
            size: annotLineWidth * 3,
            opacity: paintOpacity
          });
          replaceCanvas(result);
        }
      }

      // Commit shapes to annotation canvas
      if (activePaintTool === 'line' || activePaintTool === 'rect' || activePaintTool === 'circle') {
        annotCtx.strokeStyle = annotColor;
        annotCtx.lineWidth = annotLineWidth;
        annotCtx.lineCap = 'round';
        annotCtx.globalAlpha = paintOpacity;
        if (activePaintTool === 'line') {
          annotCtx.beginPath();
          annotCtx.moveTo(annotStartPt.x, annotStartPt.y);
          annotCtx.lineTo(pt.x, pt.y);
          annotCtx.stroke();
        } else if (activePaintTool === 'rect') {
          annotCtx.strokeRect(annotStartPt.x, annotStartPt.y, pt.x - annotStartPt.x, pt.y - annotStartPt.y);
        } else if (activePaintTool === 'circle') {
          const rx = Math.abs(pt.x - annotStartPt.x) / 2;
          const ry = Math.abs(pt.y - annotStartPt.y) / 2;
          const cx = (annotStartPt.x + pt.x) / 2;
          const cy = (annotStartPt.y + pt.y) / 2;
          annotCtx.beginPath();
          annotCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          annotCtx.stroke();
        }
        annotCtx.globalAlpha = 1;
      }

      const octx = overlayEl.getContext('2d');
      octx.clearRect(0, 0, overlayEl.width, overlayEl.height);
      octx.drawImage(annotCanvas, 0, 0);
      try { overlayEl.releasePointerCapture(e.pointerId); } catch(err) {}
    });
  }

  // Clear annotations
  const clearAnnotBtn = document.getElementById('clearAnnotBtn');
  if (clearAnnotBtn) {
    clearAnnotBtn.addEventListener('click', () => {
      if (annotCanvas) {
        annotCtx.clearRect(0, 0, annotCanvas.width, annotCanvas.height);
        const octx = overlayEl.getContext('2d');
        octx.clearRect(0, 0, overlayEl.width, overlayEl.height);
      }
      showToast('Annotations effacees');
    });
  }

  // Apply annotations
  const applyAnnotBtn = document.getElementById('applyAnnotBtn');
  if (applyAnnotBtn) {
    applyAnnotBtn.addEventListener('click', () => {
      const canvas = getCanvas();
      if (!canvas || !annotCanvas) return;
      pushHistory();
      replaceCanvas(E.mergeAnnotations(canvas, annotCanvas));
      annotCtx.clearRect(0, 0, annotCanvas.width, annotCanvas.height);
      const octx = overlayEl.getContext('2d');
      octx.clearRect(0, 0, overlayEl.width, overlayEl.height);
      showToast('Dessins appliques', 'success');
    });
  }

  // ============================================================
  // TEXT TOOL
  // ============================================================

  let textPlacementMode = false;
  const textInput = document.getElementById('textInput');
  const textFont = document.getElementById('textFont');
  const textSize = document.getElementById('textSize');
  const textSizeVal = document.getElementById('textSizeVal');
  const textColor = document.getElementById('textColor');
  const textBoldBtn = document.getElementById('textBoldBtn');
  const textItalicBtn = document.getElementById('textItalicBtn');
  const textUnderlineBtn = document.getElementById('textUnderlineBtn');
  const activateTextBtn = document.getElementById('activateTextBtn');

  if (textSize) textSize.addEventListener('input', () => {
    if (textSizeVal) textSizeVal.textContent = textSize.value + 'px';
  });

  [textBoldBtn, textItalicBtn, textUnderlineBtn].forEach(btn => {
    if (btn) btn.addEventListener('click', () => btn.classList.toggle('active'));
  });

  if (activateTextBtn) {
    activateTextBtn.addEventListener('click', () => {
      const txt = textInput ? textInput.value.trim() : '';
      if (!txt) { showToast('Entre du texte', 'error'); return; }
      textPlacementMode = true;
      deactivateAnnotationMode();
      const canvas = getCanvas();
      if (canvas) canvas.style.cursor = 'text';
      showToast('Clique sur l\'image pour placer le texte');
    });
  }

  // Text placement on canvas click
  document.addEventListener('click', function(e) {
    if (!textPlacementMode) return;
    const canvas = getCanvas();
    if (!canvas || (e.target !== canvas && e.target !== overlayEl)) return;

    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const x = Math.round((e.clientX - rect.left) * sx);
    const y = Math.round((e.clientY - rect.top) * sy);

    pushHistory();
    const result = E.addText(canvas, {
      text: textInput.value,
      x, y,
      font: textFont ? textFont.value : 'sans-serif',
      size: textSize ? parseInt(textSize.value, 10) : 48,
      color: textColor ? textColor.value : '#ffffff',
      bold: textBoldBtn && textBoldBtn.classList.contains('active'),
      italic: textItalicBtn && textItalicBtn.classList.contains('active'),
      underline: textUnderlineBtn && textUnderlineBtn.classList.contains('active')
    });
    replaceCanvas(result);
    textPlacementMode = false;
    canvas.style.cursor = 'crosshair';
    showToast('Texte place', 'success');
  });

  // ============================================================
  // BACKGROUND TOOLS
  // ============================================================

  const bgTolerance = document.getElementById('bgTolerance');
  const bgToleranceVal = document.getElementById('bgToleranceVal');
  const bgSmooth = document.getElementById('bgSmooth');
  const bgSmoothVal = document.getElementById('bgSmoothVal');

  if (bgTolerance) bgTolerance.addEventListener('input', () => {
    if (bgToleranceVal) bgToleranceVal.textContent = bgTolerance.value;
  });
  if (bgSmooth) bgSmooth.addEventListener('input', () => {
    if (bgSmoothVal) bgSmoothVal.textContent = bgSmooth.value;
  });

  const removeBgBtn = document.getElementById('removeBgBtn');
  if (removeBgBtn) {
    removeBgBtn.addEventListener('click', () => {
      const canvas = getCanvas();
      if (!canvas || canvas.width === 0) { showToast('Charge une image', 'error'); return; }
      pushHistory();
      setStatus('Suppression arriere-plan...');
      setTimeout(() => {
        const result = E.removeBackground(canvas, {
          tolerance: bgTolerance ? parseInt(bgTolerance.value, 10) : 30,
          edgeSmooth: bgSmooth ? parseInt(bgSmooth.value, 10) : 2
        });
        replaceCanvas(result);
        showToast('Arriere-plan supprime', 'success');
        setStatus('Arriere-plan supprime');
      }, 50);
    });
  }

  const replaceBgColorBtn = document.getElementById('replaceBgColorBtn');
  if (replaceBgColorBtn) {
    replaceBgColorBtn.addEventListener('click', () => {
      const canvas = getCanvas();
      if (!canvas || canvas.width === 0) return;
      const color = document.getElementById('bgColor').value;
      pushHistory();
      replaceCanvas(E.replaceBackgroundColor(canvas, color));
      showToast('Couleur BG appliquee', 'success');
    });
  }

  const replaceBgImageBtn = document.getElementById('replaceBgImageBtn');
  const bgImageInput = document.getElementById('bgImageInput');
  if (replaceBgImageBtn && bgImageInput) {
    replaceBgImageBtn.addEventListener('click', () => bgImageInput.click());
    bgImageInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const canvas = getCanvas();
      if (!canvas || canvas.width === 0) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
          pushHistory();
          replaceCanvas(E.replaceBackground(canvas, img, { fit: 'cover' }));
          showToast('Image BG appliquee', 'success');
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // ============================================================
  // ADJUSTMENTS
  // ============================================================

  const adjBrightness = document.getElementById('adjBrightness');
  const adjContrast = document.getElementById('adjContrast');
  const adjSaturation = document.getElementById('adjSaturation');
  const adjBrightnessVal = document.getElementById('adjBrightnessVal');
  const adjContrastVal = document.getElementById('adjContrastVal');
  const adjSaturationVal = document.getElementById('adjSaturationVal');

  function previewAdjustments() {
    const canvas = getCanvas();
    if (!canvas || canvas.width === 0) return;
    const b = adjBrightness ? parseInt(adjBrightness.value, 10) : 100;
    const c = adjContrast ? parseInt(adjContrast.value, 10) : 100;
    const s = adjSaturation ? parseInt(adjSaturation.value, 10) : 100;
    canvas.style.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;
  }

  if (adjBrightness) adjBrightness.addEventListener('input', () => {
    if (adjBrightnessVal) adjBrightnessVal.textContent = adjBrightness.value + '%';
    previewAdjustments();
  });
  if (adjContrast) adjContrast.addEventListener('input', () => {
    if (adjContrastVal) adjContrastVal.textContent = adjContrast.value + '%';
    previewAdjustments();
  });
  if (adjSaturation) adjSaturation.addEventListener('input', () => {
    if (adjSaturationVal) adjSaturationVal.textContent = adjSaturation.value + '%';
    previewAdjustments();
  });

  const resetAdjustBtn = document.getElementById('resetAdjustBtn');
  if (resetAdjustBtn) {
    resetAdjustBtn.addEventListener('click', () => {
      if (adjBrightness) { adjBrightness.value = 100; adjBrightnessVal.textContent = '100%'; }
      if (adjContrast) { adjContrast.value = 100; adjContrastVal.textContent = '100%'; }
      if (adjSaturation) { adjSaturation.value = 100; adjSaturationVal.textContent = '100%'; }
      const canvas = getCanvas(); if (canvas) canvas.style.filter = 'none';
    });
  }

  const applyAdjustBtn = document.getElementById('applyAdjustBtn');
  if (applyAdjustBtn) {
    applyAdjustBtn.addEventListener('click', () => {
      const canvas = getCanvas();
      if (!canvas || canvas.width === 0) { showToast('Charge une image', 'error'); return; }
      pushHistory();
      const b = adjBrightness ? parseInt(adjBrightness.value, 10) : 100;
      const c = adjContrast ? parseInt(adjContrast.value, 10) : 100;
      const s = adjSaturation ? parseInt(adjSaturation.value, 10) : 100;
      canvas.style.filter = 'none';
      replaceCanvas(E.applyAdjustments(canvas, b, c, s));
      if (adjBrightness) { adjBrightness.value = 100; adjBrightnessVal.textContent = '100%'; }
      if (adjContrast) { adjContrast.value = 100; adjContrastVal.textContent = '100%'; }
      if (adjSaturation) { adjSaturation.value = 100; adjSaturationVal.textContent = '100%'; }
      showToast('Reglages appliques', 'success');
    });
  }

  // ============================================================
  // VIGNETTE
  // ============================================================

  const vignetteIntensity = document.getElementById('vignetteIntensity');
  const vignetteIntVal = document.getElementById('vignetteIntVal');
  const vignetteRadius = document.getElementById('vignetteRadius');
  const vignetteRadVal = document.getElementById('vignetteRadVal');

  if (vignetteIntensity) vignetteIntensity.addEventListener('input', () => {
    if (vignetteIntVal) vignetteIntVal.textContent = vignetteIntensity.value + '%';
  });
  if (vignetteRadius) vignetteRadius.addEventListener('input', () => {
    if (vignetteRadVal) vignetteRadVal.textContent = vignetteRadius.value + '%';
  });

  const applyVignetteBtn = document.getElementById('applyVignetteBtn');
  if (applyVignetteBtn) {
    applyVignetteBtn.addEventListener('click', () => {
      const canvas = getCanvas();
      if (!canvas || canvas.width === 0) return;
      pushHistory();
      replaceCanvas(E.applyVignette(canvas, {
        intensity: (vignetteIntensity ? parseInt(vignetteIntensity.value, 10) : 50) / 100,
        radius: (vignetteRadius ? parseInt(vignetteRadius.value, 10) : 70) / 100
      }));
      showToast('Vignette appliquee', 'success');
    });
  }

  // ============================================================
  // NOISE
  // ============================================================

  const noiseAmount = document.getElementById('noiseAmount');
  const noiseAmountVal = document.getElementById('noiseAmountVal');
  if (noiseAmount) noiseAmount.addEventListener('input', () => {
    if (noiseAmountVal) noiseAmountVal.textContent = noiseAmount.value;
  });

  const applyNoiseBtn = document.getElementById('applyNoiseBtn');
  if (applyNoiseBtn) {
    applyNoiseBtn.addEventListener('click', () => {
      const canvas = getCanvas();
      if (!canvas || canvas.width === 0) return;
      pushHistory();
      replaceCanvas(E.addNoise(canvas, {
        amount: noiseAmount ? parseInt(noiseAmount.value, 10) : 30,
        monochrome: document.getElementById('noiseMono') ? document.getElementById('noiseMono').checked : true
      }));
      showToast('Bruit ajoute', 'success');
    });
  }

  // ============================================================
  // GRADIENT OVERLAY
  // ============================================================

  const gradOpacity = document.getElementById('gradOpacity');
  const gradOpacityVal = document.getElementById('gradOpacityVal');
  if (gradOpacity) gradOpacity.addEventListener('input', () => {
    if (gradOpacityVal) gradOpacityVal.textContent = gradOpacity.value + '%';
  });

  const applyGradientBtn = document.getElementById('applyGradientBtn');
  if (applyGradientBtn) {
    applyGradientBtn.addEventListener('click', () => {
      const canvas = getCanvas();
      if (!canvas || canvas.width === 0) return;
      const type = document.getElementById('gradientType') ? document.getElementById('gradientType').value : 'linear';
      const c1 = document.getElementById('gradColor1') ? document.getElementById('gradColor1').value : '#ff6b1a';
      const c2 = document.getElementById('gradColor2') ? document.getElementById('gradColor2').value : '#000000';
      const opac = gradOpacity ? parseInt(gradOpacity.value, 10) / 100 : 0.3;

      // Convert hex to rgba
      function hexToRgba(hex, a) {
        const r = parseInt(hex.slice(1,3), 16);
        const g = parseInt(hex.slice(3,5), 16);
        const b = parseInt(hex.slice(5,7), 16);
        return `rgba(${r},${g},${b},${a})`;
      }

      pushHistory();
      replaceCanvas(E.applyGradientOverlay(canvas, {
        type,
        stops: [
          { offset: 0, color: hexToRgba(c1, opac) },
          { offset: 1, color: hexToRgba(c2, opac) }
        ]
      }));
      showToast('Degrade applique', 'success');
    });
  }

  // ============================================================
  // WATERMARK
  // ============================================================

  const wmOpacity = document.getElementById('wmOpacity');
  const wmOpacityVal = document.getElementById('wmOpacityVal');
  if (wmOpacity) wmOpacity.addEventListener('input', () => {
    if (wmOpacityVal) wmOpacityVal.textContent = wmOpacity.value + '%';
  });

  const applyWatermarkBtn = document.getElementById('applyWatermarkBtn');
  if (applyWatermarkBtn) {
    applyWatermarkBtn.addEventListener('click', () => {
      const canvas = getCanvas();
      if (!canvas || canvas.width === 0) { showToast('Charge une image', 'error'); return; }
      const text = document.getElementById('wmText').value.trim();
      if (!text) { showToast('Entre un texte', 'error'); return; }
      pushHistory();
      const opacity = wmOpacity ? parseInt(wmOpacity.value, 10) / 100 : 0.7;
      const pos = document.getElementById('wmPosition') ? document.getElementById('wmPosition').value : 'bottom-right';
      replaceCanvas(E.addTextWatermark(canvas, {
        text, position: pos, color: `rgba(255,255,255,${opacity})`
      }));
      showToast('Watermark ajoute', 'success');
    });
  }

  // ============================================================
  // STICKERS
  // ============================================================

  let selectedSticker = null;
  let stickerMode = false;
  const stickerGrid = document.getElementById('stickerGrid');
  const stickerCats = document.getElementById('stickerCategories');
  const stickerSizeSlider = document.getElementById('stickerSize');
  const stickerSizeVal = document.getElementById('stickerSizeVal');

  if (stickerGrid && stickerCats) {
    const categories = E.STICKER_CATEGORIES;
    const catNames = { smileys: 'Smileys', hands: 'Mains', hearts: 'Coeurs', nature: 'Nature', objects: 'Objets', fun: 'Fun' };
    let activeCategory = 'smileys';

    function renderStickerCategory(catId) {
      stickerGrid.innerHTML = '';
      (categories[catId] || []).forEach(emoji => {
        const btn = document.createElement('button');
        btn.className = 'sticker-btn' + (selectedSticker === emoji ? ' selected' : '');
        btn.textContent = emoji;
        btn.addEventListener('click', () => {
          stickerGrid.querySelectorAll('.sticker-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          selectedSticker = emoji;
          stickerMode = true;
          deactivateAnnotationMode();
          const canvas = getCanvas();
          if (canvas) canvas.style.cursor = 'cell';
          const info = document.getElementById('stickerInfo');
          if (info) info.textContent = 'Sticker "' + emoji + '" - clique sur l\'image';
        });
        stickerGrid.appendChild(btn);
      });
    }

    Object.entries(catNames).forEach(([id, name]) => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-sm sticker-cat-btn' + (id === activeCategory ? ' active' : '');
      btn.textContent = name;
      btn.style.fontSize = '10px'; btn.style.padding = '4px 8px';
      btn.addEventListener('click', () => {
        activeCategory = id;
        stickerCats.querySelectorAll('.sticker-cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderStickerCategory(id);
      });
      stickerCats.appendChild(btn);
    });
    renderStickerCategory(activeCategory);
  }

  if (stickerSizeSlider) {
    stickerSizeSlider.addEventListener('input', () => {
      if (stickerSizeVal) stickerSizeVal.textContent = stickerSizeSlider.value + 'px';
    });
  }

  // Place sticker on canvas
  document.addEventListener('click', function(e) {
    if (!stickerMode || !selectedSticker) return;
    const canvas = getCanvas();
    if (!canvas || (e.target !== canvas && e.target !== overlayEl)) return;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const x = Math.round((e.clientX - rect.left) * sx);
    const y = Math.round((e.clientY - rect.top) * sy);
    const size = stickerSizeSlider ? parseInt(stickerSizeSlider.value, 10) : 60;
    pushHistory();
    replaceCanvas(E.addStickerToCanvas(canvas, selectedSticker, x, y, size));
    showToast('Sticker place', 'success');
  });

  // ============================================================
  // LAYERS (basic: toggle original/edits visibility)
  // ============================================================

  document.querySelectorAll('[data-layer-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const layer = btn.dataset.layerToggle;
      btn.classList.toggle('hidden');
      const canvas = getCanvas();
      if (!canvas) return;
      if (layer === 'original' && !btn.classList.contains('hidden')) {
        // Show original
        if (window.appHistory && window.appHistory.length > 0) {
          canvas.getContext('2d').putImageData(window.appHistory[0], 0, 0);
          setStatus('Affichage original');
        }
      } else if (layer === 'original' && btn.classList.contains('hidden')) {
        // Back to current
        if (window.appHistory && window.appHistory.length > 1) {
          canvas.getContext('2d').putImageData(window.appHistory[window.appHistory.length - 1], 0, 0);
          setStatus('Retour aux editions');
        }
      }
    });
  });

  // ============================================================
  // PRESETS
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
      watermarkOpacity: wmOpacity ? parseInt(wmOpacity.value, 10) : 70,
      method: document.getElementById('method') ? document.getElementById('method').value : 'patch',
      precision: document.getElementById('presetSize') ? parseInt(document.getElementById('presetSize').value, 10) : 6,
    };
  }

  function applyPresetConfig(config) {
    if (config.filter) { selectedFilter = config.filter; }
    if (config.brightness && adjBrightness) { adjBrightness.value = config.brightness; adjBrightnessVal.textContent = config.brightness + '%'; }
    if (config.contrast && adjContrast) { adjContrast.value = config.contrast; adjContrastVal.textContent = config.contrast + '%'; }
    if (config.saturation && adjSaturation) { adjSaturation.value = config.saturation; adjSaturationVal.textContent = config.saturation + '%'; }
    if (config.watermarkText) { const wt = document.getElementById('wmText'); if (wt) wt.value = config.watermarkText; }
    if (config.watermarkPosition) { const wp = document.getElementById('wmPosition'); if (wp) wp.value = config.watermarkPosition; }
    if (config.watermarkOpacity && wmOpacity) { wmOpacity.value = config.watermarkOpacity; wmOpacityVal.textContent = config.watermarkOpacity + '%'; }
    if (config.method) { const m = document.getElementById('method'); if (m) m.value = config.method; }
    if (config.precision) { const ps = document.getElementById('presetSize'); if (ps) { ps.value = config.precision; document.getElementById('presetSizeVal').textContent = config.precision + '%'; } }
  }

  function renderPresets() {
    if (!presetsList) return;
    const presets = E.loadPresets();
    if (presets.length === 0) {
      presetsList.innerHTML = '<p class="text-tertiary text-sm" style="text-align:center;padding:12px;">Aucun preset</p>';
      return;
    }
    presetsList.innerHTML = '';
    presets.forEach((p, index) => {
      const div = document.createElement('div');
      div.className = 'preset-item';
      div.innerHTML = `<div class="preset-info"><strong>${p.name}</strong><span class="text-tertiary text-sm">${new Date(p.createdAt).toLocaleDateString('fr-FR')}</span></div><div class="preset-actions"><button class="btn btn-sm" data-load="${index}">Charger</button><button class="btn btn-sm btn-danger" data-del="${index}">X</button></div>`;
      presetsList.appendChild(div);
    });
    presetsList.querySelectorAll('[data-load]').forEach(btn => {
      btn.addEventListener('click', () => {
        const presets = E.loadPresets();
        if (presets[parseInt(btn.dataset.load, 10)]) {
          applyPresetConfig(presets[parseInt(btn.dataset.load, 10)].config);
          showToast('Preset charge', 'success');
        }
      });
    });
    presetsList.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        E.deletePreset(parseInt(btn.dataset.del, 10));
        renderPresets();
        showToast('Preset supprime');
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
  // AUTO-IA BUTTON (in sidebar)
  // ============================================================

  const autoGenericBtn = document.getElementById('autoGenericBtn');
  if (autoGenericBtn) {
    // Add Auto-IA button after autoGenericBtn
    const removeAllBtn = document.createElement('button');
    removeAllBtn.className = 'btn btn-sm';
    removeAllBtn.innerHTML = 'Auto-IA';
    removeAllBtn.title = 'Detection auto et suppression';
    const actionsEl = autoGenericBtn.parentElement;
    if (actionsEl) actionsEl.appendChild(removeAllBtn);

    removeAllBtn.addEventListener('click', () => {
      const canvas = getCanvas();
      if (!canvas || canvas.width === 0) { showToast('Charge une image', 'error'); return; }
      pushHistory();
      const result = E.removeAllLogos(canvas);
      replaceCanvas(result.canvas);
      showToast(result.detections.length + ' logo(s) supprime(s)', 'success');
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
          s.textContent = parseInt(s.dataset.star, 10) <= currentRating ? '\u2605' : '\u2606';
          s.style.color = parseInt(s.dataset.star, 10) <= currentRating ? 'var(--orange)' : 'var(--text-tertiary)';
        });
        if (submitRatingBtn) submitRatingBtn.disabled = false;
      });
      star.addEventListener('mouseenter', () => {
        const val = parseInt(star.dataset.star, 10);
        ratingStars.querySelectorAll('[data-star]').forEach(s => {
          s.textContent = parseInt(s.dataset.star, 10) <= val ? '\u2605' : '\u2606';
        });
      });
    });
    ratingStars.addEventListener('mouseleave', () => {
      ratingStars.querySelectorAll('[data-star]').forEach(s => {
        s.textContent = parseInt(s.dataset.star, 10) <= currentRating ? '\u2605' : '\u2606';
        s.style.color = parseInt(s.dataset.star, 10) <= currentRating ? 'var(--orange)' : 'var(--text-tertiary)';
      });
    });
  }

  if (submitRatingBtn) {
    submitRatingBtn.addEventListener('click', async () => {
      if (currentRating === 0) return;
      const comment = document.getElementById('ratingComment').value.trim();
      localStorage.setItem('pirabel_user_rating', JSON.stringify({ stars: currentRating, comment, date: Date.now() }));
      const successEl = document.getElementById('ratingSuccess');
      if (successEl) { successEl.textContent = 'Merci pour ton avis !'; successEl.classList.add('active'); }
      submitRatingBtn.disabled = true;
      setTimeout(() => {
        document.getElementById('ratingModal').classList.remove('active');
        if (successEl) successEl.classList.remove('active');
      }, 2000);
    });
  }

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
      if (errEl) errEl.classList.remove('active');
      if (sucEl) sucEl.classList.remove('active');
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (errEl) { errEl.textContent = 'Email invalide'; errEl.classList.add('active'); }
        return;
      }
      const subs = JSON.parse(localStorage.getItem('pirabel_newsletter') || '[]');
      if (!subs.includes(email)) { subs.push(email); localStorage.setItem('pirabel_newsletter', JSON.stringify(subs)); }
      if (sucEl) { sucEl.textContent = 'Inscrit !'; sucEl.classList.add('active'); }
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
    themeToggle.addEventListener('click', () => window.PirabelTheme.toggleTheme());
  }

  const langToggle = document.getElementById('langToggle');
  if (langToggle && window.PirabelI18n) {
    langToggle.addEventListener('click', () => window.PirabelI18n.toggleLang());
  }

  // ============================================================
  // MODAL CLOSE HANDLERS
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

  // ============================================================
  // EXPOSE for app-logic.js
  // ============================================================
  window.pirabelEdit = {
    pushHistory,
    replaceCanvas,
    showToast,
    setStatus,
    updateDimensionsStatus,
    zoomFit,
    activateAnnotationMode,
    deactivateAnnotationMode
  };

})();
