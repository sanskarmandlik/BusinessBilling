/**
 * Centralized error message handler.
 * Converts raw fetch/server errors into clear, user-facing messages.
 */

/**
 * Auto-formats a raw server URL typed by the user.
 * Adds http:// prefix and :5000 port if missing.
 * Examples:
 *   "192.168.1.7"           → "http://192.168.1.7:5000"
 *   "192.168.1.7:5000"      → "http://192.168.1.7:5000"
 *   "http://192.168.1.7"    → "http://192.168.1.7:5000"
 *   "https://myserver.com"  → "https://myserver.com" (keeps as-is, cloud URL)
 */
export const formatServerUrl = (raw: string): string => {
  let url = raw.trim().replace(/\/+$/, ''); // remove trailing slashes
  if (!url) return '';

  // Add protocol if missing
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'http://' + url;
  }

  // Fix malformed protocol like "http:/" or "http:\"
  url = url.replace(/^(https?):-?\\?\/?\\?\/?/, '$1://');

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    
    // We only append port 5000 if:
    // 1. The hostname is an IP address (e.g. 192.168.1.7)
    // 2. The hostname is 'localhost' or '127.0.0.1'
    // And it doesn't already have a port.
    const isIpAddress = /^[0-9.]+$/.test(hostname);
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    
    if (isIpAddress || isLocalhost) {
      if (!parsed.port) {
        url = url + ':5000';
      } else if (parsed.port === '5173') {
        url = url.replace(':5173', ':5000');
      }
    }
  } catch {
    // If URL parsing fails, only append port if it looks like an IP or localhost
    if (!url.match(/:\d+$/)) {
      const hostnamePart = url.replace(/^https?:\/\//, '').split('/')[0];
      const isIpOrLocal = /^[0-9.]+$/.test(hostnamePart) || hostnamePart.includes('localhost');
      if (isIpOrLocal) {
        url = url + ':5000';
      }
    }
  }

  return url;
};

/**
 * Validates whether a URL looks usable before making a fetch call.
 * Returns an error message string if invalid, or null if valid.
 */
export const validateServerUrl = (url: string): string | null => {
  if (!url || url.trim() === '') {
    return '⚠️ No server URL configured. Tap "Configure Server IP" and enter your server address.';
  }
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return `⚠️ Invalid server URL: "${url}". It must start with http:// or https://`;
    }
    return null;
  } catch {
    return `⚠️ Invalid server URL: "${url}". Example: http://192.168.1.7:5000`;
  }
};

// Detect if the error is a network failure (server is completely unreachable)
export const isNetworkError = (err: any): boolean => {
  if (!err) return false;
  const msg = err.message?.toLowerCase() || '';
  return (
    err instanceof TypeError ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('net::err') ||
    msg.includes('connection refused') ||
    msg.includes('unable to connect') ||
    msg.includes('load failed') ||
    msg.includes('unreadable response') // our own message for bad JSON
  );
};

/**
 * Returns a specific, actionable error message for Auth (Login / Signup) failures.
 */
export const getAuthErrorMessage = (err: any, action: 'login' | 'signup', serverUrl?: string): string => {
  // Check for malformed/missing URL first
  if (serverUrl) {
    const urlError = validateServerUrl(serverUrl);
    if (urlError) return urlError;
  }

  if (isNetworkError(err)) {
    return `🔴 Cannot reach the server at: ${serverUrl || 'unknown URL'}\n\nPlease check:\n• Your laptop/server is ON and running\n• The IP address is correct (check with ipconfig)\n• Port 5000 is included (e.g. http://192.168.1.7:5000)\n• Your phone & laptop are on the same Wi-Fi`;
  }

  const raw = (err?.message || '').toLowerCase();

  // Server-side specific messages
  if (raw.includes('invalid email or password') || raw.includes('incorrect')) {
    return '❌ Incorrect email or password. Please try again.';
  }
  if (raw.includes('email is already registered') || raw.includes('already exists')) {
    return '⚠️ This email is already registered. Try logging in instead.';
  }
  if (raw.includes('email') && raw.includes('required')) {
    return '⚠️ Please enter a valid email address.';
  }
  if (raw.includes('password') && (raw.includes('required') || raw.includes('short'))) {
    return '⚠️ Password must be at least 6 characters.';
  }
  if (raw.includes('name') && raw.includes('required')) {
    return '⚠️ Full name is required to create your account.';
  }
  if (raw.includes('internal server error') || raw.includes('500')) {
    return '🔴 Server error. Something went wrong on the server side. Please try again in a moment.';
  }
  if (raw.includes('timeout') || raw.includes('timed out') || raw.includes('abort')) {
    return '⏱️ Request timed out. The server is taking too long to respond. Check your connection.';
  }
  if (raw.includes('unauthorized') || raw.includes('401')) {
    return '🔒 Session expired. Please log in again.';
  }
  if (raw.includes('forbidden') || raw.includes('403')) {
    return '🚫 Access denied. Your account may not have the required permissions.';
  }

  // Fallback with the raw message if it exists and is short enough
  if (err?.message && err.message.length < 200) {
    return err.message;
  }

  return action === 'login'
    ? '❌ Login failed. Please check your credentials and try again.'
    : '❌ Registration failed. Please check your details and try again.';
};

/**
 * Returns a specific error message for general API calls (dashboard, products, etc.)
 */
export const getApiErrorMessage = (err: any, context: string = 'operation'): string => {
  if (isNetworkError(err)) {
    return `🔴 Server unreachable. Cannot load ${context}. Please check your connection.`;
  }
  const raw = (err?.message || '').toLowerCase();
  if (raw.includes('401') || raw.includes('unauthorized')) {
    return '🔒 Your session has expired. Please log in again.';
  }
  if (raw.includes('403') || raw.includes('forbidden')) {
    return '🚫 You do not have permission to perform this action.';
  }
  if (raw.includes('500') || raw.includes('internal server error')) {
    return '🔴 Server error. Please try again in a moment.';
  }
  if (err?.message && err.message.length < 200) {
    return err.message;
  }
  return `❌ Failed to load ${context}. Please try again.`;
};
