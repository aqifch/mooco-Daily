-- ============================================
-- MOOCO-DAILY DATABASE SCHEMA
-- Complete setup with RLS policies
-- ============================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS daily_closings CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  pin TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'STAFF',
  permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table RLS: Disabled for now (app uses publishable key)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON users FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON users FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON users FOR DELETE USING (true);

-- ============================================
-- 2. CATEGORIES TABLE
-- ============================================
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('EXPENSE', 'INCOME')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON categories FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON categories FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON categories FOR DELETE USING (true);

-- ============================================
-- 3. PRODUCTS TABLE
-- ============================================
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT,
  sale_price NUMERIC NOT NULL DEFAULT 0,
  current_opening_stock NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON products FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON products FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON products FOR DELETE USING (true);

-- ============================================
-- 4. TRANSACTIONS TABLE
-- ============================================
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('STOCK_IN', 'EXPENSE', 'INCOME')),
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  quantity NUMERIC,
  category TEXT,
  amount NUMERIC,
  note TEXT,
  date_str TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster date queries
CREATE INDEX idx_transactions_date_str ON transactions(date_str);
CREATE INDEX idx_transactions_type ON transactions(type);

-- Transactions RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON transactions FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON transactions FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON transactions FOR DELETE USING (true);

-- ============================================
-- 5. DAILY CLOSINGS TABLE
-- ============================================
CREATE TABLE daily_closings (
  id SERIAL PRIMARY KEY,
  date_str TEXT NOT NULL UNIQUE,
  total_revenue NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily Closings RLS
ALTER TABLE daily_closings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON daily_closings FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON daily_closings FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON daily_closings FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON daily_closings FOR DELETE USING (true);

-- ============================================
-- SEED DATA
-- ============================================

-- Insert default admin user
INSERT INTO users (username, pin, name, role, permissions) VALUES
('admin', '1234', 'Administrator', 'OWNER', ARRAY['*']);

-- Insert expense categories
INSERT INTO categories (name, type) VALUES
('Utilities', 'EXPENSE'),
('Salaries', 'EXPENSE'),
('Rent', 'EXPENSE'),
('Transportation', 'EXPENSE'),
('Maintenance', 'EXPENSE'),
('Supplies', 'EXPENSE'),
('Miscellaneous', 'EXPENSE');

-- Insert income categories
INSERT INTO categories (name, type) VALUES
('Product Sales', 'INCOME'),
('Services', 'INCOME'),
('Other Income', 'INCOME');

-- Insert sample products
INSERT INTO products (name, unit, sale_price, current_opening_stock) VALUES
('Milk (1L)', 'Liter', 2.50, 0),
('Yogurt (500g)', 'Gram', 3.00, 0),
('Cheese (250g)', 'Gram', 5.00, 0),
('Butter (200g)', 'Gram', 4.50, 0),
('Cream (250ml)', 'ML', 3.50, 0);

-- ============================================
-- COMPLETE!
-- ============================================

SELECT 'Database schema created successfully!' AS status;
SELECT 'Total users: ' || COUNT(*) FROM users;
SELECT 'Total categories: ' || COUNT(*) FROM categories;
SELECT 'Total products: ' || COUNT(*) FROM products;
