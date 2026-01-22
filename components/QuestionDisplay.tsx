import React from 'react';
import { HelpCircle, ArrowRight } from 'lucide-react';

export interface QuestionData {
  type: 'A' | 'B' | 'C';
  text: string;
  options: string[];
}

interface QuestionDisplayProps {
  question: QuestionData;
  onAnswer: (answer: string) => void;
}

export const QuestionDisplay: React.FC<QuestionDisplayProps> = ({ question, onAnswer }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.3s_ease-out]">
      <div className="w-full max-w-lg relative">
        
        {/* Glass Container */}
        <div className="relative bg-black/80 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl overflow-hidden animate-[scaleIn_0.4s_cubic-bezier(0.175,0.885,0.32,1.275)]">
          
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10 flex flex-col gap-6">
            
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-white/5 border border-white/10 shadow-inner">
                <HelpCircle className="w-6 h-6 text-white/80" />
              </div>
              <div className="flex-1 pt-1">
                <h3 className="text-lg font-medium text-white leading-relaxed">
                  {question.text}
                </h3>
                <p className="text-xs text-white/40 mt-2 uppercase tracking-widest font-medium">
                  Decision Required
                </p>
              </div>
            </div>

            {/* Options - Liquid Bubbles */}
            <div className="grid grid-cols-1 gap-3 mt-2">
              {question.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => onAnswer(option)}
                  className="
                    group relative flex items-center justify-between px-6 py-4 rounded-xl
                    bg-white/[0.03] border border-white/10 
                    hover:bg-white/[0.08] hover:border-white/20 hover:scale-[1.02]
                    active:scale-[0.98]
                    transition-all duration-300 ease-out
                  "
                >
                  <span className="text-sm text-white/80 group-hover:text-white transition-colors text-left">
                    {option}
                  </span>
                  <div className="w-6 h-6 rounded-full border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-3 h-3 text-white" />
                  </div>
                </button>
              ))}
            </div>

          </div>
        </div>

        {/* Backdrop decoration */}
        <div className="absolute -z-10 inset-4 bg-white/5 blur-xl rounded-full" />
      </div>
    </div>
  );
};