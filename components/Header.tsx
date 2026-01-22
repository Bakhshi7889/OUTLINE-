import React from 'react';
import { Command, History } from 'lucide-react';

interface HeaderProps {
    onShowHistory: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onShowHistory }) => {
  return (
    <header className="w-full py-5 px-6 md:px-12 flex items-center justify-between border-b border-white/[0.06] bg-black/80 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300">
      <div className="flex items-center">
        <h1 
            className="text-2xl md:text-3xl font-extrabold tracking-[-0.04em] text-white select-none hover:opacity-90 transition-opacity" 
            style={{ fontFamily: '"Syne", sans-serif' }}
        >
          OUTLINE
        </h1>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center gap-2 px-2 py-1 rounded-md bg-white/5 border border-white/5 text-[9px] text-white/40 font-mono">
            <Command className="w-2.5 h-2.5" />
            <span>K</span>
        </div>
        <nav className="flex items-center gap-4 text-[10px] font-medium text-white/40">
           <span className="text-white cursor-default hover:text-white transition-colors">Generator</span>
           <button 
                onClick={onShowHistory}
                className="flex items-center gap-1.5 hover:text-white transition-colors"
           >
                <History className="w-3 h-3" />
                History
           </button>
        </nav>
      </div>
    </header>
  );
};