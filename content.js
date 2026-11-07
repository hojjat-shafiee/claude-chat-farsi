/**
 * Claude Farsi Fonts & RTL Extension - Content Script
 * Compatible with Google Chrome and Microsoft Edge (Manifest V3)
 */

(function () {
  'use strict';

  const STYLE_ID = 'claude-farsi-font-styles';
  const PERSIAN_ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const STRONG_DIR_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]|[A-Za-z\u00C0-\u024F]/;
  const TARGET_SELECTOR = 'p, li, blockquote, h1, h2, h3, h4, h5, h6, th, td, .whitespace-pre-wrap, .font-user-message, [data-testid*="user-message"]';

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
    persianDigits: false,    // Persian numerals
    uiLang: 'fa'
  };

  let currentSettings = { ...DEFAULT_SETTINGS };
  let isObserverActive = false;
  let observer = null;

  // --------------------------------------------------------------------------
  // Storage helpers (with fallback)
  // --------------------------------------------------------------------------
  async function loadSettings() {
    try {
      if (chrome.storage?.sync) {
        const data = await chrome.storage.sync.get('claudeFarsiSettings');
        if (data?.claudeFarsiSettings) {
          currentSettings = { ...DEFAULT_SETTINGS, ...data.claudeFarsiSettings };
          return;
        }
      }
    } catch (e) {
      console.debug('[Claude Farsi] sync storage unavailable, trying local:', e);
    }

    try {
      if (chrome.storage?.local) {
        const data = await chrome.storage.local.get('claudeFarsiSettings');
        if (data?.claudeFarsiSettings) {
          currentSettings = { ...DEFAULT_SETTINGS, ...data.claudeFarsiSettings };
          return;
        }
      }
    } catch (e) {
      console.warn('[Claude Farsi] Failed to load settings from storage:', e);
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

        const fontBold = new FontFace('Shabnam', `url(${chrome.runtime.getURL('fonts/Shabnam-Bold.woff2')})`, {
          weight: '700',
          style: 'normal'
        });
        const loadedBold = await fontBold.load();
        document.fonts.add(loadedBold);
      } else if (fontFamily === 'Sahel') {
        const font = new FontFace('Sahel', `url(${chrome.runtime.getURL('fonts/Sahel.woff2')})`, {
          weight: '400',
          style: 'normal'
        });
        const loaded = await font.load();
        document.fonts.add(loaded);

        const fontBold = new FontFace('Sahel', `url(${chrome.runtime.getURL('fonts/Sahel-Bold.woff2')})`, {
          weight: '700',
          style: 'normal'
        });
        const loadedBold = await fontBold.load();
        document.fonts.add(loadedBold);
      }
    } catch (err) {
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

      /* Apply font to chat messages, markdown containers & streaming elements */
      .font-claude-message,
      .font-claude-message *,
      .font-user-message,
      .font-user-message *,
      div[data-message-author-slug],
      div[data-message-author-slug] *,
      div[data-testid*="user-message"],
      div[data-testid*="user-message"] *,
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

      /* Chat message text size & line height (including user messages) */
      .prose p,
      .prose li,
      .prose blockquote,
      .font-claude-message,
      .font-claude-message p,
      .font-user-message,
      .font-user-message p,
      .font-user-message .whitespace-pre-wrap,
      div[data-message-author-slug],
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

      div[contenteditable="true"][dir="rtl"],
      div[contenteditable="true"][dir="rtl"] p,
      .ProseMirror[dir="rtl"],
      .ProseMirror[dir="rtl"] p,
      textarea[dir="rtl"] {
        direction: rtl !important;
        text-align: right !important;
      }

      div[contenteditable="true"][dir="ltr"],
      div[contenteditable="true"][dir="ltr"] p,
      .ProseMirror[dir="ltr"],
      .ProseMirror[dir="ltr"] p,
      textarea[dir="ltr"] {
        direction: ltr !important;
        text-align: left !important;
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
      .font-copernicus,
      .font-styrene {
        font-family: var(--claude-farsi-font) !important;
      }
      ` : ''}

      /* CRITICAL: Protect Code Blocks & Monospace Elements */
      pre,
      pre *,
      code,
      code *,
      kbd,
      kbd *,
      samp,
      samp *,
      .font-mono,
      .font-mono *,
      [class*="font-mono"],
      [class*="font-mono"] *,
      [class*="code-"],
      [class*="code-"] *,
      [class*="syntax-"],
      [class*="syntax-"] *,
      .hljs,
      .hljs *,
      .prism,
      .prism *,
      div[data-testid*="code"],
      div[data-testid*="code"] * {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
        direction: ltr !important;
        text-align: left !important;
        unicode-bidi: isolate !important;
        font-feature-settings: normal !important;
      }

      /* KaTeX Math formulas must keep math fonts and direction LTR */
      .katex,
      .katex * {
        direction: ltr !important;
        text-align: left !important;
        unicode-bidi: isolate !important;
        font-feature-settings: normal !important;
      }

      /* --- Smart RTL Rules --- */
      ${settings.autoRtl ? `
      /* Auto RTL elements */
      [data-cf-dir="rtl"],
      .prose[data-cf-dir="rtl"],
      p[data-cf-dir="rtl"],
      li[data-cf-dir="rtl"],
      div[data-cf-dir="rtl"],
      .whitespace-pre-wrap[data-cf-dir="rtl"],
      .font-user-message[data-cf-dir="rtl"],
      div[data-testid*="user-message"][data-cf-dir="rtl"],
      h1[data-cf-dir="rtl"],
      h2[data-cf-dir="rtl"],
      h3[data-cf-dir="rtl"],
      h4[data-cf-dir="rtl"],
      h5[data-cf-dir="rtl"],
      h6[data-cf-dir="rtl"] {
        direction: rtl !important;
        text-align: right !important;
        unicode-bidi: embed !important;
      }

      /* RTL lists properly indented on the right */
      ul[data-cf-dir="rtl"],
      ol[data-cf-dir="rtl"] {
        direction: rtl !important;
        padding-right: 1.75rem !important;
        padding-left: 0 !important;
        text-align: right !important;
        list-style-position: outside !important;
      }

      ul[data-cf-dir="rtl"] li,
      ol[data-cf-dir="rtl"] li {
        direction: rtl !important;
        text-align: right !important;
      }

      ul[data-cf-dir="rtl"] li::marker,
      ol[data-cf-dir="rtl"] li::marker {
        font-family: var(--claude-farsi-font) !important;
        font-feature-settings: var(--claude-farsi-digits);
      }

      blockquote[data-cf-dir="rtl"] {
        direction: rtl !important;
        border-right: 4px solid currentColor !important;
        border-left: 0 !important;
        padding-right: 1rem !important;
        padding-left: 0 !important;
        text-align: right !important;
      }

      /* RTL tables */
      table[data-cf-dir="rtl"] {
        direction: rtl !important;
        text-align: right !important;
      }

      table[data-cf-dir="rtl"] th,
      table[data-cf-dir="rtl"] td {
        text-align: right !important;
      }

      /* Elements detected as LTR (e.g. English replies) */
      [data-cf-dir="ltr"],
      p[data-cf-dir="ltr"],
      li[data-cf-dir="ltr"],
      div[data-cf-dir="ltr"],
      .whitespace-pre-wrap[data-cf-dir="ltr"],
      .font-user-message[data-cf-dir="ltr"],
      div[data-testid*="user-message"][data-cf-dir="ltr"] {
        direction: ltr !important;
        text-align: left !important;
      }

      ul[data-cf-dir="ltr"],
      ol[data-cf-dir="ltr"] {
        direction: ltr !important;
        padding-left: 1.75rem !important;
        padding-right: 0 !important;
        text-align: left !important;
      }
      ` : ''}

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
      const target = document.head || document.documentElement;
      if (target) {
        target.appendChild(styleEl);
      }
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

    // Find the first strong directional character
    const match = trimmed.match(STRONG_DIR_REGEX);
    if (!match) return null;

    const firstChar = match[0];
    if (PERSIAN_ARABIC_REGEX.test(firstChar)) {
      return 'rtl';
    }

    // If starts with Latin character, check if text has significant Persian content
    // Handles mixed sentences like "Claude یک مدل هوش مصنوعی است" or "React چیست؟"
    const sample = trimmed.slice(0, 300);
    const rtlChars = (sample.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
    const ltrChars = (sample.match(/[A-Za-z\u00C0-\u024F]/g) || []).length;

    if (rtlChars === 0) return 'ltr';

    if (rtlChars >= ltrChars || (rtlChars / (rtlChars + ltrChars)) >= 0.3) {
      return 'rtl';
    }

    return 'ltr';
  }

  function processElementDirection(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return;

    // Do not touch code blocks, syntax highlight, math
    if (el.closest('pre, code, .font-mono, [class*="font-mono"], [class*="code-"], [class*="syntax-"], .hljs, .prism, .katex')) {
      return;
    }

    // Target elements matching TARGET_SELECTOR
    if (el.matches && el.matches(TARGET_SELECTOR)) {
      const text = el.textContent;
      const dir = checkTextDirection(text);
      if (dir && el.getAttribute('data-cf-dir') !== dir) {
        el.setAttribute('data-cf-dir', dir);
      }

      // If this is an li, make sure parent ol/ul also receives the direction
      if (el.tagName === 'LI' && dir) {
        const listParent = el.closest('ul, ol');
        if (listParent && (!listParent.getAttribute('data-cf-dir') || dir === 'rtl')) {
          listParent.setAttribute('data-cf-dir', dir);
        }
      }

      // If this is a paragraph inside a blockquote
      if (el.tagName === 'P' && el.parentElement?.tagName === 'BLOCKQUOTE' && dir) {
        el.parentElement.setAttribute('data-cf-dir', dir);
      }

      // If this is a table cell in RTL, set direction on table
      if ((el.tagName === 'TH' || el.tagName === 'TD') && dir === 'rtl') {
        const table = el.closest('table');
        if (table && table.getAttribute('data-cf-dir') !== 'rtl') {
          table.setAttribute('data-cf-dir', 'rtl');
        }
      }
    }
  }

  function processContainer(container) {
    if (!container) return;

    if (container.nodeType === Node.ELEMENT_NODE) {
      processElementDirection(container);
    }

    if (container.querySelectorAll) {
      const elements = container.querySelectorAll(TARGET_SELECTOR);
      for (let i = 0; i < elements.length; i++) {
        processElementDirection(elements[i]);
      }
    }
  }

  // Handle user input field RTL on typing
  function handleInputDirection(inputEl) {
    if (!inputEl || !currentSettings.enabled || !currentSettings.forceInputRtl) return;

    const text = inputEl.textContent || inputEl.value || '';
    const dir = checkTextDirection(text);

    if (dir === 'rtl') {
      inputEl.setAttribute('dir', 'rtl');
      inputEl.style.direction = 'rtl';
      inputEl.style.textAlign = 'right';
      const childPs = inputEl.querySelectorAll('p');
      for (let i = 0; i < childPs.length; i++) {
        childPs[i].style.direction = 'rtl';
        childPs[i].style.textAlign = 'right';
      }
    } else if (dir === 'ltr') {
      inputEl.setAttribute('dir', 'ltr');
      inputEl.style.direction = 'ltr';
      inputEl.style.textAlign = 'left';
      const childPs = inputEl.querySelectorAll('p');
      for (let i = 0; i < childPs.length; i++) {
        childPs[i].style.direction = 'ltr';
        childPs[i].style.textAlign = 'left';
      }
    } else {
      inputEl.setAttribute('dir', 'auto');
      inputEl.style.direction = '';
      inputEl.style.textAlign = '';
      const childPs = inputEl.querySelectorAll('p');
      for (let i = 0; i < childPs.length; i++) {
        childPs[i].style.direction = '';
        childPs[i].style.textAlign = '';
      }
    }
  }

  function resetInputs() {
    const inputs = document.querySelectorAll('div[contenteditable="true"], textarea, .ProseMirror');
    inputs.forEach(input => {
      input.removeAttribute('dir');
      input.style.direction = '';
      input.style.textAlign = '';
      const childPs = input.querySelectorAll('p');
      childPs.forEach(p => {
        p.style.direction = '';
        p.style.textAlign = '';
      });
    });
  }

  function attachInputListeners() {
    const inputs = document.querySelectorAll('div[contenteditable="true"], textarea, .ProseMirror');
    inputs.forEach(input => {
      if (input.dataset.cfAttached) return;
      input.dataset.cfAttached = 'true';

      const onInput = () => handleInputDirection(input);
      input.addEventListener('input', onInput, { passive: true });
      input.addEventListener('keyup', onInput, { passive: true });
      input.addEventListener('paste', () => setTimeout(onInput, 10), { passive: true });
      input.addEventListener('compositionend', onInput, { passive: true });

      handleInputDirection(input);
    });
  }

  // Batched DOM observer using requestAnimationFrame (watches childList AND characterData for streaming)
  function setupMutationObserver() {
    if (observer) {
      observer.disconnect();
    }

    const pendingNodes = new Set();
    let isScheduled = false;

    function flushBatch() {
      isScheduled = false;

      // Re-inject style if removed during client-side route transitions
      if (!document.getElementById(STYLE_ID)) {
        applyStyles();
      }

      const batch = Array.from(pendingNodes);
      pendingNodes.clear();

      for (let i = 0; i < batch.length; i++) {
        const node = batch[i];
        if (node && node.nodeType === Node.ELEMENT_NODE) {
          processContainer(node);
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
            const added = mutation.addedNodes[j];
            if (added.nodeType === Node.ELEMENT_NODE) {
              pendingNodes.add(added);
            }
          }
        } else if (mutation.type === 'characterData') {
          const block = mutation.target.parentElement?.closest(TARGET_SELECTOR) || mutation.target.parentElement;
          if (block && block.nodeType === Node.ELEMENT_NODE) {
            pendingNodes.add(block);
          }
        }
      }

      if (!isScheduled && pendingNodes.size > 0) {
        isScheduled = true;
        requestAnimationFrame(flushBatch);
      }
    });

    const root = document.documentElement || document.body;
    if (root) {
      observer.observe(root, {
        childList: true,
        characterData: true,
        subtree: true
      });
      isObserverActive = true;
    }
  }

  // --------------------------------------------------------------------------
  // Initialization & Live Updates
  // --------------------------------------------------------------------------
  async function init() {
    await loadSettings();
    await ensureFontLoaded(currentSettings.fontFamily);
    applyStyles();

    // Start observer early to catch stream hydration
    setupMutationObserver();

    const onDomReady = () => {
      applyStyles();
      processContainer(document.body);
      attachInputListeners();
      if (!isObserverActive) {
        setupMutationObserver();
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onDomReady, { once: true });
    } else {
      onDomReady();
    }
  }

  // Standard storage change listener
  try {
    chrome.storage.onChanged.addListener(async (changes) => {
      if (changes.claudeFarsiSettings) {
        currentSettings = { ...DEFAULT_SETTINGS, ...changes.claudeFarsiSettings.newValue };
        if (!currentSettings.enabled) {
          resetInputs();
        }
        await ensureFontLoaded(currentSettings.fontFamily);
        applyStyles();
        if (document.body) {
          processContainer(document.body);
          attachInputListeners();
        }
      }
    });
  } catch (err) {
    console.warn('[Claude Farsi] Failed to bind storage.onChanged:', err);
  }

  // Start initialization immediately
  init();
})();
