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

async function getStoredSettings() {
  try {
    if (chrome.storage?.sync) {
      const data = await chrome.storage.sync.get('claudeFarsiSettings');
      if (data?.claudeFarsiSettings) return data.claudeFarsiSettings;
    }
  } catch (err) {
    console.debug('[Claude Farsi SW] sync storage get failed, trying local:', err);
  }

  try {
    if (chrome.storage?.local) {
      const data = await chrome.storage.local.get('claudeFarsiSettings');
      if (data?.claudeFarsiSettings) return data.claudeFarsiSettings;
    }
  } catch (err) {
    console.warn('[Claude Farsi SW] local storage get failed:', err);
  }

  return null;
}

async function updateBadge() {
  try {
    const settings = await getStoredSettings();
    if (settings && settings.enabled === false) {
      await chrome.action.setBadgeText({ text: 'OFF' });
      await chrome.action.setBadgeBackgroundColor({ color: '#71717A' });
    } else {
      await chrome.action.setBadgeText({ text: '' });
    }
  } catch (err) {
    console.warn('[Claude Farsi SW] Failed to update badge:', err);
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  try {
    const storage = chrome.storage.sync || chrome.storage.local;
    const existing = await storage.get('claudeFarsiSettings');
    if (!existing || !existing.claudeFarsiSettings) {
      await storage.set({ claudeFarsiSettings: DEFAULT_SETTINGS });
    }
  } catch (err) {
    console.error('[Claude Farsi SW] Initialization error:', err);
  }
  await updateBadge();
});

chrome.runtime.onStartup.addListener(updateBadge);

// Standard cross-context storage change listener
chrome.storage.onChanged.addListener(async (changes) => {
  if (changes.claudeFarsiSettings) {
    const newSettings = changes.claudeFarsiSettings.newValue;
    if (newSettings && newSettings.enabled === false) {
      await chrome.action.setBadgeText({ text: 'OFF' });
      await chrome.action.setBadgeBackgroundColor({ color: '#71717A' });
    } else {
      await chrome.action.setBadgeText({ text: '' });
    }
  }
});

// Update badge immediately upon worker boot
updateBadge();
