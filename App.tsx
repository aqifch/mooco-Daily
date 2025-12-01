import React, { useState } from 'react';
import { ViewState, User } from './types';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { StockIn } from './components/StockIn';
import { Expenses } from './components/Expenses';
import { Income } from './components/Income';
import { DayClosing } from './components/DayClosing';
import { ProductManager } from './components/ProductManager';
import { Settings } from './components/Settings';

function App() {
  const [view, setView] = useState<ViewState>(ViewState.LOGIN);
  const [user, setUser] = useState<User | null>(null);

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    setView(ViewState.DASHBOARD);
  };

  const handleLogout = () => {
    setUser(null);
    setView(ViewState.LOGIN);
  };

  const renderView = () => {
    switch (view) {
      case ViewState.LOGIN:
        return <Login onLoginSuccess={handleLoginSuccess} />;
      
      case ViewState.DASHBOARD:
        return (
          <Dashboard 
            user={user} 
            onNavigate={setView} 
            onLogout={handleLogout} 
          />
        );
      
      case ViewState.STOCK_IN:
        return (
          <StockIn 
            onBack={() => setView(ViewState.DASHBOARD)} 
            onNavigate={setView}
            currentUser={user}
          />
        );
      
      case ViewState.EXPENSES:
        return (
          <Expenses 
            onBack={() => setView(ViewState.DASHBOARD)} 
            onNavigate={setView}
            currentUser={user}
          />
        );

      case ViewState.INCOME:
        return (
          <Income 
            onBack={() => setView(ViewState.DASHBOARD)} 
            onNavigate={setView}
            currentUser={user}
          />
        );
      
      case ViewState.CLOSING:
        return (
          <DayClosing 
            onBack={() => setView(ViewState.DASHBOARD)} 
            onNavigate={setView}
            currentUser={user}
          />
        );

      case ViewState.PRODUCTS:
        return (
          <ProductManager 
            onBack={() => setView(ViewState.DASHBOARD)} 
            onNavigate={setView}
            currentUser={user}
          />
        );

      case ViewState.SETTINGS:
        return (
          <Settings 
            onBack={() => setView(ViewState.DASHBOARD)} 
            onNavigate={setView}
            currentUser={user}
          />
        );
        
      default:
        return <div className="p-10 text-center">Page not found</div>;
    }
  };

  return (
    <div className="font-sans">
      {renderView()}
    </div>
  );
}

export default App;