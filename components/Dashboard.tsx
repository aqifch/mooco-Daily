import React, { useEffect, useState } from 'react';
import { ViewState, User } from '../types';
import { Layout } from './Layout';
import { PackagePlus, Receipt, Store, TrendingUp, TrendingDown, Wallet, ArrowRight, HandCoins } from 'lucide-react';
import { fetchTodayExpenses, fetchTodayClosing, fetchTodayIncome } from '../services/supabase';

interface DashboardProps {
  onNavigate: (view: ViewState) => void;
  onLogout: () => void;
  user: User | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onLogout, user }) => {
  const userName = user?.name || 'User';
  
  const [stats, setStats] = useState({
    sales: 0,
    expenses: 0,
    income: 0,
    cashDrawer: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch Expenses, Income, and Closing Data in parallel
      const [expensesData, incomeData, closingData] = await Promise.all([
        fetchTodayExpenses(),
        fetchTodayIncome(),
        fetchTodayClosing()
      ]);

      const totalExpenses = expensesData.reduce((acc, curr) => acc + (curr.amount || 0), 0);
      const totalIncome = incomeData.reduce((acc, curr) => acc + (curr.amount || 0), 0);
      const totalSales = closingData ? closingData.total_revenue : 0;
      
      // Cash Drawer = (Sales + Other Income) - Expenses
      const cashInHand = (totalSales + totalIncome) - totalExpenses;

      setStats({
        sales: totalSales,
        expenses: totalExpenses,
        income: totalIncome,
        cashDrawer: cashInHand
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
    if (user.permissions && user.permissions.length > 0) {
        return user.permissions.includes(view);
    }
    // Fallback Legacy
    if (user.role.toLowerCase() === 'admin') return true;
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
      <div className="space-y-6 md:space-y-8">
        {/* Welcome Card */}
        <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl shadow-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
          <div className="relative z-10">
            <p className="text-slate-400 text-sm font-medium mb-1">Welcome back,</p>
            <h2 className="text-3xl font-bold">{userName}</h2>
          </div>
        </div>

        {/* ---------------- NEW STATS ROW ---------------- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* 1. Today Sale */}
            <div className="bg-emerald-500 rounded-2xl p-4 text-white shadow-lg shadow-emerald-100 flex flex-col justify-between h-28">
                <div className="flex items-center gap-1.5 text-emerald-100 text-[10px] uppercase font-bold tracking-wider mb-1">
                    <Store size={12} /> Sales
                </div>
                <div className="text-2xl font-bold tracking-tight">
                    {loading ? '...' : `$${stats.sales.toFixed(0)}`}
                </div>
            </div>

            {/* 2. Today Income */}
            <div className="bg-teal-500 rounded-2xl p-4 text-white shadow-lg shadow-teal-100 flex flex-col justify-between h-28">
                <div className="flex items-center gap-1.5 text-teal-100 text-[10px] uppercase font-bold tracking-wider mb-1">
                    <HandCoins size={12} /> Income
                </div>
                <div className="text-2xl font-bold tracking-tight">
                    {loading ? '...' : `$${stats.income.toFixed(0)}`}
                </div>
            </div>

            {/* 3. Today Expenses */}
            <div className="bg-orange-500 rounded-2xl p-4 text-white shadow-lg shadow-orange-100 flex flex-col justify-between h-28">
                <div className="flex items-center gap-1.5 text-orange-100 text-[10px] uppercase font-bold tracking-wider mb-1">
                    <TrendingDown size={12} /> Expenses
                </div>
                <div className="text-2xl font-bold tracking-tight">
                    {loading ? '...' : `$${stats.expenses.toFixed(0)}`}
                </div>
            </div>

            {/* 4. Cash Drawer (Net) */}
            <div className="bg-blue-600 rounded-2xl p-4 text-white shadow-lg shadow-blue-100 flex flex-col justify-between h-28">
                <div className="flex items-center gap-1.5 text-blue-100 text-[10px] uppercase font-bold tracking-wider mb-1">
                    <Wallet size={12} /> Drawer
                </div>
                <div className="text-2xl font-bold tracking-tight">
                    {loading ? '...' : `$${stats.cashDrawer.toFixed(0)}`}
                </div>
            </div>

        </div>

        {/* Primary Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {canAccess(ViewState.STOCK_IN) && (
            <button
              onClick={() => onNavigate(ViewState.STOCK_IN)}
              className="group flex items-center gap-4 p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-blue-500 hover:shadow-lg hover:shadow-blue-50 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <PackagePlus size={24} />
              </div>
              <div className="text-left">
                <h3 className="text-base font-bold text-slate-800">Stock In</h3>
                <p className="text-xs text-slate-400">Add Inventory</p>
              </div>
            </button>
          )}

          {canAccess(ViewState.EXPENSES) && (
            <button
              onClick={() => onNavigate(ViewState.EXPENSES)}
              className="group flex items-center gap-4 p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-orange-500 hover:shadow-lg hover:shadow-orange-50 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Receipt size={24} />
              </div>
              <div className="text-left">
                <h3 className="text-base font-bold text-slate-800">Expenses</h3>
                <p className="text-xs text-slate-400">Record Costs</p>
              </div>
            </button>
          )}

          {canAccess(ViewState.INCOME) && (
            <button
              onClick={() => onNavigate(ViewState.INCOME)}
              className="group flex items-center gap-4 p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-teal-500 hover:shadow-lg hover:shadow-teal-50 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <HandCoins size={24} />
              </div>
              <div className="text-left">
                <h3 className="text-base font-bold text-slate-800">Income</h3>
                <p className="text-xs text-slate-400">Record Earnings</p>
              </div>
            </button>
          )}

          {canAccess(ViewState.CLOSING) && (
            <button
              onClick={() => onNavigate(ViewState.CLOSING)}
              className="group flex items-center gap-4 p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-50 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Store size={24} />
              </div>
              <div className="text-left">
                <h3 className="text-base font-bold text-slate-800">Closing</h3>
                <p className="text-xs text-slate-400">End Day Shift</p>
              </div>
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
};