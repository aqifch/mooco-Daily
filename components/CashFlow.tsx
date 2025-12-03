import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from './Layout';
import { Button } from './Button';
import { Input } from './Input';
import { addTransaction, fetchTodayExpenses, fetchTodayIncome, returnTransaction, getTodayString, fetchCategories } from '../services/supabase';
import { ViewState, Transaction, User, Category } from '../types';
import { RotateCcw, TrendingDown, TrendingUp, AlertCircle, X, Search, ChevronDown } from 'lucide-react';

interface CashFlowProps {
  onBack: () => void;
  onNavigate: (view: ViewState) => void;
  currentUser: User | null;
  initialMode?: 'EXPENSE' | 'INCOME';
}

export const CashFlow: React.FC<CashFlowProps> = ({ onBack, onNavigate, currentUser, initialMode = 'EXPENSE' }) => {
  // Mode Toggle
  const [mode, setMode] = useState<'EXPENSE' | 'INCOME'>(initialMode);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  
  const [history, setHistory] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);

  // Category search state
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // Return modal state
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnTxn, setReturnTxn] = useState<Transaction | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [returningTxn, setReturningTxn] = useState(false);

  // Theme colors based on mode
  const theme = useMemo(() => {
    if (mode === 'EXPENSE') {
      return {
        primary: 'orange',
        gradient: 'from-orange-500 to-orange-600',
        bg: 'bg-orange-50',
        text: 'text-orange-600',
        border: 'border-orange-500',
        shadow: 'shadow-orange-200',
        hover: 'hover:bg-orange-50',
        ring: 'ring-orange-500',
        icon: TrendingDown,
        title: 'Expenses',
        buttonText: 'Save Expense',
        placeholder: 'e.g. Plumber for kitchen sink...'
      };
    }
    return {
      primary: 'teal',
      gradient: 'from-teal-500 to-teal-600',
      bg: 'bg-teal-50',
      text: 'text-teal-600',
      border: 'border-teal-500',
      shadow: 'shadow-teal-200',
      hover: 'hover:bg-teal-50',
      ring: 'ring-teal-500',
      icon: TrendingUp,
      title: 'Income',
      buttonText: 'Save Income',
      placeholder: 'e.g. Cash payment received...'
    };
  }, [mode]);

  // Get main categories and their sub-categories
  const mainCategories = useMemo(() => categories.filter(c => !c.parent_id), [categories]);
  const getSubCategories = (parentId: number) => categories.filter(c => c.parent_id === parentId);
  
  // Get parent category name for a sub-category
  const getParentName = (cat: Category) => {
    if (!cat.parent_id) return null;
    const parent = categories.find(c => c.id === cat.parent_id);
    return parent?.name || null;
  };

  // Filtered categories for search
  const filteredCategories = useMemo(() => {
    const search = categorySearch.toLowerCase();
    if (!search) return [];
    
    return categories.filter(cat => {
      const matchesName = cat.name.toLowerCase().includes(search);
      const parentName = getParentName(cat);
      const matchesParent = parentName?.toLowerCase().includes(search);
      return matchesName || matchesParent;
    });
  }, [categories, categorySearch]);

  // Check if a category has sub-categories
  const hasSubCategories = (catId: number) => categories.some(c => c.parent_id === catId);

  // Select a category
  const selectCategory = (cat: Category) => {
    const parentName = getParentName(cat);
    if (parentName) {
      setCategory(parentName);
      setSubCategory(cat.name);
    } else {
      setCategory(cat.name);
      setSubCategory('');
    }
    setCategorySearch('');
    setShowCategoryDropdown(false);
  };

  // Load data when mode changes
  useEffect(() => {
    loadData();
  }, [mode]);

  const loadData = async () => {
    setLoadingHistory(true);
    try {
      const fetchFn = mode === 'EXPENSE' ? fetchTodayExpenses : fetchTodayIncome;
      const catType = mode === 'EXPENSE' ? 'EXPENSE' : 'INCOME';
      
      const [data, catData] = await Promise.all([
        fetchFn(true),
        fetchCategories(catType)
      ]);
      
      setHistory(data);
      setCategories(catData);
      const sum = data.reduce((acc, curr) => acc + (curr.amount || 0), 0);
      setTotal(sum);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Handle mode switch
  const handleModeSwitch = (newMode: 'EXPENSE' | 'INCOME') => {
    if (newMode === mode) return;
    setMode(newMode);
    // Reset form
    setCategory('');
    setSubCategory('');
    setAmount('');
    setNote('');
    setCategorySearch('');
    setShowCategoryDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !amount) return;
    
    setLoading(true);
    try {
      await addTransaction({
        type: mode,
        category,
        sub_category: subCategory || null,
        amount: Number(amount),
        note: note,
        date_str: getTodayString()
      });
      
      // Reset form
      setCategory('');
      setSubCategory('');
      setAmount('');
      setNote('');
      
      // Refresh list
      const fetchFn = mode === 'EXPENSE' ? fetchTodayExpenses : fetchTodayIncome;
      const data = await fetchFn();
      setHistory(data);
      const sum = data.reduce((acc, curr) => acc + (curr.amount || 0), 0);
      setTotal(sum);
    } catch (error) {
      console.error('Error recording transaction:', error);
      alert('Failed to save.');
    } finally {
      setLoading(false);
    }
  };

  const openReturnModal = (txn: Transaction) => {
    setReturnTxn(txn);
    setReturnReason('');
    setShowReturnModal(true);
  };

  const handleReturn = async () => {
    if (!returnTxn || !returnReason.trim()) {
      alert('Please enter a reason for the return');
      return;
    }
    
    setReturningTxn(true);
    try {
      const result = await returnTransaction(returnTxn, returnReason.trim());
      if (result.success) {
        const fetchFn = mode === 'EXPENSE' ? fetchTodayExpenses : fetchTodayIncome;
        const data = await fetchFn(true);
        setHistory(data);
        const sum = data.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        setTotal(sum);
        setShowReturnModal(false);
        setReturnTxn(null);
        setReturnReason('');
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error returning:', error);
      alert('Failed to return.');
    } finally {
      setReturningTxn(false);
    }
  };

  const Icon = theme.icon;

  return (
    <Layout 
      title="Cash Flow" 
      onBack={onBack}
      activeView={mode === 'EXPENSE' ? ViewState.EXPENSES : ViewState.INCOME}
      onNavigate={onNavigate}
      currentUser={currentUser}
    >
      <div className="space-y-6 pb-24">
        
        {/* Mode Toggle + Summary Combined */}
        <div className="flex items-center gap-2">
          {/* Toggle Switch - Compact */}
          <div className="bg-slate-100 p-1 rounded-xl flex gap-0.5 flex-shrink-0">
            <button
              onClick={() => handleModeSwitch('EXPENSE')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs transition-all ${
                mode === 'EXPENSE'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              <TrendingDown size={14} />
              Expense
            </button>
            <button
              onClick={() => handleModeSwitch('INCOME')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs transition-all ${
                mode === 'INCOME'
                  ? 'bg-teal-500 text-white shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              <TrendingUp size={14} />
              Income
            </button>
          </div>

          {/* Summary Card - Compact */}
          <div className={`flex-1 bg-gradient-to-r ${theme.gradient} rounded-xl px-3 py-2 text-white flex items-center justify-between`}>
            <div className="text-lg font-bold">₨{total.toFixed(0)}</div>
            <div className="text-[10px] text-white/70 font-medium">
              {history.filter(h => !h.is_return).length} txns
            </div>
          </div>
        </div>

        <div className="flex flex-col md:grid md:grid-cols-2 gap-4 md:gap-6">
          {/* Input Form */}
          <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <div className={`w-1 h-4 rounded-full ${mode === 'EXPENSE' ? 'bg-orange-500' : 'bg-teal-500'}`}></div>
              New {mode === 'EXPENSE' ? 'Expense' : 'Income'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Category</label>
                <div className="relative">
                  {/* Selected Category Display / Search Input */}
                  <div 
                    className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus-within:${theme.border} focus-within:bg-white transition-all cursor-pointer`}
                    onClick={() => setShowCategoryDropdown(true)}
                  >
                    {category ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-slate-800">
                            {subCategory || category}
                          </span>
                          {subCategory && (
                            <span className="text-xs text-slate-400 ml-2">
                              ({category})
                            </span>
                          )}
                        </div>
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setCategory(''); setSubCategory(''); }}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-400">
                        <Search size={16} />
                        <input
                          type="text"
                          value={categorySearch}
                          onChange={(e) => { setCategorySearch(e.target.value); setShowCategoryDropdown(true); }}
                          onFocus={() => setShowCategoryDropdown(true)}
                          placeholder="Search category..."
                          className="flex-1 bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-400"
                        />
                        <ChevronDown size={16} />
                      </div>
                    )}
                  </div>

                  {/* Category Dropdown - Higher z-index for mobile */}
                  {showCategoryDropdown && !category && (
                    <div className="absolute z-[100] w-full mt-1 bg-white rounded-xl border border-slate-200 shadow-xl max-h-64 overflow-y-auto">
                      {categorySearch ? (
                        filteredCategories.length === 0 ? (
                          <div className="p-4 text-sm text-slate-400 text-center">No categories found</div>
                        ) : (
                          filteredCategories.map(cat => {
                            const parentName = getParentName(cat);
                            const hasSubs = hasSubCategories(cat.id);
                            if (!parentName && hasSubs) return null;
                            
                            return (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => selectCategory(cat)}
                                className={`w-full text-left px-4 py-2.5 ${theme.hover} transition-colors flex items-center justify-between`}
                              >
                                <span className="text-sm font-medium text-slate-800">{cat.name}</span>
                                {parentName && (
                                  <span className={`text-xs ${theme.text} ${theme.bg} px-2 py-0.5 rounded-full`}>{parentName}</span>
                                )}
                              </button>
                            );
                          })
                        )
                      ) : (
                        <div>
                          {mainCategories.map(mainCat => {
                            const subs = getSubCategories(mainCat.id);
                            
                            return (
                              <div key={mainCat.id}>
                                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                                  <span className="text-xs font-bold text-slate-500 uppercase">{mainCat.name}</span>
                                </div>
                                
                                {subs.length > 0 ? (
                                  subs.map(sub => (
                                    <button
                                      key={sub.id}
                                      type="button"
                                      onClick={() => selectCategory(sub)}
                                      className={`w-full text-left px-6 py-2.5 ${theme.hover} transition-colors text-sm text-slate-700`}
                                    >
                                      {sub.name}
                                    </button>
                                  ))
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => selectCategory(mainCat)}
                                    className={`w-full text-left px-6 py-2.5 ${theme.hover} transition-colors text-sm text-slate-600 italic`}
                                  >
                                    Select "{mainCat.name}"
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      <div className="border-t border-slate-100 p-2">
                        <button
                          type="button"
                          onClick={() => { setShowCategoryDropdown(false); setCategorySearch(''); }}
                          className="w-full text-center text-xs text-slate-400 hover:text-slate-600 py-1"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <input type="hidden" value={category} required />
              </div>

              <Input
                label="Amount (Rs)"
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                min="0"
                step="0.01"
                className="py-3.5 text-base min-h-[48px]"
              />

              <div className="space-y-1.5">
                 <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Note</label>
                 <textarea
                   rows={2}
                   value={note}
                   onChange={(e) => setNote(e.target.value)}
                   placeholder={theme.placeholder}
                   className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:${theme.border} focus:bg-white outline-none transition-all text-slate-800 placeholder:text-slate-400 resize-none text-sm`}
                 />
              </div>

              <div className="pt-2">
                <Button 
                  type="submit" 
                  fullWidth 
                  isLoading={loading} 
                  className={`${mode === 'EXPENSE' ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-200' : 'bg-teal-600 hover:bg-teal-700 shadow-teal-200'} py-3 text-sm`}
                >
                  {theme.buttonText}
                </Button>
              </div>
            </form>
          </div>

          {/* History List */}
          <div className="flex flex-col">
            <h3 className="text-sm font-bold text-slate-800 mb-2 px-1 flex items-center justify-between">
              <span>Today's History</span>
              {loadingHistory && <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Syncing...</span>}
            </h3>
            
            <div className="flex-1 overflow-y-auto max-h-[280px] md:max-h-[400px] bg-slate-50/50 rounded-2xl md:rounded-3xl border border-slate-100 p-2">
              {loadingHistory ? (
                <div className="space-y-2 p-1">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-white animate-pulse rounded-2xl"></div>
                  ))}
                </div>
              ) : history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm">
                    <AlertCircle size={20} className="opacity-40" />
                  </div>
                  <p className="text-xs font-medium">No {mode.toLowerCase()} today</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((item) => {
                    const isReturnEntry = item.is_return;
                    const hasBeenReturned = item.has_been_returned;
                    const isExpense = mode === 'EXPENSE';
                    
                    return (
                      <div 
                        key={item.id} 
                        className={`group p-3 rounded-2xl border shadow-sm transition-all flex items-center gap-3 ${
                          isReturnEntry 
                            ? (isExpense ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200')
                            : hasBeenReturned 
                              ? 'bg-slate-100 border-slate-200 opacity-60' 
                              : `bg-white border-slate-100 hover:shadow-md ${isExpense ? 'hover:border-orange-200' : 'hover:border-teal-200'}`
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isReturnEntry 
                            ? (isExpense ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600')
                            : (isExpense ? 'bg-orange-50 text-orange-600' : 'bg-teal-50 text-teal-600')
                        }`}>
                          {isReturnEntry ? <RotateCcw size={18} /> : <Icon size={18} />}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="min-w-0">
                                <h4 className={`font-bold text-sm truncate ${hasBeenReturned ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                  {item.sub_category || item.category}
                                </h4>
                                {item.sub_category && (
                                  <span className="text-[10px] text-slate-400">{item.category}</span>
                                )}
                              </div>
                              {isReturnEntry && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase flex-shrink-0 ${
                                  isExpense ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                                }`}>
                                  {isExpense ? 'Refund' : 'Return'}
                                </span>
                              )}
                              {hasBeenReturned && !isReturnEntry && (
                                <span className="text-[10px] font-bold bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded uppercase flex-shrink-0">
                                  Returned
                                </span>
                              )}
                            </div>
                            <span className={`font-mono font-bold text-sm ${
                              isReturnEntry 
                                ? (isExpense ? 'text-emerald-600' : 'text-red-600')
                                : 'text-slate-900'
                            }`}>
                              {isReturnEntry ? (isExpense ? '+' : '-') : ''}Rs {Math.abs(item.amount || 0).toFixed(0)}
                            </span>
                          </div>
                          {item.note && (
                            <p className={`text-xs mt-0.5 line-clamp-1 ${
                              isReturnEntry 
                                ? (isExpense ? 'text-emerald-500' : 'text-red-500')
                                : 'text-slate-400'
                            }`}>
                              {item.note}
                            </p>
                          )}
                          <p className="text-[10px] text-slate-300 mt-1">
                            {item.created_at ? new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                          </p>
                        </div>

                        {!isReturnEntry && !hasBeenReturned && (
                          <button 
                            onClick={() => openReturnModal(item)}
                            className={`p-2 text-slate-300 rounded-lg transition-colors ${
                              isExpense ? 'hover:text-orange-500 hover:bg-orange-50' : 'hover:text-teal-500 hover:bg-teal-50'
                            }`}
                            title="Return/Reverse Entry"
                          >
                            <RotateCcw size={16} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Return Modal - Fullscreen on mobile */}
      {showReturnModal && returnTxn && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-[60]">
          <div className="bg-white w-full md:max-w-md md:rounded-3xl rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom md:zoom-in duration-300 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 p-4 md:p-6 border-b border-slate-100 flex items-center justify-between bg-white rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  mode === 'EXPENSE' ? 'bg-orange-100 text-orange-600' : 'bg-teal-100 text-teal-600'
                }`}>
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base md:text-lg text-slate-800">Return {mode === 'EXPENSE' ? 'Expense' : 'Income'}</h3>
                  <p className="text-xs text-slate-400">This will create a reversal entry</p>
                </div>
              </div>
              <button
                onClick={() => setShowReturnModal(false)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 md:p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-500 mb-1">Original Entry</p>
                <p className="font-bold text-slate-800">{returnTxn.category}</p>
                <p className={`text-lg font-bold ${mode === 'EXPENSE' ? 'text-orange-600' : 'text-teal-600'}`}>
                  Rs {returnTxn.amount?.toFixed(0)}
                </p>
                {returnTxn.note && <p className="text-xs text-slate-400 mt-1">{returnTxn.note}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Reason for Return <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="e.g., Wrong entry, Refund received..."
                  className={`w-full px-4 py-3 min-h-[48px] border border-slate-200 rounded-xl outline-none resize-none text-base ${
                    mode === 'EXPENSE' ? 'focus:border-orange-500' : 'focus:border-teal-500'
                  }`}
                  rows={3}
                  autoFocus
                />
              </div>
            </div>

            {/* Actions - Sticky bottom */}
            <div className="sticky bottom-0 p-4 md:p-6 pt-2 flex gap-3 bg-white border-t border-slate-100">
              <Button
                onClick={() => setShowReturnModal(false)}
                variant="outline"
                fullWidth
                className="min-h-[48px]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReturn}
                fullWidth
                isLoading={returningTxn}
                className={`min-h-[48px] ${mode === 'EXPENSE' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-teal-600 hover:bg-teal-700'}`}
              >
                Confirm Return
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

