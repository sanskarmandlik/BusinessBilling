import React, { useState, useEffect } from 'react';
import { Mail, Lock, KeySquare, Eye, EyeOff, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { getApiBaseUrl } from '../config';

interface ForgotPasswordProps {
  onNavigate: (page: string) => void;
  addAlert: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function ForgotPassword({ onNavigate, addAlert }: ForgotPasswordProps) {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Dev Helper: Stores the simulated reset link
  const [simulatedLink, setSimulatedLink] = useState('');

  // Extract token from URL query string if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      setToken(urlToken);
    }
  }, []);

  const handleRequestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      addAlert('Please enter your email address', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      addAlert('Reset link generated!', 'success');
      if (data.resetLink) {
        setSimulatedLink(data.resetLink);
      }
    } catch (err: any) {
      addAlert(err.message || 'Error requesting reset link', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      addAlert('Reset token is missing', 'error');
      return;
    }
    if (newPassword.length < 6) {
      addAlert('Password must be at least 6 characters long', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      addAlert('Passwords do not match', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Reset failed');
      }

      addAlert('Password updated successfully!', 'success');
      setSuccess(true);
      // Clean query parameter
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err: any) {
      addAlert(err.message || 'Failed to reset password. Token may have expired.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
            <CheckCircle size={48} style={{ color: 'var(--accent-green)' }} />
          </div>
          <h2 className="auth-title">Password Reset</h2>
          <p className="auth-subtitle" style={{ marginBottom: '2rem' }}>
            Your password has been updated. You can now log in using your new credentials.
          </p>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={() => onNavigate('login')}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ marginBottom: '1rem' }}>
          <button
            type="button"
            onClick={() => {
              // Clear state and navigate back
              setToken('');
              setSimulatedLink('');
              window.history.replaceState({}, document.title, window.location.pathname);
              onNavigate('login');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.85rem'
            }}
          >
            <ArrowLeft size={16} /> Back to Login
          </button>
        </div>

        {/* If token exists (either from url or manually set/pasted), show password reset form */}
        {token ? (
          <div>
            <div className="auth-header">
              <div className="auth-logo"><KeySquare /></div>
              <h2 className="auth-title">New Password</h2>
              <p className="auth-subtitle">Enter your new secure password below</p>
            </div>

            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label className="form-label" htmlFor="new-password">New Password</label>
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
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Min. 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{ paddingLeft: '44px', paddingRight: '44px' }}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.75rem' }}>
                <label className="form-label" htmlFor="confirm-password">Confirm Password</label>
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
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ paddingLeft: '44px', paddingRight: '44px' }}
                    disabled={loading}
                    required
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
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Reset Password'}
              </button>
            </form>
          </div>
        ) : (
          /* Otherwise show request reset token link form */
          <div>
            <div className="auth-header">
              <div className="auth-logo"><KeySquare /></div>
              <h2 className="auth-title">Reset Password</h2>
              <p className="auth-subtitle">Provide your account email to retrieve a password reset token</p>
            </div>

            <form onSubmit={handleRequestLink}>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" htmlFor="email-input">Email Address</label>
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
                    id="email-input"
                    type="email"
                    className="form-input"
                    placeholder="owner@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ paddingLeft: '44px' }}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Generate Reset Token'}
              </button>
            </form>

            {simulatedLink && (
              <div className="auth-dev-alert">
                <strong>[Local Dev Helper] Simulated Reset Link:</strong><br />
                <a 
                  href={simulatedLink} 
                  onClick={(e) => {
                    e.preventDefault();
                    // Extract token and set state to show reset password inputs
                    const url = new URL(simulatedLink);
                    const t = url.searchParams.get('token');
                    if (t) setToken(t);
                  }}
                  style={{ color: 'var(--accent-green)', textDecoration: 'underline', cursor: 'pointer', display: 'block', marginTop: '0.25rem' }}
                >
                  Click here to Reset Password
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
