import React from 'react';
import { ViewState, User } from '../types';
import { ArrowLeft, LogOut, Home, PackagePlus, Receipt, Store, Settings, Package, HandCoins } from 'lucide-react';

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
    
    if (currentUser.permissions && currentUser.permissions.length > 0) {
        return currentUser.permissions.includes(view);
    }
    
    if (currentUser.role.toLowerCase() === 'admin') return true;
    
    const basicTasks = [ViewState.DASHBOARD, ViewState.STOCK_IN, ViewState.EXPENSES, ViewState.INCOME, ViewState.CLOSING];
    return basicTasks.includes(view);
  };

  const allNavItems = [
    { view: ViewState.DASHBOARD, label: 'Home', icon: Home },
    { view: ViewState.STOCK_IN, label: 'Stock In', icon: PackagePlus },
    { view: ViewState.EXPENSES, label: 'Expenses', icon: Receipt },
    { view: ViewState.INCOME, label: 'Other Income', icon: HandCoins },
    { view: ViewState.CLOSING, label: 'Closing', icon: Store },
    { view: ViewState.PRODUCTS, label: 'Products', icon: Package },
    { view: ViewState.SETTINGS, label: 'Settings', icon: Settings },
  ];

  const navItems = allNavItems.filter(item => hasAccess(item.view));

  const mobileNavItems = navItems.filter(item => 
    [ViewState.DASHBOARD, ViewState.STOCK_IN, ViewState.EXPENSES, ViewState.INCOME, ViewState.CLOSING].includes(item.view)
  );

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
              const isActive = activeView === item.view;
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

      {/* ----------------- MAIN CONTENT WRAPPER ----------------- */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* Header */}
        <header className="bg-white px-4 py-4 md:px-8 md:py-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0 z-20">
          <div className="flex items-center gap-3">
            {onBack && (
              <button 
                onClick={onBack}
                className="p-2 -ml-2 hover:bg-slate-50 rounded-full text-slate-600 transition-colors"
              >
                <ArrowLeft size={24} />
              </button>
            )}
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">{title}</h1>
          </div>
          
          {/* Mobile Logout (shown in header) */}
          {onLogout && (
            <button 
              onClick={onLogout}
              className="md:hidden p-2 -mr-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          )}

          {/* Desktop User/Info Placeholder */}
          <div className="hidden md:block text-sm text-slate-400">
             {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className={`flex-1 overflow-y-auto p-4 md:p-8 ${onNavigate ? 'pb-28 md:pb-8' : ''}`}>
          <div className="max-w-6xl mx-auto w-full h-full">
            {children}
          </div>
        </main>

        {/* ----------------- MOBILE BOTTOM NAV ----------------- */}
        {onNavigate && (
          <nav className="md:hidden fixed bottom-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-2 z-40 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] overflow-x-auto">
            {mobileNavItems.map((item) => {
              const isActive = activeView === item.view;
              const Icon = item.icon;
              return (
                <button
                  key={item.view}
                  onClick={() => onNavigate(item.view)}
                  className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-200 min-w-[64px] flex-1 ${
                    isActive 
                      ? 'text-blue-600 bg-blue-50 translate-y-[-4px] shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className="mb-1" />
                  <span className={`text-[9px] font-bold tracking-wide truncate max-w-full ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                    {item.label}
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