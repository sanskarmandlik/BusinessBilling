import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader2, Wifi, WifiOff, CheckCircle } from 'lucide-react';
import { getApiBaseUrl, setApiBaseUrl, getDefaultApiBaseUrl } from '../config';
import { getAuthErrorMessage, isNetworkError, formatServerUrl, validateServerUrl } from '../utils/errorHandler';

interface LoginProps {
  onLoginSuccess: (token: string, user: any) => void;
  onNavigate: (page: string) => void;
  addAlert: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function Login({ onLoginSuccess, onNavigate, addAlert }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrl, setServerUrl] = useState(getApiBaseUrl());
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'ok' | 'fail'>('idle');

  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const handleSaveServerUrl = async () => {
    const formatted = formatServerUrl(serverUrl);
    if (!formatted) {
      addAlert('⚠️ Please enter a valid server URL (e.g. 192.168.1.7)', 'error');
      return;
    }
    setServerUrl(formatted); // show the formatted version in the input
    await setApiBaseUrl(formatted);
    addAlert(`✅ Server URL saved: ${formatted}`, 'success');
    setConnectionStatus('idle');
  };

  const handleResetServerUrl = async () => {
    const defaultUrl = getDefaultApiBaseUrl();
    setServerUrl(defaultUrl);
    await setApiBaseUrl(defaultUrl);
    addAlert(`🔄 Server URL reset to default: ${defaultUrl}`, 'info');
    setConnectionStatus('idle');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      addAlert('⚠️ Please enter your email address.', 'error');
      return;
    }
    if (!validateEmail(email.trim())) {
      addAlert('⚠️ Please enter a valid email address (e.g. name@example.com).', 'error');
      return;
    }
    if (!password) {
      addAlert('⚠️ Please enter your password.', 'error');
      return;
    }
    if (password.length < 6) {
      addAlert('⚠️ Password must be at least 6 characters.', 'error');
      return;
    }

    const currentUrl = getApiBaseUrl();

    // Validate server URL before attempting login
    const urlError = validateServerUrl(currentUrl);
    if (urlError) {
      addAlert(urlError, 'error');
      setShowServerConfig(true);
      return;
    }

