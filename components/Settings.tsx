import React, { useEffect, useState } from 'react';
import { Layout } from './Layout';
import { fetchUsers, addUser, updateUser, deleteUser, fetchCategories, addCategory, updateCategory, deleteCategory, deleteDataByType, resetProductStock, getDataCounts, DeleteDataType, fetchProducts, supabase } from '../services/supabase';
import { User, ViewState, Category, Product } from '../types';
import { Users, UserPlus, Trash2, Lock, CheckSquare, Pencil, X, Tags, Plus, Shield, Hash, Briefcase, FolderPlus, TrendingDown, TrendingUp, ShieldCheck, Database, AlertTriangle, RefreshCw, PackageMinus, Receipt, HandCoins, Archive, Package, Save, CheckCircle, Wallet, FileText } from 'lucide-react';

interface SettingsProps {
  onBack: () => void;
  onNavigate: (view: ViewState) => void;
  currentUser: User | null;
}

// Settings permission is NOT available for other users - only Owner/Admin has it
const AVAILABLE_PERMISSIONS = [
  { id: ViewState.STOCK_IN, label: 'Stock In' },
  { id: ViewState.EXPENSES, label: 'Expenses' },
  { id: ViewState.INCOME, label: 'Other Income' },
  { id: ViewState.CLOSING, label: 'Day Closing' },
  { id: ViewState.PRODUCTS, label: 'Manage Products' },
  { id: ViewState.REPORTS, label: 'Reports & History' },
  // Settings is NOT included - only Owner/Admin can access
];

// Check if user is protected (Owner/Admin)
const isProtectedUser = (user: User): boolean => {
  const role = user.role?.toLowerCase() || '';
  return role === 'owner' || role === 'admin' || role === 'administrator';
};

// Check if current user can edit target user
const canEditUser = (targetUser: User, currentUser: User | null): boolean => {
  if (!currentUser) return false;
  
  // User can always edit themselves (for PIN change)
  if (targetUser.id === currentUser.id) return true;
  
  // Protected users can only be edited by themselves
  if (isProtectedUser(targetUser)) return false;
  
  return true;
};

