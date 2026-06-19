import React, { useState, useEffect } from 'react';
import { Home, Briefcase, Receipt, Wallet, User, Settings as SettingsIcon, LogOut, X, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { Preferences } from '@capacitor/preferences';
import { getApiBaseUrl, initApiBaseUrl } from './config';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Billing from './pages/Billing';
import Expense from './pages/Expense';
import AccountInfo from './pages/AccountInfo';
import Settings from './pages/Settings';

interface Alert {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [activePage, setActivePage] = useState<string>('home');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  // Prevents flash of login screen before native storage is read
  const [isStorageLoading, setIsStorageLoading] = useState(true);

  // Global settings state (synchronized from DB)
  const [currency, setCurrency] = useState('INR');
  const [taxRate, setTaxRate] = useState(0);
  const [theme, setTheme] = useState('dark');

  // On first mount: load persisted session from native storage (Capacitor Preferences)
  // This is the key fix — localStorage is NOT reliably persistent on mobile WebViews.
  // @capacitor/preferences maps to Android SharedPreferences / iOS UserDefaults.
  useEffect(() => {
    const loadSession = async () => {
      try {
        // Initialize API URL from native storage first
        await initApiBaseUrl();

        // Load token from native storage
        const { value: storedToken } = await Preferences.get({ key: 'token' });
        // Load user from native storage
        const { value: storedUser } = await Preferences.get({ key: 'user' });

        if (storedToken) {
          setToken(storedToken);
        }
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {
            // Corrupted user data — clear it
            await Preferences.remove({ key: 'user' });
          }
        }
      } catch (err) {
        // Fallback to localStorage if native Preferences fails (pure browser environment)
        const fallbackToken = localStorage.getItem('token');
        const fallbackUser = localStorage.getItem('user');
        if (fallbackToken) setToken(fallbackToken);
        if (fallbackUser) {
          try { setUser(JSON.parse(fallbackUser)); } catch { /* ignore */ }
        }
      } finally {
        setIsStorageLoading(false);
      }
    };

    loadSession();
  }, []);

  // Load settings from backend if logged in
  const fetchSettings = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.status === 401 || response.status === 403) {
        // Token expired
        handleLogout();
        return;
      }
      const data = await response.json();
      if (response.ok) {
        setCurrency(data.currency || 'INR');
        setTaxRate(data.tax_rate || 0);
        setTheme(data.theme || 'dark');
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  useEffect(() => {
    if (token) {
      fetchSettings();
    }
  }, [token]);

  // Sync theme with HTML document class
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  }, [theme]);

  const addAlert = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now().toString() + Math.random().toString();
    setAlerts(prev => [...prev, { id, message, type }]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      removeAlert(id);
    }, 4000);
  };

  const removeAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const handleLoginSuccess = async (newToken: string, newUser: any) => {
    // Save to native persistent storage (survives app restarts)
    try {
      await Preferences.set({ key: 'token', value: newToken });
      await Preferences.set({ key: 'user', value: JSON.stringify(newUser) });
    } catch {
      // Fallback to localStorage
    }
    // Always keep localStorage in sync as a backup
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    setActivePage('home');
  };

  const handleLogout = async () => {
    // Remove from both native and localStorage
    try {
      await Preferences.remove({ key: 'token' });
      await Preferences.remove({ key: 'user' });
    } catch {
      // Ignore if native storage unavailable
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setActivePage('login');
    addAlert('Logged out successfully', 'info');
  };

  const handleSettingsUpdate = (newCurrency: string, newTax: number, newTheme: string) => {
    setCurrency(newCurrency);
    setTaxRate(newTax);
    setTheme(newTheme);
  };

  const handleProfileUpdate = async (updatedUser: any) => {
    try {
      await Preferences.set({ key: 'user', value: JSON.stringify(updatedUser) });
    } catch { /* ignore */ }
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };


  // Show a loading screen while reading stored session from native preferences.
  // Without this, there would be a brief flash of the Login screen on every cold start.
  if (isStorageLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem',
        background: 'var(--bg-primary)'
      }}>
        <div style={{ fontSize: '2.5rem' }}>💼</div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', letterSpacing: '0.05em' }}>Loading Sanna Billing...</p>
      </div>
    );
  }

  // Auth pages check
  if (!token) {
    if (activePage === 'signup') {
      return (
        <>
          <Signup onLoginSuccess={handleLoginSuccess} onNavigate={setActivePage} addAlert={addAlert} />
          <AlertContainer alerts={alerts} removeAlert={removeAlert} />
        </>
      );
    }
    if (activePage === 'forgot-password' || window.location.pathname === '/reset-password' || window.location.search.includes('token=')) {
      return (
        <>
          <ForgotPassword onNavigate={setActivePage} addAlert={addAlert} />
          <AlertContainer alerts={alerts} removeAlert={removeAlert} />
        </>
      );
    }
    return (
      <>
        <Login onLoginSuccess={handleLoginSuccess} onNavigate={setActivePage} addAlert={addAlert} />
        <AlertContainer alerts={alerts} removeAlert={removeAlert} />
      </>
    );
  }

  // Render correct dashboard screen content
  const renderPageContent = () => {
    switch (activePage) {
      case 'home':
        return <Dashboard token={token} currency={currency} onNavigate={setActivePage} addAlert={addAlert} />;
      case 'products':
        return <Products token={token} currency={currency} addAlert={addAlert} />;
      case 'billing':
        return <Billing token={token} currency={currency} addAlert={addAlert} />;
      case 'expense':
        return <Expense token={token} currency={currency} addAlert={addAlert} />;
      case 'account-info':
        return <AccountInfo token={token} addAlert={addAlert} onProfileUpdate={handleProfileUpdate} />;
      case 'settings':
        return <Settings token={token} currency={currency} onSettingsUpdate={handleSettingsUpdate} addAlert={addAlert} />;
      default:
        return <Dashboard token={token} currency={currency} onNavigate={setActivePage} addAlert={addAlert} />;
    }
  };

  return (
    <div className="app-container">
      {/* Top Header Bar */}
      <header className="header-bar">
        <div className="logo-section">
          <div className="logo-icon">💼</div>
          <span className="logo-text">Sanna Billing</span>
        </div>
        
        <div className="user-profile-header">
          <div className="user-badge">
            <span className="user-badge-name">{user ? user.name : 'Business Owner'}</span>
            <span className="user-badge-role">{user && user.business_name ? user.business_name : 'Sanna Admin'}</span>
          </div>
          <div className="profile-avatar">
            {user && user.name ? user.name.charAt(0).toUpperCase() : 'O'}
          </div>
          <button 
            className="btn btn-secondary btn-icon" 
            onClick={() => setActivePage('settings')}
            title="App Settings"
            style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)' }}
          >
            <SettingsIcon size={20} />
          </button>
          <button 
            className="btn btn-secondary btn-icon" 
            onClick={handleLogout}
            title="Sign Out"
            style={{ border: 'none', background: 'transparent', color: 'var(--accent-red)' }}
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Page Area */}
      {renderPageContent()}

      {/* Sticky Bottom Navigation Footer */}
      <footer className="footer-nav">
        {[
          { id: 'home', label: 'Home', icon: Home },
          { id: 'products', label: 'Products', icon: Briefcase },
          { id: 'billing', label: 'Billing', icon: Receipt },
          { id: 'expense', label: 'Expense', icon: Wallet },
          { id: 'account-info', label: 'Account Info', icon: User }
        ].map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              className={`tab-btn ${activePage === tab.id ? 'active' : ''}`}
              onClick={() => setActivePage(tab.id)}
            >
              <IconComponent className="tab-icon" />
              <span className="tab-label">{tab.label}</span>
            </button>
          );
        })}
      </footer>

      {/* Banner Alerts */}
      <AlertContainer alerts={alerts} removeAlert={removeAlert} />
    </div>
  );
}

// Subcomponent: Alert Notification Overlay list
function AlertContainer({ alerts, removeAlert }: { alerts: Alert[], removeAlert: (id: string) => void }) {
  return (
    <div className="alert-container">
      {alerts.map((alert) => (
        <div key={alert.id} className={`alert-item ${alert.type}`}>
          {alert.type === 'success' ? (
            <CheckCircle size={18} />
          ) : alert.type === 'error' ? (
            <AlertTriangle size={18} />
          ) : (
            <Info size={18} />
          )}
          <span style={{ paddingRight: '1.25rem', display: 'inline-block' }}>{alert.message}</span>
          <button className="alert-close" onClick={() => removeAlert(alert.id)}>
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
