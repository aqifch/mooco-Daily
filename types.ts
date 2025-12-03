export interface User {
  id?: number;
  pin: string;
  name: string;
  username?: string;
  role: string;
  permissions?: string[];
}

export interface Product {
  id: number;
  name: string;
  unit?: string;
  sale_price: number;
  current_opening_stock: number;
}

export interface Category {
  id: number;
  name: string;
  type: 'EXPENSE' | 'INCOME';
  parent_id?: number | null;
}

export type TransactionType = 'STOCK_IN' | 'EXPENSE' | 'INCOME';

export interface Transaction {
  id?: number;
  type: TransactionType;
  product_id?: number | null;
  quantity?: number | null;
  category?: string | null;
  sub_category?: string | null;
  amount?: number | null;
  note?: string | null;
  date_str: string;
  created_at?: string;
  // Return/Reversal tracking (never delete, only reverse)
  is_return?: boolean;
  return_of?: number | null;
  return_reason?: string | null;
  // UI helper - set by fetch functions
  has_been_returned?: boolean;
  // For join queries
  products?: {
    name: string;
    unit?: string;
    sale_price?: number;
  };
}

export interface DailyClosing {
  id?: number;
  date_str: string;
  total_revenue: number;
  cash_received?: number | null;
  total_withdrawals?: number;
  closing_type?: 'partial' | 'final';
  notes?: string | null;
  closed_by?: number | null;
  created_at?: string;
  report_json?: any;
  next_day_opening_cash?: number | null;
}

export interface CashWithdrawal {
  id?: number;
  amount: number;
  reason?: string;
  withdrawn_by?: number;
  date_str: string;
  created_at?: string;
}

export enum ViewState {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  STOCK_IN = 'STOCK_IN',
  EXPENSES = 'EXPENSES',
  INCOME = 'INCOME',
  CLOSING = 'CLOSING',
  PRODUCTS = 'PRODUCTS',
  REPORTS = 'REPORTS',
  SETTINGS = 'SETTINGS',
}

// Report Types
export interface DailyReport {
  date: string;
  totalSales: number;
  totalExpenses: number;
  totalIncome: number;
  cashReceived: number;
  loss: number;
  profit: number;
  stockInCount: number;
  expenseCount: number;
  incomeCount: number;
}

export interface TransactionHistory {
  id: number;
  type: string;
  category?: string;
  productName?: string;
  quantity?: number;
  amount?: number;
  note?: string;
  date_str: string;
  created_at: string;
}