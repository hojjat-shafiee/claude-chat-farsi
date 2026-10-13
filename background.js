/**
 * Claude Farsi Fonts & RTL Extension - Service Worker
 * Compatible with Google Chrome and Microsoft Edge (Manifest V3)
 */

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

chrome.runtime.onInstalled.addListener(async (details) => {
  const storage = chrome.storage.sync || chrome.storage.local;
  try {
    const existing = await storage.get('claudeFarsiSettings');
    if (!existing || !existing.claudeFarsiSettings) {
      await storage.set({ claudeFarsiSettings: DEFAULT_SETTINGS });
    }
  } catch (err) {
    console.error('[Claude Farsi SW] Initialization error:', err);
  }
});

// Update badge status when settings change
const storage = chrome.storage.sync || chrome.storage.local;
storage.onChanged.addListener((changes) => {
  if (changes.claudeFarsiSettings) {
    const newSettings = changes.claudeFarsiSettings.newValue;
    if (newSettings && newSettings.enabled === false) {
      chrome.action.setBadgeText({ text: 'OFF' });
      chrome.action.setBadgeBackgroundColor({ color: '#71717A' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  }
});
