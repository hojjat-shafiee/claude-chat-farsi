/**
 * Claude Farsi Fonts & RTL Extension - Content Script
 * Compatible with Google Chrome and Microsoft Edge (Manifest V3)
 */

(function () {
  'use strict';

  const STYLE_ID = 'claude-farsi-font-styles';
  const PERSIAN_ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

  const DEFAULT_SETTINGS = {
    enabled: true,
    fontFamily: 'Vazirmatn', // 'Vazirmatn', 'Estedad', 'Shabnam', 'Sahel', 'custom', 'default'
    customFontName: '',
    fontSize: 16,            // px (0 = default)
    lineHeight: 1.8,         // ratio (0 = default)
    fontWeight: '400',       // '300', '400', '500', '600', '700'
    autoRtl: true,           // Automatic RTL detection on messages
    forceInputRtl: true,     // Auto RTL on chat input
    applyToUI: true,         // Apply to whole UI or only chat messages
    persianDigits: false     // Persian numerals
  };

  let currentSettings = { ...DEFAULT_SETTINGS };
  let isObserverActive = false;
  let observer = null;

  // --------------------------------------------------------------------------
  // Storage helpers (with fallback)
  // --------------------------------------------------------------------------
  async function loadSettings() {
    try {
      const storage = chrome.storage.sync || chrome.storage.local;
      const data = await storage.get('claudeFarsiSettings');
      if (data && data.claudeFarsiSettings) {
        currentSettings = { ...DEFAULT_SETTINGS, ...data.claudeFarsiSettings };
      }
    } catch (e) {
      console.warn('[Claude Farsi] Failed to load settings from storage, using defaults:', e);
    }
  }

  // --------------------------------------------------------------------------
  // Preload FontFace via JS for 100% reliability
  // --------------------------------------------------------------------------
  async function ensureFontLoaded(fontFamily) {
    if (!('fonts' in document)) return;

    try {
      if (fontFamily === 'Vazirmatn') {
        const font = new FontFace('Vazirmatn', `url(${chrome.runtime.getURL('fonts/Vazirmatn-Variable.woff2')})`, {
          weight: '100 900',
          style: 'normal'
        });
        const loaded = await font.load();
        document.fonts.add(loaded);
      } else if (fontFamily === 'Estedad') {
        const fontAr = new FontFace('Estedad', `url(${chrome.runtime.getURL('fonts/Estedad-Arabic-Variable.woff2')})`, {
          weight: '100 900',
          style: 'normal'
        });
        const loadedAr = await fontAr.load();
        document.fonts.add(loadedAr);

        const fontLat = new FontFace('Estedad', `url(${chrome.runtime.getURL('fonts/Estedad-Latin-Variable.woff2')})`, {
          weight: '100 900',
          style: 'normal'
        });
        const loadedLat = await fontLat.load();
        document.fonts.add(loadedLat);
      } else if (fontFamily === 'Shabnam') {
        const font = new FontFace('Shabnam', `url(${chrome.runtime.getURL('fonts/Shabnam.woff2')})`, {
          weight: '400',
          style: 'normal'
        });
        const loaded = await font.load();
        document.fonts.add(loaded);
      } else if (fontFamily === 'Sahel') {
        const font = new FontFace('Sahel', `url(${chrome.runtime.getURL('fonts/Sahel.woff2')})`, {
          weight: '400',
          style: 'normal'
        });
        const loaded = await font.load();
        document.fonts.add(loaded);
      }
    } catch (err) {
      // Non-fatal, @font-face in CSS acts as backup
      console.debug('[Claude Farsi] FontFace preload notice:', err);
    }
  }

  // --------------------------------------------------------------------------
  // Build and Inject Dynamic CSS
  // --------------------------------------------------------------------------
  function generateCss(settings) {
    if (!settings.enabled) {
      return '';
    }

    let resolvedFamily = '';
    switch (settings.fontFamily) {
      case 'Vazirmatn':
        resolvedFamily = "'Vazirmatn', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        break;
      case 'Estedad':
        resolvedFamily = "'Estedad', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        break;
      case 'Shabnam':
        resolvedFamily = "'Shabnam', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        break;
      case 'Sahel':
        resolvedFamily = "'Sahel', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        break;
      case 'custom':
        if (settings.customFontName && settings.customFontName.trim()) {
          resolvedFamily = `'${settings.customFontName.trim()}', 'Vazirmatn', sans-serif`;
        } else {
          resolvedFamily = "'Vazirmatn', sans-serif";
        }
        break;
      case 'default':
      default:
        resolvedFamily = 'inherit';
        break;
    }

    const fontSizeRule = settings.fontSize && settings.fontSize > 0 ? `${settings.fontSize}px` : 'inherit';
    const lineHeightRule = settings.lineHeight && settings.lineHeight > 0 ? settings.lineHeight : '1.75';
    const fontWeightRule = settings.fontWeight || '400';
    const persianDigitsRule = settings.persianDigits ? '"ss01" on, "cv01" on' : 'normal';

    return `
      /* --- Root CSS Variables for Claude Farsi --- */
      :root {
        --claude-farsi-font: ${resolvedFamily};
        --claude-farsi-size: ${fontSizeRule};
        --claude-farsi-line-height: ${lineHeightRule};
        --claude-farsi-weight: ${fontWeightRule};
        --claude-farsi-digits: ${persianDigitsRule};
      }

      /* Apply font to chat messages & markdown containers */
      .font-claude-message,
      .font-user-message,
      div[data-message-author-slug],
      .prose,
      .prose p,
      .prose li,
      .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6,
      .prose blockquote,
      .prose table,
      .prose td,
      .prose th,
      .whitespace-pre-wrap,
      .break-words,
      div[data-is-streaming] {
        font-family: var(--claude-farsi-font) !important;
        font-weight: var(--claude-farsi-weight);
        font-feature-settings: var(--claude-farsi-digits);
      }

      /* Chat message text size & line height */
      .prose p,
      .prose li,
      .prose blockquote,
      .font-claude-message p,
      .font-user-message p,
      div[data-message-author-slug] p {
        ${settings.fontSize > 0 ? `font-size: var(--claude-farsi-size) !important;` : ''}
        ${settings.lineHeight > 0 ? `line-height: var(--claude-farsi-line-height) !important;` : ''}
      }

      /* Input box styling */
      div[contenteditable="true"],
      div[contenteditable="true"] p,
      textarea,
      .ProseMirror,
      div[role="textbox"] {
        font-family: var(--claude-farsi-font) !important;
        ${settings.fontSize > 0 ? `font-size: var(--claude-farsi-size) !important;` : ''}
        ${settings.lineHeight > 0 ? `line-height: var(--claude-farsi-line-height) !important;` : ''}
        font-feature-settings: var(--claude-farsi-digits);
      }

      /* Apply to general UI navigation/sidebars if enabled */
      ${settings.applyToUI ? `
      body,
      nav,
      [role="navigation"],
      aside,
      button,
      header,
      .font-sans,
      .font-tiempos,
      .font-copernicus {
        font-family: var(--claude-farsi-font) !important;
      }
      ` : ''}

      /* CRITICAL: Protect Code Blocks & Monospace Elements */
      pre,
      pre *,
      code,
      code *,
      kbd,
      samp,
      .font-mono,
      .font-mono *,
      [class*="font-mono"],
      [class*="code-"],
      [class*="syntax-"],
      .hljs,
      .prism,
      div[data-testid*="code"],
      .katex,
      .katex * {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
        direction: ltr !important;
        text-align: left !important;
        unicode-bidi: isolate !important;
        font-feature-settings: normal !important;
      }

      /* --- Smart RTL Rules --- */
      ${settings.autoRtl ? `
      /* Let browser resolve paragraph direction automatically */
      .prose p,
      .prose li,
      .prose blockquote,
      div[data-message-author-slug] p,
      .whitespace-pre-wrap {
        unicode-bidi: plaintext;
        text-align: start;
      }

      /* Elements detected as RTL */
      [data-cf-dir="rtl"],
      .prose[data-cf-dir="rtl"],
      p[data-cf-dir="rtl"],
      li[data-cf-dir="rtl"],
      div[data-cf-dir="rtl"] {
        direction: rtl !important;
        text-align: right !important;
        unicode-bidi: embed !important;
      }

      /* RTL lists properly indented on the right */
      ul[data-cf-dir="rtl"],
      ol[data-cf-dir="rtl"] {
        direction: rtl !important;
        padding-right: 1.5rem !important;
        padding-left: 0 !important;
        text-align: right !important;
      }

      blockquote[data-cf-dir="rtl"] {
        direction: rtl !important;
        border-right-width: 4px !important;
        border-left-width: 0 !important;
        padding-right: 1rem !important;
        padding-left: 0 !important;
        text-align: right !important;
      }

      /* Elements detected as LTR (e.g. English replies) */
      [data-cf-dir="ltr"],
      p[data-cf-dir="ltr"],
      li[data-cf-dir="ltr"] {
        direction: ltr !important;
        text-align: left !important;
      }
      ` : ''}

      /* Smooth transition when changing font size/line height */
      .prose {
        text-rendering: optimizeLegibility;
        -webkit-font-smoothing: antialiased;
      }
    `;
  }

  function applyStyles() {
    let styleEl = document.getElementById(STYLE_ID);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(styleEl);
    }
    styleEl.textContent = generateCss(currentSettings);
  }

  // --------------------------------------------------------------------------
  // Smart RTL and Input Detection
  // --------------------------------------------------------------------------
  function checkTextDirection(text) {
    if (!text) return null;
    const trimmed = text.trim();
    if (!trimmed) return null;

    // Check first 150 characters to detect primary language
    const sample = trimmed.slice(0, 150);
    return PERSIAN_ARABIC_REGEX.test(sample) ? 'rtl' : 'ltr';
  }

  function processElementDirection(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return;

    // Do not touch code blocks
    if (el.closest('pre, code, .font-mono, [class*="code-"], .katex')) return;

    // If it's a paragraph or list item in message body
    if (el.matches && el.matches('p, li, blockquote, h1, h2, h3, h4, h5, h6')) {
      const text = el.textContent;
      const dir = checkTextDirection(text);
      if (dir && el.getAttribute('data-cf-dir') !== dir) {
        el.setAttribute('data-cf-dir', dir);
      }
    }
  }

  function processContainer(container) {
    if (!container || !container.querySelectorAll) return;

    const elements = container.querySelectorAll(
      '.prose p, .prose li, .prose blockquote, .prose h1, .prose h2, .prose h3, div[data-message-author-slug] p'
    );
    for (let i = 0; i < elements.length; i++) {
      processElementDirection(elements[i]);
    }
  }

  // Handle user input field RTL on typing
  function handleInputDirection(inputEl) {
    if (!inputEl || !currentSettings.forceInputRtl) return;

    const text = inputEl.textContent || inputEl.value || '';
    const dir = checkTextDirection(text);

    if (dir === 'rtl') {
      inputEl.setAttribute('dir', 'rtl');
      inputEl.style.direction = 'rtl';
      inputEl.style.textAlign = 'right';
    } else if (dir === 'ltr') {
      inputEl.setAttribute('dir', 'ltr');
      inputEl.style.direction = 'ltr';
      inputEl.style.textAlign = 'left';
    } else {
      // Empty or no letters yet: default to auto
      inputEl.setAttribute('dir', 'auto');
    }
  }

  function attachInputListeners() {
    const inputs = document.querySelectorAll('div[contenteditable="true"], textarea, .ProseMirror');
    inputs.forEach(input => {
      if (input.dataset.cfAttached) return;
      input.dataset.cfAttached = 'true';

      input.addEventListener('input', () => handleInputDirection(input), { passive: true });
      input.addEventListener('keyup', () => handleInputDirection(input), { passive: true });
      // Initial check
      handleInputDirection(input);
    });
  }

  // Batched DOM observer using requestAnimationFrame
  function setupMutationObserver() {
    if (observer) {
      observer.disconnect();
    }

    let pendingNodes = [];
    let isScheduled = false;

    function flushBatch() {
      isScheduled = false;
      const batch = pendingNodes;
      pendingNodes = [];

      for (let i = 0; i < batch.length; i++) {
        const node = batch[i];
        if (node.nodeType === Node.ELEMENT_NODE) {
          processContainer(node);
          processElementDirection(node);
        }
      }

      attachInputListeners();
    }

    observer = new MutationObserver(mutations => {
      if (!currentSettings.enabled || !currentSettings.autoRtl) return;

      for (let i = 0; i < mutations.length; i++) {
        const mutation = mutations[i];
        if (mutation.type === 'childList') {
          for (let j = 0; j < mutation.addedNodes.length; j++) {
            pendingNodes.push(mutation.addedNodes[j]);
          }
        }
      }

      if (!isScheduled && pendingNodes.length > 0) {
        isScheduled = true;
        requestAnimationFrame(flushBatch);
      }
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });

    isObserverActive = true;
  }

  // --------------------------------------------------------------------------
  // Initialization & Live Updates
  // --------------------------------------------------------------------------
  async function init() {
    await loadSettings();
    await ensureFontLoaded(currentSettings.fontFamily);
    applyStyles();

    const onDomReady = () => {
      applyStyles();
      processContainer(document.body);
      attachInputListeners();
      setupMutationObserver();
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onDomReady, { once: true });
    } else {
      onDomReady();
    }
  }

  // Listen for storage changes from popup in real-time
  const storageArea = chrome.storage.sync || chrome.storage.local;
  storageArea.onChanged.addListener(async (changes, area) => {
    if (changes.claudeFarsiSettings) {
      currentSettings = { ...DEFAULT_SETTINGS, ...changes.claudeFarsiSettings.newValue };
      await ensureFontLoaded(currentSettings.fontFamily);
      applyStyles();
      if (document.body) {
        processContainer(document.body);
        attachInputListeners();
      }
    }
  });

  // Start initialization immediately
  init();
})();
