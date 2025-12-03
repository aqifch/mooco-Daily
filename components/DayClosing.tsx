import React, { useEffect, useState, useMemo } from 'react';
import { Layout } from './Layout';
import { 
  fetchProducts, 
  fetchTodayStockIn, 
  fetchTodayClosings,
  fetchTodayExpenses,
  fetchTodayIncome,
  fetchTodayWithdrawals,
  addCashWithdrawal,
  supabase,
  getTodayString
} from '../services/supabase';
import { Product, ViewState, User, DailyClosing, CashWithdrawal } from '../types';
import { 
  Wallet, 
  Package,
  TrendingUp,
  TrendingDown,
  Save,
  Lock,
  CheckCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Banknote,
  ShoppingCart,
  MinusCircle,
  X,
  Plus,
  Sunrise
} from 'lucide-react';

interface DayClosingProps {
  onBack: () => void;
  onNavigate: (view: ViewState) => void;
  currentUser: User | null;
}

interface StockItem {
  product: Product;
  opening: number;
  stockIn: number;
  available: number;
  remaining: string;
  sold: number;
}

export const DayClosing: React.FC<DayClosingProps> = ({ onBack, onNavigate, currentUser }) => {
  // Data State
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locking, setLocking] = useState(false);
  
  // Today's Summary (auto-calculated)
  const [todaySales, setTodaySales] = useState(0);
  const [todayExpenses, setTodayExpenses] = useState(0);
  const [todayIncome, setTodayIncome] = useState(0);
  
  // Opening Cash - loaded from previous day's next_day_opening_cash
  const [openingCash, setOpeningCash] = useState<number>(0);
  const [openingCashLocked, setOpeningCashLocked] = useState(false);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [firstTimeOpeningCash, setFirstTimeOpeningCash] = useState('');
  const [savingFirstTimeOpening, setSavingFirstTimeOpening] = useState(false);
  
  // User Input
  const [cashInDrawer, setCashInDrawer] = useState('');
  
  // Cash Withdrawals
  const [withdrawals, setWithdrawals] = useState<CashWithdrawal[]>([]);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawReason, setWithdrawReason] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  
  // Closing Status
  const [existingClosing, setExistingClosing] = useState<DailyClosing | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Next Day Opening Cash (set after locking)
  const [nextDayOpeningCash, setNextDayOpeningCash] = useState('');
  const [nextDayOpeningSaved, setNextDayOpeningSaved] = useState(false);
  const [savingNextDayOpening, setSavingNextDayOpening] = useState(false);

  // Load all data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const today = getTodayString();
      
      // Fetch all data in parallel
      const [products, stockInData, expensesData, incomeData, closingsData, withdrawalsData] = await Promise.all([
        fetchProducts(),
        fetchTodayStockIn(),
        fetchTodayExpenses(),
        fetchTodayIncome(),
        fetchTodayClosings(),
        fetchTodayWithdrawals()
      ]);

      // Calculate totals (returned items have negative amounts, so sum works correctly)
      const totalExpenses = expensesData.reduce((sum, e) => sum + (e.amount || 0), 0);
      const totalIncome = incomeData.reduce((sum, i) => sum + (i.amount || 0), 0);
      
      setTodayExpenses(totalExpenses);
      setTodayIncome(totalIncome);
      setWithdrawals(withdrawalsData);

      // Check for existing closing
      const latestClosing = closingsData.length > 0 ? closingsData[0] : null;
      setExistingClosing(latestClosing);
      
      // Load opening cash from previous day's final closing
      const { data: previousDayClosing } = await supabase
        .from('daily_closings')
        .select('next_day_opening_cash')
        .eq('closing_type', 'final')
        .lt('date_str', today)
        .order('date_str', { ascending: false })
        .limit(1)
        .single();
      
      if (previousDayClosing?.next_day_opening_cash !== null && previousDayClosing?.next_day_opening_cash !== undefined) {
        // Previous day set opening cash for today - LOCKED
        setOpeningCash(previousDayClosing.next_day_opening_cash);
        setOpeningCashLocked(true);
        setIsFirstTimeUser(false);
      } else {
        // First time user OR previous day didn't set opening cash
        setOpeningCash(0);
        setOpeningCashLocked(false);
        setIsFirstTimeUser(true);
      }
      
      if (latestClosing) {
        setIsLocked(latestClosing.closing_type === 'final');
        setCashInDrawer(latestClosing.cash_received?.toString() || '');
        setLastSaved(new Date(latestClosing.created_at || '').toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }));
        
        // Check if next day opening is already set
        if (latestClosing.next_day_opening_cash !== null && latestClosing.next_day_opening_cash !== undefined) {
          setNextDayOpeningCash(latestClosing.next_day_opening_cash.toString());
          setNextDayOpeningSaved(true);
        }
        
        // Load saved stock from report_json
        let savedStock: Record<number, number> = {};
        if (latestClosing.report_json) {
          try {
            const report = typeof latestClosing.report_json === 'string' 
              ? JSON.parse(latestClosing.report_json) 
              : latestClosing.report_json;
            if (report.closingStock) {
              report.closingStock.forEach((item: any) => {
                savedStock[item.productId] = item.newOpeningStock;
              });
            }
          } catch (e) {
            console.error('Error parsing report_json:', e);
          }
        }

        // Build stock items with saved values
        const items: StockItem[] = products.map(product => {
          const productStockIn = stockInData
            .filter(s => s.product_id === product.id && !s.is_return)
            .reduce((sum, s) => sum + (s.quantity || 0), 0);
          
          const opening = product.current_opening_stock || 0;
          const available = opening + productStockIn;
          const savedRemaining = savedStock[product.id!];
          
          return {
            product,
            opening,
            stockIn: productStockIn,
            available,
            remaining: savedRemaining !== undefined ? savedRemaining.toString() : '',
            sold: savedRemaining !== undefined ? available - savedRemaining : 0
          };
        });
        
        setStockItems(items);
        
        // Calculate sales from saved data
        const sales = items.reduce((sum, item) => {
          const remaining = savedStock[item.product.id!];
          if (remaining !== undefined) {
            const sold = item.available - remaining;
            return sum + (sold * (item.product.sale_price || 0));
          }
          return sum;
        }, 0);
        setTodaySales(sales);
        
      } else {
        // No existing closing - fresh start
        const items: StockItem[] = products.map(product => {
          const productStockIn = stockInData
            .filter(s => s.product_id === product.id && !s.is_return)
            .reduce((sum, s) => sum + (s.quantity || 0), 0);
          
          const opening = product.current_opening_stock || 0;
          const available = opening + productStockIn;
          
        return {
            product,
            opening,
            stockIn: productStockIn,
            available,
            remaining: '',
            sold: 0
        };
      });

        setStockItems(items);
        setTodaySales(0);
      }

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update remaining stock for a product
  const updateRemaining = (productId: number, value: string) => {
    if (isLocked) return;
    
    const numValue = value === '' ? '' : Math.max(0, parseInt(value) || 0).toString();
    
    setStockItems(prev => prev.map(item => {
      if (item.product.id === productId) {
        const remaining = numValue === '' ? 0 : parseInt(numValue);
        const cappedRemaining = Math.min(remaining, item.available);
        const sold = item.available - cappedRemaining;
        
        return {
          ...item,
          remaining: numValue === '' ? '' : cappedRemaining.toString(),
          sold: numValue === '' ? 0 : sold
        };
      }
      return item;
    }));
  };

  // Total withdrawals
  const totalWithdrawals = useMemo(() => {
    return withdrawals.reduce((sum, w) => sum + (w.amount || 0), 0);
  }, [withdrawals]);

  // Calculate totals - WITH OPENING CASH
  const calculations = useMemo(() => {
    // Calculate sales from stock
    const salesFromStock = stockItems.reduce((sum, item) => {
      if (item.remaining !== '') {
        const sold = item.available - parseInt(item.remaining);
        return sum + (sold * (item.product.sale_price || 0));
      }
      return sum;
    }, 0);

    // Expected Cash = Opening Cash + Sales + Income - Expenses - Withdrawals
    const expectedCash = openingCash + salesFromStock + todayIncome - todayExpenses - totalWithdrawals;
    const actualCash = parseFloat(cashInDrawer) || 0;
    const difference = actualCash - expectedCash;
    
    return {
      sales: salesFromStock,
      openingCash,
      expectedCash,
      actualCash,
      difference,
      hasLoss: difference < 0,
      hasExtra: difference > 0,
      isMatch: Math.abs(difference) < 1 // Allow Rs 1 tolerance
    };
  }, [stockItems, todayIncome, todayExpenses, cashInDrawer, totalWithdrawals, openingCash]);

  // Handle cash withdrawal
  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setWithdrawing(true);
    try {
      const result = await addCashWithdrawal(
        amount,
        withdrawReason || 'Cash withdrawal',
        currentUser?.id
      );
      
      if (!result.success) {
        throw new Error(result.message);
      }
      
      // Refresh withdrawals
      const newWithdrawals = await fetchTodayWithdrawals();
      setWithdrawals(newWithdrawals);
      
      // Reset form and close modal
      setWithdrawAmount('');
      setWithdrawReason('');
      setShowWithdrawModal(false);
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      alert('Failed to record withdrawal: ' + (error.message || 'Unknown error'));
    } finally {
      setWithdrawing(false);
    }
  };

  // Save first-time opening cash
  const handleSaveFirstTimeOpening = async () => {
    const amount = parseFloat(firstTimeOpeningCash);
    if (isNaN(amount) || amount < 0) {
      alert('Please enter a valid amount');
      return;
    }

    setSavingFirstTimeOpening(true);
    try {
      setOpeningCash(amount);
      setOpeningCashLocked(true);
      setIsFirstTimeUser(false);
    } catch (error: any) {
      console.error('Save first time opening error:', error);
      alert('Failed to save: ' + (error.message || 'Unknown error'));
    } finally {
      setSavingFirstTimeOpening(false);
    }
  };

  // Save next day opening cash
  const handleSaveNextDayOpening = async () => {
    const amount = parseFloat(nextDayOpeningCash);
    if (isNaN(amount) || amount < 0) {
      alert('Please enter a valid amount');
      return;
    }

    setSavingNextDayOpening(true);
    try {
      // Update today's closing record with next_day_opening_cash
      if (existingClosing?.id) {
        const { error } = await supabase
          .from('daily_closings')
          .update({ next_day_opening_cash: amount })
          .eq('id', existingClosing.id);
        if (error) throw error;
        setNextDayOpeningSaved(true);
      }
    } catch (error: any) {
      console.error('Save next day opening error:', error);
      alert('Failed to save: ' + (error.message || 'Unknown error'));
    } finally {
      setSavingNextDayOpening(false);
    }
  };

  // Check if can save
  const canSave = useMemo(() => {
    const hasAnyStock = stockItems.some(item => item.remaining !== '');
    const hasCash = cashInDrawer !== '';
    return hasAnyStock || hasCash;
  }, [stockItems, cashInDrawer]);

  // Check if can lock
  const canLock = useMemo(() => {
    const allStockFilled = stockItems.every(item => item.remaining !== '');
    const hasCash = cashInDrawer !== '';
    const hasOpeningCash = openingCashLocked || !isFirstTimeUser;
    return allStockFilled && hasCash && hasOpeningCash;
  }, [stockItems, cashInDrawer, openingCashLocked, isFirstTimeUser]);

  // Save (Update) - does NOT update product stock
  const handleSave = async () => {
    if (!canSave || isLocked) return;
    
    setSaving(true);
    try {
      const today = getTodayString();
      const closingStock = stockItems.map(item => ({
        productId: item.product.id,
        newOpeningStock: item.remaining === '' ? item.available : parseInt(item.remaining)
      }));

      const closingData = {
        date_str: today,
        total_revenue: calculations.sales,
        cash_received: parseFloat(cashInDrawer) || 0,
        total_withdrawals: totalWithdrawals,
        closing_type: 'partial',
        notes: null,
        closed_by: currentUser?.id || null,
        report_json: JSON.stringify({ closingStock })
      };

      if (existingClosing?.id) {
        // Update existing
        const { error } = await supabase
          .from('daily_closings')
          .update(closingData)
          .eq('id', existingClosing.id);
        
        if (error) throw error;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('daily_closings')
          .insert([closingData])
          .select()
          .single();
        
        if (error) throw error;
        setExistingClosing(data);
      }

      setLastSaved(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
      setTodaySales(calculations.sales);
      
      // Brief success indicator
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      
    } catch (error: any) {
      console.error('Save error:', error);
      alert('Save failed: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  // Lock (Final) - DOES update product stock
  const handleLock = async () => {
    if (!canLock || isLocked) return;
    
    const confirmMsg = `🔒 LOCK TODAY'S CLOSING?\n\n` +
      `Opening Cash: Rs ${openingCash.toFixed(0)}\n` +
      `Sales: Rs ${calculations.sales.toFixed(0)}\n` +
      `Income: Rs ${todayIncome.toFixed(0)}\n` +
      `Expenses: Rs ${todayExpenses.toFixed(0)}\n` +
      `Withdrawals: Rs ${totalWithdrawals.toFixed(0)}\n` +
      `Expected Cash: Rs ${calculations.expectedCash.toFixed(0)}\n` +
      `Cash Received: Rs ${calculations.actualCash.toFixed(0)}\n` +
      `Difference: Rs ${calculations.difference.toFixed(0)}\n\n` +
      `⚠️ This will:\n` +
      `• Update stock for tomorrow\n` +
      `• Lock today's closing (no more edits)\n\n` +
      `Are you sure?`;
    
    if (!window.confirm(confirmMsg)) return;
    
    setLocking(true);
    try {
      const today = getTodayString();
      const closingStock = stockItems.map(item => ({
        productId: item.product.id,
        newOpeningStock: parseInt(item.remaining) || 0
      }));

      // Update product stocks
      for (const item of closingStock) {
        await supabase
          .from('products')
          .update({ current_opening_stock: item.newOpeningStock })
          .eq('id', item.productId);
      }

      const cashReceived = parseFloat(cashInDrawer) || 0;
      
      const closingData = {
        date_str: today,
        total_revenue: calculations.sales,
        cash_received: cashReceived,
        total_withdrawals: totalWithdrawals,
        closing_type: 'final',
        notes: null,
        closed_by: currentUser?.id || null,
        report_json: JSON.stringify({ closingStock })
      };

      if (existingClosing?.id) {
        await supabase
          .from('daily_closings')
          .update(closingData)
          .eq('id', existingClosing.id);
      } else {
        const { data } = await supabase
          .from('daily_closings')
          .insert([closingData])
          .select()
          .single();
        setExistingClosing(data);
      }

      setIsLocked(true);
      setLastSaved(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
      
    } catch (error: any) {
      console.error('Lock error:', error);
      alert('Lock failed: ' + (error.message || 'Unknown error'));
    } finally {
      setLocking(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Layout 
        title="Day Closing" 
        onBack={onBack}
        activeView={ViewState.CLOSING}
        onNavigate={onNavigate}
        currentUser={currentUser}
      >
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <RefreshCw size={40} className="animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Locked state - Today is closed, can set tomorrow's opening cash
  if (isLocked) {
    // USE DATABASE VALUES for locked screen - NOT recalculated values!
    const savedSales = existingClosing?.total_revenue || 0;
    const savedCashReceived = existingClosing?.cash_received || 0;
    const savedWithdrawals = existingClosing?.total_withdrawals || 0;
    
    // Expected = Opening + Sales + Income - Expenses - Withdrawals (using saved values)
    const savedExpectedCash = openingCash + savedSales + todayIncome - todayExpenses - savedWithdrawals;
    const savedDifference = savedCashReceived - savedExpectedCash;
    
    return (
      <Layout 
        title="Day Closing" 
        onBack={onBack}
        activeView={ViewState.CLOSING}
        onNavigate={onNavigate}
        currentUser={currentUser}
      >
        <div className="space-y-4 pb-24">
          {/* Success Banner */}
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle size={24} className="text-green-600" />
            </div>
            <div>
              <h2 className="font-bold text-green-800">Today Closed! ✅</h2>
              <p className="text-xs text-green-600">Stock updated for tomorrow</p>
            </div>
          </div>
          
          {/* Next Day Opening Cash - Set Tonight */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Sunrise size={20} className="text-amber-500" />
              <div>
                <p className="text-sm font-bold text-slate-800">Kal ka Opening Cash</p>
                <p className="text-[10px] text-slate-500">Drawer mein raat ko kitna rakh rahe ho?</p>
              </div>
            </div>
            
            {nextDayOpeningSaved ? (
              <div className="flex items-center justify-between bg-white/70 rounded-xl p-3">
                <span className="text-slate-600 text-sm">Amount Set:</span>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-amber-700">Rs {nextDayOpeningCash}</span>
                  <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">✓ Saved</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">Rs</span>
                  <input
                    type="number"
                    value={nextDayOpeningCash}
                    onChange={(e) => setNextDayOpeningCash(e.target.value)}
                    placeholder="0"
                    className="w-full pl-9 pr-3 py-3 text-right font-bold bg-white border-2 border-amber-300 rounded-xl focus:border-amber-500 outline-none text-lg"
                  />
                </div>
                <button
                  onClick={handleSaveNextDayOpening}
                  disabled={savingNextDayOpening || !nextDayOpeningCash}
                  className="px-4 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  {savingNextDayOpening ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  Save
                </button>
              </div>
            )}
            
            <p className="text-[10px] text-amber-600 mt-3">
              💡 {nextDayOpeningSaved ? 'Kal subah ye amount automatically locked dikhega' : 'Ye amount kal subah automatically locked dikhega'}
            </p>
          </div>
          
          {/* Today's Summary Card - Using SAVED database values */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Lock size={14} className="text-slate-400" />
              Today's Summary (Locked)
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Opening Cash</span>
                <span className="font-medium text-amber-600">Rs {openingCash.toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sales</span>
                <span className="font-medium text-emerald-600">+ Rs {savedSales}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Income</span>
                <span className="font-medium text-teal-600">+ Rs {todayIncome.toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Expenses</span>
                <span className="font-medium text-orange-600">- Rs {todayExpenses.toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Withdrawals</span>
                <span className="font-medium text-red-600">- Rs {savedWithdrawals}</span>
              </div>
              <div className="border-t border-slate-100 pt-2 flex justify-between">
                <span className="text-slate-500">Expected</span>
                <span className="font-bold text-blue-600">Rs {savedExpectedCash.toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Received</span>
                <span className="font-bold text-slate-800">Rs {savedCashReceived}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Difference</span>
                {(() => {
                  const hasLoss = savedDifference < 0;
                  const hasExtra = savedDifference > 0;
                  return (
                    <span className={`font-bold ${hasLoss ? 'text-red-600' : hasExtra ? 'text-blue-600' : 'text-green-600'}`}>
                      Rs {Math.abs(savedDifference).toFixed(0)} 
                      {hasLoss ? ' (Loss)' : hasExtra ? ' (Extra)' : ' ✓'}
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Stock Summary - Locked */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Package size={14} className="text-slate-400" />
              Stock Summary (Locked)
            </h3>
            <div className="space-y-1">
              {stockItems.map(item => (
                <div key={item.product.id} className="flex items-center justify-between text-sm py-1">
                  <span className="text-slate-600">{item.product.name}</span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-400">Sold: {item.sold}</span>
                    <span className="font-medium text-emerald-600">Left: {item.remaining || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <button 
            onClick={onBack}
            className="w-full px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </Layout>
    );
  }

  // Main UI
  return (
    <Layout 
      title="Day Closing" 
      onBack={onBack}
      activeView={ViewState.CLOSING}
      onNavigate={onNavigate}
      currentUser={currentUser}
    >
      <div className="space-y-6 pb-44 md:pb-32">
        
        {/* Status Bar */}
        {lastSaved && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 text-blue-700">
              <Clock size={16} />
              <span className="text-sm font-medium">Last saved: {lastSaved}</span>
            </div>
            {showSuccess && (
              <span className="text-green-600 text-sm font-bold flex items-center gap-1">
                <CheckCircle size={14} /> Saved!
              </span>
            )}
          </div>
        )}

        {/* Opening Cash Display - Locked or First Time */}
        {isFirstTimeUser && !openingCashLocked ? (
          // First time user - need to set opening cash
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Sunrise size={20} className="text-amber-500" />
              <div>
                <p className="text-sm font-bold text-slate-800">Opening Cash Set Karo</p>
                <p className="text-[10px] text-slate-500">Aaj drawer mein kitna cash hai? (First time only)</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">Rs</span>
                <input
                  type="number"
                  value={firstTimeOpeningCash}
                  onChange={(e) => setFirstTimeOpeningCash(e.target.value)}
                  placeholder="0"
                  className="w-full pl-9 pr-3 py-3 text-right font-bold bg-white border-2 border-amber-300 rounded-xl focus:border-amber-500 outline-none text-lg"
                />
              </div>
              <button
                onClick={handleSaveFirstTimeOpening}
                disabled={savingFirstTimeOpening || !firstTimeOpeningCash}
                className="px-4 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {savingFirstTimeOpening ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Save
              </button>
            </div>
            
            <p className="text-[10px] text-amber-600 mt-3">
              ⚠️ Ye ek baar save hone ke baad edit nahi hoga
            </p>
          </div>
        ) : (
          // Opening cash is locked (from previous night)
          <div className="bg-amber-50/50 rounded-2xl border border-amber-100 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sunrise size={18} className="text-amber-500" />
                <span className="text-sm font-medium text-slate-600">Opening Cash</span>
                <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                  <Lock size={10} /> Locked
                </span>
              </div>
              <span className="text-lg font-bold text-amber-700">Rs {openingCash.toFixed(0)}</span>
            </div>
          </div>
        )}

        {/* Cash Received */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 bg-emerald-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote size={18} className="text-emerald-600" />
                <span className="text-sm font-medium text-slate-600">Cash Received</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">Rs</span>
                <input
                  type="number"
                  value={cashInDrawer}
                  onChange={(e) => setCashInDrawer(e.target.value)}
                  placeholder="Kitna mila?"
                  className="w-32 pl-9 pr-3 py-2 text-right font-bold bg-white border-2 border-emerald-300 rounded-lg focus:border-emerald-500 outline-none text-sm"
                />
              </div>
                  </div>
            
            {/* Expected vs Actual */}
            {cashInDrawer && (
              <div className="mt-3 pt-3 border-t border-emerald-200/50 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Expected: <span className="font-bold text-slate-700">Rs {calculations.expectedCash.toFixed(0)}</span>
                </span>
                <span className={`font-bold px-2 py-1 rounded-full ${
                  calculations.isMatch ? 'bg-green-100 text-green-700' :
                  calculations.hasLoss ? 'bg-red-100 text-red-700' : 
                  'bg-blue-100 text-blue-700'
                }`}>
                  {calculations.isMatch ? '✓ Match' : 
                   calculations.hasLoss ? `↓ ${Math.abs(calculations.difference).toFixed(0)} Loss` :
                   `↑ ${calculations.difference.toFixed(0)} Extra`}
                </span>
                    </div>
                  )}
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
            <p className="text-[10px] text-emerald-600 font-bold uppercase mb-1">Sales</p>
            <p className="text-sm font-bold text-emerald-700">Rs {calculations.sales.toFixed(0)}</p>
          </div>
          <div className="bg-teal-50 rounded-xl p-3 text-center border border-teal-100">
            <p className="text-[10px] text-teal-600 font-bold uppercase mb-1">Income</p>
            <p className="text-sm font-bold text-teal-700">Rs {todayIncome.toFixed(0)}</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-3 text-center border border-orange-100">
            <p className="text-[10px] text-orange-600 font-bold uppercase mb-1">Expenses</p>
            <p className="text-sm font-bold text-orange-700">Rs {todayExpenses.toFixed(0)}</p>
          </div>
          <div className="bg-red-50 rounded-xl p-3 text-center border border-red-100">
            <p className="text-[10px] text-red-600 font-bold uppercase mb-1">Withdraw</p>
            <p className="text-sm font-bold text-red-700">Rs {totalWithdrawals.toFixed(0)}</p>
          </div>
        </div>

        {/* Cash Withdrawals - Compact */}
        {withdrawals.length > 0 && (
          <div className="bg-red-50/50 rounded-xl border border-red-100 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-red-600 uppercase">Withdrawals</span>
              <button
                onClick={() => setShowWithdrawModal(true)}
                className="text-xs text-red-600 hover:text-red-700 font-medium"
              >
                + Add
              </button>
            </div>
            <div className="space-y-1">
              {withdrawals.map((w, idx) => (
                <div key={w.id || idx} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{w.reason || 'Withdrawal'}</span>
                  <span className="font-medium text-red-600">-Rs {w.amount}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Add Withdrawal Button (when no withdrawals) */}
        {withdrawals.length === 0 && (
          <button
            onClick={() => setShowWithdrawModal(true)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-slate-500 text-sm font-medium hover:bg-slate-100 hover:border-slate-400 transition-all"
          >
            <MinusCircle size={16} />
            Add Cash Withdrawal
          </button>
        )}

        {/* Stock Count - Professional Mobile UI */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {/* Header with Progress */}
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Package size={18} className="text-blue-600" />
                <span className="font-bold text-slate-800 text-sm">Stock Count</span>
              </div>
              <span className="text-xs font-medium text-slate-500">
                {stockItems.filter(i => i.remaining !== '').length}/{stockItems.length}
              </span>
            </div>
            {/* Progress Bar - Mobile Only */}
            <div className="md:hidden h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${(stockItems.filter(i => i.remaining !== '').length / stockItems.length) * 100}%` }}
              />
            </div>
          </div>
          
          {/* Desktop Table Header */}
          <div className="hidden md:grid grid-cols-7 gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
            <div className="col-span-2">Product</div>
            <div className="text-center">Open</div>
            <div className="text-center">In</div>
            <div className="text-center">Avail</div>
            <div className="text-center">Left</div>
            <div className="text-right">Sold / Revenue</div>
          </div>
          
          {/* Stock Items */}
          <div className="divide-y divide-slate-100">
            {stockItems.map((item, index) => (
              <div key={item.product.id} className="hover:bg-slate-50/50">
                {/* Desktop View */}
                <div className="hidden md:grid grid-cols-7 gap-2 px-4 py-2.5 items-center">
                  <div className="col-span-2 min-w-0">
                    <p className="font-medium text-slate-800 text-sm truncate">{item.product.name}</p>
                    <p className="text-[10px] text-slate-400">Rs {item.product.sale_price}/{item.product.unit}</p>
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-medium text-amber-600">{item.opening}</span>
                  </div>
                  <div className="text-center">
                    <span className={`text-sm font-medium ${item.stockIn > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                      {item.stockIn > 0 ? `+${item.stockIn}` : '0'}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-bold text-slate-800">{item.available}</span>
                  </div>
                  <div className="text-center">
                    <input
                      type="number"
                      value={item.remaining}
                      onChange={(e) => updateRemaining(item.product.id!, e.target.value)}
                      placeholder="?"
                      min="0"
                      max={item.available}
                      className={`w-14 px-2 py-1 text-center text-sm font-bold rounded-lg border outline-none transition-all ${
                        item.remaining !== '' 
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700' 
                          : 'bg-blue-50 border-blue-200 focus:border-blue-400'
                      }`}
                    />
                  </div>
                  <div className="text-right">
                    {item.remaining !== '' ? (
                      <span className="text-sm font-bold text-emerald-600">
                        {item.sold} / Rs {(item.sold * (item.product.sale_price || 0)).toFixed(0)}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-300">-</span>
                    )}
                  </div>
                </div>
                
                {/* Mobile View - Compact Row */}
                <div className={`md:hidden flex items-center gap-2 px-3 py-2 ${item.remaining !== '' ? 'bg-emerald-50/40' : ''}`}>
                  {/* Left: Product Info + Stock Flow */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-800 text-sm truncate">{item.product.name}</p>
                      <span className="text-[10px] text-slate-400 shrink-0">₨{item.product.sale_price}</span>
                    </div>
                    {/* Stock Flow - Inline */}
                    <div className="flex items-center gap-1 mt-0.5 text-[10px]">
                      <span className="text-amber-600 font-medium">{item.opening}</span>
                      {item.stockIn > 0 && (
                        <span className="text-blue-600 font-medium">+{item.stockIn}</span>
                      )}
                      <span className="text-slate-400">=</span>
                      <span className="font-bold text-slate-700">{item.available}</span>
                    </div>
                </div>

                  {/* Center: Input */}
                    <input
                      type="number"
                      inputMode="numeric"
                    value={item.remaining}
                    onChange={(e) => updateRemaining(item.product.id!, e.target.value)}
                    placeholder="?"
                    min="0"
                    max={item.available}
                    className={`w-14 h-10 text-center text-sm font-bold rounded-lg border-2 outline-none transition-all shrink-0 ${
                      item.remaining !== '' 
                        ? 'bg-emerald-100 border-emerald-400 text-emerald-700' 
                        : 'bg-slate-50 border-slate-200 focus:border-blue-400'
                    }`}
                  />
                  
                  {/* Right: Result */}
                  <div className="w-16 text-right shrink-0">
                    {item.remaining !== '' ? (
                      <>
                        <p className="text-xs font-bold text-emerald-600">{item.sold} sold</p>
                        <p className="text-[10px] text-emerald-500">₨{(item.sold * (item.product.sale_price || 0)).toFixed(0)}</p>
                      </>
                    ) : (
                      <p className="text-[10px] text-slate-300">—</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Footer - Totals */}
          <div className="border-t border-slate-200">
            {/* Desktop Totals */}
            <div className="hidden md:grid grid-cols-7 gap-2 px-4 py-3 bg-slate-50 items-center text-sm">
              <div className="col-span-2 font-bold text-slate-700">Total</div>
              <div className="text-center font-medium text-amber-600">
                {stockItems.reduce((sum, i) => sum + i.opening, 0)}
              </div>
              <div className="text-center font-medium text-blue-600">
                +{stockItems.reduce((sum, i) => sum + i.stockIn, 0)}
              </div>
              <div className="text-center font-bold text-slate-800">
                {stockItems.reduce((sum, i) => sum + i.available, 0)}
              </div>
              <div className="text-center font-medium text-emerald-600">
                {stockItems.reduce((sum, i) => sum + (i.remaining !== '' ? parseInt(i.remaining) : 0), 0)}
              </div>
              <div className="text-right font-bold text-emerald-600">
                {stockItems.reduce((sum, i) => sum + i.sold, 0)} / Rs {calculations.sales.toFixed(0)}
              </div>
            </div>
            
            {/* Mobile Totals - Compact */}
            <div className="md:hidden flex items-center justify-between px-3 py-2 bg-slate-50 text-[10px]">
              <div className="flex items-center gap-2">
                <span className="text-amber-600">{stockItems.reduce((sum, i) => sum + i.opening, 0)}</span>
                <span className="text-blue-600">+{stockItems.reduce((sum, i) => sum + i.stockIn, 0)}</span>
                <span className="text-slate-400">=</span>
                <span className="font-bold text-slate-700">{stockItems.reduce((sum, i) => sum + i.available, 0)}</span>
              </div>
              <div className="flex items-center gap-2 bg-emerald-500 text-white px-2 py-1 rounded-md">
                <span className="font-medium">{stockItems.reduce((sum, i) => sum + i.sold, 0)} sold</span>
                <span className="font-bold">₨{calculations.sales.toFixed(0)}</span>
              </div>
                  </div>
                </div>
              </div>

      </div>

      {/* Fixed Bottom Buttons - Above mobile nav */}
      <div className="fixed bottom-20 md:bottom-0 left-0 right-0 md:left-64 bg-white/95 backdrop-blur-sm border-t border-slate-200 p-3 shadow-xl z-30">
        <div className="max-w-xl mx-auto">
          {/* Warning if opening cash not set */}
          {isFirstTimeUser && !openingCashLocked && (
            <p className="text-[10px] text-amber-600 text-center mb-2 font-medium">
              ⚠️ Pehle Opening Cash set karo, phir Lock kar sakoge
            </p>
          )}
          
          <div className="flex gap-2">
            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={!canSave || saving}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
                canSave && !saving
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-[0.98]'
                  : 'bg-slate-50 text-slate-300 cursor-not-allowed'
              }`}
            >
              {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            
            {/* Lock Button */}
            <button
              onClick={handleLock}
              disabled={!canLock || locking}
              className={`flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
                canLock && !locking
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-200/50 hover:shadow-emerald-300/50 active:scale-[0.98]'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              {locking ? <RefreshCw size={16} className="animate-spin" /> : <Lock size={16} />}
              {locking ? 'Locking...' : 'Lock & Close Day'}
            </button>
          </div>
        </div>
        </div>

      {/* Cash Withdrawal Modal - Fullscreen on mobile */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowWithdrawModal(false)}
          ></div>
          
          <div className="relative bg-white w-full md:max-w-sm md:rounded-3xl rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom md:zoom-in duration-300">
            {/* Header */}
            <div className="px-4 md:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-red-50 to-white rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                  <MinusCircle size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800">Cash Withdrawal</h2>
                  <p className="text-xs text-slate-500">Drawer se cash nikaalna</p>
                </div>
              </div>
              <button 
                onClick={() => setShowWithdrawModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <div className="p-4 md:p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Amount (Kitna nikalna hai?)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rs</span>
                        <input
                          type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                          placeholder="0"
                    autoFocus
                    className="w-full pl-12 pr-4 py-3.5 min-h-[48px] text-lg font-bold text-center bg-red-50 border border-red-200 rounded-xl focus:border-red-500 focus:bg-white outline-none transition-all"
                        />
                      </div>
        </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Reason (Kyun nikala?)
                </label>
                <input
                  type="text"
                  value={withdrawReason}
                  onChange={(e) => setWithdrawReason(e.target.value)}
                  placeholder="e.g. Personal use, Bank deposit..."
                  className="w-full px-4 py-3.5 min-h-[48px] bg-slate-50 border border-slate-200 rounded-xl focus:border-red-500 focus:bg-white outline-none transition-all text-base"
                />
            </div>
            
              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="flex-1 px-4 py-3.5 min-h-[48px] rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWithdraw}
                  disabled={withdrawing || !withdrawAmount}
                  className="flex-1 px-4 py-3.5 min-h-[48px] rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 shadow-lg shadow-red-200 transition-all disabled:opacity-50"
                >
                  {withdrawing ? (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw size={16} className="animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    'Withdraw'
                  )}
                </button>
            </div>
          </div>
        </div>
      </div>
      )}
    </Layout>
  );
};
