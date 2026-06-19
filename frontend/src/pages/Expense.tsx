import React, { useState, useEffect } from 'react';
import { ArrowDownRight, CircleDollarSign, Plus, ScrollText, AlertCircle, Loader2 } from 'lucide-react';
import { getApiBaseUrl } from '../config';

interface Expense {
  id: number;
  amount: number;
  description: string;
  category: string;
  payment_method: string;
  created_at: string;
}

interface ExpenseProps {
  token: string;
  currency: string;
  addAlert: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function Expense({ token, currency, addAlert }: ExpenseProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Balance calculation states
  const [currentSaved, setCurrentSaved] = useState(0);
  const [cashSaved, setCashSaved] = useState(0);
  const [onlineSaved, setOnlineSaved] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);

  // Form states
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Personal Withdrawal');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Online'>('Cash');
  const [submitting, setSubmitting] = useState(false);

  const fetchExpenseData = async () => {
    try {
      // 1. Fetch expenses list
      const expRes = await fetch(`${getApiBaseUrl()}/api/expenses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const expData = await expRes.json();
      if (!expRes.ok) throw new Error(expData.error || 'Failed to fetch expenses');
      setExpenses(expData);

      // 2. Fetch dashboard stats for current savings balance
      const statsRes = await fetch(`${getApiBaseUrl()}/api/dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      if (statsRes.ok) {
        setCurrentSaved(statsData.stats.totalSaved);
        setCashSaved(statsData.stats.cashSaved || 0);
        setOnlineSaved(statsData.stats.onlineSaved || 0);
        setTotalExpenses(statsData.stats.totalExpenses);
      }
    } catch (err: any) {
      addAlert(err.message || 'Error fetching withdrawal details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchExpenseData();
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      addAlert('Please enter a valid amount greater than 0', 'error');
      return;
    }
    if (!description) {
      addAlert('Please enter a description/reason', 'error');
      return;
    }
    const activeBalance = paymentMethod === 'Online' ? onlineSaved : cashSaved;
    if (amount > activeBalance) {
      addAlert(`Insufficient ${paymentMethod.toLowerCase()} balance. You cannot withdraw more than your current ${paymentMethod.toLowerCase()} savings of ${formatCurrency(activeBalance)}.`, 'error');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount, description, category, paymentMethod })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Withdrawal logging failed');
      }

      addAlert('Personal withdrawal logged successfully!', 'success');
      // Reset form
      setAmount(0);
      setDescription('');
      setCategory('Personal Withdrawal');
      setPaymentMethod('Cash');
      
      // Refresh list & balance
      fetchExpenseData();
    } catch (err: any) {
      addAlert(err.message || 'Failed to record withdrawal', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: number | undefined | null) => {
    const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency;
    const value = val || 0;
    return `${symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="page-content">
      {/* Title Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Personal Withdrawals</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Log money taken for personal expenses from current business sales savings</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh', flexDirection: 'column', gap: '1rem' }}>
          <Loader2 className="animate-spin" size={35} style={{ color: 'var(--accent-cyan)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading transactions...</p>
        </div>
      ) : (
        <div className="expense-layout">
          
          {/* Left panel: Input Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Balance Status Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(18, 24, 41, 0.9), rgba(0, 242, 254, 0.05))', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  <CircleDollarSign size={16} style={{ color: 'var(--accent-cyan)' }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Cash Savings</span>
                </div>
                <div style={{ fontFamily: 'var(--font-title)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                  {formatCurrency(cashSaved)}
                </div>
              </div>

              <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(18, 24, 41, 0.9), rgba(157, 78, 221, 0.05))', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  <CircleDollarSign size={16} style={{ color: 'var(--accent-purple)' }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Online Savings</span>
                </div>
                <div style={{ fontFamily: 'var(--font-title)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-purple)' }}>
                  {formatCurrency(onlineSaved)}
                </div>
              </div>
            </div>
            
            <div className="glass-card" style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Total cumulative withdrawals:</span>
              <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>{formatCurrency(totalExpenses)}</span>
            </div>

            {/* Log form */}
            <div className="glass-card">
              <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                Log Withdrawal
              </h3>
              
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="exp-amount">Withdrawal Amount *</label>
                  <input
                    id="exp-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={paymentMethod === 'Online' ? onlineSaved : cashSaved}
                    className="form-input"
                    placeholder="0.00"
                    value={amount || ''}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    disabled={submitting || (paymentMethod === 'Online' ? onlineSaved <= 0 : cashSaved <= 0)}
                    required
                  />
                  {(paymentMethod === 'Online' ? onlineSaved <= 0 : cashSaved <= 0) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent-red)', fontSize: '0.75rem', marginTop: '0.4rem' }}>
                      <AlertCircle size={12} /> No {paymentMethod.toLowerCase()} balance available to withdraw.
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Withdraw From Account</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className={`btn ${paymentMethod === 'Cash' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setPaymentMethod('Cash')}
                      style={{ padding: '0.5rem', fontSize: '0.8rem', flex: 1 }}
                      disabled={submitting || (cashSaved <= 0 && onlineSaved <= 0)}
                    >
                      💵 Cash Account
                    </button>
                    <button
                      type="button"
                      className={`btn ${paymentMethod === 'Online' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setPaymentMethod('Online')}
                      style={{ padding: '0.5rem', fontSize: '0.8rem', flex: 1 }}
                      disabled={submitting || (cashSaved <= 0 && onlineSaved <= 0)}
                    >
                      💳 Online Account
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="exp-category">Expense Category</label>
                  <select
                    id="exp-category"
                    className="form-input"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={submitting || currentSaved <= 0}
                    style={{ appearance: 'none', cursor: 'pointer' }}
                  >
                    <option value="Personal Withdrawal">Personal Withdrawal</option>
                    <option value="Home Groceries">Home Groceries</option>
                    <option value="Shop Rent / Bills">Shop Rent / Bills</option>
                    <option value="Family Medical">Family Medical</option>
                    <option value="Owner Salary">Owner Salary</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label" htmlFor="exp-desc">Reason / Description *</label>
                  <textarea
                    id="exp-desc"
                    className="form-input"
                    placeholder="e.g. Took cash out for buying house vegetables"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={submitting || currentSaved <= 0}
                    style={{ minHeight: '80px', resize: 'none' }}
                    required
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={submitting || currentSaved <= 0 || amount <= 0}
                >
                  {submitting ? <Loader2 className="animate-spin" size={18} /> : 'Record Withdrawal'}
                </button>
              </form>
            </div>
          </div>

          {/* Right panel: Withdrawals Logs List */}
          <div className="glass-card" style={{ height: 'fit-content' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <ScrollText size={20} style={{ color: 'var(--accent-purple)' }} />
              <h3 style={{ fontSize: '1.15rem' }}>Withdrawal Ledger</h3>
              <span className="badge badge-red" style={{ marginLeft: 'auto' }}>{expenses.length} logs</span>
            </div>

            <div style={{ maxHeight: '520px', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {expenses.length > 0 ? (
                expenses.map((exp) => (
                  <div 
                    key={exp.id} 
                    className="activity-item" 
                    style={{ padding: '1rem', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{exp.description}</div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--accent-purple)', fontWeight: 500 }}>{exp.category}</span>
                        <span>•</span>
                        <span style={{ fontWeight: 600 }}>{exp.payment_method === 'Online' ? '💳 Online' : '💵 Cash'}</span>
                        <span>•</span>
                        <span>{new Date(exp.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div style={{ color: 'var(--accent-red)', fontWeight: 700, fontSize: '1.1rem', fontFamily: 'var(--font-title)' }}>
                      -{formatCurrency(exp.amount)}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  No personal expenses logged.
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
