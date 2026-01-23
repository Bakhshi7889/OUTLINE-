import React, { useEffect, useRef, useState } from 'react';
import { BrainCircuit, Sparkles } from 'lucide-react';

interface ThinkingPanelProps {
  content: string;
}

export const ThinkingPanel: React.FC<ThinkingPanelProps> = ({ content }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Auto-expand when thinking content starts arriving
  useEffect(() => {
    if (content && !isExpanded) {
      setIsExpanded(true);
    }
  }, [content]);

  // Auto-scroll to bottom of thinking
  useEffect(() => {
    if (scrollRef.current && isExpanded) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [content, isExpanded]);

  if (!content) return null;

  return (
    <div className="w-full max-w-2xl mx-auto my-6 animate-[fadeIn_0.5s_ease-out]">
      <div 
        className={`
            relative overflow-hidden rounded-xl border transition-all duration-500
            ${isExpanded ? 'bg-[#0a0a0a] border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.1)]' : 'bg-transparent border-transparent'}
        `}
      >
        {/* Header */}
        <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 w-full px-4 py-2 bg-white/[0.03] hover:bg-white/[0.05] transition-colors z-20 relative"
        >
            <div className={`p-1 rounded-md ${isExpanded ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-white/40'}`}>
                <BrainCircuit className="w-3.5 h-3.5" />
            </div>
            <span className={`text-[10px] font-mono tracking-widest uppercase ${isExpanded ? 'text-blue-400' : 'text-white/40'}`}>
                {isExpanded ? 'Neural Engine Active' : 'Reasoning Hidden'}
            </span>
            {isExpanded && <div className="ml-auto w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_#3b82f6]" />}
        </button>

        {/* Matrix View */}
        <div 
            className={`
                relative transition-[max-height] duration-500 ease-in-out
                ${isExpanded ? 'max-h-[300px]' : 'max-h-0'}
            `}
        >
            {/* Scanline overlay */}
            <div className="absolute inset-0 pointer-events-none z-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] opacity-20" />
            
            <div 
                ref={scrollRef}
                className="p-5 font-mono text-[11px] text-blue-200/80 leading-relaxed whitespace-pre-wrap overflow-y-auto max-h-[300px] custom-scrollbar selection:bg-blue-500/30"
                style={{ textShadow: '0 0 5px rgba(59, 130, 246, 0.5)' }}
            >
                {content}
                <span className="inline-block w-2 h-4 bg-blue-500/50 align-middle ml-1 animate-pulse" />
            </div>
        </div>
      </div>
    </div>
  );
};