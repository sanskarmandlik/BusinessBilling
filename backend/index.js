import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { query } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'family_business_secret_key_123';

app.use(cors());
app.use(express.json());

// --- Authentication Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token missing' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// --- Auth Routes ---

// SIGNUP
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password, businessName, businessAddress } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  try {
    // Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existingUser.rowCount > 0) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user (settings trigger will auto-create default settings)
    const result = await query(
      `INSERT INTO users (name, email, password_hash, business_name, business_address)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, business_name`,
      [name, email.toLowerCase(), passwordHash, businessName || '', businessAddress || '']
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// LOGIN
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (result.rowCount === 0) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        business_name: user.business_name,
        business_address: user.business_address
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// FORGOT PASSWORD
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const result = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (result.rowCount === 0) {
      // For security, don't reveal that the user does not exist
      return res.json({ message: 'If the email exists, a password reset link has been generated.' });
    }

    // Generate simulated recovery token
    const token = jwt.sign({ email: email.toLowerCase(), purpose: 'password_reset' }, JWT_SECRET, { expiresIn: '1h' });
    await query('UPDATE users SET reset_token = $1 WHERE email = $2', [token, email.toLowerCase()]);

    // Send back simulated reset link for local testing ease
    res.json({
      message: 'Simulated password reset link generated successfully.',
      resetLink: `http://localhost:5173/reset-password?token=${token}`
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// RESET PASSWORD
app.post('/api/auth/reset-password', async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }

  try {
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    if (decoded.purpose !== 'password_reset') {
      return res.status(400).json({ error: 'Invalid token purpose' });
    }

    // Check if user exists with this token
    const userResult = await query('SELECT id FROM users WHERE email = $1 AND reset_token = $2', [decoded.email, token]);
    if (userResult.rowCount === 0) {
      return res.status(400).json({ error: 'Invalid or consumed token' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Update password and clear reset token
    await query('UPDATE users SET password_hash = $1, reset_token = NULL WHERE email = $2', [passwordHash, decoded.email]);

    res.json({ message: 'Password has been successfully updated.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Dashboard Stats Endpoint ---
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    // 1. Fetch sales summary by payment method
    const salesCashRes = await query(
      "SELECT COALESCE(SUM(total_amount), 0)::numeric as total, COUNT(*)::integer as count FROM sales WHERE user_id = $1 AND payment_method = 'Cash'",
      [userId]
    );
    const salesOnlineRes = await query(
      "SELECT COALESCE(SUM(total_amount), 0)::numeric as total, COUNT(*)::integer as count FROM sales WHERE user_id = $1 AND payment_method = 'Online'",
      [userId]
    );
    const cashSales = parseFloat(salesCashRes.rows[0].total);
    const onlineSales = parseFloat(salesOnlineRes.rows[0].total);
    const salesCount = salesCashRes.rows[0].count + salesOnlineRes.rows[0].count;
    const totalSales = cashSales + onlineSales;

    // 2. Fetch expenses by payment method (owner withdrawals)
    const expenseCashRes = await query(
      "SELECT COALESCE(SUM(amount), 0)::numeric as total FROM expenses WHERE user_id = $1 AND payment_method = 'Cash'",
      [userId]
    );
    const expenseOnlineRes = await query(
      "SELECT COALESCE(SUM(amount), 0)::numeric as total FROM expenses WHERE user_id = $1 AND payment_method = 'Online'",
      [userId]
    );
    const cashExpenses = parseFloat(expenseCashRes.rows[0].total);
    const onlineExpenses = parseFloat(expenseOnlineRes.rows[0].total);
    const totalExpenses = cashExpenses + onlineExpenses;

    // 3. Current net savings (total and split)
    const cashSaved = cashSales - cashExpenses;
    const onlineSaved = onlineSales - onlineExpenses;
    const totalSaved = cashSaved + onlineSaved;

    // 4. Daily sales summary
    const dailySalesResult = await query(
      `SELECT COALESCE(SUM(total_amount), 0)::numeric as daily_sales_amount, 
              COUNT(*)::integer as daily_sales_count 
       FROM sales 
       WHERE user_id = $1 AND created_at >= CURRENT_DATE`,
      [userId]
    );
    const dailySalesAmount = parseFloat(dailySalesResult.rows[0].daily_sales_amount);
    const dailySalesCount = dailySalesResult.rows[0].daily_sales_count;

    // 5. low stock products
    const lowStockResult = await query(
      'SELECT id, name, sku, stock, price FROM products WHERE user_id = $1 AND stock < 5 ORDER BY stock ASC LIMIT 5',
      [userId]
    );

    // 6. Recent merged activities log (combines customer purchases & aggregates products into brief text)
    const recentSales = await query(
      `SELECT s.id, 'sale' as type, s.total_amount as amount, s.customer_name, s.payment_method, s.created_at,
              COALESCE(STRING_AGG(si.quantity || 'x ' || si.product_name, ', '), 'Items') as items_summary
       FROM sales s
       LEFT JOIN sale_items si ON si.sale_id = s.id
       WHERE s.user_id = $1
       GROUP BY s.id
       ORDER BY s.created_at DESC
       LIMIT 10`,
      [userId]
    );

    const recentExpenses = await query(
      `SELECT id, 'expense' as type, amount, description, payment_method, created_at 
       FROM expenses WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [userId]
    );

    const activities = [
      ...recentSales.rows.map(r => ({ 
        id: r.id,
        type: 'sale',
        amount: parseFloat(r.amount),
        customer_name: r.customer_name,
        payment_method: r.payment_method || 'Cash',
        items_summary: r.items_summary,
        created_at: r.created_at
      })),
      ...recentExpenses.rows.map(r => ({ 
        id: r.id,
        type: 'expense',
        amount: parseFloat(r.amount),
        description: r.description,
        payment_method: r.payment_method || 'Cash',
        created_at: r.created_at
      }))
    ]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);

    // 7. Graph data (last 7 days summary of sales and expenses)
    const graphDataResult = await query(
      `SELECT 
         dates.date::date as day,
         COALESCE(SUM(s.total_amount), 0)::numeric as sales,
         COALESCE(SUM(e.amount), 0)::numeric as expenses
       FROM 
         (SELECT GENERATE_SERIES(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day')::date as date) dates
       LEFT JOIN sales s ON s.user_id = $1 AND s.created_at::date = dates.date
       LEFT JOIN expenses e ON e.user_id = $1 AND e.created_at::date = dates.date
       GROUP BY dates.date
       ORDER BY dates.date ASC`,
      [userId]
    );

    const chartData = graphDataResult.rows.map(row => ({
      date: new Date(row.day).toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' }),
      sales: parseFloat(row.sales),
      expenses: parseFloat(row.expenses)
    }));

    res.json({
      stats: {
        totalSales,
        salesCount,
        totalExpenses,
        totalSaved,
        cashSales,
        onlineSales,
        cashExpenses,
        onlineExpenses,
        cashSaved,
        onlineSaved,
        dailySalesAmount,
        dailySalesCount
      },
      lowStock: lowStockResult.rows,
      recentActivities: activities,
      chartData
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Products Routes ---

// GET PRODUCTS
app.get('/api/products', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, sku, price::numeric, stock, created_at FROM products WHERE user_id = $1 ORDER BY name ASC',
      [req.user.id]
    );
    const products = result.rows.map(p => ({ ...p, price: parseFloat(p.price) }));
    res.json(products);
  } catch (error) {
    console.error('Fetch products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CREATE PRODUCT
app.post('/api/products', authenticateToken, async (req, res) => {
  const { name, sku, price, stock } = req.body;

  if (!name || price === undefined || stock === undefined) {
    return res.status(400).json({ error: 'Name, price, and stock quantity are required' });
  }

  try {
    const result = await query(
      `INSERT INTO products (user_id, name, sku, price, stock)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, name, sku, price::numeric, stock, created_at`,
      [req.user.id, name, sku || '', price, stock]
    );
    const product = result.rows[0];
    product.price = parseFloat(product.price);
    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// EDIT PRODUCT
app.put('/api/products/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, sku, price, stock } = req.body;

  if (!name || price === undefined || stock === undefined) {
    return res.status(400).json({ error: 'Name, price, and stock are required' });
  }

  try {
    const result = await query(
      `UPDATE products 
       SET name = $1, sku = $2, price = $3, stock = $4
       WHERE id = $5 AND user_id = $6
       RETURNING id, name, sku, price::numeric, stock, created_at`,
      [name, sku || '', price, stock, id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Product not found or unauthorized' });
    }

    const product = result.rows[0];
    product.price = parseFloat(product.price);
    res.json(product);
  } catch (error) {
    console.error('Edit product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE PRODUCT
app.delete('/api/products/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query('DELETE FROM products WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Product not found or unauthorized' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Sales Routes ---

// GET SALES
app.get('/api/sales', authenticateToken, async (req, res) => {
  try {
    const salesResult = await query(
      `SELECT id, customer_name, customer_phone, subtotal::numeric, tax_rate::numeric, 
              tax_amount::numeric, discount_amount::numeric, total_amount::numeric, payment_method, created_at 
       FROM sales 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    // Format money types to floats
    const sales = salesResult.rows.map(s => ({
      ...s,
      subtotal: parseFloat(s.subtotal),
      tax_rate: parseFloat(s.tax_rate),
      tax_amount: parseFloat(s.tax_amount),
      discount_amount: parseFloat(s.discount_amount),
      total_amount: parseFloat(s.total_amount)
    }));

    res.json(sales);
  } catch (error) {
    console.error('Fetch sales error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET SALE ITEMS
app.get('/api/sales/:id/items', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // Verify sale belongs to user
    const saleVerify = await query('SELECT id FROM sales WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (saleVerify.rowCount === 0) {
      return res.status(404).json({ error: 'Sale record not found' });
    }

    const itemsResult = await query(
      `SELECT id, sale_id, product_id, product_name, quantity, unit_price::numeric, total_price::numeric
       FROM sale_items 
       WHERE sale_id = $1`,
      [id]
    );

    const items = itemsResult.rows.map(item => ({
      ...item,
      unit_price: parseFloat(item.unit_price),
      total_price: parseFloat(item.total_price)
    }));

    res.json(items);
  } catch (error) {
    console.error('Fetch sale items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CREATE SALE (TRANSACTIONAL)
app.post('/api/sales', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { customerName, customerPhone, items, subtotal, taxRate, taxAmount, discountAmount, totalAmount, paymentMethod } = req.body;
  const activeMethod = paymentMethod === 'Online' ? 'Online' : 'Cash';

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items list is empty' });
  }

  // We should run inside a transaction
  try {
    // 1. Begin transaction
    await query('BEGIN');

    // 2. Insert into sales
    const saleResult = await query(
      `INSERT INTO sales (user_id, customer_name, customer_phone, subtotal, tax_rate, tax_amount, discount_amount, total_amount, payment_method)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [userId, customerName || 'Walk-in Customer', customerPhone || '', subtotal, taxRate, taxAmount, discountAmount, totalAmount, activeMethod]
    );

    const saleId = saleResult.rows[0].id;

    // 3. Insert items and decrement stock
    for (const item of items) {
      // Check if product exists and check stock
      if (item.productId) {
        const productCheck = await query(
          'SELECT stock, name FROM products WHERE id = $1 AND user_id = $2',
          [item.productId, userId]
        );

        if (productCheck.rowCount === 0) {
          throw new Error(`Product ${item.name} not found in inventory.`);
        }

        const currentStock = productCheck.rows[0].stock;
        if (currentStock < item.quantity) {
          throw new Error(`Insufficient stock for product ${productCheck.rows[0].name}. Available: ${currentStock}, Requested: ${item.quantity}`);
        }

        // Decrement stock
        await query(
          'UPDATE products SET stock = stock - $1 WHERE id = $2 AND user_id = $3',
          [item.quantity, item.productId, userId]
        );
      }

      // Insert sale item
      await query(
        `INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [saleId, item.productId || null, item.name, item.quantity, item.price, item.quantity * item.price]
      );
    }

    // 4. Commit transaction
    await query('COMMIT');

    res.status(201).json({
      message: 'Sale transaction recorded successfully',
      saleId
    });

  } catch (error) {
    // Rollback transaction in case of failure
    await query('ROLLBACK');
    console.error('Create sale transaction failed:', error.message);
    res.status(400).json({ error: error.message || 'Transaction failed' });
  }
});

// --- Expenses Routes (Owner Withdrawals) ---

// GET EXPENSES
app.get('/api/expenses', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, amount::numeric, description, category, payment_method, created_at 
       FROM expenses 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    const expenses = result.rows.map(e => ({
      ...e,
      amount: parseFloat(e.amount)
    }));

    res.json(expenses);
  } catch (error) {
    console.error('Fetch expenses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CREATE EXPENSE (Owner Withdrawal)
app.post('/api/expenses', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { amount, description, category, paymentMethod } = req.body;
  const activeMethod = paymentMethod === 'Online' ? 'Online' : 'Cash';

  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'Valid positive withdrawal amount is required' });
  }
  if (!description) {
    return res.status(400).json({ error: 'Description/Reason is required' });
  }

  try {
    // Validate balance for this specific payment mode
    const salesResult = await query('SELECT COALESCE(SUM(total_amount), 0)::numeric as total FROM sales WHERE user_id = $1 AND payment_method = $2', [userId, activeMethod]);
    const expensesResult = await query('SELECT COALESCE(SUM(amount), 0)::numeric as total FROM expenses WHERE user_id = $1 AND payment_method = $2', [userId, activeMethod]);
    const totalSales = parseFloat(salesResult.rows[0].total);
    const totalExpenses = parseFloat(expensesResult.rows[0].total);
    const currentBalance = totalSales - totalExpenses;

    if (parseFloat(amount) > currentBalance) {
      return res.status(400).json({ 
        error: `Insufficient ${activeMethod.toLowerCase()} balance. You have ${currentBalance.toFixed(2)} available, and tried to withdraw ${parseFloat(amount).toFixed(2)}.`
      });
    }

    const result = await query(
      `INSERT INTO expenses (user_id, amount, description, category, payment_method)
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, amount::numeric, description, category, payment_method, created_at`,
      [userId, amount, description, category || 'Personal Withdrawal', activeMethod]
    );

    const expense = result.rows[0];
    expense.amount = parseFloat(expense.amount);

    res.status(201).json({
      message: 'Personal withdrawal logged successfully',
      expense
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Settings & User Details Routes ---

// GET USER INFO
app.get('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, email, business_name, business_address, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Fetch user info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// UPDATE USER INFO
app.put('/api/users/profile', authenticateToken, async (req, res) => {
  const { name, businessName, businessAddress } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const result = await query(
      `UPDATE users 
       SET name = $1, business_name = $2, business_address = $3
       WHERE id = $4
       RETURNING id, name, email, business_name, business_address`,
      [name, businessName || '', businessAddress || '', req.user.id]
    );

    res.json({
      message: 'Profile updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// UPDATE PASSWORD
app.put('/api/users/password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  try {
    const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, req.user.id]);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET SETTINGS
app.get('/api/settings', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT currency, tax_rate::numeric, theme FROM settings WHERE user_id = $1', [req.user.id]);
    if (result.rowCount === 0) {
      // Return defaults if somehow row doesn't exist
      return res.json({ currency: 'INR', tax_rate: 0.00, theme: 'dark' });
    }
    const settings = result.rows[0];
    settings.tax_rate = parseFloat(settings.tax_rate);
    res.json(settings);
  } catch (error) {
    console.error('Fetch settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// UPDATE SETTINGS
app.put('/api/settings', authenticateToken, async (req, res) => {
  const { currency, taxRate, theme } = req.body;

  try {
    const result = await query(
      `INSERT INTO settings (user_id, currency, tax_rate, theme, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) 
       DO UPDATE SET currency = EXCLUDED.currency, tax_rate = EXCLUDED.tax_rate, theme = EXCLUDED.theme, updated_at = CURRENT_TIMESTAMP
       RETURNING currency, tax_rate::numeric, theme`,
      [req.user.id, currency || 'INR', taxRate !== undefined ? taxRate : 0.00, theme || 'dark']
    );

    const settings = result.rows[0];
    settings.tax_rate = parseFloat(settings.tax_rate);

    res.json({
      message: 'Settings updated successfully',
      settings
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start listening on all network interfaces (0.0.0.0 = accessible from phone/other devices on same WiFi)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n=========================================================`);
  console.log(`  ✅ Sanna Billing Server is RUNNING`);
  console.log(`  Mode    : ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Port    : ${PORT}`);
  console.log(`  Local   : http://localhost:${PORT}`);
  console.log(`  Network : http://<your-wifi-ip>:${PORT}  (for mobile APK)`);
  console.log(`  Tip     : Run 'ipconfig' to find your WiFi IPv4 address`);
  console.log(`=========================================================\n`);
});
