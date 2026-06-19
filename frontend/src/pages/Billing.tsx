import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search, Plus, Minus, Trash2, User, Phone, CheckCircle, Receipt, Loader2, RefreshCw } from 'lucide-react';
import { getApiBaseUrl } from '../config';

interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  stock: number;
}

interface CartItem extends Product {
  quantity: number;
}

interface BillingProps {
  token: string;
  currency: string;
  addAlert: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function Billing({ token, currency, addAlert }: BillingProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Cart states
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0);
  
  // Customer details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Online'>('Cash');
  const [submitting, setSubmitting] = useState(false);

  // Fetch products and settings (to get default tax rate)
  const loadInitialData = async () => {
    try {
      // Fetch products
      const prodRes = await fetch(`${getApiBaseUrl()}/api/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const prodData = await prodRes.json();
      if (!prodRes.ok) throw new Error(prodData.error || 'Failed to load products');
      setProducts(prodData);

      // Fetch user settings
      const settingsRes = await fetch(`${getApiBaseUrl()}/api/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const settingsData = await settingsRes.json();
      if (settingsRes.ok) {
        setTaxRate(settingsData.tax_rate || 0);
      }
    } catch (err: any) {
      addAlert(err.message || 'Error loading billing data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadInitialData();
    }
  }, [token]);

  // Add product to cart
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      addAlert('Product is out of stock', 'error');
      return;
    }

    const existingIndex = cart.findIndex(item => item.id === product.id);
    
