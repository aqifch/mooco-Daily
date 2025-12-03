import { createClient } from '@supabase/supabase-js';
import { Product, Transaction, DailyClosing, User, Category, CashWithdrawal } from '../types';

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

export const loginUser = async (nameOrUsername: string, pin: string) => {
  // Try to find user by name first (case-insensitive), then by username
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('pin', pin)
    .or(`name.ilike.${nameOrUsername},username.ilike.${nameOrUsername}`)
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

export const addCategory = async (name: string, type: 'EXPENSE' | 'INCOME', parentId?: number | null) => {
  const { data, error } = await supabase
    .from('categories')
    .insert([{ name, type, parent_id: parentId || null }])
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

// Fetch main categories (no parent)
export const fetchMainCategories = async (type?: 'EXPENSE' | 'INCOME'): Promise<Category[]> => {
  let query = supabase
    .from('categories')
    .select('*')
    .is('parent_id', null)
    .order('name');
  
  if (type) {
    query = query.eq('type', type);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

// Fetch sub-categories for a parent category
export const fetchSubCategories = async (parentId: number): Promise<Category[]> => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('parent_id', parentId)
    .order('name');
  
  if (error) throw error;
  return data || [];
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

export const fetchTodayStockIn = async (includeReturns: boolean = false): Promise<Transaction[]> => {
  const today = getTodayString();
  let query = supabase
    .from('transactions')
    .select('*, products(name, unit, sale_price)')
    .eq('type', 'STOCK_IN')
    .eq('date_str', today)
    .order('created_at', { ascending: false });

  // If not including returns, filter them out
  if (!includeReturns) {
    query = query.or('is_return.is.null,is_return.eq.false');
  }

  const { data, error } = await query;
  if (error) throw error;
  
  // Mark transactions that have been returned
  const returnedIds = (data || [])
    .filter(t => t.is_return && t.return_of)
    .map(t => t.return_of);
  
  return (data || []).map(t => ({
    ...t,
    has_been_returned: returnedIds.includes(t.id)
  }));
};

export const fetchTodayExpenses = async (includeReturns: boolean = false): Promise<Transaction[]> => {
  const today = getTodayString();
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('type', 'EXPENSE')
    .eq('date_str', today)
    .order('created_at', { ascending: false });

  if (!includeReturns) {
    query = query.or('is_return.is.null,is_return.eq.false');
  }

  const { data, error } = await query;
  if (error) throw error;
  
  // Mark transactions that have been returned
  const returnedIds = (data || [])
    .filter(t => t.is_return && t.return_of)
    .map(t => t.return_of);
  
  return (data || []).map(t => ({
    ...t,
    has_been_returned: returnedIds.includes(t.id)
  }));
};

export const fetchTodayIncome = async (includeReturns: boolean = false): Promise<Transaction[]> => {
  const today = getTodayString();
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('type', 'INCOME')
    .eq('date_str', today)
    .order('created_at', { ascending: false });

  if (!includeReturns) {
    query = query.or('is_return.is.null,is_return.eq.false');
  }

  const { data, error } = await query;
  if (error) throw error;
  
  // Mark transactions that have been returned
  const returnedIds = (data || [])
    .filter(t => t.is_return && t.return_of)
    .map(t => t.return_of);
  
  return (data || []).map(t => ({
    ...t,
    has_been_returned: returnedIds.includes(t.id)
  }));
};

// RETURN/REVERSE a transaction (instead of deleting)
export const returnTransaction = async (
  originalTxn: Transaction, 
  reason: string
): Promise<{ success: boolean; message: string }> => {
  const today = getTodayString();
  
  try {
    // Create a reversal entry
    const reversalTxn: any = {
      type: originalTxn.type,
      date_str: today,
      is_return: true,
      return_of: originalTxn.id,
      return_reason: reason,
      note: `RETURN: ${originalTxn.note || ''} - Reason: ${reason}`
    };

    // Copy relevant fields based on type
    if (originalTxn.type === 'STOCK_IN') {
      reversalTxn.product_id = originalTxn.product_id;
      reversalTxn.quantity = -(originalTxn.quantity || 0); // Negative quantity for return
    } else {
      reversalTxn.category = originalTxn.category;
      reversalTxn.amount = -(originalTxn.amount || 0); // Negative amount for return
    }

    const { error } = await supabase
      .from('transactions')
      .insert([reversalTxn]);

    if (error) throw error;

    return { success: true, message: 'Transaction returned successfully.' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to return transaction.' };
  }
};

// Fetch returns for a transaction
export const fetchReturnsForTransaction = async (originalId: number): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('return_of', originalId);

  if (error) throw error;
  return data || [];
};

// Legacy delete (kept for backward compatibility but shouldn't be used)
export const deleteTransaction = async (id: number) => {
  // Instead of deleting, we should use returnTransaction
  // This is kept for backward compatibility but logs a warning
  console.warn('deleteTransaction is deprecated. Use returnTransaction instead.');
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  return true;
};

// --- CASH WITHDRAWALS ---

export const fetchTodayWithdrawals = async (): Promise<CashWithdrawal[]> => {
  const today = getTodayString();
  const { data, error } = await supabase
    .from('cash_withdrawals')
    .select('*')
    .eq('date_str', today)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const addCashWithdrawal = async (
  amount: number, 
  reason: string, 
  userId?: number
): Promise<{ success: boolean; message: string }> => {
  const today = getTodayString();
  
  const { error } = await supabase
    .from('cash_withdrawals')
    .insert([{
      amount,
      reason,
      withdrawn_by: userId,
      date_str: today
    }]);

  if (error) {
    return { success: false, message: error.message };
  }
  return { success: true, message: 'Cash withdrawal recorded.' };
};

export const getTotalWithdrawalsToday = async (): Promise<number> => {
  const withdrawals = await fetchTodayWithdrawals();
  return withdrawals.reduce((sum, w) => sum + (w.amount || 0), 0);
};

// --- DAILY CLOSING ---

// Fetch all closings for today (supports multiple closings per day)
export const fetchTodayClosings = async (): Promise<DailyClosing[]> => {
  const today = getTodayString();
  const { data, error } = await supabase
    .from('daily_closings')
    .select('*')
    .eq('date_str', today)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

// Fetch the latest closing for today
export const fetchTodayClosing = async (): Promise<DailyClosing | null> => {
  const today = getTodayString();
  const { data, error } = await supabase
    .from('daily_closings')
    .select('*')
    .eq('date_str', today)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data || null;
};

// Check if FINAL closing done for today
export const isFinalClosingDoneToday = async (): Promise<boolean> => {
  const today = getTodayString();
  const { data, error } = await supabase
    .from('daily_closings')
    .select('id')
    .eq('date_str', today)
    .eq('closing_type', 'final')
    .maybeSingle();

  if (error) return false;
  return data !== null;
};

// Get proper totals from today's closings (handles partial/final correctly)
export const getTodayClosingsTotals = async () => {
  const closings = await fetchTodayClosings();
  
  // Find final closing if exists, otherwise get latest partial
  const finalClosing = closings.find(c => c.closing_type === 'final');
  const latestClosing = closings[0]; // Already sorted by created_at DESC
  
  // Revenue = from final closing if exists, else from latest partial (NOT summed!)
  const actualRevenue = finalClosing?.total_revenue || latestClosing?.total_revenue || 0;
  
  // Cash Received = SUM of all partial deposits + final
  const totalCashReceived = closings.reduce((sum, c) => sum + (c.cash_received || 0), 0);
  
  return {
    totalRevenue: actualRevenue,
    totalCashReceived: totalCashReceived,
    openingCash: 0, // Removed - not used anymore
    closingsCount: closings.length,
    hasFinalClosing: finalClosing !== undefined,
    latestClosing: latestClosing,
    finalClosing: finalClosing
  };
};

export const performDailyClosing = async (
  closingData: { productId: number; newOpeningStock: number }[],
  totalRevenue: number,
  cashReceived: number = 0,
  options?: {
    totalWithdrawals?: number;
    closingType?: 'partial' | 'final';
    notes?: string;
    closedBy?: number;
  }
): Promise<{ success: boolean; message: string }> => {
  const today = getTodayString();
  
  try {
    // Check if final closing already done
    const finalDone = await isFinalClosingDoneToday();
    if (finalDone) {
      return { 
        success: false, 
        message: 'Final closing has already been done for today. No more closings allowed.' 
      };
    }
    
    // If this is a final closing, update product stocks
    if (options?.closingType === 'final') {
      const updateErrors: string[] = [];
      
      for (const item of closingData) {
        const { error } = await supabase
          .from('products')
          .update({ current_opening_stock: item.newOpeningStock })
          .eq('id', item.productId);
        
        if (error) {
          updateErrors.push(`Product ID ${item.productId}: ${error.message}`);
        }
      }
      
      if (updateErrors.length > 0) {
        console.error('Product update errors:', updateErrors);
      }
    }
    
    // Prepare closing stock report data
    const stockReport = closingData.filter(item => item.newOpeningStock > 0 || options?.closingType === 'final');
    
    // Insert closing record with stock details
    // Handle closed_by carefully - only use if it's a valid number
    const closedByValue = options?.closedBy && typeof options.closedBy === 'number' && options.closedBy > 0 
      ? options.closedBy 
      : null;
    
    const { error: closingError } = await supabase
      .from('daily_closings')
      .insert([{ 
        date_str: today, 
        total_revenue: totalRevenue,
        cash_received: cashReceived,
        total_withdrawals: options?.totalWithdrawals || 0,
        closing_type: options?.closingType || 'partial',
        notes: options?.notes,
        closed_by: closedByValue,
        report_json: stockReport.length > 0 ? JSON.stringify({ closingStock: closingData }) : null
      }]);

    if (closingError) {
      throw closingError;
    }

    const closingTypeLabel = options?.closingType === 'final' ? 'Final' : 'Partial';
    return { 
      success: true, 
      message: `${closingTypeLabel} closing completed successfully.` 
    };
    
  } catch (error: any) {
    console.error('Closing error:', error);
    
    // Handle specific error types
    let errorMessage = error.message || 'Failed to complete closing.';
    
    // Foreign key violation (user doesn't exist)
    if (error.code === '23503') {
      errorMessage = 'Invalid user reference. Please re-login and try again.';
    }
    // Unique constraint violation
    else if (error.code === '23505') {
      errorMessage = 'A closing record for today already exists.';
    }
    
    return { 
      success: false, 
      message: errorMessage 
    };
  }
};

// --- REPORTS & HISTORY ---

// Fetch all transactions with optional filters
export const fetchAllTransactions = async (
  filters?: {
    type?: 'STOCK_IN' | 'EXPENSE' | 'INCOME';
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
) => {
  let query = supabase
    .from('transactions')
    .select(`
      id, type, product_id, category, amount, quantity, note, date_str, created_at,
      products(name, unit)
    `)
    .order('created_at', { ascending: false });

  if (filters?.type) {
    query = query.eq('type', filters.type);
  }
  if (filters?.startDate) {
    query = query.gte('date_str', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('date_str', filters.endDate);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

// Fetch all daily closings (history)
export const fetchAllClosings = async (limit?: number) => {
  let query = supabase
    .from('daily_closings')
    .select('*')
    .order('date_str', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

// Get summary stats for a date range
export const fetchReportSummary = async (startDate: string, endDate: string) => {
  // Fetch all data in parallel
  const [transactions, closings] = await Promise.all([
    supabase
      .from('transactions')
      .select('*')
      .gte('date_str', startDate)
      .lte('date_str', endDate),
    supabase
      .from('daily_closings')
      .select('*')
      .gte('date_str', startDate)
      .lte('date_str', endDate)
  ]);

  if (transactions.error) throw transactions.error;
  if (closings.error) throw closings.error;

  const txns = transactions.data || [];
  const allClosings = closings.data || [];

  // Filter closings: Keep only ONE record per day (prioritize final, then latest partial)
  const uniqueClosingsMap = new Map();
  allClosings.forEach(closing => {
    const existing = uniqueClosingsMap.get(closing.date_str);
    if (!existing) {
      uniqueClosingsMap.set(closing.date_str, closing);
    } else {
      // If existing is partial and new is final, replace
      if (existing.closing_type !== 'final' && closing.closing_type === 'final') {
        uniqueClosingsMap.set(closing.date_str, closing);
      }
      // If both partial or both final, keep the latest one (by id or created_at)
      else if (existing.closing_type === closing.closing_type && closing.id > existing.id) {
        uniqueClosingsMap.set(closing.date_str, closing);
      }
    }
  });
  
  const validClosings = Array.from(uniqueClosingsMap.values());

  // Calculate summaries
  // Only count NON-RETURNED transactions for totals
  const validTxns = txns.filter(t => !t.is_return);
  
  // Subtract returns from totals
  const stockInTxns = validTxns.filter(t => t.type === 'STOCK_IN');
  const expenseTxns = validTxns.filter(t => t.type === 'EXPENSE');
  const incomeTxns = validTxns.filter(t => t.type === 'INCOME');

  // Handle returns logic properly
  // Sum amounts (returns are already negative in database if implemented that way, 
  // but our current implementation might store them as positive with is_return=true)
  // Let's check return logic: 
  // In current implementation: is_return=true transactions have negative amounts/quantities?
  // Let's assume they might not. Safer to filter them out or subtract.
  // Actually, best approach is to sum EVERYTHING, because returns should be negative.
  // Let's verify how we store returns.
  // The returnTransaction function stores: quantity = -original.quantity OR amount = -original.amount
  // So simple SUM is correct! We just need to include is_return=true records too.
  
  const allExpenseTxns = txns.filter(t => t.type === 'EXPENSE');
  const allIncomeTxns = txns.filter(t => t.type === 'INCOME');
  
  const totalExpenses = allExpenseTxns.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalIncome = allIncomeTxns.reduce((sum, t) => sum + (t.amount || 0), 0);
  
  // For sales, use the filtered unique closings
  const totalSales = validClosings.reduce((sum, c) => sum + (c.total_revenue || 0), 0);
  
  // For cash received, we need to be careful. 
  // If we allowed multiple partial closings per day, we should SUM their cash_received for that day.
  // BUT, our current closing logic might be accumulating total cash in each record?
  // Let's check DayClosing.tsx: cashReceived is input by user. 
  // If user enters "Total Cash in Drawer", then taking the last record is correct.
  // If user enters "Cash Deposit", then we need to sum.
  // Based on "Save" functionality, it looks like user is entering "Cash Received" at that moment.
  // So we should SUM all cash_received from ALL closings (partial + final).
  const totalCashReceived = allClosings.reduce((sum, c) => sum + (c.cash_received || 0), 0);
  
  const totalLoss = totalSales > totalCashReceived ? totalSales - totalCashReceived : 0;

  return {
    totalSales,
    totalExpenses,
    totalIncome,
    totalCashReceived,
    totalLoss,
    netProfit: totalSales + totalIncome - totalExpenses,
    stockInCount: stockInTxns.length,
    expenseCount: expenseTxns.length,
    incomeCount: incomeTxns.length,
    closingDays: validClosings.length,
    transactions: txns,
    closings: validClosings // Return unique closings for list
  };
};

// Get daily breakdown for charts
export const fetchDailyBreakdown = async (days: number = 30) => {
  const endDate = getTodayString();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startStr = startDate.toISOString().split('T')[0];

  const { data: closings, error } = await supabase
    .from('daily_closings')
    .select('*')
    .gte('date_str', startStr)
    .lte('date_str', endDate)
    .order('date_str', { ascending: true });

  if (error) throw error;
  return closings || [];
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

// ------------------------------------------------------------------
// DATA MANAGEMENT - BULK DELETE OPERATIONS
// ------------------------------------------------------------------

export type DeleteDataType = 'transactions' | 'closings' | 'stock_in' | 'expenses' | 'income' | 'withdrawals' | 'all';

export const deleteDataByType = async (type: DeleteDataType): Promise<{ success: boolean; message: string; deleted: number }> => {
  try {
    let deleted = 0;

    switch (type) {
      case 'transactions':
        // Delete all transactions
        const { data: txnData } = await supabase.from('transactions').select('id');
        if (txnData && txnData.length > 0) {
          const { error } = await supabase.from('transactions').delete().neq('id', 0);
          if (error) throw error;
          deleted = txnData.length;
        }
        break;

      case 'closings':
        // Delete all daily closings
        const { data: closingData } = await supabase.from('daily_closings').select('id');
        if (closingData && closingData.length > 0) {
          const { error } = await supabase.from('daily_closings').delete().neq('id', 0);
          if (error) throw error;
          deleted = closingData.length;
        }
        break;

      case 'stock_in':
        // Delete only STOCK_IN transactions
        const { data: stockData } = await supabase.from('transactions').select('id').eq('type', 'STOCK_IN');
        if (stockData && stockData.length > 0) {
          const { error } = await supabase.from('transactions').delete().eq('type', 'STOCK_IN');
          if (error) throw error;
          deleted = stockData.length;
        }
        break;

      case 'expenses':
        // Delete only EXPENSE transactions
        const { data: expData } = await supabase.from('transactions').select('id').eq('type', 'EXPENSE');
        if (expData && expData.length > 0) {
          const { error } = await supabase.from('transactions').delete().eq('type', 'EXPENSE');
          if (error) throw error;
          deleted = expData.length;
        }
        break;

      case 'income':
        // Delete only INCOME transactions
        const { data: incData } = await supabase.from('transactions').select('id').eq('type', 'INCOME');
        if (incData && incData.length > 0) {
          const { error } = await supabase.from('transactions').delete().eq('type', 'INCOME');
          if (error) throw error;
          deleted = incData.length;
        }
        break;

      case 'withdrawals':
        // Delete all cash withdrawals
        const { data: withdrawData } = await supabase.from('cash_withdrawals').select('id');
        if (withdrawData && withdrawData.length > 0) {
          const { error } = await supabase.from('cash_withdrawals').delete().neq('id', 0);
          if (error) throw error;
          deleted = withdrawData.length;
        }
        break;

      case 'all':
        // Delete everything: transactions, closings, withdrawals, and reset products
        const results = await Promise.all([
          supabase.from('transactions').delete().neq('id', 0),
          supabase.from('daily_closings').delete().neq('id', 0),
          supabase.from('cash_withdrawals').delete().neq('id', 0),
          supabase.from('products').update({ current_opening_stock: 0 }).neq('id', 0)
        ]);
        
        // Check for errors
        for (const result of results) {
          if (result.error) throw result.error;
        }
        
        return { success: true, message: 'All data deleted and products reset.', deleted: -1 };
    }

    return { 
      success: true, 
      message: `Successfully deleted ${deleted} ${type} records.`,
      deleted 
    };
  } catch (error: any) {
    console.error('Delete error:', error);
    return { 
      success: false, 
      message: error.message || 'Failed to delete data.',
      deleted: 0 
    };
  }
};

export const resetProductStock = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const { error } = await supabase
      .from('products')
      .update({ current_opening_stock: 0 })
      .neq('id', 0);
    
    if (error) throw error;
    return { success: true, message: 'All product stock reset to 0.' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to reset stock.' };
  }
};

export const getDataCounts = async (): Promise<{
  transactions: number;
  stockIn: number;
  expenses: number;
  income: number;
  closings: number;
  withdrawals: number;
}> => {
  const [txns, closings, withdrawals] = await Promise.all([
    supabase.from('transactions').select('id, type'),
    supabase.from('daily_closings').select('id'),
    supabase.from('cash_withdrawals').select('id')
  ]);

  const txnData = txns.data || [];
  
  return {
    transactions: txnData.length,
    stockIn: txnData.filter(t => t.type === 'STOCK_IN').length,
    expenses: txnData.filter(t => t.type === 'EXPENSE').length,
    income: txnData.filter(t => t.type === 'INCOME').length,
    closings: closings.data?.length || 0,
    withdrawals: withdrawals.data?.length || 0
  };
};