export const Settings: React.FC<SettingsProps> = ({ onBack, onNavigate, currentUser }) => {
  // Data State
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // User Modal State
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userName, setUserName] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [userSaving, setUserSaving] = useState(false);

  // Category Modal State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryType, setCategoryType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [categoryParentId, setCategoryParentId] = useState<number | null>(null);
  const [categorySaving, setCategorySaving] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());

  // Active Tab
  const [activeTab, setActiveTab] = useState<'users' | 'categories' | 'stock' | 'data'>('users');

  // Data Management State
  const [dataCounts, setDataCounts] = useState({ transactions: 0, stockIn: 0, expenses: 0, income: 0, closings: 0, withdrawals: 0 });
  const [deleting, setDeleting] = useState(false);
  const [deleteType, setDeleteType] = useState<DeleteDataType | null>(null);

  // Stock Adjustment State
  const [products, setProducts] = useState<Product[]>([]);
  const [stockAdjustments, setStockAdjustments] = useState<Record<number, string>>({});
  const [savingStock, setSavingStock] = useState(false);
  const [stockSaveSuccess, setStockSaveSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [userData, catData, counts, productsData] = await Promise.all([
        fetchUsers(), 
        fetchCategories(),
        getDataCounts(),
        fetchProducts()
      ]);
      setUsers(userData);
      setCategories(catData);
      setDataCounts(counts);
      setProducts(productsData);
      
      // Initialize stock adjustments with current values
      const initialAdjustments: Record<number, string> = {};
      productsData.forEach(p => {
        if (p.id) initialAdjustments[p.id] = (p.current_opening_stock || 0).toString();
      });
      setStockAdjustments(initialAdjustments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ============ USER HANDLERS ============
  const openAddUserModal = () => {
    setEditingUser(null);
    setUserName('');
    setPin('');
    setRole('');
    setPermissions([]);
    setShowUserModal(true);
  };

  const openEditUserModal = (user: User) => {
    // Check if current user can edit this user
    if (!canEditUser(user, currentUser)) {
      alert('You cannot edit this account.');
      return;
    }
    
    setEditingUser(user);
    setUserName(user.name);
    setPin(user.pin);
    setRole(user.role);
    // Filter out 'settings' from permissions if present
    setPermissions((user.permissions || []).filter(p => p.toLowerCase() !== 'settings'));
    setShowUserModal(true);
  };
  
  // Check if editing own account (for restricted edit mode)
  const isEditingSelf = editingUser?.id === currentUser?.id;
  const isEditingProtectedUser = editingUser ? isProtectedUser(editingUser) : false;

  const closeUserModal = () => {
    setShowUserModal(false);
    setEditingUser(null);
  };

  const handleTogglePermission = (permId: string) => {
    setPermissions(prev => 
      prev.includes(permId) 
        ? prev.filter(p => p !== permId)
        : [...prev, permId]
    );
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !pin || !role) return;
    
    setUserSaving(true);
    try {
      // If editing protected user (themselves), only update PIN
      if (editingUser && isProtectedUser(editingUser) && editingUser.id === currentUser?.id) {
        await updateUser(editingUser.id, { pin });
        closeUserModal();
        const newUsers = await fetchUsers();
        setUsers(newUsers);
        return;
      }
      
      // Prevent creating admin/owner roles for new users
      const roleLower = role.toLowerCase();
      if (!editingUser && (roleLower === 'admin' || roleLower === 'owner' || roleLower === 'administrator')) {
        alert('Cannot create users with Admin/Owner role. These are reserved roles.');
        setUserSaving(false);
        return;
      }
      
      // Name is used as both name and username for login
      // Settings permission is never given to regular users
      const finalPermissions = permissions.filter(p => p.toLowerCase() !== 'settings');
      
      const payload = { 
        name: userName, 
        username: userName.toLowerCase().replace(/\s+/g, ''), // Auto-generate username from name
        pin, 
        role, 
        permissions: finalPermissions 
      };
      
      if (editingUser?.id) {
        await updateUser(editingUser.id, payload);
      } else {
        await addUser(payload);
      }
      closeUserModal();
      const newUsers = await fetchUsers();
      setUsers(newUsers);
    } catch (err) {
      console.error(err);
      alert('Failed to save user.');
    } finally {
      setUserSaving(false);
    }
  };

  const handleDeleteUser = async (id: number, user: User) => {
    // Don't allow deleting protected users
    if (isProtectedUser(user)) {
      alert('Administrator account cannot be deleted.');
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await deleteUser(id);
      const newUsers = await fetchUsers();
      setUsers(newUsers);
    } catch (err) {
      console.error(err);
      alert('Failed to delete user');
    }
  };

  // ============ CATEGORY HANDLERS ============
  const openAddCategoryModal = (type: 'EXPENSE' | 'INCOME', parentId?: number) => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryType(type);
    setCategoryParentId(parentId || null);
    setShowCategoryModal(true);
  };

  const openEditCategoryModal = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setCategoryType(cat.type);
    setCategoryParentId(cat.parent_id || null);
    setShowCategoryModal(true);
  };

  const toggleCategoryExpand = (categoryId: number) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const closeCategoryModal = () => {
    setShowCategoryModal(false);
    setEditingCategory(null);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName) return;
    
    setCategorySaving(true);
    try {
      if (editingCategory?.id) {
        await updateCategory(editingCategory.id, categoryName);
      } else {
        await addCategory(categoryName, categoryType, categoryParentId);
      }
      closeCategoryModal();
      const newCats = await fetchCategories();
      setCategories(newCats);
    } catch (error) {
      alert('Failed to save category');
    } finally {
      setCategorySaving(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if(!window.confirm('Delete this category?')) return;
    try {
      await deleteCategory(id);
      const newCats = await fetchCategories();
      setCategories(newCats);
    } catch (error) {
      alert('Failed to delete category');
    }
  };

  // ============ DATA MANAGEMENT HANDLERS ============
  const handleDeleteData = async (type: DeleteDataType) => {
    const typeLabels: Record<DeleteDataType, string> = {
      'transactions': 'ALL Transactions',
      'closings': 'ALL Daily Closings',
      'stock_in': 'Stock In entries',
      'expenses': 'Expense entries',
      'income': 'Income entries',
      'withdrawals': 'Cash Withdrawal entries',
      'all': 'ALL DATA (Transactions, Closings, Withdrawals, Stock Reset)'
    };

    const confirmMsg = type === 'all' 
      ? `⚠️ DANGER! This will DELETE:\n\n• All Transactions\n• All Daily Closings\n• All Cash Withdrawals\n• Reset ALL Product Stock to 0\n\nThis action CANNOT be undone!\n\nType "DELETE ALL" to confirm:`
      : `Are you sure you want to delete ${typeLabels[type]}?\n\nThis action cannot be undone!`;

    if (type === 'all') {
      const input = prompt(confirmMsg);
      if (input !== 'DELETE ALL') {
        alert('Deletion cancelled.');
        return;
      }
    } else {
      if (!window.confirm(confirmMsg)) return;
    }

    setDeleting(true);
    setDeleteType(type);
    try {
      const result = await deleteDataByType(type);
      if (result.success) {
        alert(result.message);
        // Reload counts
        const counts = await getDataCounts();
        setDataCounts(counts);
      } else {
        alert('Error: ' + result.message);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete data');
    } finally {
      setDeleting(false);
      setDeleteType(null);
    }
  };

  const handleResetStock = async () => {
    if (!window.confirm('Reset all product stock to 0?\n\nThis will set current_opening_stock to 0 for all products.')) return;
    
    setDeleting(true);
    try {
      const result = await resetProductStock();
      alert(result.message);
    } catch (err) {
      alert('Failed to reset stock');
    } finally {
      setDeleting(false);
    }
  };

  // ============ STOCK ADJUSTMENT HANDLERS ============
  const handleStockChange = (productId: number, value: string) => {
    setStockAdjustments(prev => ({
      ...prev,
      [productId]: value
    }));
    setStockSaveSuccess(false);
  };

  const handleSaveStockAdjustments = async () => {
    const changes: { id: number; name: string; oldStock: number; newStock: number }[] = [];
    
    // Find all products with changes
    products.forEach(product => {
      if (!product.id) return;
      const newValue = parseInt(stockAdjustments[product.id] || '0');
      const oldValue = product.current_opening_stock || 0;
      if (newValue !== oldValue) {
        changes.push({
          id: product.id,
          name: product.name,
          oldStock: oldValue,
          newStock: newValue
        });
      }
    });

    if (changes.length === 0) {
      alert('No changes to save.');
      return;
    }

    // Confirm changes
    const changesList = changes.map(c => `• ${c.name}: ${c.oldStock} → ${c.newStock}`).join('\n');
    if (!window.confirm(`Save these stock adjustments?\n\n${changesList}`)) return;

    setSavingStock(true);
    try {
      // Update each product
      for (const change of changes) {
        const { error } = await supabase
          .from('products')
          .update({ current_opening_stock: change.newStock })
          .eq('id', change.id);
        
        if (error) throw error;
      }

      // Reload products
      const updatedProducts = await fetchProducts();
      setProducts(updatedProducts);
      
      // Update adjustments state
      const newAdjustments: Record<number, string> = {};
      updatedProducts.forEach(p => {
        if (p.id) newAdjustments[p.id] = (p.current_opening_stock || 0).toString();
      });
      setStockAdjustments(newAdjustments);
      
      setStockSaveSuccess(true);
      setTimeout(() => setStockSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save stock adjustments');
    } finally {
      setSavingStock(false);
    }
  };

  // Main categories (no parent)
  const expenseCategories = categories.filter(c => c.type === 'EXPENSE' && !c.parent_id);
  const incomeCategories = categories.filter(c => c.type === 'INCOME' && !c.parent_id);
  
  // Get sub-categories for a parent
  const getSubCategories = (parentId: number) => categories.filter(c => c.parent_id === parentId);

  return (
    <Layout 
      title="Settings" 
      onBack={onBack}
      activeView={ViewState.SETTINGS}
      onNavigate={onNavigate}
      currentUser={currentUser}
    >
      <div className="space-y-6 pb-24">
        
        {/* Tab Navigation - Scrollable on mobile */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'users' 
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-500'
            }`}
          >
            <Users size={14} />
            Staff
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'categories' 
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-500'
            }`}
          >
            <Tags size={14} />
            Categories
          </button>
          <button
            onClick={() => setActiveTab('stock')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'stock' 
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-500'
            }`}
          >
            <Package size={14} />
            Stock
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'data' 
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-500'
            }`}
          >
            <Database size={14} />
            Data
          </button>
        </div>

        {/* ============ USERS TAB ============ */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-800">Staff Members</h2>
                <p className="text-xs text-slate-500 hidden sm:block">Manage team access</p>
              </div>
              <button
                onClick={openAddUserModal}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-200 transition-all flex-shrink-0"
              >
                <UserPlus size={16} />
                <span className="hidden sm:inline">Add</span> Staff
              </button>
            </div>

            {/* Users Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1,2,3].map(i => (
                  <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 animate-pulse">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-slate-200 rounded-xl"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-slate-200 rounded w-24 mb-2"></div>
                        <div className="h-3 bg-slate-100 rounded w-16"></div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <div className="h-5 bg-slate-100 rounded w-16"></div>
                      <div className="h-5 bg-slate-100 rounded w-14"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {users.map(user => {
                  const isProtected = isProtectedUser(user);
                  const isSelf = user.id === currentUser?.id;
                  const canEdit = canEditUser(user, currentUser);
                  
                  return (
                    <div 
                      key={user.id} 
                      className={`bg-white rounded-2xl p-5 border shadow-sm transition-all group ${
                        isProtected 
                          ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-white' 
                          : 'border-slate-100 hover:shadow-md hover:border-slate-200'
                      }`}
                    >
                      {/* Protected Badge */}
                      {isProtected && (
                        <div className="flex items-center gap-1.5 text-amber-600 text-[10px] font-bold uppercase mb-3 bg-amber-100 w-fit px-2 py-1 rounded-lg">
                          <ShieldCheck size={12} />
                          {isSelf ? 'Your Account' : 'Protected Account'}
                        </div>
                      )}
                      
                      {/* User Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-lg ${
                            isProtected 
                              ? 'bg-gradient-to-br from-amber-500 to-amber-600' 
                              : 'bg-gradient-to-br from-slate-700 to-slate-900'
                          }`}>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800">{user.name}</h3>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                              isProtected
                                ? 'bg-amber-100 text-amber-700'
                                : user.role.toLowerCase() === 'manager'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {user.role}
                            </span>
                          </div>
                        </div>
                 
                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          {/* Edit button - show for self or non-protected users */}
                          {canEdit && (
                    <button 
                              onClick={() => openEditUserModal(user)}
                              className={`p-2 rounded-lg transition-colors ${
                                isProtected && isSelf
                                  ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50'
                                  : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100'
                              }`}
                              title={isSelf ? 'Edit your PIN' : 'Edit user'}
                     >
                              <Pencil size={16} />
                     </button>
                          )}
                          
                          {/* Delete button - only for non-protected users */}
                          {!isProtected && (
                     <button 
                              onClick={() => user.id && handleDeleteUser(user.id, user)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                     >
                              <Trash2 size={16} />
                     </button>
                          )}
                          
                          {/* Lock icon for protected users (not self) */}
                          {isProtected && !isSelf && (
                            <div className="p-2 text-amber-500">
                              <Lock size={18} />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Permissions */}
                      <div className="flex flex-wrap gap-1.5">
                        {isProtected ? (
                          <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-600 px-2 py-1 rounded-md">
                            Full Access (All Permissions)
                          </span>
                        ) : user.permissions && user.permissions.length > 0 ? (
                          user.permissions.filter(p => p.toLowerCase() !== 'settings').slice(0, 4).map(p => (
                            <span 
                              key={p} 
                              className="text-[10px] font-bold uppercase bg-slate-100 text-slate-500 px-2 py-1 rounded-md"
                            >
                              {p.replace('_', ' ')}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-500 px-2 py-1 rounded-md">
                            Default Access
                          </span>
                        )}
                        {!isProtected && user.permissions && user.permissions.filter(p => p.toLowerCase() !== 'settings').length > 4 && (
                          <span className="text-[10px] font-bold bg-slate-200 text-slate-500 px-2 py-1 rounded-md">
                            +{user.permissions.filter(p => p.toLowerCase() !== 'settings').length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============ CATEGORIES TAB ============ */}
        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Expense Categories */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-orange-50 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                    <TrendingDown size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">Expense Categories</h3>
                    <p className="text-xs text-slate-500">{expenseCategories.length} categories</p>
                  </div>
                </div>
                    <button 
                  onClick={() => openAddCategoryModal('EXPENSE')}
                  className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-lg shadow-orange-200 transition-all hover:scale-105 active:scale-95"
                >
                  <Plus size={16} />
                  Add
                </button>
              </div>
              <div className="p-3 max-h-96 overflow-y-auto">
                {expenseCategories.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    No expense categories yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {expenseCategories.map(cat => {
                      const subCats = getSubCategories(cat.id);
                      const isExpanded = expandedCategories.has(cat.id);
                      
                      return (
                        <div key={cat.id} className="space-y-1">
                          {/* Main Category */}
                          <div className="flex items-center justify-between p-3 bg-slate-50 hover:bg-orange-50 rounded-xl group transition-colors">
                            <div className="flex items-center gap-2">
                              {subCats.length > 0 && (
                                <button 
                                  onClick={() => toggleCategoryExpand(cat.id)}
                                  className="p-1 text-slate-400 hover:text-slate-600"
                    >
                                  <span className={`transition-transform inline-block ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                    </button>
                 )}
                              <span className="font-medium text-slate-700 text-sm">{cat.name}</span>
                              {subCats.length > 0 && (
                                <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-bold">
                                  {subCats.length}
                                </span>
                 )}
              </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => openAddCategoryModal('EXPENSE', cat.id)}
                                className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-white rounded-lg transition-colors"
                                title="Add Sub-category"
                              >
                                <Plus size={14} />
                              </button>
                              <button 
                                onClick={() => openEditCategoryModal(cat)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-colors"
                              >
                            <Pencil size={14} />
                         </button>
                              <button 
                                onClick={() => handleDeleteCategory(cat.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-colors"
                              >
                            <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          
                          {/* Sub-categories */}
                          {isExpanded && subCats.length > 0 && (
                            <div className="ml-6 space-y-1">
                              {subCats.map(subCat => (
                                <div 
                                  key={subCat.id}
                                  className="flex items-center justify-between p-2 pl-4 bg-orange-50 hover:bg-orange-100 rounded-lg group transition-colors border-l-2 border-orange-300"
                                >
                                  <span className="text-slate-600 text-sm">{subCat.name}</span>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={() => openEditCategoryModal(subCat)}
                                      className="p-1 text-slate-400 hover:text-blue-600 hover:bg-white rounded transition-colors"
                                    >
                                      <Pencil size={12} />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteCategory(subCat.id)}
                                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-white rounded transition-colors"
                                    >
                                      <Trash2 size={12} />
                         </button>
                      </div>
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

            {/* Income Categories */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-teal-50 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">Income Categories</h3>
                    <p className="text-xs text-slate-500">{incomeCategories.length} categories</p>
                  </div>
                </div>
                    <button 
                  onClick={() => openAddCategoryModal('INCOME')}
                  className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-lg shadow-teal-200 transition-all hover:scale-105 active:scale-95"
                     >
                  <Plus size={16} />
                  Add
                     </button>
              </div>
              <div className="p-3 max-h-96 overflow-y-auto">
                {incomeCategories.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    No income categories yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {incomeCategories.map(cat => {
                      const subCats = getSubCategories(cat.id);
                      const isExpanded = expandedCategories.has(cat.id);
                      
                      return (
                        <div key={cat.id} className="space-y-1">
                          {/* Main Category */}
                          <div className="flex items-center justify-between p-3 bg-slate-50 hover:bg-teal-50 rounded-xl group transition-colors">
                            <div className="flex items-center gap-2">
                              {subCats.length > 0 && (
                    <button 
                                  onClick={() => toggleCategoryExpand(cat.id)}
                                  className="p-1 text-slate-400 hover:text-slate-600"
                    >
                                  <span className={`transition-transform inline-block ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                    </button>
                 )}
                              <span className="font-medium text-slate-700 text-sm">{cat.name}</span>
                              {subCats.length > 0 && (
                                <span className="text-[10px] bg-teal-100 text-teal-600 px-1.5 py-0.5 rounded-full font-bold">
                                  {subCats.length}
                                </span>
                 )}
              </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => openAddCategoryModal('INCOME', cat.id)}
                                className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-white rounded-lg transition-colors"
                                title="Add Sub-category"
                              >
                                <Plus size={14} />
                              </button>
                              <button 
                                onClick={() => openEditCategoryModal(cat)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-colors"
                              >
                            <Pencil size={14} />
                         </button>
                              <button 
                                onClick={() => handleDeleteCategory(cat.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-colors"
                              >
                            <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          
                          {/* Sub-categories */}
                          {isExpanded && subCats.length > 0 && (
                            <div className="ml-6 space-y-1">
                              {subCats.map(subCat => (
                                <div 
                                  key={subCat.id}
                                  className="flex items-center justify-between p-2 pl-4 bg-teal-50 hover:bg-teal-100 rounded-lg group transition-colors border-l-2 border-teal-300"
                                >
                                  <span className="text-slate-600 text-sm">{subCat.name}</span>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={() => openEditCategoryModal(subCat)}
                                      className="p-1 text-slate-400 hover:text-blue-600 hover:bg-white rounded transition-colors"
                                    >
                                      <Pencil size={12} />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteCategory(subCat.id)}
                                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-white rounded transition-colors"
                                    >
                                      <Trash2 size={12} />
                         </button>
                      </div>
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
          </div>
        )}

        {/* ============ STOCK ADJUSTMENT TAB ============ */}
        {activeTab === 'stock' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Package size={24} className="text-blue-600" />
                                        </div>
                                        <div>
                    <h2 className="font-bold text-slate-800">Stock Adjustment</h2>
                    <p className="text-sm text-slate-500">Adjust opening stock for products</p>
                  </div>
                </div>
                
                {/* Save Button */}
                <button
                  onClick={handleSaveStockAdjustments}
                  disabled={savingStock}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    stockSaveSuccess
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
                  } disabled:opacity-50`}
                >
                  {savingStock ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : stockSaveSuccess ? (
                    <>
                      <CheckCircle size={16} />
                      Saved!
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Info Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-800 font-medium">When to use Stock Adjustment?</p>
                <p className="text-xs text-amber-700 mt-1">
                  Use this when physical stock count doesn't match the system. Adjust here to correct any discrepancies.
                </p>
                                        </div>
                                    </div>

            {/* Products List - Mobile friendly */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {/* Products */}
              <div className="divide-y divide-slate-100">
                {loading ? (
                  <div className="p-8 text-center text-slate-400">Loading products...</div>
                ) : products.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">No products found</div>
                ) : (
                  products.map(product => {
                    const currentStock = product.current_opening_stock || 0;
                    const newStock = parseInt(stockAdjustments[product.id!] || '0');
                    const hasChange = newStock !== currentStock;
                    
                    return (
                      <div 
                        key={product.id} 
                        className={`flex items-center justify-between gap-3 px-4 py-3 transition-colors ${
                          hasChange ? 'bg-blue-50' : ''
                        }`}
                      >
                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 text-sm truncate">{product.name}</p>
                          <p className="text-[10px] text-slate-400">
                            Current: <span className={hasChange ? 'line-through' : 'font-bold'}>{currentStock}</span> {product.unit}
                          </p>
                        </div>
                        
                        {/* New Stock Input */}
                        <input
                          type="number"
                          value={stockAdjustments[product.id!] || ''}
                          onChange={(e) => handleStockChange(product.id!, e.target.value)}
                          min="0"
                          className={`w-20 px-2 py-2 text-center text-sm font-bold rounded-lg border outline-none transition-all ${
                            hasChange
                              ? 'border-blue-400 bg-white text-blue-700'
                              : 'border-slate-200 bg-slate-50 text-slate-700 focus:border-blue-400'
                          }`}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============ DATA MANAGEMENT TAB ============ */}
        {activeTab === 'data' && (
          <div className="space-y-4">
            {/* Warning Banner - Compact */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3">
              <AlertTriangle size={20} className="text-red-600 flex-shrink-0" />
              <p className="text-red-700 text-xs font-medium">
                ⚠️ Danger Zone - Data deletion is permanent!
              </p>
            </div>

            {/* Data Counts Overview - Compact on mobile */}
            <div className="bg-white rounded-xl border border-slate-100 p-3">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                <div className="bg-slate-50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-slate-800">{dataCounts.transactions}</p>
                  <p className="text-[9px] text-slate-500 font-medium">Total</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-blue-600">{dataCounts.stockIn}</p>
                  <p className="text-[9px] text-blue-500 font-medium">Stock</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-orange-600">{dataCounts.expenses}</p>
                  <p className="text-[9px] text-orange-500 font-medium">Expense</p>
                </div>
                <div className="bg-teal-50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-teal-600">{dataCounts.income}</p>
                  <p className="text-[9px] text-teal-500 font-medium">Income</p>
                </div>
                <div className="bg-red-50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-red-600">{dataCounts.withdrawals}</p>
                  <p className="text-[9px] text-red-500 font-medium">Withdraw</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-purple-600">{dataCounts.closings}</p>
                  <p className="text-[9px] text-purple-500 font-medium">Close</p>
                </div>
              </div>
            </div>

            {/* Delete Options */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <h3 className="font-bold text-slate-800">Delete Specific Data</h3>
                <p className="text-sm text-slate-500 mt-1">Select what type of data you want to delete</p>
              </div>
              <div className="p-4 space-y-3">
                {/* All Transactions */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">All Transactions</p>
                      <p className="text-xs text-slate-500">{dataCounts.transactions} records (Stock, Expense, Income)</p>
                    </div>
                  </div>
                                        <button 
                    onClick={() => handleDeleteData('transactions')}
                    disabled={deleting || dataCounts.transactions === 0}
                    className="px-4 py-2 bg-slate-600 text-white text-sm font-bold rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {deleting && deleteType === 'transactions' ? 'Deleting...' : 'Delete'}
                                        </button>
                </div>

                {/* Stock In */}
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                      <PackageMinus size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">Stock In Entries</p>
                      <p className="text-xs text-slate-500">{dataCounts.stockIn} records</p>
                    </div>
                  </div>
                                            <button 
                    onClick={() => handleDeleteData('stock_in')}
                    disabled={deleting || dataCounts.stockIn === 0}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {deleting && deleteType === 'stock_in' ? 'Deleting...' : 'Delete'}
                                            </button>
                                    </div>

                {/* Expenses */}
                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                      <Receipt size={20} />
                                </div>
                    <div>
                      <p className="font-bold text-slate-800">Expense Entries</p>
                      <p className="text-xs text-slate-500">{dataCounts.expenses} records</p>
                    </div>
                  </div>
                                            <button 
                    onClick={() => handleDeleteData('expenses')}
                    disabled={deleting || dataCounts.expenses === 0}
                    className="px-4 py-2 bg-orange-600 text-white text-sm font-bold rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {deleting && deleteType === 'expenses' ? 'Deleting...' : 'Delete'}
                                            </button>
                                    </div>

                {/* Income */}
                <div className="flex items-center justify-between p-4 bg-teal-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center">
                      <HandCoins size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">Income Entries</p>
                      <p className="text-xs text-slate-500">{dataCounts.income} records</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteData('income')}
                    disabled={deleting || dataCounts.income === 0}
                    className="px-4 py-2 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {deleting && deleteType === 'income' ? 'Deleting...' : 'Delete'}
                  </button>
                </div>

                {/* Cash Withdrawals */}
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                      <Wallet size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">Cash Withdrawals</p>
                      <p className="text-xs text-slate-500">{dataCounts.withdrawals} records</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteData('withdrawals')}
                    disabled={deleting || dataCounts.withdrawals === 0}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {deleting && deleteType === 'withdrawals' ? 'Deleting...' : 'Delete'}
                  </button>
                </div>

                {/* Daily Closings */}
                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                      <Archive size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">Daily Closings</p>
                      <p className="text-xs text-slate-500">{dataCounts.closings} records</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteData('closings')}
                    disabled={deleting || dataCounts.closings === 0}
                    className="px-4 py-2 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {deleting && deleteType === 'closings' ? 'Deleting...' : 'Delete'}
                  </button>
                </div>

                {/* Reset Stock */}
                <div className="flex items-center justify-between p-4 bg-slate-100 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center">
                      <RefreshCw size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">Reset Product Stock</p>
                      <p className="text-xs text-slate-500">Set all opening stock to 0</p>
                    </div>
                  </div>
                  <button
                    onClick={handleResetStock}
                    disabled={deleting}
                    className="px-4 py-2 bg-slate-600 text-white text-sm font-bold rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Delete All - Danger */}
            <div className="bg-red-50 border-2 border-red-300 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-red-200 bg-red-100">
                <h3 className="font-bold text-red-800 flex items-center gap-2">
                  <AlertTriangle size={18} />
                  Complete Data Reset
                </h3>
                <p className="text-sm text-red-600 mt-1">
                  This will delete ALL data and reset product stock. Use with extreme caution!
                </p>
              </div>
              <div className="p-5">
                <button
                  onClick={() => handleDeleteData('all')}
                  disabled={deleting}
                  className="w-full px-6 py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {deleting && deleteType === 'all' ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Deleting Everything...
                    </>
                  ) : (
                    <>
                      <Trash2 size={20} />
                      Delete ALL Data & Reset
                    </>
                  )}
                </button>
                                </div>
                            </div>
                    </div>
        )}

                </div>

      {/* ============ USER MODAL ============ */}
      {showUserModal && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeUserModal}
          ></div>
          
          {/* Modal - Fullscreen on mobile */}
          <div className="relative bg-white w-full md:max-w-md md:rounded-3xl rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom md:zoom-in duration-300">
            {/* Header */}
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  editingUser ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  {editingUser ? <Pencil size={20} /> : <UserPlus size={20} />}
                </div>
                <div>
                  <h2 className="font-bold text-slate-800">
                    {editingUser ? 'Edit Staff Member' : 'Add New Staff'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {editingUser ? 'Update details and permissions' : 'Create a new team member'}
                  </p>
                </div>
              </div>
              <button 
                onClick={closeUserModal}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X size={20} />
                            </button>
                    </div>
                    
            {/* Form */}
            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              
              {/* PIN Only Mode for Protected Users editing themselves */}
              {isEditingSelf && isEditingProtectedUser ? (
                <>
                  {/* Info */}
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
                    <ShieldCheck size={20} className="text-amber-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-amber-800">Change Your PIN</p>
                      <p className="text-xs text-amber-600 mt-1">
                        As an administrator, you can only change your PIN. Name and role are protected.
                      </p>
                    </div>
                  </div>
                  
                  {/* Current Info (Read Only) */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white text-lg font-bold">
                        {userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{userName}</p>
                        <p className="text-xs text-amber-600 font-medium uppercase">{role}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* PIN Field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                      <Hash size={12} /> New 4-Digit PIN
                    </label>
                    <input
                      type="text"
                      value={pin}
                      onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="Enter new PIN"
                            required 
                      maxLength={4}
                      inputMode="numeric"
                      autoFocus
                      className="w-full px-4 py-4 rounded-xl border-2 border-amber-200 bg-amber-50 focus:bg-white focus:border-amber-500 outline-none transition-all text-lg font-mono tracking-[0.5em] text-center"
                        />
                  </div>
                </>
              ) : (
                <>
                  {/* Name (used for both display and login) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                      <Briefcase size={12} /> Name
                    </label>
                    <input
                      type="text"
                      value={userName}
                      onChange={e => setUserName(e.target.value)}
                      placeholder="e.g. Ahmed, Sara, etc."
                      required
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-medium"
                            />
                    <p className="text-[10px] text-slate-400 ml-1">This name will be used for login</p>
                  </div>

                  {/* PIN & Role */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                        <Hash size={12} /> 4-Digit PIN
                      </label>
                      <input
                        type="text"
                                value={pin} 
                        onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="••••"
                                required 
                                maxLength={4} 
                                inputMode="numeric"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-mono tracking-[0.5em] text-center"
                            />
                        </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                        <Shield size={12} /> Role
                      </label>
                      <input
                        type="text"
                            value={role} 
                            onChange={e => setRole(e.target.value)} 
                        placeholder="e.g. Manager, Cashier"
                            required 
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all text-sm"
                        />
                    </div>
                  </div>

                  {/* Info about restricted roles */}
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-2">
                    <Lock size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-700">
                      <strong>Note:</strong> Admin/Owner roles are reserved and cannot be assigned to new users. Settings access is only for administrators.
                    </p>
                  </div>

                  {/* Permissions */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                                <Lock size={12} /> Access Permissions
                    </label>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                             <div className="grid grid-cols-2 gap-2">
                                {AVAILABLE_PERMISSIONS.map(perm => (
                          <button
                            key={perm.id}
                            type="button"
                            onClick={() => handleTogglePermission(perm.id)}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                              permissions.includes(perm.id)
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                              permissions.includes(perm.id)
                                ? 'bg-white/20 border-white/30'
                                : 'border-slate-300'
                            }`}>
                              {permissions.includes(perm.id) && <CheckSquare size={10} />}
                                        </div>
                            {perm.label}
                          </button>
                                ))}
                             </div>
                        </div>
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeUserModal}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                          type="submit" 
                  disabled={userSaving || !userName || !pin || !role}
                  className={`flex-1 px-4 py-3 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-50 ${
                    isEditingSelf && isEditingProtectedUser
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-200'
                      : editingUser 
                      ? 'bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-200' 
                      : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200'
                  }`}
                        >
                  {userSaving ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Saving...
                    </span>
                  ) : (
                    isEditingSelf && isEditingProtectedUser ? 'Update PIN' : editingUser ? 'Update Staff' : 'Add Staff'
                  )}
                </button>
              </div>
                    </form>
                </div>
            </div>
      )}

      {/* ============ CATEGORY MODAL ============ */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeCategoryModal}
          ></div>
          
          {/* Modal - Fullscreen on mobile */}
          <div className="relative bg-white w-full md:max-w-sm md:rounded-3xl rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom md:zoom-in duration-300">
            {/* Header */}
            <div className={`px-6 py-4 border-b border-slate-100 flex items-center justify-between rounded-t-3xl ${
              categoryType === 'EXPENSE' ? 'bg-gradient-to-r from-orange-50 to-white' : 'bg-gradient-to-r from-teal-50 to-white'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  categoryType === 'EXPENSE' 
                    ? 'bg-orange-100 text-orange-600' 
                    : 'bg-teal-100 text-teal-600'
                }`}>
                  {editingCategory ? <Pencil size={20} /> : <FolderPlus size={20} />}
            </div>
                <div>
                  <h2 className="font-bold text-slate-800">
                    {editingCategory 
                      ? 'Edit Category' 
                      : categoryParentId 
                        ? 'Add Sub-Category'
                        : `Add ${categoryType === 'EXPENSE' ? 'Expense' : 'Income'} Category`
                    }
                  </h2>
                  {categoryParentId && !editingCategory && (
                    <p className="text-xs text-slate-500">
                      Under: {categories.find(c => c.id === categoryParentId)?.name}
                    </p>
                  )}
                </div>
              </div>
              <button 
                onClick={closeCategoryModal}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white/50 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              {/* Sub-category indicator */}
              {categoryParentId && !editingCategory && (
                <div className={`text-xs px-3 py-2 rounded-lg ${
                  categoryType === 'EXPENSE' 
                    ? 'bg-orange-50 text-orange-700 border border-orange-200' 
                    : 'bg-teal-50 text-teal-700 border border-teal-200'
                }`}>
                  📁 Adding sub-category under <strong>{categories.find(c => c.id === categoryParentId)?.name}</strong>
      </div>
              )}
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  {categoryParentId ? 'Sub-Category Name' : 'Category Name'}
                </label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={e => setCategoryName(e.target.value)}
                  placeholder={categoryParentId 
                    ? 'e.g. Electricity, Water, etc.' 
                    : categoryType === 'EXPENSE' ? 'e.g. Utilities, Transport' : 'e.g. Service Charge'
                  }
                  required
                  autoFocus
                  className={`w-full px-4 py-3 rounded-xl border bg-slate-50 focus:bg-white outline-none transition-all text-sm font-medium ${
                    categoryType === 'EXPENSE' 
                      ? 'border-slate-200 focus:border-orange-500' 
                      : 'border-slate-200 focus:border-teal-500'
                  }`}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeCategoryModal}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={categorySaving || !categoryName}
                  className={`flex-1 px-4 py-3 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-50 ${
                    categoryType === 'EXPENSE'
                      ? 'bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-200'
                      : 'bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-200'
                  }`}
                >
                  {categorySaving ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Saving...
                    </span>
                  ) : (
                    editingCategory ? 'Update' : 'Add Category'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};
