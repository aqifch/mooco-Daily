import React, { useEffect, useState, useMemo } from 'react';
import { Layout } from './Layout';
import { ViewState, User, Transaction, DailyClosing } from '../types';
import { 
  fetchAllTransactions, 
  fetchAllClosings, 
  fetchReportSummary,
  fetchDailyBreakdown 
} from '../services/supabase';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Filter, 
  Download,
  Clock,
  Package,
  Receipt,
  HandCoins,
  Store,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Search,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  PieChart
} from 'lucide-react';

interface ReportsProps {
  onBack: () => void;
  onNavigate: (view: ViewState) => void;
  currentUser: User | null;
}

type TabType = 'overview' | 'transactions' | 'closings' | 'categories';
type DateRange = 'today' | 'week' | 'month' | 'year' | 'custom';
type TransactionFilter = 'ALL' | 'STOCK_IN' | 'EXPENSE' | 'INCOME';

interface CategoryBreakdown {
  category: string;
  subCategory?: string;
  total: number;
  count: number;
  percentage: number;
}

export const Reports: React.FC<ReportsProps> = ({ onBack, onNavigate, currentUser }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data states
  const [summary, setSummary] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [closings, setClosings] = useState<DailyClosing[]>([]);
  const [dailyData, setDailyData] = useState<any[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Calculate date range
  const getDateRange = () => {
    const today = new Date();
    const endDate = today.toISOString().split('T')[0];
    let startDate = endDate;

    switch (dateRange) {
      case 'today':
        startDate = endDate;
        break;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        startDate = weekAgo.toISOString().split('T')[0];
        break;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        startDate = monthAgo.toISOString().split('T')[0];
        break;
      case 'year':
        const yearAgo = new Date(today);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        startDate = yearAgo.toISOString().split('T')[0];
        break;
      case 'custom':
        startDate = customStart || endDate;
        return { start: startDate, end: customEnd || endDate };
    }
    return { start: startDate, end: endDate };
  };

  useEffect(() => {
    loadData();
  }, [dateRange, customStart, customEnd]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      
      const [summaryData, txnData, closingData, dailyBreakdown] = await Promise.all([
        fetchReportSummary(start, end),
        fetchAllTransactions({ startDate: start, endDate: end }),
        fetchAllClosings(100),
        fetchDailyBreakdown(30)
      ]);

      setSummary(summaryData);
      setTransactions(txnData);
      setClosings(closingData);
      setDailyData(dailyBreakdown);
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    
    if (transactionFilter !== 'ALL') {
      filtered = filtered.filter(t => t.type === transactionFilter);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.category?.toLowerCase().includes(query) ||
        t.products?.name?.toLowerCase().includes(query) ||
        t.note?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [transactions, transactionFilter, searchQuery]);

  // Pagination
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(start, start + itemsPerPage);
  }, [filteredTransactions, currentPage]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  // Category breakdown calculations
  const expenseBreakdown = useMemo((): CategoryBreakdown[] => {
    const expenses = transactions.filter(t => t.type === 'EXPENSE' && !t.is_return);
    const totalExpenses = expenses.reduce((sum, t) => sum + (t.amount || 0), 0);
    
    // Group by category (main category)
    const categoryMap = new Map<string, { total: number; count: number; subCategories: Map<string, { total: number; count: number }> }>();
    
    expenses.forEach(t => {
      const cat = t.category || 'Uncategorized';
      const subCat = t.sub_category || null;
      
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, { total: 0, count: 0, subCategories: new Map() });
      }
      
      const catData = categoryMap.get(cat)!;
      catData.total += t.amount || 0;
      catData.count += 1;
      
      if (subCat) {
        if (!catData.subCategories.has(subCat)) {
          catData.subCategories.set(subCat, { total: 0, count: 0 });
        }
        const subData = catData.subCategories.get(subCat)!;
        subData.total += t.amount || 0;
        subData.count += 1;
      }
    });
    
    // Convert to array and sort by total
    const result: CategoryBreakdown[] = [];
    categoryMap.forEach((data, cat) => {
      result.push({
        category: cat,
        total: data.total,
        count: data.count,
        percentage: totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0
      });
      
      // Add sub-categories
      data.subCategories.forEach((subData, subCat) => {
        result.push({
          category: cat,
          subCategory: subCat,
          total: subData.total,
          count: subData.count,
          percentage: totalExpenses > 0 ? (subData.total / totalExpenses) * 100 : 0
        });
      });
    });
    
    return result.sort((a, b) => b.total - a.total);
  }, [transactions]);

  const incomeBreakdown = useMemo((): CategoryBreakdown[] => {
    const incomes = transactions.filter(t => t.type === 'INCOME' && !t.is_return);
    const totalIncome = incomes.reduce((sum, t) => sum + (t.amount || 0), 0);
    
    // Group by category
    const categoryMap = new Map<string, { total: number; count: number; subCategories: Map<string, { total: number; count: number }> }>();
    
    incomes.forEach(t => {
      const cat = t.category || 'Uncategorized';
      const subCat = t.sub_category || null;
      
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, { total: 0, count: 0, subCategories: new Map() });
      }
      
      const catData = categoryMap.get(cat)!;
      catData.total += t.amount || 0;
      catData.count += 1;
      
      if (subCat) {
        if (!catData.subCategories.has(subCat)) {
          catData.subCategories.set(subCat, { total: 0, count: 0 });
        }
        const subData = catData.subCategories.get(subCat)!;
        subData.total += t.amount || 0;
        subData.count += 1;
      }
    });
    
    // Convert to array and sort by total
    const result: CategoryBreakdown[] = [];
    categoryMap.forEach((data, cat) => {
      result.push({
        category: cat,
        total: data.total,
        count: data.count,
        percentage: totalIncome > 0 ? (data.total / totalIncome) * 100 : 0
      });
      
      // Add sub-categories
      data.subCategories.forEach((subData, subCat) => {
        result.push({
          category: cat,
          subCategory: subCat,
          total: subData.total,
          count: subData.count,
          percentage: totalIncome > 0 ? (subData.total / totalIncome) * 100 : 0
        });
      });
    });
    
    return result.sort((a, b) => b.total - a.total);
  }, [transactions]);

  const totalExpenseAmount = useMemo(() => 
    expenseBreakdown.filter(e => !e.subCategory).reduce((sum, e) => sum + e.total, 0)
  , [expenseBreakdown]);

  const totalIncomeAmount = useMemo(() => 
    incomeBreakdown.filter(i => !i.subCategory).reduce((sum, i) => sum + i.total, 0)
  , [incomeBreakdown]);

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-PK', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-PK', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  // Transaction type colors
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'STOCK_IN': return 'bg-blue-100 text-blue-700';
      case 'EXPENSE': return 'bg-orange-100 text-orange-700';
      case 'INCOME': return 'bg-teal-100 text-teal-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'STOCK_IN': return <Package size={14} />;
      case 'EXPENSE': return <Receipt size={14} />;
      case 'INCOME': return <HandCoins size={14} />;
      default: return <Clock size={14} />;
    }
  };

  return (
    <Layout 
      title="Reports & History" 
      onBack={onBack}
      activeView={ViewState.REPORTS}
      onNavigate={onNavigate}
      currentUser={currentUser}
    >
      <div className="space-y-6 pb-24">
        
        {/* Header with Date Range */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Business Reports</h2>
            <p className="text-sm text-slate-500">Analyze your business performance</p>
          </div>
          
          {/* Date Range Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            {(['today', 'week', 'month', 'year'] as DateRange[]).map(range => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                  dateRange === range 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {range === 'today' ? 'Today' : range === 'week' ? '7 Days' : range === 'month' ? '30 Days' : '1 Year'}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: PieChart },
            { id: 'categories', label: 'Categories', icon: Receipt },
            { id: 'transactions', label: 'Transactions', icon: Clock },
            { id: 'closings', label: 'Daily', icon: BarChart3 },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as TabType); setCurrentPage(1); }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon size={18} />
              <span className="hidden md:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="h-28 bg-slate-200 rounded-2xl"></div>)}
            </div>
            <div className="h-64 bg-slate-200 rounded-2xl"></div>
          </div>
        ) : (
          <>
            {/* ==================== OVERVIEW TAB ==================== */}
            {activeTab === 'overview' && summary && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Total Sales */}
                  <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 text-white shadow-lg">
                    <div className="flex items-center gap-1.5 text-emerald-100 text-[10px] uppercase font-bold tracking-wider mb-2">
                      <Store size={12} /> Total Sales
                    </div>
                    <div className="text-2xl font-bold">Rs {summary.totalSales?.toLocaleString()}</div>
                    <div className="text-xs text-emerald-100 mt-1">{summary.closingDays} closing days</div>
                  </div>

                  {/* Total Income */}
                  <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-4 text-white shadow-lg">
                    <div className="flex items-center gap-1.5 text-teal-100 text-[10px] uppercase font-bold tracking-wider mb-2">
                      <TrendingUp size={12} /> Other Income
                    </div>
                    <div className="text-2xl font-bold">Rs {summary.totalIncome?.toLocaleString()}</div>
                    <div className="text-xs text-teal-100 mt-1">{summary.incomeCount} transactions</div>
                  </div>

                  {/* Total Expenses */}
                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-4 text-white shadow-lg">
                    <div className="flex items-center gap-1.5 text-orange-100 text-[10px] uppercase font-bold tracking-wider mb-2">
                      <TrendingDown size={12} /> Expenses
                    </div>
                    <div className="text-2xl font-bold">Rs {summary.totalExpenses?.toLocaleString()}</div>
                    <div className="text-xs text-orange-100 mt-1">{summary.expenseCount} transactions</div>
                  </div>

                  {/* Net Profit */}
                  <div className={`rounded-2xl p-4 text-white shadow-lg ${
                    summary.netProfit >= 0 
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                      : 'bg-gradient-to-br from-red-500 to-red-600'
                  }`}>
                    <div className="flex items-center gap-1.5 text-blue-100 text-[10px] uppercase font-bold tracking-wider mb-2">
                      <Wallet size={12} /> Net Profit
                    </div>
                    <div className="text-2xl font-bold">Rs {summary.netProfit?.toLocaleString()}</div>
                    <div className="text-xs opacity-80 mt-1">Sales + Income - Expenses</div>
                  </div>
                </div>

                {/* Loss Alert */}
                {summary.totalLoss > 0 && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-red-800">Cash Loss Detected</h3>
                      <p className="text-red-600 text-sm">
                        Expected: Rs {summary.totalSales?.toLocaleString()} | Received: Rs {summary.totalCashReceived?.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-red-600">Rs {summary.totalLoss?.toLocaleString()}</span>
                      <p className="text-[10px] text-red-500 uppercase font-bold">Total Loss</p>
                    </div>
                  </div>
                )}

                {/* Quick Stats */}
                <div className="grid md:grid-cols-3 gap-4">
                  {/* Stock In Summary */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                        <Package size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">Stock Entries</h3>
                        <p className="text-xs text-slate-500">{summary.stockInCount} entries</p>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-blue-600">{summary.stockInCount}</div>
                  </div>

                  {/* Expense Summary */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                        <Receipt size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">Expense Records</h3>
                        <p className="text-xs text-slate-500">{summary.expenseCount} records</p>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-orange-600">{summary.expenseCount}</div>
                  </div>

                  {/* Income Summary */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center">
                        <HandCoins size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">Income Records</h3>
                        <p className="text-xs text-slate-500">{summary.incomeCount} records</p>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-teal-600">{summary.incomeCount}</div>
                  </div>
                </div>

                {/* Daily Trend Chart (Simple visual) */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <BarChart3 size={20} className="text-blue-500" />
                    Daily Sales Trend (Last 30 Days)
                  </h3>
                  
                  {(() => {
                    // Generate last 30 days with data
                    const last30Days: { date: string; revenue: number; cashReceived: number; hasData: boolean }[] = [];
                    const today = new Date();
                    
                    for (let i = 29; i >= 0; i--) {
                      const date = new Date(today);
                      date.setDate(date.getDate() - i);
                      const dateStr = date.toISOString().split('T')[0];
                      
                      // Find matching data
                      const dayData = dailyData.find(d => d.date_str === dateStr);
                      
                      last30Days.push({
                        date: dateStr,
                        revenue: dayData?.total_revenue || 0,
                        cashReceived: dayData?.cash_received || 0,
                        hasData: !!dayData
                      });
                    }
                    
                    const maxRevenue = Math.max(...last30Days.map(d => d.revenue), 1);
                    const totalRevenue = last30Days.reduce((sum, d) => sum + d.revenue, 0);
                    const daysWithSales = last30Days.filter(d => d.revenue > 0).length;
                    
                    return (
                      <>
                        {/* Stats Row */}
                        <div className="grid grid-cols-3 gap-4 mb-6">
                          <div className="bg-emerald-50 rounded-xl p-3 text-center">
                            <p className="text-xs text-emerald-600 font-medium">Total Sales</p>
                            <p className="text-lg font-bold text-emerald-700">Rs {totalRevenue.toLocaleString()}</p>
                          </div>
                          <div className="bg-blue-50 rounded-xl p-3 text-center">
                            <p className="text-xs text-blue-600 font-medium">Days with Sales</p>
                            <p className="text-lg font-bold text-blue-700">{daysWithSales} / 30</p>
                          </div>
                          <div className="bg-purple-50 rounded-xl p-3 text-center">
                            <p className="text-xs text-purple-600 font-medium">Avg/Day</p>
                            <p className="text-lg font-bold text-purple-700">Rs {daysWithSales > 0 ? Math.round(totalRevenue / daysWithSales).toLocaleString() : 0}</p>
                          </div>
                        </div>
                        
                        {/* Chart */}
                        <div className="relative">
                          {/* Y-axis labels */}
                          <div className="absolute left-0 top-0 bottom-6 w-12 flex flex-col justify-between text-[9px] text-slate-400 text-right pr-2">
                            <span>Rs {maxRevenue.toLocaleString()}</span>
                            <span>Rs {Math.round(maxRevenue / 2).toLocaleString()}</span>
                            <span>0</span>
                          </div>
                          
                          {/* Chart Area */}
                          <div className="ml-14">
                            <div className="flex items-end gap-[2px] h-40 border-l border-b border-slate-200 pl-1 pb-1">
                              {last30Days.map((day, idx) => {
                                const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                                const hasLoss = day.hasData && day.cashReceived < day.revenue;
                                const isToday = idx === 29;
                                const dayNum = new Date(day.date).getDate();
                                
                                return (
                                  <div 
                                    key={idx} 
                                    className="flex-1 flex flex-col items-center group relative"
                                  >
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                                      <div className="bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap">
                                        <p className="font-bold">{new Date(day.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</p>
                                        <p>Sales: Rs {day.revenue.toLocaleString()}</p>
                                        {day.hasData && <p>Cash: Rs {day.cashReceived.toLocaleString()}</p>}
                                      </div>
                                    </div>
                                    
                                    {/* Bar */}
                                    <div 
                                      className={`w-full rounded-t transition-all cursor-pointer ${
                                        !day.hasData 
                                          ? 'bg-slate-200' 
                                          : hasLoss 
                                            ? 'bg-red-400 hover:bg-red-500' 
                                            : 'bg-emerald-400 hover:bg-emerald-500'
                                      } ${isToday ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
                                      style={{ height: `${Math.max(height, 2)}%`, minHeight: day.hasData ? '4px' : '2px' }}
                                    ></div>
                                    
                                    {/* Date label (show every 5th day) */}
                                    {(idx % 5 === 0 || isToday) && (
                                      <span className={`text-[8px] mt-1 ${isToday ? 'text-blue-600 font-bold' : 'text-slate-400'}`}>
                                        {dayNum}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        
                        {/* Legend */}
                        <div className="flex items-center justify-center gap-6 mt-4 text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 bg-emerald-400 rounded"></div>
                            <span className="text-slate-500">Sales (No Loss)</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 bg-red-400 rounded"></div>
                            <span className="text-slate-500">Has Cash Loss</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 bg-slate-200 rounded"></div>
                            <span className="text-slate-500">No Data</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 bg-blue-400 rounded ring-2 ring-blue-300"></div>
                            <span className="text-slate-500">Today</span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* ==================== TRANSACTIONS TAB ==================== */}
            {activeTab === 'transactions' && (
              <div className="space-y-4">
                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-3">
                  {/* Search */}
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search transactions..."
                      value={searchQuery}
                      onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none text-sm"
                    />
                  </div>
                  
                  {/* Type Filter */}
                  <div className="flex gap-2">
                    {(['ALL', 'STOCK_IN', 'EXPENSE', 'INCOME'] as TransactionFilter[]).map(filter => (
                      <button
                        key={filter}
                        onClick={() => { setTransactionFilter(filter); setCurrentPage(1); }}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                          transactionFilter === filter 
                            ? filter === 'ALL' ? 'bg-slate-800 text-white'
                            : filter === 'STOCK_IN' ? 'bg-blue-600 text-white'
                            : filter === 'EXPENSE' ? 'bg-orange-600 text-white'
                            : 'bg-teal-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {filter === 'ALL' ? 'All' : filter === 'STOCK_IN' ? 'Stock In' : filter === 'EXPENSE' ? 'Expenses' : 'Income'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Results count */}
                <div className="text-sm text-slate-500">
                  Showing {paginatedTransactions.length} of {filteredTransactions.length} transactions
                </div>

                {/* Transaction List */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  {paginatedTransactions.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <Clock size={32} className="mx-auto mb-2 opacity-50" />
                      <p>No transactions found</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {paginatedTransactions.map(txn => (
                        <div key={txn.id} className="p-4 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-4">
                            {/* Type Badge */}
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getTypeColor(txn.type)}`}>
                              {getTypeIcon(txn.type)}
                            </div>
                            
                            {/* Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 truncate">
                                  {txn.type === 'STOCK_IN' 
                                    ? txn.products?.name || 'Unknown Product'
                                    : txn.category || 'Uncategorized'
                                  }
                                </span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getTypeColor(txn.type)}`}>
                                  {txn.type.replace('_', ' ')}
                                </span>
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                {txn.note && <span className="mr-2">{txn.note}</span>}
                                {formatDate(txn.date_str)} • {formatTime(txn.created_at)}
                              </div>
                            </div>
                            
                            {/* Amount/Quantity */}
                            <div className="text-right">
                              {txn.type === 'STOCK_IN' ? (
                                <span className="font-bold text-blue-600">+{txn.quantity} {txn.products?.unit || ''}</span>
                              ) : (
                                <span className={`font-bold ${txn.type === 'EXPENSE' ? 'text-orange-600' : 'text-teal-600'}`}>
                                  Rs {txn.amount?.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span className="text-sm text-slate-600 px-4">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ==================== CLOSINGS TAB ==================== */}
            {activeTab === 'closings' && (
              <div className="space-y-4">
                <div className="text-sm text-slate-500">
                  {closings.length} closing records found
                </div>

                {closings.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400">
                    <BarChart3 size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No closing records yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {closings.map(closing => {
                      const loss = (closing.total_revenue || 0) - (closing.cash_received || 0);
                      const hasLoss = loss > 0;
                      
                      return (
                        <div 
                          key={closing.id} 
                          className={`bg-white rounded-2xl border p-4 shadow-sm transition-all hover:shadow-md ${
                            hasLoss ? 'border-red-200' : 'border-slate-100'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                hasLoss ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                              }`}>
                                <Calendar size={20} />
                              </div>
                              <div>
                                <h3 className="font-bold text-slate-800">{formatDate(closing.date_str)}</h3>
                                <p className="text-xs text-slate-400">
                                  Closed at {closing.created_at ? formatTime(closing.created_at) : '-'}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <p className="text-xs text-slate-400">Expected</p>
                                <p className="font-bold text-slate-800">Rs {(closing.total_revenue || 0).toLocaleString()}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-slate-400">Received</p>
                                <p className="font-bold text-blue-600">Rs {(closing.cash_received || 0).toLocaleString()}</p>
                              </div>
                              {hasLoss && (
                                <div className="text-right">
                                  <p className="text-xs text-red-400">Loss</p>
                                  <p className="font-bold text-red-600 flex items-center gap-1">
                                    <ArrowDownRight size={14} />
                                    Rs {loss.toLocaleString()}
                                  </p>
                                </div>
                              )}
                              {!hasLoss && loss < 0 && (
                                <div className="text-right">
                                  <p className="text-xs text-emerald-400">Extra</p>
                                  <p className="font-bold text-emerald-600 flex items-center gap-1">
                                    <ArrowUpRight size={14} />
                                    Rs {Math.abs(loss).toLocaleString()}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ==================== CATEGORIES TAB ==================== */}
            {activeTab === 'categories' && (
              <div className="space-y-6">
                
                {/* Expenses by Category */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-orange-50 to-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                          <TrendingDown size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800">Expenses by Category</h3>
                          <p className="text-xs text-slate-500">{expenseBreakdown.filter(e => !e.subCategory).length} categories</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-orange-600">Rs {totalExpenseAmount.toLocaleString()}</p>
                        <p className="text-xs text-slate-500">Total Expenses</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    {expenseBreakdown.filter(e => !e.subCategory).length === 0 ? (
                      <p className="text-center text-slate-400 py-8">No expense data for this period</p>
                    ) : (
                      <div className="space-y-3">
                        {expenseBreakdown.filter(e => !e.subCategory).map((item, idx) => {
                          const subItems = expenseBreakdown.filter(e => e.subCategory && e.category === item.category);
                          
                          return (
                            <div key={idx} className="space-y-2">
                              {/* Main Category */}
                              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-slate-800">{item.category}</span>
                                    <span className="font-bold text-orange-600">Rs {item.total.toLocaleString()}</span>
                                  </div>
                                  {/* Progress bar */}
                                  <div className="h-2 bg-orange-100 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-orange-500 rounded-full transition-all"
                                      style={{ width: `${item.percentage}%` }}
                                    ></div>
                                  </div>
                                  <div className="flex justify-between mt-1 text-[10px] text-slate-500">
                                    <span>{item.count} transactions</span>
                                    <span>{item.percentage.toFixed(1)}%</span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Sub-categories */}
                              {subItems.length > 0 && (
                                <div className="ml-4 space-y-1">
                                  {subItems.map((sub, subIdx) => (
                                    <div key={subIdx} className="flex items-center justify-between p-2 pl-4 bg-slate-50 rounded-lg border-l-2 border-orange-300">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm text-slate-600">{sub.subCategory}</span>
                                        <span className="text-[10px] text-slate-400">({sub.count})</span>
                                      </div>
                                      <span className="text-sm font-medium text-orange-600">Rs {sub.total.toLocaleString()}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Income by Category */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-teal-50 to-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center">
                          <TrendingUp size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800">Income by Category</h3>
                          <p className="text-xs text-slate-500">{incomeBreakdown.filter(i => !i.subCategory).length} categories</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-teal-600">Rs {totalIncomeAmount.toLocaleString()}</p>
                        <p className="text-xs text-slate-500">Total Income</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    {incomeBreakdown.filter(i => !i.subCategory).length === 0 ? (
                      <p className="text-center text-slate-400 py-8">No income data for this period</p>
                    ) : (
                      <div className="space-y-3">
                        {incomeBreakdown.filter(i => !i.subCategory).map((item, idx) => {
                          const subItems = incomeBreakdown.filter(i => i.subCategory && i.category === item.category);
                          
                          return (
                            <div key={idx} className="space-y-2">
                              {/* Main Category */}
                              <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-xl">
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-slate-800">{item.category}</span>
                                    <span className="font-bold text-teal-600">Rs {item.total.toLocaleString()}</span>
                                  </div>
                                  {/* Progress bar */}
                                  <div className="h-2 bg-teal-100 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-teal-500 rounded-full transition-all"
                                      style={{ width: `${item.percentage}%` }}
                                    ></div>
                                  </div>
                                  <div className="flex justify-between mt-1 text-[10px] text-slate-500">
                                    <span>{item.count} transactions</span>
                                    <span>{item.percentage.toFixed(1)}%</span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Sub-categories */}
                              {subItems.length > 0 && (
                                <div className="ml-4 space-y-1">
                                  {subItems.map((sub, subIdx) => (
                                    <div key={subIdx} className="flex items-center justify-between p-2 pl-4 bg-slate-50 rounded-lg border-l-2 border-teal-300">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm text-slate-600">{sub.subCategory}</span>
                                        <span className="text-[10px] text-slate-400">({sub.count})</span>
                                      </div>
                                      <span className="text-sm font-medium text-teal-600">Rs {sub.total.toLocaleString()}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary Comparison */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white">
                  <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4">Summary</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-orange-400 text-xs font-bold uppercase mb-1">Expenses</p>
                      <p className="text-2xl font-bold">Rs {totalExpenseAmount.toLocaleString()}</p>
                    </div>
                    <div className="text-center border-x border-slate-700">
                      <p className="text-teal-400 text-xs font-bold uppercase mb-1">Income</p>
                      <p className="text-2xl font-bold">Rs {totalIncomeAmount.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-xs font-bold uppercase mb-1 ${
                        totalIncomeAmount - totalExpenseAmount >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {totalIncomeAmount - totalExpenseAmount >= 0 ? 'Net Gain' : 'Net Loss'}
                      </p>
                      <p className={`text-2xl font-bold ${
                        totalIncomeAmount - totalExpenseAmount >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        Rs {Math.abs(totalIncomeAmount - totalExpenseAmount).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

