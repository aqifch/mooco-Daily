import React, { useEffect, useState, useMemo } from 'react';
import { Layout } from './Layout';
import { Button } from './Button';
import { fetchProducts, fetchTodayStockIn, performDailyClosing } from '../services/supabase';
import { Product, ViewState, User } from '../types';

interface DayClosingProps {
  onBack: () => void;
  onNavigate: (view: ViewState) => void;
  currentUser: User | null;
}

interface ClosingRow {
  product: Product;
  stockIn: number;
  totalAvailable: number;
  closingInput: string;
}

export const DayClosing: React.FC<DayClosingProps> = ({ onBack, onNavigate, currentUser }) => {
  const [rows, setRows] = useState<ClosingRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Parallel fetch for speed
      const [productsData, transactionsData] = await Promise.all([
        fetchProducts(),
        fetchTodayStockIn()
      ]);

      // OPTIMIZATION: Create a Map for O(1) lookup instead of filtering array for every product
      const stockInMap = new Map<number, number>();
      
      for (const t of transactionsData) {
        if (t.product_id && t.quantity) {
          const current = stockInMap.get(t.product_id) || 0;
          stockInMap.set(t.product_id, current + t.quantity);
        }
      }

      // Build rows using the Map
      const calculatedRows: ClosingRow[] = productsData.map(p => {
        const stockInQty = stockInMap.get(p.id) || 0;
        return {
          product: p,
          stockIn: stockInQty,
          totalAvailable: p.current_opening_stock + stockInQty,
          closingInput: '' // User must input this
        };
      });

      setRows(calculatedRows);
    } catch (err) {
      console.error(err);
      alert('Error loading data for closing.');
    } finally {
      setFetching(false);
    }
  };

  const handleInputChange = (productId: number, value: string) => {
    setRows(prev => prev.map(row => 
      row.product.id === productId ? { ...row, closingInput: value } : row
    ));
  };

  // Memoize calculations to prevent lag during typing
  const { totalRev, details } = useMemo(() => {
    let totalRev = 0;
    const details = rows.map(row => {
      const closing = row.closingInput === '' ? -1 : Number(row.closingInput);
      const sold = closing >= 0 ? Math.max(0, row.totalAvailable - closing) : 0;
      const revenue = sold * row.product.sale_price;
      // Only add to total if user has entered a value
      if (closing >= 0) {
        totalRev += revenue;
      }
      return { ...row, sold, revenue };
    });
    return { totalRev, details };
  }, [rows]);

  const handleSubmit = async () => {
    // Validation
    const incomplete = rows.some(r => r.closingInput === '');
    if (incomplete) {
      alert('Please enter closing stock for all products (enter 0 if none).');
      return;
    }

    if (!window.confirm(`Total Revenue Calculated: $${totalRev.toFixed(2)}\n\nConfirm Daily Closing? This cannot be undone.`)) {
      return;
    }

    setSubmitting(true);
    try {
      const closingData = rows.map(r => ({
        productId: r.product.id,
        newOpeningStock: Number(r.closingInput)
      }));

      await performDailyClosing(closingData, totalRev);
      setCompleted(true);
    } catch (err) {
      console.error(err);
      alert('Failed to process closing.');
    } finally {
      setSubmitting(false);
    }
  };

  if (fetching) {
    return (
      <Layout 
        title="Day End Closing" 
        onBack={onBack}
        activeView={ViewState.CLOSING}
        onNavigate={onNavigate}
        currentUser={currentUser}
      >
        <div className="space-y-4 animate-pulse pt-2">
           {[1, 2, 3, 4, 5].map(i => (
             <div key={i} className="h-20 bg-slate-200 rounded-2xl w-full"></div>
           ))}
        </div>
      </Layout>
    );
  }

  if (completed) {
    return (
      <Layout 
        title="Closing Complete" 
        onBack={onBack}
        activeView={ViewState.CLOSING}
        onNavigate={onNavigate}
        currentUser={currentUser}
      >
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center space-y-4 animate-in fade-in zoom-in duration-500">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4 shadow-lg shadow-green-100">
             <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <h2 className="text-3xl font-bold text-slate-800">Success!</h2>
          <p className="text-slate-600 max-w-md">Daily closing has been recorded successfully. Inventory has been updated for the next business day.</p>
          <Button onClick={onBack} variant="outline" className="mt-8 px-8">Back to Dashboard</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      title="Day End Closing" 
      onBack={onBack}
      activeView={ViewState.CLOSING}
      onNavigate={onNavigate}
      currentUser={currentUser}
    >
      <div className="space-y-6 pb-32">
        
        {/* ----------------- MOBILE COMPACT LIST VIEW (md:hidden) ----------------- */}
        <div className="md:hidden flex flex-col gap-3">
          {rows.map((row) => {
             const hasInput = row.closingInput !== '';
             const sold = hasInput ? Math.max(0, row.totalAvailable - Number(row.closingInput)) : null;
             
             return (
              <div 
                key={row.product.id} 
                className={`bg-white p-4 rounded-2xl shadow-sm border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                   hasInput ? 'border-emerald-200 bg-emerald-50/10' : 'border-slate-100'
                }`}
                onClick={() => document.getElementById(`closing-input-${row.product.id}`)?.focus()}
              >
                {/* Left Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-800 text-base truncate">{row.product.name}</h3>
                  <div className="text-xs text-slate-400 font-medium mt-1 flex items-center gap-2">
                     <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">Open: {row.product.current_opening_stock}</span>
                     <span>+</span>
                     <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">In: {row.stockIn}</span>
                     <span>=</span>
                     <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold">Total: {row.totalAvailable}</span>
                  </div>
                  {sold !== null && (
                    <div className="mt-1.5 text-xs font-bold text-emerald-600">
                      Sold: {sold}
                    </div>
                  )}
                </div>

                {/* Right Input */}
                <div className="w-24 flex-shrink-0">
                  <div className="relative">
                    <input
                      id={`closing-input-${row.product.id}`}
                      type="number"
                      inputMode="numeric"
                      value={row.closingInput}
                      onChange={(e) => handleInputChange(row.product.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className={`w-full h-12 px-2 text-center border-2 rounded-xl focus:ring-2 focus:ring-offset-1 outline-none font-bold text-xl transition-all placeholder:text-slate-300 shadow-sm ${
                        hasInput 
                        ? 'border-emerald-400 text-emerald-700 bg-white focus:ring-emerald-200' 
                        : 'border-slate-200 text-slate-800 bg-slate-50 focus:border-blue-400 focus:bg-white focus:ring-blue-100'
                      }`}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
             );
          })}
        </div>

        {/* ----------------- DESKTOP TABLE VIEW (hidden md:block) ----------------- */}
        <div className="hidden md:block bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-5">Product Name</th>
                <th className="px-6 py-5 text-center">Unit Price</th>
                <th className="px-6 py-5 text-center">Open Stock</th>
                <th className="px-6 py-5 text-center">Stock In</th>
                <th className="px-6 py-5 text-center text-blue-600">Total Avail</th>
                <th className="px-6 py-5 w-48 text-center bg-emerald-50/50 text-emerald-800">Closing Stock</th>
                <th className="px-6 py-5 text-right">Sold / Sale Rev</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => {
                 const closingVal = Number(row.closingInput);
                 const hasInput = row.closingInput !== '';
                 const sold = hasInput ? Math.max(0, row.totalAvailable - closingVal) : '-';
                 const rev = hasInput && sold !== '-' ? (sold as number * row.product.sale_price).toFixed(2) : '-';

                 return (
                  <tr 
                    key={row.product.id} 
                    className={`transition-colors group cursor-pointer ${hasInput ? 'bg-emerald-50/5' : 'hover:bg-slate-50'}`}
                    onClick={() => document.getElementById(`closing-input-${row.product.id}`)?.focus()}
                  >
                    <td className="px-6 py-4 font-bold text-slate-700 text-base">{row.product.name}</td>
                    <td className="px-6 py-4 text-center text-slate-500 font-mono text-sm">${row.product.sale_price}</td>
                    <td className="px-6 py-4 text-center text-slate-500 font-medium">{row.product.current_opening_stock}</td>
                    <td className="px-6 py-4 text-center text-emerald-600 font-bold">{row.stockIn > 0 ? `+${row.stockIn}` : '-'}</td>
                    <td className="px-6 py-4 text-center font-bold text-blue-600 bg-blue-50/10 text-lg">{row.totalAvailable}</td>
                    <td className="px-4 py-3 bg-emerald-50/20">
                      <div className="relative flex items-center justify-center">
                        <input
                          id={`closing-input-${row.product.id}`}
                          type="number"
                          min="0"
                          value={row.closingInput}
                          onChange={(e) => handleInputChange(row.product.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-28 px-2 py-2 text-center border-2 border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 outline-none font-bold text-lg text-slate-800 transition-all bg-white shadow-sm"
                          placeholder="0"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex flex-col items-end gap-0.5">
                         <span className="text-sm font-bold text-slate-800">{sold !== '-' ? `${sold} Sold` : '-'}</span>
                         <span className="text-xs font-mono text-emerald-600 font-medium">{rev !== '-' ? `$${rev}` : ''}</span>
                       </div>
                    </td>
                  </tr>
                 );
              })}
            </tbody>
          </table>
        </div>

        {/* Responsive Sticky Footer */}
        <div className="fixed bottom-[80px] md:bottom-0 left-0 right-0 md:left-64 bg-white/95 backdrop-blur-xl border-t border-slate-200 p-3 md:p-6 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-20 transition-all">
          <div className="max-w-6xl mx-auto flex flex-row items-center justify-between gap-4">
            <div className="flex flex-col md:flex-row md:items-center md:gap-12">
              <span className="text-slate-400 text-[10px] md:text-xs uppercase font-bold tracking-wider">Sale Revenue</span>
              <span className="text-2xl md:text-3xl font-bold text-emerald-600">${totalRev.toFixed(2)}</span>
            </div>
            
            <div className="w-1/2 md:w-auto md:min-w-[300px]">
               <Button 
                onClick={handleSubmit} 
                fullWidth 
                variant="secondary"
                isLoading={submitting}
                className="shadow-xl shadow-emerald-200 hover:shadow-2xl hover:shadow-emerald-300 active:scale-95 py-3 md:py-3 text-sm md:text-lg rounded-xl"
              >
                Complete
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};