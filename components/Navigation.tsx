
import React from 'react';
import { LayoutDashboard, Plus, MessageCircle, CalendarDays, Brain } from 'lucide-react';
import { AppView } from '../types';

interface NavigationProps {
  currentView: AppView;
  setView: (view: AppView) => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentView, setView }) => {
  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-sm px-4">
      <nav className="bg-white/90 backdrop-blur-xl border border-white/50 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] rounded-[2.5rem] h-20 flex items-center px-2 relative">
        
        {/* Left Group */}
        <div className="flex-1 flex justify-evenly">
            <button
                onClick={() => setView(AppView.DASHBOARD)}
                className={`relative flex flex-col items-center justify-center transition-all duration-300 p-2 ${
                currentView === AppView.DASHBOARD ? 'text-emerald-600' : 'text-gray-300 hover:text-gray-500'
                }`}
            >
                <LayoutDashboard size={26} strokeWidth={currentView === AppView.DASHBOARD ? 2.5 : 2} />
                {currentView === AppView.DASHBOARD && <span className="absolute bottom-0 w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/50"></span>}
            </button>

            <button
                onClick={() => setView(AppView.PLAN)}
                className={`relative flex flex-col items-center justify-center transition-all duration-300 p-2 ${
                currentView === AppView.PLAN ? 'text-emerald-600' : 'text-gray-300 hover:text-gray-500'
                }`}
            >
                <CalendarDays size={26} strokeWidth={currentView === AppView.PLAN ? 2.5 : 2} />
                {currentView === AppView.PLAN && <span className="absolute bottom-0 w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/50"></span>}
            </button>
        </div>

        {/* Center Space for FAB */}
        <div className="w-20 relative flex justify-center">
            <div className="absolute -top-10">
                <button
                onClick={() => setView(AppView.LOG_FOOD)}
                className="w-16 h-16 bg-gradient-to-b from-emerald-400 to-emerald-500 rounded-full shadow-[0_10px_25px_rgba(16,185,129,0.4)] border-[6px] border-gray-50 flex items-center justify-center text-white transform transition-transform active:scale-95 hover:scale-105 hover:-translate-y-1"
                >
                    <Plus size={32} strokeWidth={3} />
                </button>
            </div>
        </div>

        {/* Right Group */}
        <div className="flex-1 flex justify-evenly">
             <button
                onClick={() => setView(AppView.INSIGHTS)}
                className={`relative flex flex-col items-center justify-center transition-all duration-300 p-2 ${
                currentView === AppView.INSIGHTS ? 'text-emerald-600' : 'text-gray-300 hover:text-gray-500'
                }`}
            >
                <Brain size={26} strokeWidth={currentView === AppView.INSIGHTS ? 2.5 : 2} />
                {currentView === AppView.INSIGHTS && <span className="absolute bottom-0 w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/50"></span>}
            </button>

             <button
                onClick={() => setView(AppView.CHAT)}
                className={`relative flex flex-col items-center justify-center transition-all duration-300 p-2 ${
                currentView === AppView.CHAT ? 'text-emerald-600' : 'text-gray-300 hover:text-gray-500'
                }`}
            >
                <MessageCircle size={26} strokeWidth={currentView === AppView.CHAT ? 2.5 : 2} />
                {currentView === AppView.CHAT && <span className="absolute bottom-0 w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/50"></span>}
            </button>
        </div>

      </nav>
    </div>
  );
};

export default Navigation;
