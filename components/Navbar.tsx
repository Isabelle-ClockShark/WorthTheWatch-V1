
import React from 'react';

interface NavbarProps {
  onNavigate: (view: 'dashboard' | 'library' | 'ai') => void;
  activeView: string;
  onOpenAccount: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onNavigate, activeView, onOpenAccount }) => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass px-6 py-4 flex items-center justify-between">
      <div 
        className="flex items-center gap-2 cursor-pointer" 
        onClick={() => onNavigate('dashboard')}
      >
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white">W</div>
        <h1 className="text-xl font-bold tracking-tight gradient-text">WorthTheWatch</h1>
      </div>
      
      <div className="flex items-center gap-8">
        {[
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'library', label: 'My Library' },
          { id: 'ai', label: 'AI Recommendations' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id as any)}
            className={`text-sm font-medium transition-colors ${
              activeView === item.id ? 'text-indigo-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      
      <div className="flex items-center gap-4">
        <button 
          onClick={onOpenAccount}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-full transition-all text-sm font-semibold border border-white/5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Account
        </button>
        <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden border border-white/10">
          <img src="https://picsum.photos/seed/user123/100" alt="Avatar" />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