    setLoading(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

      let response: Response;
      try {
        response = await fetch(`${currentUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
          signal: controller.signal,
        });
      } catch (fetchErr: any) {
        clearTimeout(timeout);
        throw fetchErr;
      }
      clearTimeout(timeout);

      let data: any = {};
      try {
        data = await response.json();
      } catch {
        // Server returned non-JSON — likely wrong IP/port hitting something unexpected
        throw new Error(`🔴 Server at "${currentUrl}" returned an invalid response. This usually means the IP or port is wrong, or the backend is not running. Please verify the Server IP in settings.`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      addAlert(`✅ Welcome back, ${data.user.name}!`, 'success');
      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      let message: string;
      // Check for our own descriptive errors first
      if (err?.message && err.message.startsWith('🔴')) {
        message = err.message;
      } else if (err?.name === 'AbortError') {
        message = `⏱️ Request timed out after 15 seconds.\n\nServer at "${currentUrl}" is not responding. Please check:\n• Is the backend server running?\n• Is the IP address correct?`;
      } else {
        message = getAuthErrorMessage(err, 'login', currentUrl);
      }
      addAlert(message, 'error');
      // Auto-open server config on network errors
      if (isNetworkError(err) || err?.name === 'AbortError' || (err?.message && err.message.startsWith('🔴'))) {
        setShowServerConfig(true);
        setConnectionStatus('fail');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    const formatted = formatServerUrl(serverUrl);
    if (!formatted) {
      addAlert('⚠️ Please enter a server URL to test (e.g. 192.168.1.7)', 'error');
      return;
    }
    // Update input to show formatted version
    setServerUrl(formatted);

    setTestingConnection(true);
    setConnectionStatus('idle');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(`${formatted}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@test.com', password: 'test' }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.status < 500) {
        setConnectionStatus('ok');
        // Save the valid URL automatically on successful test
        await setApiBaseUrl(formatted);
        addAlert(`✅ Server is reachable at ${formatted}! URL has been saved.`, 'success');
      } else {
        setConnectionStatus('fail');
        addAlert(`⚠️ Server at ${formatted} responded with error ${res.status}. It may have an issue.`, 'error');
      }
    } catch (err: any) {
      setConnectionStatus('fail');
      if (err?.name === 'AbortError') {
        addAlert(`⏱️ Connection to ${formatted} timed out after 8 seconds.\n\nCheck: Is the server running? Is the IP correct?`, 'error');
      } else {
        addAlert(`🔴 Cannot reach: ${formatted}\n\nTips:\n• Check that your laptop is on the same Wi-Fi\n• Make sure backend server is running\n• Verify IP with ipconfig on your laptop`, 'error');
      }
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">💼</div>
          <h2 className="auth-title">Sanna Billing</h2>
          <p className="auth-subtitle">Login to manage your business operations</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={18}
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              />
              <input
                id="login-email"
                type="email"
                className="form-input"
                placeholder="owner@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '44px' }}
                disabled={loading}
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label className="form-label" htmlFor="login-password" style={{ margin: 0 }}>Password</label>
              <button
                type="button"
                className="auth-link"
                onClick={() => onNavigate('forgot-password')}
                style={{ background: 'none', border: 'none', fontSize: '0.8rem', cursor: 'pointer' }}
                disabled={loading}
              >
                Forgot Password?
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <Lock
                size={18}
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '44px', paddingRight: '44px' }}
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                disabled={loading}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '1.5rem' }} disabled={loading}>
            {loading
              ? <><Loader2 className="animate-spin" size={18} />&nbsp;Logging in...</>
              : 'Login to Account'
            }
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account?{' '}
          <button
            type="button"
            className="auth-link"
            onClick={() => onNavigate('signup')}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            disabled={loading}
          >
            Create an Account
          </button>
        </div>

        {/* Server Configuration Panel */}
        <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', textAlign: 'center' }}>
          <button
            type="button"
            className="auth-link"
            onClick={() => setShowServerConfig(!showServerConfig)}
            style={{ background: 'none', border: 'none', fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
          >
            {connectionStatus === 'ok'
              ? <CheckCircle size={14} style={{ color: 'var(--accent-green)' }} />
              : connectionStatus === 'fail'
                ? <WifiOff size={14} style={{ color: 'var(--accent-red)' }} />
                : <span>⚙️</span>
            }
            {showServerConfig ? 'Hide Server Settings' : 'Configure Server IP'}
          </button>

          {showServerConfig && (
            <div style={{ marginTop: '0.75rem', textAlign: 'left' }}>
              <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Backend Server URL
                {connectionStatus === 'ok' && <span style={{ color: 'var(--accent-green)', fontWeight: 600, fontSize: '0.7rem' }}>● Connected</span>}
                {connectionStatus === 'fail' && <span style={{ color: 'var(--accent-red)', fontWeight: 600, fontSize: '0.7rem' }}>● Unreachable</span>}
              </label>

              {/* Hint box */}
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.6rem 0.8rem', marginBottom: '0.5rem', fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--text-primary)' }}>Cloud Default:</strong> <code style={{ background: 'var(--bg-primary)', padding: '1px 5px', borderRadius: '3px' }}>{getDefaultApiBaseUrl()}</code><br />
                <strong style={{ color: 'var(--text-primary)' }}>Or connect to local PC:</strong><br />
                Open CMD on your laptop → type <code style={{ background: 'var(--bg-primary)', padding: '1px 5px', borderRadius: '3px' }}>ipconfig</code> → look for <strong>IPv4 Address</strong><br />
                Example: <code style={{ background: 'var(--bg-primary)', padding: '1px 5px', borderRadius: '3px' }}>192.168.1.7</code>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ padding: '0.5rem', fontSize: '0.85rem', flex: 1 }}
                  value={serverUrl}
                  onChange={(e) => { setServerUrl(e.target.value); setConnectionStatus('idle'); }}
                  placeholder="192.168.1.7  or  http://192.168.1.7:5000"
                  autoCapitalize="none"
                  autoCorrect="off"
                  inputMode="url"
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: 'auto', padding: '0.5rem 0.75rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                  onClick={handleSaveServerUrl}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: 'auto', padding: '0.5rem 0.75rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                  onClick={handleResetServerUrl}
                  title="Reset to Default"
                >
                  Reset
                </button>
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: '100%', padding: '0.6rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                onClick={handleTestConnection}
                disabled={testingConnection}
              >
                {testingConnection
                  ? <><Loader2 className="animate-spin" size={15} /> Testing connection...</>
                  : <><Wifi size={15} /> Test Connection</>
                }
              </button>

              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: 1.5, textAlign: 'center' }}>
                ⚠️ Your phone and laptop must be on the <strong>same Wi-Fi network</strong>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
