-- Business Billing Schema for PostgreSQL

-- Create Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    business_name VARCHAR(150),
    business_address TEXT,
    reset_token VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    sku VARCHAR(50),
    price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    stock INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Sales/Invoices table
CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(20) DEFAULT 'Cash',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Sale Items table
CREATE TABLE IF NOT EXISTS sale_items (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(150) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00
);

-- Create Expenses/Withdrawals table (Owner withdrawals from sales savings)
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    description TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'Personal Withdrawal',
    payment_method VARCHAR(20) DEFAULT 'Cash',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Settings table (1-to-1 with user)
CREATE TABLE IF NOT EXISTS settings (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    currency VARCHAR(10) DEFAULT 'INR',
    tax_rate NUMERIC(5, 2) DEFAULT 0.00,
    theme VARCHAR(20) DEFAULT 'dark',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger function to auto-create settings row on user insert
CREATE OR REPLACE FUNCTION create_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO settings (user_id, currency, tax_rate, theme)
    VALUES (NEW.id, 'INR', 0.00, 'dark')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Set up trigger on users table
DROP TRIGGER IF EXISTS trigger_create_user_settings ON users;
CREATE TRIGGER trigger_create_user_settings
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_user_settings();
