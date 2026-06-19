import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Intercept all fetch requests to automatically bypass tunnel warning/reminder pages
const originalFetch = window.fetch;
window.fetch = function (input, init) {
  let url = '';
  if (typeof input === 'string') {
    url = input;
  } else if (input instanceof URL) {
    url = input.toString();
  } else if (input && typeof input === 'object' && 'url' in input) {
    url = (input as any).url;
  }

  if (url && (url.includes('loca.lt') || url.includes('ngrok') || url.includes('pinggy'))) {
    init = init || {};
    // Clone or initialize headers
    let headers: any = init.headers || {};
    
    if (headers instanceof Headers) {
      headers.set('bypass-tunnel-reminder', 'true');
      headers.set('Bypass-Tunnel-Reminder', 'true');
      headers.set('ngrok-skip-browser-warning', 'true');
    } else if (Array.isArray(headers)) {
      headers.push(['bypass-tunnel-reminder', 'true']);
      headers.push(['Bypass-Tunnel-Reminder', 'true']);
      headers.push(['ngrok-skip-browser-warning', 'true']);
    } else {
      // Create new object to prevent modifying read-only headers
      headers = {
        ...headers,
        'bypass-tunnel-reminder': 'true',
        'Bypass-Tunnel-Reminder': 'true',
        'ngrok-skip-browser-warning': 'true'
      };
    }
    init.headers = headers;
  }
  return originalFetch(input, init);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
