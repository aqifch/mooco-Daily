import React, { useEffect, useState } from 'react';
import { ViewState, User } from '../types';
import { Layout } from './Layout';
import { PackagePlus, Receipt, Store, TrendingDown, Wallet, HandCoins, AlertTriangle, Sunrise, MinusCircle } from 'lucide-react';
import { fetchTodayExpenses, fetchTodayClosings, fetchTodayIncome, fetchTodayWithdrawals, supabase } from '../services/supabase';

interface DashboardProps {
  onNavigate: (view: ViewState) => void;
  onLogout: () => void;
  user: User | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onLogout, user }) => {
  const [stats, setStats] = useState({
    openingCash: 0,
    sales: 0,
    expenses: 0,
    income: 0,
    withdrawals: 0,
    expectedCash: 0,
    actualCash: 0,
    loss: 0,
    tomorrowOpeningCash: null as number | null
  });
  const [loading, setLoading] = useState(true);
  const [hasFinalClosing, setHasFinalClosing] = useState(true);
  const [hasPartialClosing, setHasPartialClosing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      const [expensesData, incomeData, closingsData, withdrawalsData] = await Promise.all([
        fetchTodayExpenses(),
        fetchTodayIncome(),
        fetchTodayClosings(),
        fetchTodayWithdrawals()
      ]);

      const totalExpenses = expensesData.reduce((acc, curr) => acc + (curr.amount || 0), 0);
      const totalIncome = incomeData.reduce((acc, curr) => acc + (curr.amount || 0), 0);
      const totalWithdrawals = withdrawalsData.reduce((acc, curr) => acc + (curr.amount || 0), 0);
      
      // Check closing status for warnings
      const hasFinal = closingsData.some(c => c.closing_type === 'final');
      const hasPartial = closingsData.some(c => c.closing_type === 'partial');
      setHasFinalClosing(hasFinal);
      setHasPartialClosing(hasPartial);
      
      // Get opening cash from previous day's final closing
      let openingCash = 0;
      try {
        const { data: previousDayClosing } = await supabase
          .from('daily_closings')
          .select('next_day_opening_cash')
          .eq('closing_type', 'final')
          .lt('date_str', today)
          .order('date_str', { ascending: false })
          .limit(1)
          .single();
        
        if (previousDayClosing?.next_day_opening_cash !== null && previousDayClosing?.next_day_opening_cash !== undefined) {
          openingCash = previousDayClosing.next_day_opening_cash;
        }
      } catch (e) {
        // No previous day closing - first time user
        openingCash = 0;
      }
      
      // Get the LATEST closing record
      let totalSales = 0;
      let actualCash = 0;
      let tomorrowOpeningCash: number | null = null;
      
      if (closingsData.length > 0) {
        // Sort by ID desc to get latest
        const latestClosing = closingsData.sort((a, b) => (b.id || 0) - (a.id || 0))[0];
        totalSales = latestClosing.total_revenue || 0;
        actualCash = latestClosing.cash_received || 0;
        
        // Check if tomorrow's opening cash is set
        if (latestClosing.next_day_opening_cash !== null && latestClosing.next_day_opening_cash !== undefined) {
          tomorrowOpeningCash = latestClosing.next_day_opening_cash;
        }
      }
      
      // Expected Cash = Opening Cash + Sales + Income - Expenses - Withdrawals
      const expectedCash = openingCash + totalSales + totalIncome - totalExpenses - totalWithdrawals;
      
      // Loss = Expected - Actual (positive means shortage)
      const loss = expectedCash - actualCash;

      setStats({
        openingCash,
        sales: totalSales,
        expenses: totalExpenses,
        income: totalIncome,
        withdrawals: totalWithdrawals,
        expectedCash,
        actualCash,
        loss: loss > 0 ? loss : 0,
        tomorrowOpeningCash
      });
    } catch (error) {
      console.error("Error loading dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  // Check Permission Helper
  const canAccess = (view: ViewState) => {
    if (!user) return false;
    
    const role = user.role?.toLowerCase() || '';
    if (role === 'admin' || role === 'owner' || role === 'manager') return true;
    
    if (user.permissions && user.permissions.length > 0) {
        const viewLower = view.toLowerCase().replace('_', '');
        return user.permissions.some(p => 
          p === view || p.toLowerCase().replace('_', '') === viewLower || p === '*'
        );
    }
    
    const basicTasks = [ViewState.STOCK_IN, ViewState.EXPENSES, ViewState.INCOME, ViewState.CLOSING];
    return basicTasks.includes(view);
  };

  return (
    <Layout 
      title="Dashboard" 
      onLogout={onLogout} 
      activeView={ViewState.DASHBOARD}
      onNavigate={onNavigate}
      currentUser={user}
    >
      <div className="space-y-4 md:space-y-6">
        {/* Stats Row - 2 per row on mobile, 3 on tablet, 6 on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
            
            {/* 1. Opening Cash */}
            <div className="bg-gradient-to-br from-amber-400 to-amber-500 rounded-xl md:rounded-2xl p-3 md:p-4 text-white shadow-md shadow-amber-100/50">
                <div className="flex items-center gap-1 text-amber-100 text-[9px] md:text-[10px] uppercase font-bold tracking-wider mb-1">
                    <Sunrise size={10} /> Opening
                </div>
                <div className="text-lg md:text-xl font-bold tracking-tight">
                    {loading ? '...' : `₨${stats.openingCash.toFixed(0)}`}
                </div>
            </div>

            {/* 2. Today Sales */}
            <div className="bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-xl md:rounded-2xl p-3 md:p-4 text-white shadow-md shadow-emerald-100/50">
                <div className="flex items-center gap-1 text-emerald-100 text-[9px] md:text-[10px] uppercase font-bold tracking-wider mb-1">
                    <Store size={10} /> Sales
                </div>
                <div className="text-lg md:text-xl font-bold tracking-tight">
                    {loading ? '...' : `₨${stats.sales.toFixed(0)}`}
                </div>
            </div>

            {/* 3. Today Income */}
            <div className="bg-gradient-to-br from-teal-400 to-teal-500 rounded-xl md:rounded-2xl p-3 md:p-4 text-white shadow-md shadow-teal-100/50">
                <div className="flex items-center gap-1 text-teal-100 text-[9px] md:text-[10px] uppercase font-bold tracking-wider mb-1">
                    <HandCoins size={10} /> Income
                </div>
                <div className="text-lg md:text-xl font-bold tracking-tight">
                    {loading ? '...' : `₨${stats.income.toFixed(0)}`}
                </div>
            </div>

            {/* 4. Today Expenses */}
            <div className="bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl md:rounded-2xl p-3 md:p-4 text-white shadow-md shadow-orange-100/50">
                <div className="flex items-center gap-1 text-orange-100 text-[9px] md:text-[10px] uppercase font-bold tracking-wider mb-1">
                    <TrendingDown size={10} /> Expenses
                </div>
                <div className="text-lg md:text-xl font-bold tracking-tight">
                    {loading ? '...' : `₨${stats.expenses.toFixed(0)}`}
                </div>
            </div>

            {/* 5. Withdrawals */}
            <div className="bg-gradient-to-br from-red-400 to-red-500 rounded-xl md:rounded-2xl p-3 md:p-4 text-white shadow-md shadow-red-100/50">
                <div className="flex items-center gap-1 text-red-100 text-[9px] md:text-[10px] uppercase font-bold tracking-wider mb-1">
                    <MinusCircle size={10} /> Withdraw
                </div>
                <div className="text-lg md:text-xl font-bold tracking-tight">
                    {loading ? '...' : `₨${stats.withdrawals.toFixed(0)}`}
                </div>
            </div>

            {/* 6. Expected Cash */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl md:rounded-2xl p-3 md:p-4 text-white shadow-md shadow-blue-100/50">
                <div className="flex items-center gap-1 text-blue-100 text-[9px] md:text-[10px] uppercase font-bold tracking-wider mb-1">
                    <Wallet size={10} /> Expected
                </div>
                <div className="text-lg md:text-xl font-bold tracking-tight">
                    {loading ? '...' : `₨${stats.expectedCash.toFixed(0)}`}
                </div>
            </div>

        </div>

        {/* Loss Alert - Only show if there's a loss */}
        {!loading && stats.loss > 0 && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-red-800 text-sm">⚠️ Cash Shortage Detected</h3>
              <p className="text-red-600 text-xs mt-0.5">
                Expected: Rs {stats.expectedCash.toFixed(0)} | Actual: Rs {stats.actualCash.toFixed(0)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-red-600">Rs {stats.loss.toFixed(0)}</span>
              <p className="text-[10px] text-red-500 uppercase font-bold">Shortage</p>
            </div>
          </div>
        )}

        {/* Tomorrow's Opening Cash - Show if set */}
        {!loading && stats.tomorrowOpeningCash !== null && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sunrise size={18} className="text-blue-500" />
              <div>
                <span className="font-bold text-blue-800 text-sm">Kal ka Opening Cash</span>
                <p className="text-[10px] text-blue-500">Tomorrow's drawer start</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xl font-bold text-blue-700">₨{stats.tomorrowOpeningCash}</span>
              <p className="text-[10px] text-blue-500 font-medium">Set ✓</p>
            </div>
          </div>
        )}

        {/* Final Closing Warning - Compact */}
        {!loading && hasPartialClosing && !hasFinalClosing && (
          <button 
            onClick={() => onNavigate(ViewState.CLOSING)}
            className="w-full bg-amber-50 border border-amber-300 rounded-xl px-4 py-2.5 flex items-center justify-between hover:bg-amber-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-600" />
              <span className="font-bold text-amber-800 text-sm">Final Closing Pending</span>
            </div>
            <span className="text-amber-600 text-xs font-bold">Complete →</span>
          </button>
        )}

      </div>
    </Layout>
  );
};
