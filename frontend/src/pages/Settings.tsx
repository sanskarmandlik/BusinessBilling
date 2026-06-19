import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, ShieldAlert, Palette, Coins, Key, Loader2, Sparkles, Wifi } from 'lucide-react';
import { getApiBaseUrl, setApiBaseUrl, getDefaultApiBaseUrl } from '../config';
import { formatServerUrl } from '../utils/errorHandler';

interface SettingsProps {
  token: string;
  currency: string;
  onSettingsUpdate: (currency: string, taxRate: number, theme: string) => void;
  addAlert: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function Settings({ token, currency, onSettingsUpdate, addAlert }: SettingsProps) {
  const [loading, setLoading] = useState(true);
  
  // Settings values
  const [activeCurrency, setActiveCurrency] = useState('INR');
  const [taxRate, setTaxRate] = useState(0);
  const [theme, setTheme] = useState('light');
  const [apiBaseUrl, setApiBaseUrlState] = useState(getApiBaseUrl());
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'ok' | 'fail'>('idle');

  const handleResetApiUrl = () => {
    const defaultUrl = getDefaultApiBaseUrl();
    setApiBaseUrlState(defaultUrl);
    setConnectionStatus('idle');
    addAlert(`🔄 Server URL field set to default: ${defaultUrl}. Click 'Save Configurations' to apply!`, 'info');
  };

  const handleTestConnection = async () => {
    const formatted = formatServerUrl(apiBaseUrl);
    if (!formatted) {
      addAlert('⚠️ Please enter a server URL to test', 'error');
      return;
    }
    setApiBaseUrlState(formatted);

    setTestingConnection(true);
    setConnectionStatus('idle');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(`${formatted}/api/users/profile`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.status === 200) {
        setConnectionStatus('ok');
        addAlert(`✅ Server at ${formatted} is reachable and session is valid!`, 'success');
      } else if (res.status === 401 || res.status === 403) {
        setConnectionStatus('ok');
        addAlert(`⚠️ Server at ${formatted} is reachable, but your session is invalid. You'll need to log out and log back in.`, 'info');
      } else {
        setConnectionStatus('fail');
        addAlert(`⚠️ Server at ${formatted} responded with status ${res.status}.`, 'error');
      }
    } catch (err: any) {
      setConnectionStatus('fail');
      if (err?.name === 'AbortError') {
        addAlert(`⏱️ Connection to ${formatted} timed out after 8 seconds.`, 'error');
      } else {
        addAlert(`🔴 Cannot reach: ${formatted}. Verify server is running and URL is correct.`, 'error');
      }
    } finally {
      setTestingConnection(false);
    }
  };

