import React, { useState, useEffect } from 'react';
import { User, Mail, Building, MapPin, Calendar, Award, Receipt, ShieldAlert, Loader2 } from 'lucide-react';
import { getApiBaseUrl } from '../config';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  business_name: string;
  business_address: string;
  created_at: string;
}

interface AccountInfoProps {
  token: string;
  addAlert: (message: string, type: 'success' | 'error' | 'info') => void;
  onProfileUpdate: (updatedUser: any) => void;
}

export default function AccountInfo({ token, addAlert, onProfileUpdate }: AccountInfoProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit fields
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/users/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch profile info');
      setProfile(data);
      setName(data.name);
      setBusinessName(data.business_name || '');
      setBusinessAddress(data.business_address || '');
    } catch (err: any) {
      addAlert(err.message || 'Error fetching profile details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile();
    }
  }, [token]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      addAlert('Name is required', 'error');
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, businessName, businessAddress })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update profile');

      addAlert('Profile details updated successfully!', 'success');
      setProfile(data.user);
      onProfileUpdate(data.user);
    } catch (err: any) {
      addAlert(err.message || 'Error updating profile', 'error');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="page-content">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Account Information</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Review owner identity, business status, and subscription details</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh', flexDirection: 'column', gap: '1rem' }}>
          <Loader2 className="animate-spin" size={35} style={{ color: 'var(--accent-cyan)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading profile details...</p>
        </div>
      ) : profile ? (
        <div className="account-grid">
          
          {/* Left Panel: Profile Detail Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '2.5rem 1.5rem' }}>
              <div className="profile-avatar" style={{ width: '80px', height: '80px', fontSize: '2rem', borderRadius: '50%', marginBottom: '1rem' }}>
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <h2 style={{ fontSize: '1.4rem', marginBottom: '0.25rem' }}>{profile.name}</h2>
              <p style={{ color: 'var(--accent-cyan)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Business Owner
              </p>
              
              <div style={{ width: '100%', borderTop: '1px solid var(--border-color)', marginTop: '1.5rem', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Mail size={18} style={{ color: 'var(--text-muted)' }} />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Email Address</div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{profile.email}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Calendar size={18} style={{ color: 'var(--text-muted)' }} />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Registered Since</div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{new Date(profile.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Award size={18} style={{ color: 'var(--text-muted)' }} />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Subscription Tier</div>
                    <div style={{ color: 'var(--accent-green)', fontWeight: 600 }}>Lifetime Premium</div>
                  </div>
                </div>
              </div>
            </div>

            {/* License details */}
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(157, 78, 221, 0.05)', borderColor: 'rgba(157, 78, 221, 0.15)' }}>
              <Receipt style={{ color: 'var(--accent-purple)' }} />
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Commercial License</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.1rem' }}>Active & compliant. Licensed to Sanna systems.</p>
              </div>
            </div>
          </div>

          {/* Right Panel: Edit profile details */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              Update Identity & Business Info
            </h3>

            <form onSubmit={handleUpdate}>
              <div className="form-group">
                <label className="form-label" htmlFor="owner-name-input">Owner Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    id="owner-name-input"
                    type="text"
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ paddingLeft: '44px' }}
                    disabled={updating}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="business-name-input">Business / Shop Name</label>
                <div style={{ position: 'relative' }}>
                  <Building size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    id="business-name-input"
                    type="text"
                    className="form-input"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    style={{ paddingLeft: '44px' }}
                    disabled={updating}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label" htmlFor="business-address-input">Business Address</label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={18} style={{ position: 'absolute', left: '14px', top: '16px', color: 'var(--text-muted)' }} />
                  <textarea
                    id="business-address-input"
                    className="form-input"
                    value={businessAddress}
                    onChange={(e) => setBusinessAddress(e.target.value)}
                    style={{ paddingLeft: '44px', minHeight: '100px', resize: 'vertical' }}
                    disabled={updating}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: 'auto', paddingLeft: '2rem', paddingRight: '2rem' }} disabled={updating}>
                {updating ? <Loader2 className="animate-spin" size={18} /> : 'Save Profiles'}
              </button>
            </form>
          </div>

        </div>
      ) : (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          No user profiles loaded.
        </div>
      )}
    </div>
  );
}
