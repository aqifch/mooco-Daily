import React, { useEffect, useState } from 'react';
import { Layout } from './Layout';
import { Button } from './Button';
import { Input } from './Input';
import { fetchProducts, addProduct, updateProduct, deleteProduct } from '../services/supabase';
import { Product, ViewState, User } from '../types';
import { Plus, Pencil, Trash2, X, Save } from 'lucide-react';

interface ProductManagerProps {
  onBack: () => void;
  onNavigate: (view: ViewState) => void;
  currentUser: User | null;
}

export const ProductManager: React.FC<ProductManagerProps> = ({ onBack, onNavigate, currentUser }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Form Data
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [salePrice, setSalePrice] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await fetchProducts();
      setProducts(data);
    } catch (err) {
      console.error(err);
      alert('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingId(product.id);
      setName(product.name);
      setUnit(product.unit || '');
      setSalePrice(product.sale_price.toString());
    } else {
      setEditingId(null);
      setName('');
      setUnit('');
      setSalePrice('');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        name,
        unit: unit || undefined,
        sale_price: Number(salePrice),
      };

      if (editingId) {
        await updateProduct(editingId, payload);
      } else {
        await addProduct(payload);
      }
      
      setIsModalOpen(false);
      await loadProducts();
    } catch (err) {
      console.error(err);
      alert('Failed to save product');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this product? This will assume historical data might be affected.')) return;
    
    try {
      await deleteProduct(id);
      await loadProducts();
    } catch (err) {
      console.error(err);
      alert('Failed to delete product');
    }
  };

  return (
    <Layout 
      title="Product Manager" 
      onBack={onBack}
      activeView={ViewState.PRODUCTS}
      onNavigate={onNavigate}
      currentUser={currentUser}
    >
      <div className="space-y-6 pb-24">
        {/* Header Action */}
        <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-700">All Inventory Items</h2>
            <Button onClick={() => handleOpenModal()} className="px-4 py-2 text-sm shadow-md">
                <Plus size={18} /> Add Product
            </Button>
        </div>

        {/* List View */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
                <div className="p-8 text-center text-slate-400">Loading products...</div>
            ) : products.length === 0 ? (
                <div className="p-12 text-center text-slate-400">No products found. Add one to get started.</div>
            ) : (
                <div className="divide-y divide-slate-100">
                    {products.map(p => (
                        <div key={p.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                                    {p.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">{p.name}</h3>
                                    <p className="text-xs text-slate-400">
                                        Unit: {p.unit || 'N/A'} • Open Stock: {p.current_opening_stock}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4 md:gap-8">
                                <div className="text-right hidden md:block">
                                    <p className="text-sm font-bold text-slate-700">Sale: ${p.sale_price}</p>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => handleOpenModal(p)}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        <Pencil size={18} />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(p.id)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Product' : 'Add New Product'}</h3>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                        <X size={24} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input 
                        label="Product Name" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        required 
                        placeholder="e.g. Milk"
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Unit" 
                            value={unit} 
                            onChange={e => setUnit(e.target.value)} 
                            placeholder="e.g. Liters"
                        />
                        <Input 
                            label="Sale Price" 
                            type="number" 
                            step="0.01" 
                            value={salePrice} 
                            onChange={e => setSalePrice(e.target.value)} 
                            required 
                            placeholder="0.00"
                        />
                    </div>
                    
                    {/* Purchase Price Input Removed */}

                    <div className="pt-4 flex gap-3">
                        <Button type="button" variant="outline" fullWidth onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" fullWidth isLoading={actionLoading} className="shadow-lg">
                            <Save size={18} /> Save
                        </Button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </Layout>
  );
};