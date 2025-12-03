import React, { useState } from 'react';
import { ViewState, User } from '../types';
import { ArrowLeft, LogOut, Home, PackagePlus, Store, Settings, Package, BarChart3, Wallet, Menu, X } from 'lucide-react';

interface LayoutProps {
  title: string;
  onBack?: () => void;
  onLogout?: () => void;
  children: React.ReactNode;
  activeView?: ViewState;
  onNavigate?: (view: ViewState) => void;
  currentUser?: User | null;
}

export const Layout: React.FC<LayoutProps> = ({ 
  title, 
  onBack, 
  onLogout, 
  children,
  activeView,
  onNavigate,
  currentUser
}) => {
  
  // Helper to check permissions
  const hasAccess = (view: ViewState) => {
    if (!currentUser) return false;
    if (view === ViewState.DASHBOARD) return true;
    
    // Admin/Owner has full access
    const role = currentUser.role?.toLowerCase() || '';
    if (role === 'admin' || role === 'owner' || role === 'manager') return true;
    
    // Check permissions array (handle both formats: 'STOCK_IN' and 'stockin')
    if (currentUser.permissions && currentUser.permissions.length > 0) {
        const viewLower = view.toLowerCase().replace('_', '');
        return currentUser.permissions.some(p => 
          p === view || p.toLowerCase().replace('_', '') === viewLower || p === '*'
        );
    }
    
    // Default: basic staff can access basic tasks
    const basicTasks = [ViewState.DASHBOARD, ViewState.STOCK_IN, ViewState.EXPENSES, ViewState.INCOME, ViewState.CLOSING];
    return basicTasks.includes(view);
  };

  const allNavItems = [
    { view: ViewState.DASHBOARD, label: 'Home', icon: Home },
    { view: ViewState.STOCK_IN, label: 'Stock In', icon: PackagePlus },
    { view: ViewState.EXPENSES, label: 'Cash Flow', icon: Wallet },
    { view: ViewState.CLOSING, label: 'Closing', icon: Store },
    { view: ViewState.PRODUCTS, label: 'Products', icon: Package },
    { view: ViewState.REPORTS, label: 'Reports', icon: BarChart3 },
    { view: ViewState.SETTINGS, label: 'Settings', icon: Settings },
  ];

  const navItems = allNavItems.filter(item => hasAccess(item.view));

  // Mobile nav with shorter labels
  const mobileNavItems = navItems
    .filter(item => [ViewState.DASHBOARD, ViewState.STOCK_IN, ViewState.EXPENSES, ViewState.CLOSING].includes(item.view))
    .map(item => ({
      ...item,
      mobileLabel: item.view === ViewState.EXPENSES ? 'Cash' : 
                   item.view === ViewState.STOCK_IN ? 'Stock' :
                   item.view === ViewState.CLOSING ? 'Close' : item.label
    }));

  // Mobile sidebar items (Products, Reports, Settings)
  const mobileSidebarItems = navItems.filter(item => 
    [ViewState.PRODUCTS, ViewState.REPORTS, ViewState.SETTINGS].includes(item.view)
  );

  // Mobile sidebar state
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden w-full">
      {/* ----------------- DESKTOP SIDEBAR ----------------- */}
      {onNavigate && (
        <aside className="hidden md:flex w-64 flex-col bg-white border-r border-slate-200 z-30 shadow-sm">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">M</div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 tracking-tight leading-tight">Mooco</h1>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Daily Manager</p>
            </div>
          </div>
          
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              // Cash Flow button should be active for both EXPENSES and INCOME views
              const isActive = item.view === ViewState.EXPENSES 
                ? (activeView === ViewState.EXPENSES || activeView === ViewState.INCOME)
                : activeView === item.view;
              const Icon = item.icon;
              return (
                <button
                  key={item.view}
                  onClick={() => onNavigate(item.view)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                    isActive 
                      ? 'bg-blue-50 text-blue-700 shadow-sm' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {onLogout && (
            <div className="p-4 border-t border-slate-100">
              <div className="mb-3 px-2">
                 <p className="text-xs font-bold text-slate-800">{currentUser?.name}</p>
                 <p className="text-[10px] text-slate-400 capitalize">{currentUser?.role}</p>
              </div>
              <button 
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors text-sm font-medium"
              >
                <LogOut size={20} />
                Logout
              </button>
            </div>
          )}
        </aside>
      )}

      {/* ----------------- MOBILE SIDEBAR OVERLAY ----------------- */}
      {showMobileSidebar && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowMobileSidebar(false)}
          />
          
          {/* Sidebar */}
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl animate-in slide-in-from-left duration-300">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white font-bold text-lg">M</div>
                <div>
                  <h1 className="text-lg font-bold text-white tracking-tight">Mooco</h1>
                  <p className="text-[10px] text-blue-200 font-medium uppercase tracking-wider">Daily Manager</p>
                </div>
              </div>
              <button 
                onClick={() => setShowMobileSidebar(false)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* User Info */}
            {currentUser && (
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-md">
                    {currentUser.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{currentUser.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{currentUser.role}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Navigation */}
            <nav className="p-3 space-y-1">
              <p className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Menu</p>
              {mobileSidebarItems.map((item) => {
                const isActive = activeView === item.view;
                const Icon = item.icon;
                return (
                  <button
                    key={item.view}
                    onClick={() => {
                      onNavigate?.(item.view);
                      setShowMobileSidebar(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all text-sm font-medium ${
                      isActive 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            
            {/* Logout */}
            {onLogout && (
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100 bg-white">
                <button 
                  onClick={() => {
                    setShowMobileSidebar(false);
                    onLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-colors font-bold text-sm"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* ----------------- MAIN CONTENT WRAPPER ----------------- */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* Header */}
        <header className="bg-white px-4 py-4 md:px-8 md:py-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0 z-20">
          <div className="flex items-center gap-2">
            {/* Mobile Menu Button - Only show on Dashboard */}
            {onNavigate && activeView === ViewState.DASHBOARD && (
              <button 
                onClick={() => setShowMobileSidebar(true)}
                className="md:hidden p-2 -ml-2 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors"
              >
                <Menu size={24} />
              </button>
            )}
            {/* Back button - Show on non-dashboard screens on mobile, always on desktop if provided */}
            {onBack && (
              <button 
                onClick={onBack}
                className={`p-2 -ml-2 hover:bg-slate-50 rounded-full text-slate-600 transition-colors ${
                  activeView === ViewState.DASHBOARD ? 'hidden' : ''
                }`}
              >
                <ArrowLeft size={24} />
              </button>
            )}
            <h1 className="text-lg md:text-2xl font-bold text-slate-800 tracking-tight truncate">{title}</h1>
          </div>
          
          {/* User Info & Logout */}
          <div className="flex items-center gap-3">
            {/* User Name - Desktop only */}
            {currentUser && (
              <div className="hidden md:flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm">
                  {currentUser.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 leading-tight">{currentUser.name}</p>
                  <p className="text-[10px] text-slate-400 capitalize">{currentUser.role}</p>
                </div>
              </div>
            )}
            
            {/* Logout Button - Desktop only */}
            {onLogout && (
              <button 
                onClick={onLogout}
                className="hidden md:block p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            )}
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className={`flex-1 overflow-y-auto p-4 md:p-8 ${onNavigate ? 'pb-24 md:pb-8' : ''}`}>
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </main>

        {/* ----------------- MOBILE BOTTOM NAV ----------------- */}
        {onNavigate && (
          <nav className="md:hidden fixed bottom-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-2 z-40 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] overflow-x-auto">
            {mobileNavItems.map((item) => {
              // Cash Flow button should be active for both EXPENSES and INCOME views
              const isActive = item.view === ViewState.EXPENSES 
                ? (activeView === ViewState.EXPENSES || activeView === ViewState.INCOME)
                : activeView === item.view;
              const Icon = item.icon;
              return (
                <button
                  key={item.view}
                  onClick={() => onNavigate(item.view)}
                  className={`flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all duration-200 flex-1 ${
                    isActive 
                      ? 'text-blue-600 bg-blue-50' 
                      : 'text-slate-400 active:bg-slate-100'
                  }`}
                >
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  <span className={`text-[10px] font-bold mt-0.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                    {item.mobileLabel}
                  </span>
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
};