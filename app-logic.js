// ============================================================
// PIRABEL REMOVER — APP MAIN LOGIC (Supabase async)
// ============================================================

(async function() {
  'use strict';

  // Require auth (async — attend Supabase)
  const user = await window.PirabelAuth.requireAuth();
  if (!user) return;

  // Update nav user chip
  const initials = user.name.split(' ').map(s => s[0]).join('').toUpperCase().substring(0, 2);
  document.getElementById('navAvatar').textContent = initials;
  document.getElementById('navName').textContent = user.name.split(' ')[0];

  // DOM refs
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const editor = document.getElementById('editor');
  const imgCanvas = document.getElementById('imgCanvas');
  const overlay = document.getElementById('overlay');
  const ctx = imgCanvas.getContext('2d');
  const octx = overlay.getContext('2d');
  const status = document.getElementById('status');
  const toast = document.getElementById('toast');

  let originalImage = null;
  let originalImageData = null;
  let history = [];
  window.appHistory = history; // Exposer pour app-edit.js
  let selection = null;
  let drawing = false;
  let startPt = null;
  let originalFilename = 'image';
  let batchFiles = [];
  let batchResults = [];
  let processedHistory = loadHistory();
  let hasIncrementedForCurrentImage = false;
  let lastLoadedFile = null; // For reuse feature

  // ============================================================
  // QUOTA UI
  // ============================================================
  function updateQuotaUI() {
    const plan = window.PirabelAuth.getEffectivePlan();
    const banner = document.getElementById('quotaBanner');
    const label = document.getElementById('quotaLabel');
    const detail = document.getElementById('quotaDetail');
    const upgradeBtn = document.getElementById('quotaUpgradeBtn');

    banner.classList.remove('pro', 'warning', 'danger');

    if (plan.unlimited) {
      banner.classList.add('pro');
      label.textContent = plan.name;
      const ms = plan.remainingMs;
      const days = Math.floor(ms / (1000*60*60*24));
      const hours = Math.floor((ms % (1000*60*60*24)) / (1000*60*60));
      detail.textContent = days > 0
        ? days + 'j ' + hours + 'h restantes · Illimité'
        : hours + 'h restantes · Illimité';
      upgradeBtn.style.display = 'none';
    } else if (plan.type === 'payg') {
      banner.classList.add('pro');
      label.textContent = 'Crédits PAYG + gratuit';
      detail.textContent = plan.credits + ' crédit(s) + ' + plan.freeRemaining + ' images gratuites';
      upgradeBtn.style.display = 'block';
      upgradeBtn.textContent = 'Recharger';
    } else {
      label.textContent = 'Plan gratuit';
      detail.textContent = plan.freeRemaining + ' / ' + plan.monthlyTotal + ' images restantes';
      if (plan.freeRemaining <= 0) banner.classList.add('danger');
      else if (plan.freeRemaining <= 3) banner.classList.add('warning');
      upgradeBtn.style.display = 'block';
      upgradeBtn.textContent = 'Passer Pro';
    }
  }

  // ============================================================
  // QUOTA MODAL
  // ============================================================
  function renderUpgradeOptions() {
    const container = document.getElementById('upgradeOptions');
    const plans = window.PIRABEL_CONFIG.PLANS;
    container.innerHTML = '';
    [
      { id: 'payg', featured: false },
      { id: 'pass3j', featured: true },
      { id: 'monthly', featured: false }
    ].forEach(({ id, featured }) => {
      const p = plans[id];
      const div = document.createElement('div');
      div.className = 'upgrade-option' + (featured ? ' featured' : '');
      const iconSvg = window.PirabelIcons ? window.PirabelIcons.svg(p.icon, 24) : '';
      div.innerHTML = `
        <div class="upgrade-icon">${iconSvg}</div>
        <div class="upgrade-info">
          <div class="upgrade-name">${p.name}</div>
          <div class="upgrade-desc">${p.desc}</div>
        </div>
        <div class="upgrade-price">${p.price.toLocaleString('fr-FR')} <span>FCFA</span></div>
      `;
      div.addEventListener('click', () => buyPlan(id));
      container.appendChild(div);
    });
  }

  async function buyPlan(planId) {
    showToast('Chargement du paiement...', 'info');
    closeModal('quotaModal');
    try {
      await window.PirabelPayment.payForPlan(planId, {
        onSuccess: (response, planId) => {
          const pn = window.PIRABEL_CONFIG.PLANS[planId].name;
          document.getElementById('paySuccessText').textContent =
            'Ton plan "' + pn + '" est activé. Bonne utilisation !';
          openModal('paySuccessModal');
          updateQuotaUI();
        },
        onFailure: () => showToast('Paiement annulé', 'error')
      });
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ============================================================
  // TABS
  // ============================================================
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const isPro = window.PirabelAuth.getEffectivePlan().batch;
      if (tab.dataset.tab === 'batch' && !isPro) {
        showToast('Mode lot réservé aux plans Pro', 'error');
        renderUpgradeOptions();
        openModal('quotaModal');
        return;
      }
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
      if (tab.dataset.tab === 'gallery') renderGallery();
    });
  });

  // ============================================================
  // STATUS / TOAST
  // ============================================================
  function setStatus(msg, kind) {
    status.textContent = msg || '';
    status.className = 'status' + (kind ? ' ' + kind : '');
  }

  function showToast(msg, kind) {
    toast.textContent = msg;
    toast.className = 'toast' + (kind ? ' ' + kind : '');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  // ============================================================
  // FILE LOADING
  // ============================================================
  function loadFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      showToast('Fichier non supporté', 'error');
      return;
    }
    if (!window.PirabelAuth.canProcess()) {
      renderUpgradeOptions();
      openModal('quotaModal');
      return;
    }
    originalFilename = file.name ? file.name.replace(/\.[^.]+$/, '') : 'image';
    lastLoadedFile = file; // Store for reuse
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        imgCanvas.width = img.width;
        imgCanvas.height = img.height;
        overlay.width = img.width;
        overlay.height = img.height;
        ctx.drawImage(img, 0, 0);
        originalImage = img;
        originalImageData = ctx.getImageData(0, 0, img.width, img.height);
        history = [originalImageData];
        selection = null;
        hasIncrementedForCurrentImage = false;
        clearOverlay();
        dropzone.style.display = 'none';
        editor.classList.add('active');
        document.getElementById('compareWrap').classList.remove('active');
        setStatus(img.width + ' x ' + img.height + ' px');
      };
      img.onerror = () => showToast('Image invalide', 'error');
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  dropzone.addEventListener('click', () => {
    if (!window.PirabelAuth.canProcess()) {
      renderUpgradeOptions();
      openModal('quotaModal');
      return;
    }
    fileInput.click();
  });

  fileInput.addEventListener('change', e => {
    if (e.target.files[0]) loadFile(e.target.files[0]);
  });

  ['dragover', 'dragenter'].forEach(ev => {
    dropzone.addEventListener(ev, e => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
  });
  ['dragleave', 'dragend'].forEach(ev => {
    dropzone.addEventListener(ev, () => dropzone.classList.remove('dragover'));
  });
  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
  });

  document.addEventListener('paste', e => {
    if (!document.getElementById('tab-single').classList.contains('active')) return;
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          loadFile(file);
          showToast('Image collée');
          break;
        }
      }
    }
  });

  // ============================================================
  // SELECTION DRAWING
  // ============================================================
  function getCanvasCoords(e) {
    const rect = overlay.getBoundingClientRect();
    const sx = overlay.width / rect.width;
    const sy = overlay.height / rect.height;
    const cx = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const cy = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    return {
      x: Math.round((cx - rect.left) * sx),
      y: Math.round((cy - rect.top) * sy)
    };
  }

  function clearOverlay() { octx.clearRect(0, 0, overlay.width, overlay.height); }

  function drawSelection() {
    clearOverlay();
    if (!selection) return;
    octx.strokeStyle = '#FF6B1A';
    octx.lineWidth = Math.max(2, overlay.width / 250);
    octx.setLineDash([overlay.width / 80, overlay.width / 130]);
    octx.strokeRect(selection.x, selection.y, selection.w, selection.h);
    octx.fillStyle = 'rgba(255,107,26,0.18)';
    octx.fillRect(selection.x, selection.y, selection.w, selection.h);
    const cs = Math.max(8, overlay.width / 80);
    octx.fillStyle = '#FF6B1A';
    octx.setLineDash([]);
    [[selection.x, selection.y], [selection.x + selection.w, selection.y],
     [selection.x, selection.y + selection.h], [selection.x + selection.w, selection.y + selection.h]
    ].forEach(([x, y]) => {
      octx.beginPath();
      octx.arc(x, y, cs / 2, 0, Math.PI * 2);
      octx.fill();
    });
  }

  imgCanvas.style.pointerEvents = 'auto';
  imgCanvas.style.touchAction = 'none';

  imgCanvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    drawing = true;
    startPt = getCanvasCoords(e);
    selection = { x: startPt.x, y: startPt.y, w: 0, h: 0 };
    imgCanvas.setPointerCapture(e.pointerId);
  });
  imgCanvas.addEventListener('pointermove', e => {
    if (!drawing) return;
    const p = getCanvasCoords(e);
    selection = {
      x: Math.min(startPt.x, p.x),
      y: Math.min(startPt.y, p.y),
      w: Math.abs(p.x - startPt.x),
      h: Math.abs(p.y - startPt.y)
    };
    drawSelection();
  });
  imgCanvas.addEventListener('pointerup', e => {
    drawing = false;
    try { imgCanvas.releasePointerCapture(e.pointerId); } catch (err) {}
  });
  imgCanvas.addEventListener('pointercancel', () => { drawing = false; });

  // ============================================================
  // PRESETS
  // ============================================================
  document.getElementById('autoBtn').addEventListener('click', () => {
    if (!originalImage) return;
    const w = imgCanvas.width;
    const h = imgCanvas.height;
    const sizePct = parseInt(document.getElementById('presetSize').value, 10) / 100;
    const size = Math.round(Math.min(w, h) * sizePct);
    const padX = Math.round(w * 0.018);
    const padY = Math.round(h * 0.018);
    selection = { x: w - size - padX, y: h - size - padY, w: size, h: size };
    drawSelection();
    setStatus('Preset Pirabel — losange Gemini ciblé');
  });

  document.getElementById('autoGenericBtn').addEventListener('click', () => {
    if (!originalImage) return;
    const w = imgCanvas.width;
    const h = imgCanvas.height;
    const selW = Math.round(w * 0.22);
    const selH = Math.round(h * 0.10);
    const pad = Math.round(Math.min(w, h) * 0.015);
    selection = { x: w - selW - pad, y: h - selH - pad, w: selW, h: selH };
    drawSelection();
    setStatus('Zone large pour watermark texte');
  });

  document.getElementById('presetSize').addEventListener('input', e => {
    document.getElementById('presetSizeVal').textContent = e.target.value + '%';
  });

  document.getElementById('clearBtn').addEventListener('click', () => {
    selection = null;
    clearOverlay();
    setStatus('Sélection effacée');
  });

  document.getElementById('resetBtn').addEventListener('click', () => {
    if (originalImage && history.length > 1) {
      if (!confirm('Recommencer avec une nouvelle image ?')) return;
    }
    originalImage = null;
    originalImageData = null;
    history = [];
    selection = null;
    hasIncrementedForCurrentImage = false;
    clearOverlay();
    ctx.clearRect(0, 0, imgCanvas.width, imgCanvas.height);
    editor.classList.remove('active');
    dropzone.style.display = 'block';
    fileInput.value = '';
    document.getElementById('compareWrap').classList.remove('active');
    setStatus('');
  });

  // ============================================================
  // INPAINTING METHODS
  // ============================================================
  document.getElementById('applyBtn').addEventListener('click', () => {
    if (!selection || selection.w < 4 || selection.h < 4) {
      showToast('Sélectionne d\'abord une zone', 'error');
      return;
    }
    const method = document.getElementById('method').value;
    history.push(ctx.getImageData(0, 0, imgCanvas.width, imgCanvas.height));
    if (method === 'blur') applyBlur();
    else if (method === 'edge') applyEdgeStretch();
    else if (method === 'pixelate') applyPixelate();
    else applyPatchSample();
    if (document.getElementById('smoothEdges').checked) {
      seamSmooth(selection.x, selection.y, selection.w, selection.h);
    }
    clearOverlay();
    selection = null;
    showToast('Suppression appliquee', 'success');
    setStatus('Tu peux annuler, comparer ou télécharger');
  });

  function applyPatchSample() {
    const { x, y, w, h } = selection;
    const cw = imgCanvas.width;
    const ch = imgCanvas.height;
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

  function applyBlur() {
    const { x, y, w, h } = selection;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.filter = 'blur(20px)';
    ctx.drawImage(imgCanvas, 0, 0);
    ctx.restore();
  }

  function applyEdgeStretch() {
    const { x, y, w, h } = selection;
    const cw = imgCanvas.width;
    const img = ctx.getImageData(0, 0, cw, imgCanvas.height);
    const data = img.data;
    const srcY = Math.max(0, y - 1);
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const dst = ((y + j) * cw + (x + i)) * 4;
        const src = (srcY * cw + (x + i)) * 4;
        data[dst] = data[src];
        data[dst + 1] = data[src + 1];
        data[dst + 2] = data[src + 2];
        data[dst + 3] = data[src + 3];
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  function applyPixelate() {
    const { x, y, w, h } = selection;
    const blockSize = Math.max(8, Math.min(w, h) / 12);
    const t = document.createElement('canvas');
    t.width = Math.ceil(w / blockSize);
    t.height = Math.ceil(h / blockSize);
    const tc = t.getContext('2d');
    tc.imageSmoothingEnabled = true;
    tc.drawImage(imgCanvas, x, y, w, h, 0, 0, t.width, t.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(t, 0, 0, t.width, t.height, x, y, w, h);
    ctx.imageSmoothingEnabled = true;
  }

  function seamSmooth(x, y, w, h) {
    const border = 3;
    ctx.save();
    ctx.filter = 'blur(1.5px)';
    ctx.beginPath();
    ctx.rect(x, y, w, border);
    ctx.rect(x, y + h - border, w, border);
    ctx.rect(x, y, border, h);
    ctx.rect(x + w - border, y, border, h);
    ctx.clip();
    ctx.drawImage(imgCanvas, 0, 0);
    ctx.restore();
  }

  // ============================================================
  // UNDO / COMPARE / DOWNLOAD
  // ============================================================
  document.getElementById('undoBtn').addEventListener('click', () => {
    if (history.length <= 1) {
      showToast('Rien à annuler', 'error');
      return;
    }
    history.pop();
    ctx.putImageData(history[history.length - 1], 0, 0);
    selection = null;
    clearOverlay();
    setStatus('Annulé');
  });

  const compareWrap = document.getElementById('compareWrap');
  document.getElementById('compareBtn').addEventListener('click', () => {
    if (!originalImageData) return;
    if (compareWrap.classList.contains('active')) {
      compareWrap.classList.remove('active');
      return;
    }
    const beforeCanvas = document.createElement('canvas');
    beforeCanvas.width = originalImageData.width;
    beforeCanvas.height = originalImageData.height;
    beforeCanvas.getContext('2d').putImageData(originalImageData, 0, 0);
    document.getElementById('compareBefore').src = beforeCanvas.toDataURL('image/png');
    document.getElementById('compareAfter').src = imgCanvas.toDataURL('image/png');
    compareWrap.classList.add('active');
    setStatus('Glisse la barre orange');
  });

  let compareDragging = false;
  const compareHandle = document.getElementById('compareHandle');
  function moveCompare(clientX) {
    const rect = compareWrap.getBoundingClientRect();
    let pct = ((clientX - rect.left) / rect.width) * 100;
    pct = Math.max(0, Math.min(100, pct));
    compareWrap.querySelector('.compare-after').style.width = pct + '%';
    compareHandle.style.left = pct + '%';
  }
  compareHandle.addEventListener('pointerdown', e => {
    compareDragging = true;
    compareHandle.setPointerCapture(e.pointerId);
  });
  compareHandle.addEventListener('pointermove', e => {
    if (compareDragging) moveCompare(e.clientX);
  });
  compareHandle.addEventListener('pointerup', e => {
    compareDragging = false;
    try { compareHandle.releasePointerCapture(e.pointerId); } catch (err) {}
  });

  document.getElementById('downloadBtn').addEventListener('click', () => {
    const format = document.getElementById('exportFormat').value;
    const mime = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
    const ext = format === 'jpeg' ? 'jpg' : format;
    const quality = format === 'png' ? undefined : 0.92;

    imgCanvas.toBlob(async blob => {
      if (!blob) {
        showToast('Erreur export', 'error');
        return;
      }
      // Consume only on first download per image
      if (!hasIncrementedForCurrentImage) {
        const success = await window.PirabelAuth.consumeImage();
        if (!success) {
          showToast('Quota épuisé', 'error');
          renderUpgradeOptions();
          openModal('quotaModal');
          return;
        }
        hasIncrementedForCurrentImage = true;
        updateQuotaUI();
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = originalFilename + '_sans-logo.' + ext;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      showToast('Telecharge', 'success');
      saveToHistory(imgCanvas);
    }, mime, quality);
  });

  // ============================================================
  // REUSE LAST IMAGE
  // ============================================================
  document.getElementById('reuseBtn').addEventListener('click', () => {
    if (!lastLoadedFile) {
      showToast('Aucune image précédente à réutiliser', 'error');
      return;
    }
    loadFile(lastLoadedFile);
    showToast('Image rechargée');
  });

  // ============================================================
  // QUICK EXPORT (PNG + JPG + WEBP)
  // ============================================================
  document.getElementById('quickExportBtn').addEventListener('click', async () => {
    if (!originalImage || imgCanvas.width === 0) {
      showToast('Charge d\'abord une image', 'error');
      return;
    }

    // Consume only on first download per image
    if (!hasIncrementedForCurrentImage) {
      const success = await window.PirabelAuth.consumeImage();
      if (!success) {
        showToast('Quota épuisé', 'error');
        renderUpgradeOptions();
        openModal('quotaModal');
        return;
      }
      hasIncrementedForCurrentImage = true;
      updateQuotaUI();
    }

    showToast('Export en cours...', 'info');

    try {
      const results = await window.PirabelImageEdit.exportAllFormats(imgCanvas, originalFilename + '_sans-logo');
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        const url = URL.createObjectURL(r.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = r.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        if (i < results.length - 1) await new Promise(r => setTimeout(r, 300));
        URL.revokeObjectURL(url);
      }
      showToast(`✓ ${results.length} fichiers exportés (PNG + JPG + WEBP)`, 'success');
      saveToHistory(imgCanvas);
    } catch (err) {
      showToast('Erreur export', 'error');
    }
  });

  // ============================================================
  // BATCH
  // ============================================================
  const batchDropzone = document.getElementById('batchDropzone');
  const batchInput = document.getElementById('batchInput');
  const batchList = document.getElementById('batchList');
  const batchActions = document.getElementById('batchActions');
  const batchStatus = document.getElementById('batchStatus');

  batchDropzone.addEventListener('click', () => {
    if (!window.PirabelAuth.getEffectivePlan().batch) {
      showToast('Mode lot réservé aux plans Pro', 'error');
      renderUpgradeOptions();
      openModal('quotaModal');
      return;
    }
    batchInput.click();
  });

  batchInput.addEventListener('change', e => addBatchFiles(Array.from(e.target.files)));

  function addBatchFiles(files) {
    if (!window.PirabelAuth.getEffectivePlan().batch) return;
    const valid = files.filter(f => f.type.startsWith('image/'));
    if (valid.length === 0) {
      showToast('Aucune image valide', 'error');
      return;
    }
    valid.forEach(f => batchFiles.push({ file: f, status: 'pending' }));
    renderBatchList();
    batchActions.style.display = 'grid';
    showToast(valid.length + ' image(s) ajoutée(s)');
  }

  function renderBatchList() {
    batchList.innerHTML = '';
    batchFiles.forEach(item => {
      const div = document.createElement('div');
      div.className = 'batch-item';
      const reader = new FileReader();
      reader.onload = e => {
        div.innerHTML = `<img class="batch-thumb" src="${e.target.result}" alt="">
          <div class="batch-info">
            <div class="batch-name">${item.file.name}</div>
            <div class="batch-status ${item.status}">${getStatusText(item.status)}</div>
          </div>`;
      };
      reader.readAsDataURL(item.file);
      batchList.appendChild(div);
    });
  }

  function getStatusText(s) {
    return s === 'pending' ? 'En attente' :
           s === 'processing' ? 'Traitement...' :
           s === 'done' ? 'Termine' :
           s === 'error' ? 'Erreur' : s;
  }

  document.getElementById('batchProcessBtn').addEventListener('click', async () => {
    if (batchFiles.length === 0) return;
    if (!window.PirabelAuth.getEffectivePlan().batch) return;
    batchResults = [];
    const sizePct = parseInt(document.getElementById('presetSize').value, 10) / 100;
    const method = document.getElementById('method').value;
    const smooth = document.getElementById('smoothEdges').checked;

    for (let i = 0; i < batchFiles.length; i++) {
      batchFiles[i].status = 'processing';
      renderBatchList();
      batchStatus.textContent = `Traitement ${i+1}/${batchFiles.length}...`;
      try {
        const blob = await processBatchImage(batchFiles[i].file, sizePct, method, smooth);
        batchResults.push({ name: batchFiles[i].file.name, blob });
        batchFiles[i].status = 'done';
        // Consume one image per processed
        await window.PirabelAuth.consumeImage();
      } catch (err) {
        batchFiles[i].status = 'error';
      }
      renderBatchList();
    }
    batchStatus.textContent = `${batchResults.length} image(s) traitee(s)`;
    batchStatus.className = 'status success';
    document.getElementById('batchDownloadBtn').disabled = false;
    updateQuotaUI();
    showToast('Lot terminé', 'success');
  });

  function processBatchImage(file, sizePct, method, smooth) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const c = canvas.getContext('2d');
          c.drawImage(img, 0, 0);
          const w = canvas.width;
          const h = canvas.height;
          const size = Math.round(Math.min(w, h) * sizePct);
          const padX = Math.round(w * 0.018);
          const padY = Math.round(h * 0.018);
          const sel = { x: w - size - padX, y: h - size - padY, w: size, h: size };
          if (method === 'blur') batchBlur(c, canvas, sel);
          else if (method === 'edge') batchEdge(c, canvas, sel);
          else if (method === 'pixelate') batchPixelate(c, canvas, sel);
          else batchPatch(c, canvas, sel);
          if (smooth) batchSmooth(c, canvas, sel);
          canvas.toBlob(blob => blob ? resolve(blob) : reject('toBlob failed'), 'image/png');
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function batchPatch(c, canvas, sel) {
    const { x, y, w, h } = sel;
    const cw = canvas.width;
    const ch = canvas.height;
    const img = c.getImageData(0, 0, cw, ch);
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
    c.putImageData(img, 0, 0);
  }

  function batchBlur(c, canvas, sel) {
    c.save();
    c.beginPath();
    c.rect(sel.x, sel.y, sel.w, sel.h);
    c.clip();
    c.filter = 'blur(20px)';
    c.drawImage(canvas, 0, 0);
    c.restore();
  }

  function batchEdge(c, canvas, sel) {
    const { x, y, w, h } = sel;
    const cw = canvas.width;
    const img = c.getImageData(0, 0, cw, canvas.height);
    const data = img.data;
    const srcY = Math.max(0, y - 1);
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const dst = ((y + j) * cw + (x + i)) * 4;
        const src = (srcY * cw + (x + i)) * 4;
        data[dst] = data[src];
        data[dst + 1] = data[src + 1];
        data[dst + 2] = data[src + 2];
        data[dst + 3] = data[src + 3];
      }
    }
    c.putImageData(img, 0, 0);
  }

  function batchPixelate(c, canvas, sel) {
    const { x, y, w, h } = sel;
    const blockSize = Math.max(8, Math.min(w, h) / 12);
    const t = document.createElement('canvas');
    t.width = Math.ceil(w / blockSize);
    t.height = Math.ceil(h / blockSize);
    const tc = t.getContext('2d');
    tc.imageSmoothingEnabled = true;
    tc.drawImage(canvas, x, y, w, h, 0, 0, t.width, t.height);
    c.imageSmoothingEnabled = false;
    c.drawImage(t, 0, 0, t.width, t.height, x, y, w, h);
    c.imageSmoothingEnabled = true;
  }

  function batchSmooth(c, canvas, sel) {
    const { x, y, w, h } = sel;
    const border = 3;
    c.save();
    c.filter = 'blur(1.5px)';
    c.beginPath();
    c.rect(x, y, w, border);
    c.rect(x, y + h - border, w, border);
    c.rect(x, y, border, h);
    c.rect(x + w - border, y, border, h);
    c.clip();
    c.drawImage(canvas, 0, 0);
    c.restore();
  }

  document.getElementById('batchClearBtn').addEventListener('click', () => {
    batchFiles = [];
    batchResults = [];
    renderBatchList();
    batchActions.style.display = 'none';
    document.getElementById('batchDownloadBtn').disabled = true;
    batchStatus.textContent = '';
  });

  document.getElementById('batchDownloadBtn').addEventListener('click', async () => {
    if (batchResults.length === 0) return;
    batchStatus.textContent = 'Téléchargement...';
    for (let i = 0; i < batchResults.length; i++) {
      const r = batchResults[i];
      const url = URL.createObjectURL(r.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = r.name.replace(/\.[^.]+$/, '') + '_sans-logo.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      await new Promise(r => setTimeout(r, 250));
      URL.revokeObjectURL(url);
    }
    batchStatus.textContent = batchResults.length + ' telechargements';
    showToast('Téléchargements lancés', 'success');
  });

  // ============================================================
  // GALLERY
  // ============================================================
  function loadHistory() {
    try {
      const u = window.PirabelAuth.getCurrentUser();
      if (!u) return [];
      return JSON.parse(localStorage.getItem('pirabel_history_' + u.id) || '[]');
    } catch (e) { return []; }
  }

  function saveToHistory(canvas) {
    try {
      const u = window.PirabelAuth.getCurrentUser();
      if (!u) return;
      const thumb = document.createElement('canvas');
      const maxThumb = 200;
      const scale = maxThumb / Math.max(canvas.width, canvas.height);
      thumb.width = canvas.width * scale;
      thumb.height = canvas.height * scale;
      thumb.getContext('2d').drawImage(canvas, 0, 0, thumb.width, thumb.height);
      const dataUrl = thumb.toDataURL('image/jpeg', 0.7);
      const fullUrl = canvas.toDataURL('image/png');
      processedHistory.unshift({
        thumb: dataUrl,
        full: fullUrl,
        date: Date.now(),
        name: originalFilename
      });
      processedHistory = processedHistory.slice(0, 12);
      localStorage.setItem('pirabel_history_' + u.id, JSON.stringify(processedHistory));
    } catch (e) {
      console.warn('Save history failed:', e);
    }
  }

  function renderGallery() {
    const grid = document.getElementById('galleryGrid');
    if (processedHistory.length === 0) {
      grid.innerHTML = '<div class="history-empty">Aucune image traitée</div>';
      return;
    }
    grid.innerHTML = '';
    processedHistory.forEach(item => {
      const div = document.createElement('div');
      div.className = 'history-item';
      div.innerHTML = `<img src="${item.thumb}" alt="${item.name}">`;
      div.addEventListener('click', () => {
        const a = document.createElement('a');
        a.href = item.full;
        a.download = item.name + '_sans-logo.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast('Image téléchargée');
      });
      grid.appendChild(div);
    });
  }

  document.getElementById('galleryClearBtn').addEventListener('click', () => {
    if (!confirm('Vider la galerie ?')) return;
    const u = window.PirabelAuth.getCurrentUser();
    processedHistory = [];
    if (u) localStorage.removeItem('pirabel_history_' + u.id);
    renderGallery();
    showToast('Galerie vidée');
  });

  // ============================================================
  // MODALS
  // ============================================================
  function openModal(id) { document.getElementById(id).classList.add('active'); }
  function closeModal(id) { document.getElementById(id).classList.remove('active'); }

  document.getElementById('helpBtn').addEventListener('click', () => openModal('helpModal'));
  document.getElementById('historyBtn').addEventListener('click', () => {
    document.querySelector('[data-tab="gallery"]').click();
  });
  document.getElementById('quotaUpgradeBtn').addEventListener('click', () => {
    renderUpgradeOptions();
    openModal('quotaModal');
  });

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) modal.classList.remove('active');
    });
  });

  // ============================================================
  // KEYBOARD
  // ============================================================
  document.addEventListener('keydown', e => {
    if (!editor.classList.contains('active')) return;
    if (!document.getElementById('tab-single').classList.contains('active')) return;
    const t = e.target;
    if (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA') return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      document.getElementById('undoBtn').click();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      document.getElementById('downloadBtn').click();
    } else if (e.key === 'Enter' && selection) {
      e.preventDefault();
      document.getElementById('applyBtn').click();
    } else if (e.key === 'Escape') {
      document.getElementById('clearBtn').click();
    }
  });

  // ============================================================
  // PWA INSTALL
  // ============================================================
  let deferredPrompt = null;
  const installBanner = document.getElementById('installBanner');
  const installBtn = document.getElementById('installBtn');
  const installClose = document.getElementById('installClose');

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    if (!localStorage.getItem('pirabel_install_dismissed')) {
      installBanner.classList.add('active');
    }
  });

  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') showToast('App installée avec succès', 'success');
    deferredPrompt = null;
    installBanner.classList.remove('active');
  });

  installClose.addEventListener('click', () => {
    installBanner.classList.remove('active');
    localStorage.setItem('pirabel_install_dismissed', '1');
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }

  // Preload Kkiapay
  window.PirabelPayment.preload();

  // Init
  updateQuotaUI();
  renderGallery();
  setInterval(updateQuotaUI, 60000);
})();
