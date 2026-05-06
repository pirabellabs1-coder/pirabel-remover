// ============================================================
// PIRABEL — THEME TOGGLE (Dark / Light)
// ============================================================

window.PirabelTheme = (function() {
  'use strict';

  const LIGHT_VARS = {
    '--bg-primary': '#f5f5f5',
    '--bg-secondary': '#ffffff',
    '--bg-tertiary': '#f0f0f0',
    '--bg-elevated': '#e8e8e8',
    '--border': '#d4d4d4',
    '--border-hover': '#bbb',
    '--text-primary': '#1a1a1a',
    '--text-secondary': '#555555',
    '--text-tertiary': '#888888',
  };

  const DARK_VARS = {
    '--bg-primary': '#0a0a0a',
    '--bg-secondary': '#161616',
    '--bg-tertiary': '#1f1f1f',
    '--bg-elevated': '#242424',
    '--border': '#2a2a2a',
    '--border-hover': '#3a3a3a',
    '--text-primary': '#ffffff',
    '--text-secondary': '#a8a8a8',
    '--text-tertiary': '#6a6a6a',
  };

  let currentTheme = localStorage.getItem('pirabel_theme') || 'dark';

  function getTheme() { return currentTheme; }

  function setTheme(theme) {
    currentTheme = theme;
    localStorage.setItem('pirabel_theme', theme);
    applyTheme();
  }

  function toggleTheme() {
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  }

  function applyTheme() {
    const vars = currentTheme === 'light' ? LIGHT_VARS : DARK_VARS;
    const root = document.documentElement;
    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    document.body.classList.toggle('theme-light', currentTheme === 'light');
    document.body.classList.toggle('theme-dark', currentTheme === 'dark');

    // Update meta theme-color
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = currentTheme === 'light' ? '#f5f5f5' : '#0a0a0a';

    // Update toggle buttons
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      btn.textContent = currentTheme === 'dark' ? 'LT' : 'DK';
      btn.title = currentTheme === 'dark' ? 'Mode clair' : 'Mode sombre';
    });

    // Fix body::before glow for light mode
    if (currentTheme === 'light') {
      root.style.setProperty('--orange-glow', 'rgba(255, 107, 26, 0.2)');
    } else {
      root.style.setProperty('--orange-glow', 'rgba(255, 107, 26, 0.35)');
    }
  }

  // Apply on load
  function init() {
    applyTheme();
  }

  return { getTheme, setTheme, toggleTheme, applyTheme, init };
})();

// Auto-init on load
document.addEventListener('DOMContentLoaded', () => {
  window.PirabelTheme.init();
});
// Also apply immediately for pages that load before DOMContentLoaded
if (document.readyState !== 'loading') {
  window.PirabelTheme.init();
}
