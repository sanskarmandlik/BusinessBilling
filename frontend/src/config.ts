// Application Config: backend server connection management
// Uses @capacitor/preferences for native mobile persistence (Android SharedPreferences / iOS UserDefaults)
// Falls back to localStorage on web browser.
import { Preferences } from '@capacitor/preferences';

// The default API URL configuration from environment variables (fallback to localhost)
export const getDefaultApiBaseUrl = (): string => {
  const envUrl = ((import.meta.env.VITE_API_URL as string) || '').trim().replace(/\/+$/, '');
  return envUrl || 'http://localhost:5000';
};

// In-memory cache of the API URL (populated on app startup via initApiBaseUrl())
let _apiBaseUrl: string = localStorage.getItem('api_base_url') || getDefaultApiBaseUrl();

// Call this once on app startup to load the persisted URL from native storage.
// After this resolves, getApiBaseUrl() will return the correct value synchronously.
export const initApiBaseUrl = async (): Promise<void> => {
  try {
    const { value } = await Preferences.get({ key: 'api_base_url' });
    if (value) {
      _apiBaseUrl = value.trim().replace(/\/+$/, '');
      // Also sync to localStorage as backup
      localStorage.setItem('api_base_url', _apiBaseUrl);
    } else {
      // Check localStorage fallback (for existing users migrating from web)
      const fromLocal = localStorage.getItem('api_base_url');
      if (fromLocal) {
        _apiBaseUrl = fromLocal.trim().replace(/\/+$/, '');
        // Migrate to native preferences
        await Preferences.set({ key: 'api_base_url', value: _apiBaseUrl });
      } else {
        _apiBaseUrl = getDefaultApiBaseUrl();
      }
    }
  } catch {
    // Fallback silently to localStorage value if Preferences plugin fails (e.g. unit test env)
    const fromLocal = localStorage.getItem('api_base_url');
    if (fromLocal) {
      _apiBaseUrl = fromLocal.trim().replace(/\/+$/, '');
    } else {
      _apiBaseUrl = getDefaultApiBaseUrl();
    }
  }
};

// Synchronous getter — returns whatever is cached in memory.
// Always call initApiBaseUrl() first (in App startup).
export const getApiBaseUrl = (): string => {
  return _apiBaseUrl;
};

// Setter helper — persists to both native storage and localStorage.
export const setApiBaseUrl = async (url: string): Promise<void> => {
  const cleaned = url.trim().replace(/\/+$/, '');
  _apiBaseUrl = cleaned;
  localStorage.setItem('api_base_url', cleaned);
  try {
    await Preferences.set({ key: 'api_base_url', value: cleaned });
  } catch {
    // Silently ignore if plugin unavailable
  }
};

export const API_BASE_URL = getApiBaseUrl();