    if (existingIndex >= 0) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty >= product.stock) {
        addAlert(`Cannot add more. Only ${product.stock} units available in stock.`, 'error');
        return;
      }
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += 1;
      setCart(updatedCart);
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
      addAlert(`${product.name} added to cart`, 'success');
    }
  };

  // Adjust cart item quantity
  const updateQty = (id: number, delta: number) => {
    const itemIndex = cart.findIndex(item => item.id === id);
    if (itemIndex === -1) return;

    const item = cart[itemIndex];
    // Find matching product in main list to check max stock
    const product = products.find(p => p.id === id);
    if (!product) return;

    const newQty = item.quantity + delta;

    if (newQty <= 0) {
      // Remove from cart
      const updatedCart = cart.filter(c => c.id !== id);
      setCart(updatedCart);
      addAlert(`${item.name} removed from cart`, 'info');
    } else if (newQty > product.stock) {
      addAlert(`Only ${product.stock} units available in stock`, 'error');
    } else {
      const updatedCart = [...cart];
      updatedCart[itemIndex].quantity = newQty;
      setCart(updatedCart);
    }
  };

  // Remove item from cart
  const removeFromCart = (id: number, name: string) => {
    setCart(cart.filter(item => item.id !== id));
    addAlert(`${name} removed from cart`, 'info');
  };

  // Calculate prices
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const taxAmount = (subtotal - discount) > 0 ? ((subtotal - discount) * (taxRate / 100)) : 0;
  const totalAmount = Math.max(0, subtotal - discount + taxAmount);

  // Complete Billing Checkout
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      addAlert('Your shopping cart is empty', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const checkoutItems = cart.map(item => ({
        productId: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price
      }));

      const response = await fetch(`${getApiBaseUrl()}/api/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          customerName,
          customerPhone,
          items: checkoutItems,
          subtotal,
          taxRate,
          taxAmount,
          discountAmount: discount,
          totalAmount,
          paymentMethod
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Invoice recording failed');
      }

      addAlert('Bill checked out successfully!', 'success');
      // Reset POS console
      setCart([]);
      setDiscount(0);
      setCustomerName('');
      setCustomerPhone('');
      setPaymentMethod('Cash');
      
      // Reload product catalog to reflect stock reductions
      loadInitialData();
    } catch (err: any) {
      addAlert(err.message || 'Failed to complete transaction', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number | undefined | null) => {
    const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency;
    const value = amount || 0;
    return `${symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-content">
      {/* Title block */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Billing Console</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Generate invoices & log real-time sales transactions</p>
        </div>
        <button 
          className="btn btn-secondary" 
          style={{ width: 'auto', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          onClick={loadInitialData}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Catalog
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh', flexDirection: 'column', gap: '1rem' }}>
          <Loader2 className="animate-spin" size={35} style={{ color: 'var(--accent-cyan)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading catalog inventory...</p>
        </div>
      ) : (
        <div className="billing-layout">
          
          {/* Left panel: Product Selection */}
          <div>
            <div className="glass-card" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search products by Name or SKU code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingLeft: '38px', paddingTop: '0.65rem', paddingBottom: '0.65rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '550px', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {filteredProducts.length > 0 ? (
                filteredProducts.map((p) => {
                  const outOfStock = p.stock === 0;
                  const isLowStock = p.stock < 5;
                  const inCart = cart.find(item => item.id === p.id);

                  return (
                    <div key={p.id} className="billing-product-item">
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{p.name}</div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', alignItems: 'center' }}>
                          <code style={{ fontSize: '0.75rem', color: 'var(--accent-purple)' }}>{p.sku || 'No SKU'}</code>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>•</span>
                          <span className={`badge ${outOfStock ? 'badge-red' : isLowStock ? 'badge-red' : 'badge-cyan'}`} style={{ padding: '0.1rem 0.35rem', fontSize: '0.7rem' }}>
                            {p.stock} left
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                          {formatCurrency(p.price)}
                        </div>
                        <button
                          className="btn btn-primary"
                          style={{ width: 'auto', padding: '0.45rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          onClick={() => addToCart(p)}
                          disabled={outOfStock}
                        >
                          <Plus size={14} /> Add {inCart ? `(${inCart.quantity})` : ''}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="glass-card" style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No matching products found in catalog inventory.
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Active Cart & Checkout */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <ShoppingCart size={20} style={{ color: 'var(--accent-cyan)' }} />
              <h3 style={{ fontSize: '1.15rem' }}>Checkout Invoice</h3>
              <span className="badge badge-cyan" style={{ marginLeft: 'auto' }}>{cart.length} items</span>
            </div>

            <form onSubmit={handleCheckout}>
              {/* Customer Inputs */}
              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Customer Name (Optional)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    style={{ paddingLeft: '36px', fontSize: '0.85rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Phone Number (Optional)"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    style={{ paddingLeft: '36px', fontSize: '0.85rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Payment Account</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className={`btn ${paymentMethod === 'Cash' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setPaymentMethod('Cash')}
                    style={{ padding: '0.5rem', fontSize: '0.8rem', flex: 1 }}
                    disabled={submitting}
                  >
                    💵 Cash
                  </button>
                  <button
                    type="button"
                    className={`btn ${paymentMethod === 'Online' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setPaymentMethod('Online')}
                    style={{ padding: '0.5rem', fontSize: '0.8rem', flex: 1 }}
                    disabled={submitting}
                  >
                    💳 Online
                  </button>
                </div>
              </div>

              {/* Cart Items List */}
              <div className="cart-items-list">
                {cart.length > 0 ? (
                  cart.map((item) => (
                    <div key={item.id} className="cart-item">
                      <div style={{ maxWidth: '60%' }}>
                        <div style={{ fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{item.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                          {formatCurrency(item.price)} each
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div className="quantity-control">
                          <button type="button" className="qty-btn" onClick={() => updateQty(item.id, -1)} disabled={submitting}>
                            <Minus size={12} />
                          </button>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, minWidth: '15px', textAlign: 'center' }}>{item.quantity}</span>
                          <button type="button" className="qty-btn" onClick={() => updateQty(item.id, 1)} disabled={submitting}>
                            <Plus size={12} />
                          </button>
                        </div>
                        <button 
                          type="button" 
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
                          onClick={() => removeFromCart(item.id, item.name)}
                          disabled={submitting}
                        >
                          <Trash2 size={15} style={{ color: 'var(--accent-red)' }} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Shopping cart is empty.<br />Select products on the left.
                  </div>
                )}
              </div>

              {/* Subtotal / Taxes / Discount panel */}
              <div style={{ margin: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyItems: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Subtotal:</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 500 }}>{formatCurrency(subtotal)}</span>
                </div>

                {/* Discount input row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Flat Discount:</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', width: '90px', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {currency === 'INR' ? '₹' : currency === 'USD' ? '$' : '€'}
                    </span>
                    <input
                      type="number"
                      min="0"
                      max={subtotal}
                      className="form-input"
                      value={discount || ''}
                      onChange={(e) => setDiscount(Math.min(subtotal, parseFloat(e.target.value) || 0))}
                      style={{ padding: '0.2rem 0.4rem 0.2rem 18px', textAlign: 'right', fontSize: '0.8rem', borderRadius: '6px' }}
                      disabled={submitting || cart.length === 0}
                    />
                  </div>
                </div>

                {/* Tax settings info */}
                <div style={{ display: 'flex', justifyItems: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Tax ({taxRate}%):</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 500 }}>{formatCurrency(taxAmount)}</span>
                </div>

                {/* Net Total */}
                <div style={{ display: 'flex', justifyItems: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Net Payable:</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 800, fontSize: '1.15rem', color: 'var(--accent-green)', fontFamily: 'var(--font-title)' }}>
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </div>

              {/* Checkout buttons */}
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ marginTop: '1rem', width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem' }} 
                disabled={submitting || cart.length === 0}
              >
                {submitting ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    <Receipt size={18} /> Complete Checkout
                  </>
                )}
              </button>
            </form>
          </div>
          
        </div>
      )}
    </div>
  );
}
