import React, { useEffect, useState } from 'react';
import { Layout } from './Layout';
import { Button } from './Button';
import { Input } from './Input';
import { fetchProducts, addTransaction, fetchTodayStockIn, returnTransaction, getTodayString } from '../services/supabase';
import { Product, ViewState, Transaction, User } from '../types';
import { PackagePlus, RotateCcw, Box, TrendingUp, X } from 'lucide-react';

interface StockInProps {
  onBack: () => void;
  onNavigate: (view: ViewState) => void;
  currentUser: User | null;
}

export const StockIn: React.FC<StockInProps> = ({ onBack, onNavigate, currentUser }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  
  const [history, setHistory] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Return modal state
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnTxn, setReturnTxn] = useState<Transaction | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [returningTxn, setReturningTxn] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoadingData(true);
    try {
      const [productsData, historyDataRaw] = await Promise.all([
        fetchProducts(),
        fetchTodayStockIn(true) // Include returns to show full history
      ]);
      setProducts(productsData);
      
      // Manual Join: Match product IDs to Product Objects for the UI
      const enrichedHistory = historyDataRaw.map(item => ({
        ...item,
        products: productsData.find(p => p.id === item.product_id)
      }));
      
      setHistory(enrichedHistory);
    } catch (error) {
      console.error(error);
      alert('Failed to load data');
    } finally {
      setLoadingData(false);
    }
  };

  const loadStockHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await fetchTodayStockIn(true); // Include returns
      // Manual Join
      const enrichedHistory = data.map(item => ({
        ...item,
        products: products.find(p => p.id === item.product_id)
      }));
      setHistory(enrichedHistory);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !quantity) return;

    setLoading(true);
    try {
      await addTransaction({
        type: 'STOCK_IN',
        product_id: Number(selectedProductId),
        quantity: Number(quantity),
        note: note,
        date_str: getTodayString()
      });
      
      // Reset form
      setSelectedProductId('');
      setQuantity('');
      setNote('');
      
      // Refresh history
      await loadStockHistory();
    } catch (error) {
      console.error('Error adding stock:', error);
      alert('Failed to add stock. Please check connection.');
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
        await loadStockHistory();
        setShowReturnModal(false);
        setReturnTxn(null);
        setReturnReason('');
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error returning stock:', error);
      alert('Failed to return stock entry.');
    } finally {
      setReturningTxn(false);
    }
  };

  // Find selected product for unit display
  const selectedProduct = products.find(p => p.id === Number(selectedProductId));

  return (
    <Layout 
      title="Stock In" 
      onBack={onBack} 
      activeView={ViewState.STOCK_IN}
      onNavigate={onNavigate}
      currentUser={currentUser}
    >
      <div className="space-y-6 pb-24">
        
        {/* Top Header Card - EXTRA SMART & COMPACT */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl p-3 text-white shadow-md shadow-blue-200/50 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-blue-100 text-[10px] uppercase font-bold tracking-wider mb-0.5">
              <TrendingUp size={12} />
              <span>Stock Today</span>
            </div>
            <div className="text-xl font-bold tracking-tight">
              {history.length} <span className="text-sm font-medium text-blue-100 opacity-80">Items</span>
            </div>
          </div>
          
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm border border-white/10">
             <Box size={20} />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Input Form */}
          <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-100 h-fit">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
              Add Stock Details
            </h3>

            {loadingData && products.length === 0 ? (
              <div className="text-center py-8 text-slate-400">Loading products...</div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Select Product</label>
                  <div className="relative">
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:border-blue-500 focus:bg-white outline-none transition-all text-slate-800 appearance-none cursor-pointer text-sm font-medium"
                      required
                    >
                      <option value="" disabled>-- Choose a product --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} {p.unit ? `(${p.unit})` : ''}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Quantity"
                    type="number"
                    inputMode="numeric"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g. 10"
                    required
                    min="0.0001"
                    step="any"
                    className="py-3 text-sm"
                  />
                  <div className="pt-7 px-2">
                     <span className="text-slate-500 text-sm font-medium">
                       {selectedProduct?.unit || 'Units'}
                     </span>
                  </div>
                </div>

                <Input
                  label="Supplier / Note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Nestlé"
                  className="py-3 text-sm"
                />

                <div className="pt-2">
                  <Button 
                    type="submit" 
                    fullWidth 
                    isLoading={loading} 
                    variant="primary"
                    className="bg-blue-600 hover:bg-blue-700 shadow-blue-200 py-3 text-sm"
                  >
                    Confirm Stock In
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* History List */}
          <div className="flex flex-col h-full">
            <h3 className="text-sm font-bold text-slate-800 mb-3 px-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <span>Today's Incoming</span>
              </div>
              {loadingHistory && <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Syncing...</span>}
            </h3>
            
            <div className="flex-1 overflow-y-auto min-h-[300px] md:min-h-0 bg-slate-50/50 rounded-3xl border border-slate-100 p-2 md:p-3">
              {loadingData || loadingHistory ? (
                <div className="space-y-2 p-1">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-white animate-pulse rounded-2xl"></div>
                  ))}
                </div>
              ) : history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm">
                    <PackagePlus size={20} className="opacity-30" />
                  </div>
                  <p className="text-xs font-medium">No stock added today</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((item) => {
                    const isReturnEntry = item.is_return;
                    const hasBeenReturned = item.has_been_returned;
                    
                    return (
                      <div 
                        key={item.id} 
                        className={`group p-3 rounded-2xl border shadow-sm transition-all flex items-center gap-3 ${
                          isReturnEntry 
                            ? 'bg-red-50 border-red-200' 
                            : hasBeenReturned 
                              ? 'bg-slate-100 border-slate-200 opacity-60' 
                              : 'bg-white border-slate-100 hover:shadow-md hover:border-blue-200'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isReturnEntry ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                          {isReturnEntry ? <RotateCcw size={18} /> : <PackagePlus size={18} />}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <h4 className={`font-bold text-sm truncate ${hasBeenReturned ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                {item.products?.name || 'Loading...'}
                              </h4>
                              {isReturnEntry && (
                                <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded uppercase flex-shrink-0">
                                  Return
                                </span>
                              )}
                              {hasBeenReturned && !isReturnEntry && (
                                <span className="text-[10px] font-bold bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded uppercase flex-shrink-0">
                                  Returned
                                </span>
                              )}
                            </div>
                            <span className={`font-bold text-xs whitespace-nowrap px-2 py-0.5 rounded-md ${
                              isReturnEntry 
                                ? 'bg-red-100 text-red-600' 
                                : 'bg-emerald-50 text-emerald-600'
                            }`}>
                              {isReturnEntry ? '' : '+'}{item.quantity} {item.products?.unit || ''}
                            </span>
                          </div>
                          {item.note && (
                            <p className={`text-xs mt-0.5 line-clamp-1 flex items-center gap-1 ${isReturnEntry ? 'text-red-400' : 'text-slate-400'}`}>
                              <span className={`w-1 h-1 rounded-full ${isReturnEntry ? 'bg-red-300' : 'bg-slate-300'}`}></span>
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
                            className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
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

      {/* Return Modal */}
      {showReturnModal && returnTxn && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-800">Return Stock</h3>
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

            <div className="p-6 space-y-4">
              {/* Transaction Details */}
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-500 mb-1">Original Entry</p>
                <p className="font-bold text-slate-800">{returnTxn.products?.name || 'Product'}</p>
                <p className="text-lg font-bold text-blue-600">+{returnTxn.quantity} {returnTxn.products?.unit || ''}</p>
                {returnTxn.note && <p className="text-xs text-slate-400 mt-1">{returnTxn.note}</p>}
              </div>

              {/* Reason Input */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Reason for Return <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="e.g., Wrong quantity, Damaged goods, Returned to supplier..."
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none resize-none"
                  rows={3}
                  autoFocus
                />
              </div>
            </div>

            <div className="p-6 pt-0 flex gap-3">
              <Button
                onClick={() => setShowReturnModal(false)}
                variant="outline"
                fullWidth
              >
                Cancel
              </Button>
              <Button
                onClick={handleReturn}
                fullWidth
                isLoading={returningTxn}
                className="bg-blue-600 hover:bg-blue-700"
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