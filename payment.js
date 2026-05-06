window.PirabelPayment = (function() {
  'use strict';

  let scriptLoaded = false;
  let listenersAdded = false;
  let currentPaymentPlan = null;
  let onSuccessCallback = null;
  let onFailureCallback = null;

  function loadKkiapayScript() {
    return new Promise((resolve, reject) => {
      if (scriptLoaded || window.openKkiapayWidget) {
        scriptLoaded = true;
        setupListeners();
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.kkiapay.me/k.js';
      script.async = true;
      script.onload = () => {
        scriptLoaded = true;
        setTimeout(setupListeners, 200);
        resolve();
      };
      script.onerror = () => reject(new Error('Impossible de charger Kkiapay'));
      document.body.appendChild(script);
    });
  }

  function setupListeners() {
    if (listenersAdded) return;
    if (typeof window.addKkiapayListener === 'function') {
      window.addKkiapayListener('success', handleSuccess);
      window.addKkiapayListener('failed', handleFailure);
      listenersAdded = true;
    } else {
      const interval = setInterval(() => {
        if (typeof window.addKkiapayListener === 'function') {
          window.addKkiapayListener('success', handleSuccess);
          window.addKkiapayListener('failed', handleFailure);
          listenersAdded = true;
          clearInterval(interval);
        }
      }, 100);
      setTimeout(() => clearInterval(interval), 10000);
    }
  }

  async function handleSuccess(response) {
    console.log('Paiement réussi:', response);
    if (currentPaymentPlan && window.PirabelAuth) {
      try {
        const updatedUser = await window.PirabelAuth.activatePlan(currentPaymentPlan, {
          transactionId: response.transactionId || response.id || ('tx_' + Date.now()),
          method: 'kkiapay',
          rawResponse: response
        });
        if (onSuccessCallback) onSuccessCallback(response, currentPaymentPlan, updatedUser);
      } catch (e) {
        console.error('Erreur activation:', e);
        if (onFailureCallback) onFailureCallback(e);
      }
    }
    currentPaymentPlan = null;
  }

  function handleFailure(error) {
    console.warn('Paiement échoué:', error);
    if (onFailureCallback) onFailureCallback(error);
    currentPaymentPlan = null;
  }

  async function payForPlan(planId, options) {
    options = options || {};
    const plan = window.PIRABEL_CONFIG.PLANS[planId];
    if (!plan) throw new Error('Plan invalide: ' + planId);
    if (!plan.price || plan.price === 0) throw new Error('Plan gratuit, pas de paiement');

    const user = window.PirabelAuth.getCurrentUser();
    if (!user) throw new Error('Tu dois être connecté pour acheter');

    try {
      await loadKkiapayScript();
    } catch (e) {
      throw new Error('Impossible de charger le module de paiement. Vérifie ta connexion internet.');
    }

    currentPaymentPlan = planId;
    onSuccessCallback = options.onSuccess || null;
    onFailureCallback = options.onFailure || null;

    const customData = JSON.stringify({
      userEmail: user.email,
      userId: user.id,
      planId: planId,
      planName: plan.name
    });

    if (typeof window.openKkiapayWidget === 'function') {
      window.openKkiapayWidget({
        amount: plan.price,
        api_key: window.PIRABEL_CONFIG.KKIAPAY_PUBLIC_KEY,
        sandbox: window.PIRABEL_CONFIG.KKIAPAY_SANDBOX,
        email: user.email,
        name: user.name,
        data: customData,
        position: 'center',
        theme: '#FF6B1A'
      });
    } else {
      throw new Error('Module de paiement non disponible. Réessaye dans un instant.');
    }
  }

  function preload() {
    loadKkiapayScript().catch(() => {});
  }

  return { payForPlan, preload };
})();
