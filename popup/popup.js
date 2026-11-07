/**
 * Claude Farsi Fonts & RTL Extension - Popup Script
 * Compatible with Google Chrome and Microsoft Edge (Manifest V3)
 */

(function () {
  'use strict';

  const DEFAULT_SETTINGS = {
    enabled: true,
    fontFamily: 'Vazirmatn',
    customFontName: '',
    fontSize: 16,
    lineHeight: 1.8,
    fontWeight: '400',
    autoRtl: true,
    forceInputRtl: true,
    applyToUI: true,
    persianDigits: false,
    uiLang: 'fa'
  };

  const I18N = {
    fa: {
      title: 'فونت و راست‌چین کلود',
      subtitle: 'تایپوگرافی فارسی در Claude.ai',
      fontLabel: 'انتخاب قلم (Font):',
      fontVazir: 'وزیرمتن (Vazirmatn) - پیش‌فرض',
      fontEstedad: 'استعداد (Estedad) - مدرن و چشم‌نواز',
      fontShabnam: 'شبنم (Shabnam) - نرم و دلنشین',
      fontSahel: 'ساحل (Sahel) - ساده و خوانا',
      fontCustom: 'فونت سفارشی دیگر (Custom Font)...',
      fontDefault: 'پیش‌فرض سایت کلود (Default)',
      customLabel: 'نام فونت سیستم:',
      customPlaceholder: 'مثال: IRANSans, Dana, Shabnam',
      sizeLabel: 'اندازه متن:',
      heightLabel: 'فاصله بین خطوط (Line-height):',
      weightLabel: 'ضخامت متن:',
      weight300: 'نازک',
      weight400: 'عادی',
      weight500: 'متوسط',
      weight600: 'نیمه‌ضخیم',
      weight700: 'ضخیم',
      autoRtl: 'تشخیص هوشمند راست‌چین (Smart RTL)',
      inputRtl: 'راست‌چین خودکار کادر ورودی پیام',
      applyUi: 'اعمال فونت به کل ظاهر صفحه (سایدبار و منوها)',
      persianDigits: 'نمایش ارقام به صورت فارسی (۰۱۲۳۴۵۶۷۸۹)',
      previewLabel: 'پیش‌نمایش زنده:',
      previewFarsi: 'هوش مصنوعی کلود با فونت زیبای فارسی و نگارش راست‌چین.',
      previewLatin: 'Claude AI with crisp and modern Persian typography.',
      resetBtn: 'بازنشانی به حالت اولیه',
      footerTag: 'نسخه ۱.۰.۰ | سازگار با کروم و اج',
      langBtn: 'EN'
    },
    en: {
      title: 'Claude Farsi Fonts & RTL',
      subtitle: 'Persian Typography for Claude.ai',
      fontLabel: 'Select Font:',
      fontVazir: 'Vazirmatn (Default & Popular)',
      fontEstedad: 'Estedad (Modern & Aesthetic)',
      fontShabnam: 'Shabnam (Soft & Pleasant)',
      fontSahel: 'Sahel (Clean & Readable)',
      fontCustom: 'Custom Installed Font...',
      fontDefault: 'Claude Default Font',
      customLabel: 'System Font Name:',
      customPlaceholder: 'e.g. IRANSans, Dana, Shabnam',
      sizeLabel: 'Font Size:',
      heightLabel: 'Line Height:',
      weightLabel: 'Font Weight:',
      weight300: 'Light',
      weight400: 'Regular',
      weight500: 'Medium',
      weight600: 'SemiBold',
      weight700: 'Bold',
      autoRtl: 'Smart Auto RTL Detection',
      inputRtl: 'Auto RTL in Prompt Input Field',
      applyUi: 'Apply Font to Full UI (Sidebar & Menus)',
      persianDigits: 'Display Persian Digits (۰۱۲۳۴۵۶۷۸۹)',
      previewLabel: 'Live Preview:',
      previewFarsi: 'هوش مصنوعی کلود با فونت زیبای فارسی و نگارش راست‌چین.',
      previewLatin: 'Claude AI with crisp and modern Persian typography.',
      resetBtn: 'Reset to Defaults',
      footerTag: 'v1.0.0 | Chrome & Edge Compatible',
      langBtn: 'FA'
    }
  };

  let settings = { ...DEFAULT_SETTINGS };

  // DOM Elements
  const toggleEnabled = document.getElementById('toggle-enabled');
  const mainControls = document.getElementById('main-controls');
  const btnLangToggle = document.getElementById('btn-lang-toggle');

  const selectFont = document.getElementById('select-font');
  const customFontContainer = document.getElementById('custom-font-container');
  const inputCustomFont = document.getElementById('input-custom-font');

  const rangeSize = document.getElementById('range-size');
  const valSize = document.getElementById('val-size');
  const rangeHeight = document.getElementById('range-height');
  const valHeight = document.getElementById('val-height');

  const pillBtns = document.querySelectorAll('.pill-btn');

  const checkAutoRtl = document.getElementById('check-auto-rtl');
  const checkInputRtl = document.getElementById('check-input-rtl');
  const checkApplyUi = document.getElementById('check-apply-ui');
  const checkPersianDigits = document.getElementById('check-persian-digits');

  const previewBox = document.getElementById('preview-box');
  const previewFarsi = previewBox.querySelector('.preview-farsi');
  const previewLatin = previewBox.querySelector('.preview-latin');

  const btnReset = document.getElementById('btn-reset');

  // --------------------------------------------------------------------------
  // Storage Helpers with Sync/Local Fallback
  // --------------------------------------------------------------------------
  async function loadSettings() {
    try {
      if (chrome.storage?.sync) {
        const data = await chrome.storage.sync.get('claudeFarsiSettings');
        if (data?.claudeFarsiSettings) {
          settings = { ...DEFAULT_SETTINGS, ...data.claudeFarsiSettings };
          return;
        }
      }
    } catch (e) {
      console.debug('sync storage unavailable, trying local:', e);
    }

    try {
      if (chrome.storage?.local) {
        const data = await chrome.storage.local.get('claudeFarsiSettings');
        if (data?.claudeFarsiSettings) {
          settings = { ...DEFAULT_SETTINGS, ...data.claudeFarsiSettings };
          return;
        }
      }
    } catch (e) {
      console.warn('Could not read settings from storage:', e);
    }
  }

  async function saveSettings() {
    try {
      if (chrome.storage?.sync) {
        await chrome.storage.sync.set({ claudeFarsiSettings: settings });
        updatePreview();
        return;
      }
    } catch (e) {
      console.warn('sync storage set failed, trying local:', e);
    }

    try {
      if (chrome.storage?.local) {
        await chrome.storage.local.set({ claudeFarsiSettings: settings });
      }
    } catch (e) {
      console.error('Could not save settings:', e);
    }
    updatePreview();
  }

  // Debounced save to protect against storage write quotas during slider drags
  let saveTimer = null;
  function debouncedSave() {
    updatePreview();
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveSettings();
    }, 200);
  }

  function flushPendingSave() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
      saveSettings();
    }
  }

  function updateUiFromSettings() {
    toggleEnabled.checked = settings.enabled;
    mainControls.classList.toggle('disabled', !settings.enabled);

    applyLanguage(settings.uiLang || 'fa');

    selectFont.value = settings.fontFamily;
    if (settings.fontFamily === 'custom') {
      customFontContainer.classList.remove('hidden');
    } else {
      customFontContainer.classList.add('hidden');
    }
    inputCustomFont.value = settings.customFontName || '';

    rangeSize.value = settings.fontSize;
    valSize.textContent = `${settings.fontSize}px`;

    rangeHeight.value = settings.lineHeight;
    valHeight.textContent = settings.lineHeight;

    pillBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.weight === String(settings.fontWeight));
    });

    checkAutoRtl.checked = settings.autoRtl;
    checkInputRtl.checked = settings.forceInputRtl;
    checkApplyUi.checked = settings.applyToUI;
    checkPersianDigits.checked = settings.persianDigits;

    updatePreview();
  }

  function applyLanguage(lang) {
    settings.uiLang = lang;
    const t = I18N[lang] || I18N.fa;

    document.documentElement.lang = lang;
    document.body.dir = lang === 'fa' ? 'rtl' : 'ltr';
    document.body.classList.toggle('ltr', lang === 'en');

    document.getElementById('txt-title').textContent = t.title;
    document.querySelector('.subtitle').textContent = t.subtitle;
    document.getElementById('lbl-font').textContent = t.fontLabel;

    // Font options
    selectFont.options[0].textContent = t.fontVazir;
    selectFont.options[1].textContent = t.fontEstedad;
    selectFont.options[2].textContent = t.fontShabnam;
    selectFont.options[3].textContent = t.fontSahel;
    selectFont.options[4].textContent = t.fontCustom;
    selectFont.options[5].textContent = t.fontDefault;

    document.getElementById('lbl-custom-font').textContent = t.customLabel;
    inputCustomFont.placeholder = t.customPlaceholder;

    document.getElementById('lbl-size').textContent = t.sizeLabel;
    document.getElementById('lbl-height').textContent = t.heightLabel;
    document.getElementById('lbl-weight').textContent = t.weightLabel;

    pillBtns[0].textContent = t.weight300;
    pillBtns[1].textContent = t.weight400;
    pillBtns[2].textContent = t.weight500;
    pillBtns[3].textContent = t.weight600;
    pillBtns[4].textContent = t.weight700;

    document.getElementById('txt-auto-rtl').textContent = t.autoRtl;
    document.getElementById('txt-input-rtl').textContent = t.inputRtl;
    document.getElementById('txt-apply-ui').textContent = t.applyUi;
    document.getElementById('txt-persian-digits').textContent = t.persianDigits;

    document.getElementById('lbl-preview').textContent = t.previewLabel;
    previewFarsi.textContent = t.previewFarsi;
    previewLatin.textContent = t.previewLatin;

    btnReset.textContent = t.resetBtn;
    document.querySelector('.footer-tag').textContent = t.footerTag;
    btnLangToggle.textContent = t.langBtn;
  }

  function updatePreview() {
    let fontName = settings.fontFamily;
    const custom = (settings.customFontName || '').trim();
    if (fontName === 'custom' && custom) {
      fontName = `'${custom}', 'Vazirmatn', sans-serif`;
    } else if (fontName === 'default') {
      fontName = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    } else {
      fontName = `'${fontName}', sans-serif`;
    }

    previewBox.style.fontFamily = fontName;
    previewBox.style.fontSize = `${settings.fontSize}px`;
    previewBox.style.lineHeight = settings.lineHeight;
    previewBox.style.fontWeight = settings.fontWeight;

    if (settings.persianDigits) {
      previewBox.style.fontFeatureSettings = '"ss01" on, "cv01" on';
    } else {
      previewBox.style.fontFeatureSettings = 'normal';
    }
  }

  // --------------------------------------------------------------------------
  // Event Bindings
  // --------------------------------------------------------------------------
  function setupEvents() {
    toggleEnabled.addEventListener('change', async () => {
      settings.enabled = toggleEnabled.checked;
      mainControls.classList.toggle('disabled', !settings.enabled);
      await saveSettings();
    });

    btnLangToggle.addEventListener('click', async () => {
      const nextLang = settings.uiLang === 'fa' ? 'en' : 'fa';
      applyLanguage(nextLang);
      selectFont.value = settings.fontFamily;
      await saveSettings();
    });

    selectFont.addEventListener('change', async () => {
      settings.fontFamily = selectFont.value;
      if (settings.fontFamily === 'custom') {
        customFontContainer.classList.remove('hidden');
        inputCustomFont.focus();
      } else {
        customFontContainer.classList.add('hidden');
      }
      await saveSettings();
    });

    inputCustomFont.addEventListener('input', () => {
      settings.customFontName = inputCustomFont.value;
      debouncedSave();
    });

    rangeSize.addEventListener('input', () => {
      settings.fontSize = Number(rangeSize.value);
      valSize.textContent = `${settings.fontSize}px`;
      debouncedSave();
    });
    rangeSize.addEventListener('change', flushPendingSave);

    rangeHeight.addEventListener('input', () => {
      settings.lineHeight = Number(rangeHeight.value);
      valHeight.textContent = settings.lineHeight;
      debouncedSave();
    });
    rangeHeight.addEventListener('change', flushPendingSave);

    pillBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        pillBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        settings.fontWeight = btn.dataset.weight;
        await saveSettings();
      });
    });

    checkAutoRtl.addEventListener('change', async () => {
      settings.autoRtl = checkAutoRtl.checked;
      await saveSettings();
    });

    checkInputRtl.addEventListener('change', async () => {
      settings.forceInputRtl = checkInputRtl.checked;
      await saveSettings();
    });

    checkApplyUi.addEventListener('change', async () => {
      settings.applyToUI = checkApplyUi.checked;
      await saveSettings();
    });

    checkPersianDigits.addEventListener('change', async () => {
      settings.persianDigits = checkPersianDigits.checked;
      await saveSettings();
    });

    btnReset.addEventListener('click', async () => {
      settings = { ...DEFAULT_SETTINGS, uiLang: settings.uiLang };
      updateUiFromSettings();
      await saveSettings();
    });
  }

  // Init
  async function init() {
    await loadSettings();
    updateUiFromSettings();
    setupEvents();
  }

  init();
})();
