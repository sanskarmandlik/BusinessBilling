import React, { useState } from 'react';
import { User, Mail, Lock, Building, MapPin, Eye, EyeOff, Loader2, Wifi, WifiOff, CheckCircle } from 'lucide-react';
import { getApiBaseUrl, setApiBaseUrl, getDefaultApiBaseUrl } from '../config';
import { getAuthErrorMessage, isNetworkError, formatServerUrl } from '../utils/errorHandler';
import logoImg from '../assets/logo.png';

interface SignupProps {
  onLoginSuccess: (token: string, user: any) => void;
  onNavigate: (page: string) => void;
  addAlert: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function Signup({ onLoginSuccess, onNavigate, addAlert }: SignupProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrl, setServerUrl] = useState(getApiBaseUrl());
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'ok' | 'fail'>('idle');

  const handleSaveServerUrl = async () => {
    const formatted = formatServerUrl(serverUrl);
    if (!formatted) {
      addAlert('⚠️ Please enter a valid server URL (e.g. 192.168.1.7)', 'error');
      return;
    }
    setServerUrl(formatted);
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

  const handleTestConnection = async () => {
    const formatted = formatServerUrl(serverUrl);
    if (!formatted) {
      addAlert('⚠️ Please enter a server URL to test (e.g. 192.168.1.7)', 'error');
      return;
    }
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
        await setApiBaseUrl(formatted);
        addAlert(`✅ Server is reachable at ${formatted}! URL has been saved.`, 'success');
      } else {
        setConnectionStatus('fail');
        addAlert(`⚠️ Server at ${formatted} responded with error ${res.status}. It may have an issue.`, 'error');
      }
    } catch (err: any) {
      setConnectionStatus('fail');
      if (err?.name === 'AbortError') {
        addAlert(`⏱️ Connection to ${formatted} timed out after 8 seconds.`, 'error');
      } else {
        addAlert(`🔴 Cannot reach: ${formatted}\n\nTips:\n• Check that your laptop is on the same Wi-Fi\n• Make sure backend server is running`, 'error');
      }
    } finally {
      setTestingConnection(false);
    }
  };

  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation with specific messages
    if (!name.trim()) {
      addAlert('⚠️ Full name is required to create your account.', 'error');
      return;
    }
    if (name.trim().length < 2) {
      addAlert('⚠️ Please enter your full name (at least 2 characters).', 'error');
      return;
    }
    if (!email.trim()) {
      addAlert('⚠️ Please enter your email address.', 'error');
      return;
    }
    if (!validateEmail(email)) {
      addAlert('⚠️ Please enter a valid email address (e.g. name@example.com).', 'error');
      return;
    }
    if (!password) {
      addAlert('⚠️ Please enter a password.', 'error');
      return;
    }
    if (password.length < 6) {
      addAlert('⚠️ Password must be at least 6 characters long.', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          businessName: businessName.trim(),
          businessAddress: businessAddress.trim()
        }),
      });

      let data: any = {};
      try {
        data = await response.json();
      } catch {
        throw new Error('Server returned an unreadable response. It may be down.');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      addAlert('✅ Account created successfully! Welcome aboard!', 'success');
      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      const message = getAuthErrorMessage(err, 'signup');
      addAlert(message, 'error');
      // Auto-show server config if it looks like a network issue
      if (isNetworkError(err)) {
        setShowServerConfig(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" style={{ paddingTop: '2.5rem', paddingBottom: '2.5rem' }}>
      <div className="auth-card" style={{ maxWidth: '480px' }}>
        <div className="auth-header">
          <div className="auth-logo" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={logoImg} alt="BizPilot" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
          </div>
          <h2 className="auth-title">Register Business</h2>
          <p className="auth-subtitle">Create an account to start billing and tracking savings</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="signup-name">Full Name <span style={{ color: 'var(--accent-red)' }}>*</span></label>
            <div style={{ position: 'relative' }}>
              <User
                size={18}
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }}
              />
              <input
                id="signup-name"
                type="text"
                className="form-input"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ paddingLeft: '44px' }}
                disabled={loading}
                autoComplete="name"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="signup-email">Email Address <span style={{ color: 'var(--accent-red)' }}>*</span></label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={18}
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }}
              />
              <input
                id="signup-email"
                type="email"
                className="form-input"
                placeholder="owner@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '44px' }}
                disabled={loading}
                autoComplete="email"
                autoCapitalize="none"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="signup-password">Password <span style={{ color: 'var(--accent-red)' }}>*</span></label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={18}
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }}
              />
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '44px', paddingRight: '44px' }}
                disabled={loading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
                disabled={loading}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {password.length > 0 && password.length < 6 && (
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-red)', marginTop: '0.25rem', display: 'block' }}>
                ⚠️ Password too short — needs {6 - password.length} more character{6 - password.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="signup-business-name">Business / Shop Name</label>
            <div style={{ position: 'relative' }}>
              <Building
                size={18}
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }}
              />
              <input
                id="signup-business-name"
                type="text"
                className="form-input"
                placeholder="BizPilot Store"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                style={{ paddingLeft: '44px' }}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.75rem' }}>
            <label className="form-label" htmlFor="signup-business-address">Business Address</label>
            <div style={{ position: 'relative' }}>
              <MapPin
                size={18}
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '16px',
                  color: 'var(--text-muted)'
                }}
              />
              <textarea
                id="signup-business-address"
                className="form-input"
                placeholder="123 Main St, Bangalore, India"
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                style={{ paddingLeft: '44px', minHeight: '80px', resize: 'vertical' }}
                disabled={loading}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><Loader2 className="animate-spin" size={18} /> &nbsp;Creating Account...</> : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <button
            type="button"
            className="auth-link"
            onClick={() => onNavigate('login')}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            disabled={loading}
          >
            Log In
          </button>
        </div>

        {/* Server Configuration */}
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