  // Change password values
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch settings');
      setActiveCurrency(data.currency || 'INR');
      setTaxRate(data.tax_rate || 0);
      setTheme(data.theme || 'light');
    } catch (err: any) {
      addAlert(err.message || 'Error fetching preference details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchSettings();
    }
  }, [token]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (taxRate < 0) {
      addAlert('Tax rate cannot be negative', 'error');
      return;
    }

    setSavingSettings(true);
    try {
      const formattedUrl = formatServerUrl(apiBaseUrl);
      setApiBaseUrlState(formattedUrl);
      await setApiBaseUrl(formattedUrl);

      const response = await fetch(`${getApiBaseUrl()}/api/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currency: activeCurrency, taxRate, theme })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update settings');

      addAlert('Preference settings saved successfully!', 'success');
      onSettingsUpdate(data.settings.currency, data.settings.tax_rate, data.settings.theme);
    } catch (err: any) {
      addAlert(err.message || 'Error updating settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      addAlert('Please fill in all password fields', 'error');
      return;
    }
    if (newPassword.length < 6) {
      addAlert('New password must be at least 6 characters long', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      addAlert('New passwords do not match', 'error');
      return;
    }

    setSavingPassword(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/users/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update password');

      addAlert('Login password updated successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      addAlert(err.message || 'Incorrect current password or update failed', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="page-content">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Preferences & Settings</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Tune application options, currency indicators, and security settings</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh', flexDirection: 'column', gap: '1rem' }}>
          <Loader2 className="animate-spin" size={35} style={{ color: 'var(--accent-cyan)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading settings...</p>
        </div>
      ) : (
        <div className="settings-grid">
          
          {/* Left Panel: General Configurations */}
          <div className="glass-card" style={{ height: 'fit-content' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <SettingsIcon size={20} style={{ color: 'var(--accent-cyan)' }} />
              <h3 style={{ fontSize: '1.15rem' }}>Business Configurations</h3>
            </div>

            <form onSubmit={handleSaveSettings}>
              {/* Currency Selector */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Coins size={16} style={{ color: 'var(--accent-cyan)' }} /> Default Currency Indicator
                </label>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  {[
                    { code: 'INR', label: 'INR (₹) Rupee' },
                    { code: 'USD', label: 'USD ($) Dollar' },
                    { code: 'EUR', label: 'EUR (€) Euro' }
                  ].map((curr) => (
                    <button
                      key={curr.code}
                      type="button"
                      className={`btn ${activeCurrency === curr.code ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '0.65rem 1rem', fontSize: '0.85rem' }}
                      onClick={() => setActiveCurrency(curr.code)}
                      disabled={savingSettings}
                    >
                      {curr.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Default Tax Rate */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" htmlFor="default-tax-rate">Default Tax Rate (%)</label>
                <input
                  id="default-tax-rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  className="form-input"
                  placeholder="0.00"
                  value={taxRate || 0}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  disabled={savingSettings}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'block' }}>
                  Applied automatically to all new sales/billing transactions.
                </span>
              </div>

              {/* Theme Selector */}
              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Palette size={16} style={{ color: 'var(--accent-purple)' }} /> Styling Layout Theme
                </label>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  {[
                    { val: 'dark', label: 'Premium Dark Mode' },
                    { val: 'light', label: 'Modern Light Mode' }
                  ].map((t) => (
                    <button
                      key={t.val}
                      type="button"
                      className={`btn ${theme === t.val ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '0.65rem 1rem', fontSize: '0.85rem' }}
                      onClick={() => setTheme(t.val)}
                      disabled={savingSettings}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* API Server URL Override */}
              <div className="form-group" style={{ marginBottom: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <label className="form-label" htmlFor="api-server-url" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Backend Server URL (API)</span>
                  {connectionStatus === 'ok' && <span style={{ color: 'var(--accent-green)', fontWeight: 600, fontSize: '0.75rem' }}>● Reachable</span>}
                  {connectionStatus === 'fail' && <span style={{ color: 'var(--accent-red)', fontWeight: 600, fontSize: '0.75rem' }}>● Unreachable</span>}
                </label>
                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  <input
                    id="api-server-url"
                    type="text"
                    className="form-input"
                    placeholder="http://localhost:5000"
                    value={apiBaseUrl}
                    onChange={(e) => { setApiBaseUrlState(e.target.value); setConnectionStatus('idle'); }}
                    disabled={savingSettings}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ width: 'auto', padding: '0.5rem 0.75rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                    onClick={handleResetApiUrl}
                    disabled={savingSettings}
                    title="Reset to Default URL"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ width: 'auto', padding: '0.5rem 0.75rem', fontSize: '0.8rem', whiteSpace: 'nowrap', display: 'flex', gap: '0.2rem' }}
                    onClick={handleTestConnection}
                    disabled={testingConnection || savingSettings}
                  >
                    {testingConnection ? <Loader2 className="animate-spin" size={14} /> : <Wifi size={14} />}
                    Test
                  </button>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'block' }}>
                  Built-in default: <code>{getDefaultApiBaseUrl()}</code>.
                  To run on mobile via local Wi-Fi, set this to your computer's local IP address (e.g. <code>http://192.168.1.15:5000</code>).
                </span>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: 'auto', paddingLeft: '2rem', paddingRight: '2rem' }} disabled={savingSettings}>
                {savingSettings ? <Loader2 className="animate-spin" size={18} /> : 'Save Configurations'}
              </button>
            </form>
          </div>

          {/* Right Panel: Password change */}
          <div className="glass-card" style={{ height: 'fit-content' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <Key size={20} style={{ color: 'var(--accent-purple)' }} />
              <h3 style={{ fontSize: '1.15rem' }}>Security & Credentials</h3>
            </div>

            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label className="form-label" htmlFor="curr-pwd">Current Password</label>
                <input
                  id="curr-pwd"
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={savingPassword}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="new-pwd">New Password</label>
                <input
                  id="new-pwd"
                  type="password"
                  className="form-input"
                  placeholder="Min. 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={savingPassword}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label" htmlFor="confirm-new-pwd">Confirm New Password</label>
                <input
                  id="confirm-new-pwd"
                  type="password"
                  className="form-input"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={savingPassword}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={savingPassword}>
                {savingPassword ? <Loader2 className="animate-spin" size={18} /> : 'Change Password'}
              </button>
            </form>
          </div>

        </div>
      )}
    </div>
  );
}
