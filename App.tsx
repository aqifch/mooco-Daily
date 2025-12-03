import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ViewState, User } from './types';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { StockIn } from './components/StockIn';
import { CashFlow } from './components/CashFlow';
import { DayClosing } from './components/DayClosing';
import { ProductManager } from './components/ProductManager';
import { Settings } from './components/Settings';
import { Reports } from './components/Reports';

// Session timeout settings
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_BEFORE_MS = 60 * 1000; // Show warning 1 minute before logout

function App() {
  const [view, setView] = useState<ViewState>(ViewState.LOGIN);
  const [user, setUser] = useState<User | null>(null);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(60);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Reset all timers
  const resetTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setShowTimeoutWarning(false);
    setRemainingSeconds(60);
  }, []);

  // Start session timeout
  const startSessionTimer = useCallback(() => {
    if (!user) return;
    
    resetTimers();
    
    // Warning timer
    warningRef.current = setTimeout(() => {
      setShowTimeoutWarning(true);
      setRemainingSeconds(Math.floor(WARNING_BEFORE_MS / 1000));
      
      // Start countdown
      countdownRef.current = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, SESSION_TIMEOUT_MS - WARNING_BEFORE_MS);
    
    // Actual timeout
    timeoutRef.current = setTimeout(() => {
      handleLogout();
    }, SESSION_TIMEOUT_MS);
  }, [user, resetTimers]);

  // Handle user activity
  const handleUserActivity = useCallback(() => {
    if (user && !showTimeoutWarning) {
      startSessionTimer();
    }
  }, [user, showTimeoutWarning, startSessionTimer]);

  // Set up activity listeners
  useEffect(() => {
    if (!user) return;
    
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    
    events.forEach(event => {
      window.addEventListener(event, handleUserActivity);
    });
    
    // Start timer on login
    startSessionTimer();
    
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
      resetTimers();
    };
  }, [user, handleUserActivity, startSessionTimer, resetTimers]);

  // Continue session (dismiss warning)
  const handleContinueSession = () => {
    setShowTimeoutWarning(false);
    startSessionTimer();
  };

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    setView(ViewState.DASHBOARD);
  };

  const handleLogout = () => {
    resetTimers();
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
          <CashFlow 
            onBack={() => setView(ViewState.DASHBOARD)} 
            onNavigate={setView}
            currentUser={user}
            initialMode="EXPENSE"
          />
        );

      case ViewState.INCOME:
        return (
          <CashFlow 
            onBack={() => setView(ViewState.DASHBOARD)} 
            onNavigate={setView}
            currentUser={user}
            initialMode="INCOME"
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

      case ViewState.REPORTS:
        return (
          <Reports 
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
      
      {/* Session Timeout Warning Modal */}
      {showTimeoutWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
          
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center animate-in fade-in zoom-in-95 duration-200">
            {/* Warning Icon */}
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <h2 className="text-xl font-bold text-slate-800 mb-2">Session Timeout Warning</h2>
            <p className="text-slate-500 text-sm mb-4">
              Ap {remainingSeconds} seconds mein auto logout ho jayenge due to inactivity.
            </p>
            
            {/* Countdown */}
            <div className="w-20 h-20 mx-auto mb-6 relative">
              <svg className="w-full h-full transform -rotate-90">
                <circle 
                  cx="40" 
                  cy="40" 
                  r="35" 
                  fill="none" 
                  stroke="#e2e8f0" 
                  strokeWidth="6"
                />
                <circle 
                  cx="40" 
                  cy="40" 
                  r="35" 
                  fill="none" 
                  stroke="#f59e0b" 
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${(remainingSeconds / 60) * 220} 220`}
                  className="transition-all duration-1000"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-amber-600">
                {remainingSeconds}
              </span>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
              >
                Logout
              </button>
              <button
                onClick={handleContinueSession}
                className="flex-1 px-4 py-3 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 shadow-lg shadow-amber-200 transition-colors"
              >
                Continue Working
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
