import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit3, Trash2, X, AlertCircle, ShoppingCart, Loader2 } from 'lucide-react';
import { getApiBaseUrl } from '../config';

interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  stock: number;
  created_at: string;
}

interface ProductsProps {
  token: string;
  currency: string;
  addAlert: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function Products({ token, currency, addAlert }: ProductsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/products`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch products');
      }
      setProducts(data);
    } catch (err: any) {
      addAlert(err.message || 'Error fetching products', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProducts();
    }
  }, [token]);

  const resetForm = () => {
    setName('');
    setSku('');
    setPrice(0);
    setStock(0);
    setCurrentProduct(null);
  };

  const handleOpenAdd = () => {
    setModalMode('add');
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (p: Product) => {
    setModalMode('edit');
    setCurrentProduct(p);
    setName(p.name);
    setSku(p.sku);
    setPrice(p.price);
    setStock(p.stock);
    setShowModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || price < 0 || stock < 0) {
      addAlert('Please check details (Name is required, price/stock must be non-negative)', 'error');
      return;
    }

    setSubmitting(true);
    try {
      let url = `${getApiBaseUrl()}/api/products`;
      let method = 'POST';

      if (modalMode === 'edit' && currentProduct) {
        url = `${getApiBaseUrl()}/api/products/${currentProduct.id}`;
        method = 'PUT';
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, sku, price, stock })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      addAlert(
        modalMode === 'add' ? 'Product added successfully!' : 'Product updated successfully!',
        'success'
      );
      
      setShowModal(false);
      resetForm();
      fetchProducts();
    } catch (err: any) {
      addAlert(err.message || 'Failed to submit product info', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this product? This will delete associated billing items.')) {
      return;
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/products/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Delete failed');
      }

      addAlert('Product deleted successfully!', 'success');
      fetchProducts();
    } catch (err: any) {
      addAlert(err.message || 'Failed to delete product', 'error');
    }
  };

  const formatCurrency = (amount: number) => {
    const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency;
    return `${symbol}${amount.toFixed(2)}`;
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-content">
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Product Catalog</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Manage your inventory, pricing, and barcodes</p>
        </div>
        <button className="btn btn-primary" style={{ width: 'auto', padding: '0.65rem 1.25rem' }} onClick={handleOpenAdd}>
          <Plus size={18} /> Add Product
        </button>
      </div>

      {/* Filter and search bar */}
      <div className="glass-card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search by Name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '38px', paddingTop: '0.65rem', paddingBottom: '0.65rem' }}
          />
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Showing {filteredProducts.length} of {products.length} products
        </div>
      </div>

      {/* Main product table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh', flexDirection: 'column', gap: '1rem' }}>
          <Loader2 className="animate-spin" size={35} style={{ color: 'var(--accent-cyan)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading catalog...</p>
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="responsive-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>SKU</th>
                <th>Price</th>
                <th>Stock Level</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => {
                const isLowStock = p.stock < 5;
                const isOutOfStock = p.stock === 0;

                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td><code style={{ fontSize: '0.8rem', color: 'var(--accent-purple)' }}>{p.sku || 'N/A'}</code></td>
                    <td style={{ fontFamily: 'var(--font-title)', fontWeight: 600 }}>{formatCurrency(p.price)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className={`badge ${isOutOfStock ? 'badge-red' : isLowStock ? 'badge-red' : 'badge-cyan'}`}>
                          {p.stock} units
                        </span>
                        {isOutOfStock && <span style={{ color: 'var(--accent-red)', fontSize: '0.75rem', fontWeight: 500 }}>Out of Stock</span>}
                        {!isOutOfStock && isLowStock && <span style={{ color: 'var(--accent-red)', fontSize: '0.75rem', fontWeight: 500 }}>Low Stock</span>}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button 
                          className="btn btn-secondary btn-icon" 
                          onClick={() => handleOpenEdit(p)}
                          title="Edit Product"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          className="btn btn-danger btn-icon" 
                          onClick={() => handleDelete(p.id)}
                          title="Delete Product"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <AlertCircle size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No Products Found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
            {search ? 'No items in catalog matched your search criteria.' : 'Your product inventory is currently empty. Start logging products to bill customers.'}
          </p>
          {!search && (
            <button className="btn btn-primary" style={{ width: 'auto' }} onClick={handleOpenAdd}>
              <Plus size={18} /> Add Your First Product
            </button>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem' }}>{modalMode === 'add' ? 'Add New Product' : 'Edit Product Details'}</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleFormSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="prod-name">Product Name *</label>
                <input
                  id="prod-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Premium Basmati Rice"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="prod-sku">SKU / Code (Optional)</label>
                <input
                  id="prod-sku"
                  type="text"
                  className="form-input"
                  placeholder="e.g. RICE-BAS-01"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="prod-price">Selling Price *</label>
                  <input
                    id="prod-price"
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    placeholder="0.00"
                    value={price || ''}
                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                    disabled={submitting}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="prod-stock">Stock Quantity *</label>
                  <input
                    id="prod-stock"
                    type="number"
                    min="0"
                    className="form-input"
                    placeholder="0"
                    value={stock || ''}
                    onChange={(e) => setStock(parseInt(e.target.value) || 0)}
                    disabled={submitting}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <Loader2 className="animate-spin" size={18} /> : modalMode === 'add' ? 'Save Product' : 'Update Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
