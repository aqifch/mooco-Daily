import React, { useEffect, useState } from 'react';
import { Layout } from './Layout';
import { Button } from './Button';
import { Input } from './Input';
import { fetchUsers, addUser, updateUser, deleteUser, fetchCategories, addCategory, updateCategory, deleteCategory } from '../services/supabase';
import { User, ViewState, Category } from '../types';
import { Users, UserPlus, Trash2, Info, Lock, CheckSquare, Pencil, X, Tags, Plus, Save } from 'lucide-react';

interface SettingsProps {
  onBack: () => void;
  onNavigate: (view: ViewState) => void;
  currentUser: User | null;
}

const AVAILABLE_PERMISSIONS = [
  { id: ViewState.STOCK_IN, label: 'Stock In' },
  { id: ViewState.EXPENSES, label: 'Expenses' },
  { id: ViewState.INCOME, label: 'Other Income' },
  { id: ViewState.CLOSING, label: 'Day Closing' },
  { id: ViewState.PRODUCTS, label: 'Manage Products' },
  { id: ViewState.SETTINGS, label: 'Settings' },
];

export const Settings: React.FC<SettingsProps> = ({ onBack, onNavigate, currentUser }) => {
  // Staff State
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Categories State
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [catType, setCatType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [catLoading, setCatLoading] = useState(false);
  const [editingCatId, setEditingCatId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [userData, catData] = await Promise.all([fetchUsers(), fetchCategories()]);
      setUsers(userData);
      setCategories(catData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- USER HANDLERS ---
  const resetUserForm = () => {
    setEditingUserId(null);
    setName('');
    setUsername('');
    setPin('');
    setRole('');
    setPermissions([]);
    setActionLoading(false);
  };

  const handleEditUserClick = (user: User) => {
    if (!user.id) return;
    setEditingUserId(user.id);
    setName(user.name);
    setUsername(user.username || '');
    setPin(user.pin);
    setRole(user.role);
    setPermissions(user.permissions || []);
  };

  const handleTogglePermission = (permId: string) => {
    setPermissions(prev => 
      prev.includes(permId) 
        ? prev.filter(p => p !== permId)
        : [...prev, permId]
    );
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !pin || !role) return;
    
    setActionLoading(true);
    try {
      const payload = { name, username: username || undefined, pin, role, permissions };
      if (editingUserId) {
        await updateUser(editingUserId, payload);
      } else {
        await addUser(payload);
      }
      resetUserForm();
      const newUsers = await fetchUsers();
      setUsers(newUsers);
    } catch (err) {
      console.error(err);
      alert('Failed to save user.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await deleteUser(id);
      const newUsers = await fetchUsers();
      setUsers(newUsers);
    } catch (err) {
      console.error(err);
      alert('Failed to delete user');
    }
  };

  // --- CATEGORY HANDLERS ---
  const handleEditCategoryClick = (cat: Category) => {
    setEditingCatId(cat.id);
    setNewCatName(cat.name);
    setCatType(cat.type);
  };

  const cancelCatEdit = () => {
    setEditingCatId(null);
    setNewCatName('');
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;
    
    setCatLoading(true);
    try {
      if (editingCatId) {
        await updateCategory(editingCatId, newCatName);
      } else {
        await addCategory(newCatName, catType);
      }
      setNewCatName('');
      setEditingCatId(null);
      const newCats = await fetchCategories();
      setCategories(newCats);
    } catch (error) {
      alert('Failed to save category');
    } finally {
      setCatLoading(false);
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

  return (
    <Layout 
      title="Settings" 
      onBack={onBack}
      activeView={ViewState.SETTINGS}
      onNavigate={onNavigate}
      currentUser={currentUser}
    >
      <div className="space-y-12 pb-24">
        
        {/* Section: Category Management */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-2">
            <Tags size={16} /> Category Management
          </h3>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Expense Categories */}
            <div className={`bg-white rounded-3xl border shadow-sm p-5 transition-colors ${catType === 'EXPENSE' && editingCatId ? 'border-orange-200 ring-2 ring-orange-50' : 'border-slate-200'}`}>
              <h4 className="font-bold text-slate-800 mb-4 text-orange-600 flex items-center justify-between">
                 <span>Expense Categories</span>
                 {catType === 'EXPENSE' && editingCatId && (
                   <span className="text-xs text-orange-500 bg-orange-50 px-2 py-1 rounded-lg">Editing...</span>
                 )}
              </h4>
              <div className="flex gap-2 mb-4">
                 <input 
                   className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-orange-500 outline-none transition-colors"
                   placeholder="New Expense Category..."
                   value={catType === 'EXPENSE' ? newCatName : ''}
                   onChange={(e) => { 
                     if (catType !== 'EXPENSE') { setEditingCatId(null); }
                     setCatType('EXPENSE'); 
                     setNewCatName(e.target.value); 
                   }}
                   onFocus={() => { if(catType !== 'EXPENSE') { cancelCatEdit(); setCatType('EXPENSE'); } }}
                 />
                 
                 {catType === 'EXPENSE' && editingCatId ? (
                   <>
                    <button 
                        disabled={catLoading || !newCatName}
                        onClick={handleCategorySubmit}
                        className="bg-orange-600 text-white rounded-xl px-3 hover:bg-orange-700 disabled:opacity-50"
                        title="Update"
                     >
                        <Save size={18} />
                     </button>
                     <button 
                        onClick={cancelCatEdit}
                        className="bg-slate-100 text-slate-500 rounded-xl px-3 hover:bg-slate-200"
                        title="Cancel"
                     >
                        <X size={18} />
                     </button>
                   </>
                 ) : (
                    <button 
                        disabled={catLoading || !newCatName || catType !== 'EXPENSE'}
                        onClick={handleCategorySubmit}
                        className="bg-orange-600 text-white rounded-xl px-3 hover:bg-orange-700 disabled:opacity-50"
                        title="Add"
                    >
                        <Plus size={20} />
                    </button>
                 )}
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                 {categories.filter(c => c.type === 'EXPENSE').map(cat => (
                   <div key={cat.id} className={`flex justify-between items-center p-2 rounded-lg text-sm group transition-colors ${editingCatId === cat.id ? 'bg-orange-50 text-orange-700' : 'bg-slate-50 text-slate-700'}`}>
                      <span className="font-medium">{cat.name}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => handleEditCategoryClick(cat)} className="text-slate-400 hover:text-blue-500 p-1">
                            <Pencil size={14} />
                         </button>
                         <button onClick={() => handleDeleteCategory(cat.id)} className="text-slate-400 hover:text-red-500 p-1">
                            <Trash2 size={14} />
                         </button>
                      </div>
                   </div>
                 ))}
              </div>
            </div>

            {/* Income Categories */}
            <div className={`bg-white rounded-3xl border shadow-sm p-5 transition-colors ${catType === 'INCOME' && editingCatId ? 'border-teal-200 ring-2 ring-teal-50' : 'border-slate-200'}`}>
              <h4 className="font-bold text-slate-800 mb-4 text-teal-600 flex items-center justify-between">
                 <span>Income Categories</span>
                 {catType === 'INCOME' && editingCatId && (
                   <span className="text-xs text-teal-500 bg-teal-50 px-2 py-1 rounded-lg">Editing...</span>
                 )}
              </h4>
              <div className="flex gap-2 mb-4">
                 <input 
                   className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-teal-500 outline-none transition-colors"
                   placeholder="New Income Category..."
                   value={catType === 'INCOME' ? newCatName : ''}
                   onChange={(e) => { 
                     if (catType !== 'INCOME') { setEditingCatId(null); }
                     setCatType('INCOME'); 
                     setNewCatName(e.target.value); 
                   }}
                   onFocus={() => { if(catType !== 'INCOME') { cancelCatEdit(); setCatType('INCOME'); } }}
                 />
                 
                 {catType === 'INCOME' && editingCatId ? (
                   <>
                    <button 
                        disabled={catLoading || !newCatName}
                        onClick={handleCategorySubmit}
                        className="bg-teal-600 text-white rounded-xl px-3 hover:bg-teal-700 disabled:opacity-50"
                        title="Update"
                     >
                        <Save size={18} />
                     </button>
                     <button 
                        onClick={cancelCatEdit}
                        className="bg-slate-100 text-slate-500 rounded-xl px-3 hover:bg-slate-200"
                        title="Cancel"
                     >
                        <X size={18} />
                     </button>
                   </>
                 ) : (
                    <button 
                        disabled={catLoading || !newCatName || catType !== 'INCOME'}
                        onClick={handleCategorySubmit}
                        className="bg-teal-600 text-white rounded-xl px-3 hover:bg-teal-700 disabled:opacity-50"
                        title="Add"
                    >
                        <Plus size={20} />
                    </button>
                 )}
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                 {categories.filter(c => c.type === 'INCOME').map(cat => (
                   <div key={cat.id} className={`flex justify-between items-center p-2 rounded-lg text-sm group transition-colors ${editingCatId === cat.id ? 'bg-teal-50 text-teal-700' : 'bg-slate-50 text-slate-700'}`}>
                      <span className="font-medium">{cat.name}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => handleEditCategoryClick(cat)} className="text-slate-400 hover:text-blue-500 p-1">
                            <Pencil size={14} />
                         </button>
                         <button onClick={() => handleDeleteCategory(cat.id)} className="text-slate-400 hover:text-red-500 p-1">
                            <Trash2 size={14} />
                         </button>
                      </div>
                   </div>
                 ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section: Staff Management */}
        <section className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                <Users size={16} /> Staff Management
            </h3>
            
            <div className="grid lg:grid-cols-2 gap-6">
                {/* User List */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 md:p-6 order-2 lg:order-1">
                    <h4 className="font-bold text-slate-800 mb-4">Current Users</h4>
                    <div className="space-y-3">
                        {loading ? <p className="text-sm text-slate-400">Loading...</p> : users.map(user => (
                            <div key={user.id} className={`flex flex-col gap-2 p-3 rounded-xl border transition-all ${editingUserId === user.id ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-sm ${editingUserId === user.id ? 'bg-blue-600' : 'bg-slate-800'}`}>
                                            {user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                                {user.name} 
                                                {user.username && <span className="text-[10px] font-normal text-slate-400 bg-white px-1.5 rounded border border-slate-200">@{user.username}</span>}
                                            </p>
                                            <p className="text-xs text-slate-500 font-medium">{user.role}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button 
                                          onClick={() => handleEditUserClick(user)} 
                                          className="text-slate-400 hover:text-blue-600 hover:bg-white transition-colors p-2 rounded-lg"
                                          title="Edit User"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        {users.length > 1 && (
                                            <button 
                                              onClick={() => user.id && handleDeleteUser(user.id)} 
                                              className="text-slate-400 hover:text-red-500 hover:bg-white transition-colors p-2 rounded-lg"
                                              title="Delete User"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1 px-1 mt-1">
                                    {user.permissions && user.permissions.length > 0 ? (
                                        user.permissions.map(p => (
                                            <span key={p} className="text-[9px] uppercase font-bold bg-white/50 border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded-sm">
                                                {p.replace('_', ' ')}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-[9px] uppercase font-bold bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-sm">
                                            Default Access
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Add/Edit User Form */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 md:p-6 h-fit order-1 lg:order-2 sticky top-4">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                            {editingUserId ? <Pencil size={18} className="text-orange-500" /> : <UserPlus size={18} className="text-blue-500" />} 
                            {editingUserId ? 'Edit Staff Details' : 'Add New Staff'}
                        </h4>
                        {editingUserId && (
                            <button onClick={resetUserForm} className="text-xs font-medium text-slate-500 hover:text-red-500 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg">
                                <X size={12} /> Cancel Edit
                            </button>
                        )}
                    </div>
                    
                    <form onSubmit={handleSubmitUser} className="space-y-3">
                        <Input 
                            label="Full Name"
                            placeholder="e.g. John Doe" 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            required 
                            className="py-2 text-sm"
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <Input 
                                label="Username (Optional)"
                                placeholder="e.g. john_d" 
                                value={username} 
                                onChange={e => setUsername(e.target.value)} 
                                className="py-2 text-sm"
                            />
                            <Input 
                                label="4-Digit PIN"
                                placeholder="****" 
                                value={pin} 
                                onChange={e => setPin(e.target.value)} 
                                required 
                                maxLength={4} 
                                pattern="\d{4}" 
                                inputMode="numeric"
                                type="text"
                                className="py-2 text-sm font-mono tracking-widest"
                            />
                        </div>
                        <Input 
                            label="Role Title"
                            placeholder="e.g. Supervisor, Cashier" 
                            value={role} 
                            onChange={e => setRole(e.target.value)} 
                            required 
                            className="py-2 text-sm"
                        />
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                             <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <Lock size={12} /> Access Permissions
                             </h5>
                             <div className="grid grid-cols-2 gap-2">
                                {AVAILABLE_PERMISSIONS.map(perm => (
                                    <label key={perm.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1 rounded-lg transition-colors">
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${permissions.includes(perm.id) ? 'bg-blue-500 border-blue-500' : 'border-slate-300 bg-white'}`}>
                                            {permissions.includes(perm.id) && <CheckSquare size={10} className="text-white" />}
                                            <input 
                                                type="checkbox" 
                                                className="hidden" 
                                                checked={permissions.includes(perm.id)} 
                                                onChange={() => handleTogglePermission(perm.id)}
                                            />
                                        </div>
                                        <span className="text-xs font-medium text-slate-700">{perm.label}</span>
                                    </label>
                                ))}
                             </div>
                        </div>
                        <Button 
                          type="submit" 
                          fullWidth 
                          isLoading={actionLoading} 
                          className={`py-2 text-sm mt-2 ${editingUserId ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}
                        >
                            {editingUserId ? 'Update Staff Member' : 'Add Staff Member'}
                        </Button>
                    </form>
                </div>
            </div>
        </section>

        {/* Section: App Info */}
        <section className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                <Info size={16} /> App Info
            </h3>
            <div className="bg-slate-900 text-slate-400 rounded-3xl p-6 text-sm leading-relaxed">
                <p><strong className="text-white">Mooco Daily Manager</strong></p>
                <p>Version: 1.4.0 (Categories + Income Support)</p>
            </div>
        </section>

      </div>
    </Layout>
  );
};