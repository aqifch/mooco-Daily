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
}

export type TransactionType = 'STOCK_IN' | 'EXPENSE' | 'INCOME';

export interface Transaction {
  id?: number;
  type: TransactionType;
  product_id?: number | null;
  quantity?: number | null;
  category?: string | null;
  amount?: number | null;
  note?: string | null;
  date_str: string;
  created_at?: string;
  // For join queries
  products?: {
    name: string;
    unit?: string;
  };
}

export interface DailyClosing {
  id?: number;
  date_str: string;
  total_revenue: number;
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
  SETTINGS = 'SETTINGS',
}