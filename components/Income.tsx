import React, { useState, useEffect } from 'react';
import { Layout } from './Layout';
import { Button } from './Button';
import { Input } from './Input';
import { addTransaction, fetchTodayIncome, deleteTransaction, getTodayString, fetchCategories } from '../services/supabase';
import { ViewState, Transaction, User, Category } from '../types';
import { Trash2, TrendingUp, AlertCircle, HandCoins } from 'lucide-react';

interface IncomeProps {
  onBack: () => void;
  onNavigate: (view: ViewState) => void;
  currentUser: User | null;
}

export const Income: React.FC<IncomeProps> = ({ onBack, onNavigate, currentUser }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  
  const [history, setHistory] = useState<Transaction[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoadingHistory(true);
    try {
      const [incData, catData] = await Promise.all([
        fetchTodayIncome(),
        fetchCategories('INCOME')
      ]);
      setHistory(incData);
      setCategories(catData);
      const sum = incData.reduce((acc, curr) => acc + (curr.amount || 0), 0);
      setTotalIncome(sum);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !amount) return;
    
    setLoading(true);
    try {
      await addTransaction({
        type: 'INCOME',
        category,
        amount: Number(amount),
        note: note,
        date_str: getTodayString()
      });
      
      setCategory('');
      setAmount('');
      setNote('');
      
      const incData = await fetchTodayIncome();
      setHistory(incData);
      const sum = incData.reduce((acc, curr) => acc + (curr.amount || 0), 0);
      setTotalIncome(sum);
    } catch (error) {
      console.error('Error recording income:', error);
      alert('Failed to save income.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this income entry?')) return;
    try {
      await deleteTransaction(id);
      const incData = await fetchTodayIncome();
      setHistory(incData);
      const sum = incData.reduce((acc, curr) => acc + (curr.amount || 0), 0);
      setTotalIncome(sum);
    } catch (error) {
      console.error(error);
      alert('Failed to delete income.');
    }
  };

  return (
    <Layout 
      title="Other Income" 
      onBack={onBack}
      activeView={ViewState.INCOME}
      onNavigate={onNavigate}
      currentUser={currentUser}
    >
      <div className="space-y-6 pb-24">
        
        {/* Top Summary Card */}
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl p-3 text-white shadow-md shadow-teal-200/50 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-teal-100 text-[10px] uppercase font-bold tracking-wider mb-0.5">
              <TrendingUp size={12} />
              <span>Income Today</span>
            </div>
            <div className="text-xl font-bold tracking-tight">
              ${totalIncome.toFixed(2)}
            </div>
          </div>

          <div className="bg-white/20 px-2 py-1.5 rounded-lg backdrop-blur-sm text-xs text-white font-medium border border-white/10">
            {history.length} Txns
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Input Form */}
          <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <div className="w-1 h-4 bg-teal-500 rounded-full"></div>
              Add Income
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Category</label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:border-teal-500 focus:bg-white outline-none transition-all text-slate-800 appearance-none cursor-pointer text-sm font-medium"
                    required
                  >
                    <option value="" disabled>-- Select Category --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              <Input
                label="Amount ($)"
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                min="0"
                step="0.01"
                className="py-3 text-sm"
              />

              <div className="space-y-1.5">
                 <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Detail / Note</label>
                 <textarea
                   rows={2}
                   value={note}
                   onChange={(e) => setNote(e.target.value)}
                   placeholder="e.g. Sold scrap metal..."
                   className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:border-teal-500 focus:bg-white outline-none transition-all text-slate-800 placeholder:text-slate-400 resize-none text-sm"
                 />
              </div>

              <div className="pt-2">
                <Button 
                  type="submit" 
                  fullWidth 
                  isLoading={loading} 
                  variant="secondary"
                  className="bg-teal-600 hover:bg-teal-700 shadow-teal-200 py-3 text-sm"
                >
                  Save Income
                </Button>
              </div>
            </form>
          </div>

          {/* History List */}
          <div className="flex flex-col h-full">
            <h3 className="text-sm font-bold text-slate-800 mb-3 px-2 flex items-center justify-between">
              <span>Today's History</span>
              {loadingHistory && <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Syncing...</span>}
            </h3>
            
            <div className="flex-1 overflow-y-auto min-h-[300px] md:min-h-0 bg-slate-50/50 rounded-3xl border border-slate-100 p-2 md:p-3">
              {loadingHistory ? (
                <div className="space-y-2 p-1">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-white animate-pulse rounded-2xl"></div>
                  ))}
                </div>
              ) : history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm">
                    <HandCoins size={20} className="opacity-40" />
                  </div>
                  <p className="text-xs font-medium">No income recorded today</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((item) => (
                    <div key={item.id} className="group bg-white p-3 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-teal-200 transition-all flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0">
                        <TrendingUp size={18} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <h4 className="font-bold text-slate-800 text-sm truncate pr-2">{item.category}</h4>
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            +${item.amount?.toFixed(2)}
                          </span>
                        </div>
                        {item.note && (
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{item.note}</p>
                        )}
                        <p className="text-[10px] text-slate-300 mt-1">
                          {item.created_at ? new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                        </p>
                      </div>

                      <button 
                        onClick={() => item.id && handleDelete(item.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Entry"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};