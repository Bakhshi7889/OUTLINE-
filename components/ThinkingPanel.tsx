import React, { useState } from 'react';
import { ChevronDown, ChevronUp, BrainCircuit } from 'lucide-react';

interface ThinkingPanelProps {
  content: string;
}

export const ThinkingPanel: React.FC<ThinkingPanelProps> = ({ content }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!content) return null;

  return (
    <div className="w-full max-w-2xl mx-auto my-4 pl-4 border-l border-white/10 group">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-3 text-xs font-medium text-white/30 uppercase tracking-widest hover:text-white/60 transition-colors"
      >
        <BrainCircuit className="w-3.5 h-3.5" />
        Neural Reasoning
        {isExpanded ? <ChevronUp className="w-3 h-3 ml-1 opacity-50" /> : <ChevronDown className="w-3 h-3 ml-1 opacity-50" />}
      </button>
      
      {isExpanded && (
        <div className="mt-3 p-4 rounded-lg bg-white/[0.02] border border-white/5 backdrop-blur-sm">
            <div className="text-[10px] font-mono text-white/40 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto custom-scrollbar">
                {content}
            </div>
        </div>
      )}
    </div>
  );
};