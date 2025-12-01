import { createClient } from '@supabase/supabase-js';
import { Product, Transaction, DailyClosing, User, Category } from '../types';

// ------------------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------------------
const SUPABASE_URL = "https://sjozsnnnhlqpfljphcdi.supabase.co";
const SUPABASE_KEY = "sb_publishable_02pGA-xf6ls7iXFcjpxu-A_ujXIEJyu";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ------------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------------
export const getTodayString = (): string => {
  return new Date().toISOString().split('T')[0];
};

// ------------------------------------------------------------------
// API CALLS
// ------------------------------------------------------------------

export const loginUser = async (username: string, pin: string) => {
  // We use ilike for username to make it case-insensitive
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .ilike('username', username) 
    .eq('pin', pin)
    .single();
  
  if (error) throw error;
  return data;
};

// --- CATEGORIES ---

export const fetchCategories = async (type?: 'EXPENSE' | 'INCOME'): Promise<Category[]> => {
  let query = supabase.from('categories').select('*').order('name');
  
  if (type) {
    query = query.eq('type', type);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const addCategory = async (name: string, type: 'EXPENSE' | 'INCOME') => {
  const { data, error } = await supabase
    .from('categories')
    .insert([{ name, type }])
    .select();
  if (error) throw error;
  return data;
};

export const updateCategory = async (id: number, name: string) => {
  const { error } = await supabase
    .from('categories')
    .update({ name })
    .eq('id', id);
  if (error) throw error;
  return true;
};

export const deleteCategory = async (id: number) => {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
  return true;
};

// --- PRODUCTS ---

export const fetchProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data || [];
};

export const addProduct = async (product: Omit<Product, 'id' | 'current_opening_stock'>) => {
  const { data, error } = await supabase
    .from('products')
    .insert([{ ...product, current_opening_stock: 0 }])
    .select();
  
  if (error) throw error;
  return data;
};

export const updateProduct = async (id: number, product: Partial<Product>) => {
  const { error } = await supabase
    .from('products')
    .update(product)
    .eq('id', id);
  
  if (error) throw error;
  return true;
};

export const deleteProduct = async (id: number) => {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  return true;
};

// --- TRANSACTIONS ---

export const addTransaction = async (transaction: Transaction) => {
  const { data, error } = await supabase
    .from('transactions')
    .insert([transaction]);
  
  if (error) throw error;
  return data;
};

export const fetchTodayStockIn = async (): Promise<Transaction[]> => {
  const today = getTodayString();
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'STOCK_IN')
    .eq('date_str', today)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const fetchTodayExpenses = async (): Promise<Transaction[]> => {
  const today = getTodayString();
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'EXPENSE')
    .eq('date_str', today)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const fetchTodayIncome = async (): Promise<Transaction[]> => {
  const today = getTodayString();
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'INCOME')
    .eq('date_str', today)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const deleteTransaction = async (id: number) => {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  return true;
};

// --- DAILY CLOSING ---

export const fetchTodayClosing = async (): Promise<DailyClosing | null> => {
  const today = getTodayString();
  const { data, error } = await supabase
    .from('daily_closings')
    .select('*')
    .eq('date_str', today)
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
};

export const performDailyClosing = async (
  closingData: { productId: number; newOpeningStock: number }[],
  totalRevenue: number
) => {
  const today = getTodayString();
  
  const updatePromises = closingData.map(async (item) => {
    return supabase
      .from('products')
      .update({ current_opening_stock: item.newOpeningStock })
      .eq('id', item.productId);
  });

  await Promise.all(updatePromises);

  const { error: closingError } = await supabase
    .from('daily_closings')
    .insert([{ date_str: today, total_revenue: totalRevenue }]);

  if (closingError) throw closingError;

  return true;
};

// --- USERS ---

export const fetchUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data || [];
};

export const addUser = async (user: Omit<User, 'id'>) => {
  const { data, error } = await supabase
    .from('users')
    .insert([user])
    .select();
  
  if (error) throw error;
  return data;
};

export const updateUser = async (id: number, user: Partial<User>) => {
  const { error } = await supabase
    .from('users')
    .update(user)
    .eq('id', id);

  if (error) throw error;
  return true;
};

export const deleteUser = async (id: number) => {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  return true;
};