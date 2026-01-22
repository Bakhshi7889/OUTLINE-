import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, Layers, Cpu, ChevronDown, Check } from 'lucide-react';
import { saveDraft, loadDraft } from '../utils/storage';

interface InputPanelProps {
  onGenerate: (idea: string, target: string, type: string) => void;
  isBusy: boolean;
  initialValues?: { idea: string, target: string, type: string } | null;
}

const TARGETS = ['Google AI Studio', 'Replit', 'Lovable', 'Cursor', 'Bolt'];
const TYPES = ['Website', 'Mobile App', 'PWA'];

const TARGET_LOGOS: Record<string, string> = {
  'Google AI Studio': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRXKZihUNtc0oqnWOpgxzmHjgds5JiBO4U-jTKW5OmeQg&s=10',
  'Replit': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT1uwaC6TTMxF1qF2IRQsEjz4TlYL0xBx9rBI2FyuMoJ8lxyueD9vwx18sE&s=10',
  'Lovable': 'https://lovable.dev/img/logo/lovable-logo-icon.svg',
  'Cursor': 'https://registry.npmmirror.com/@lobehub/icons-static-png/1.75.0/files/dark/cursor.png',
  'Bolt': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT9JIHE8U54Syeur3yryEv1n400-1M3cBBIh1qaNktBmw&s=10'
};

const TYPE_ICONS: Record<string, string> = {
  'Website': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRoqmFxCjVCemt_EecBv2Bso0d35z1Gw-gqJQt_-uegTg&s=10',
  'Mobile App': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRQpnQ_SL-LEiAEcMBAMwiNnyLmL48stofJyV0tOYRXIg&s=10',
  'PWA': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR7zyGNuKCZTC3kVcJFs_qCNuVIBiDXNONdNyV71Oairg&s=10'
};

// Custom Dropdown Component
interface CustomSelectProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  icon: React.ElementType;
  disabled?: boolean;
  className?: string;
  dropUp?: boolean;
  optionIcons?: Record<string, string>;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ 
  value, options, onChange, icon: Icon, disabled, className, dropUp = false, optionIcons
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all outline-none group w-full md:w-auto justify-between md:justify-start
          ${isOpen 
            ? 'bg-white/10 border-white/10' 
            : 'bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10'}
        `}
        disabled={disabled}
      >
        <div className="flex items-center gap-2">
            {optionIcons && optionIcons[value] ? (
                <img 
                    src={optionIcons[value]} 
                    alt={value} 
                    className="w-3.5 h-3.5 object-contain rounded-sm opacity-90 group-hover:opacity-100 transition-opacity" 
                />
            ) : (
                <Icon className={`w-3 h-3 transition-colors ${isOpen ? 'text-white' : 'text-white/40 group-hover:text-white/60'}`} />
            )}
            
            <span className="text-[11px] font-medium text-white/90 leading-none mx-0.5">{value}</span>
        </div>

        <ChevronDown className={`w-2.5 h-2.5 text-white/20 transition-transform duration-300 ${isOpen ? 'rotate-180 text-white/60' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      <div 
        className={`
            absolute left-0 min-w-[180px] w-full md:w-auto z-50 
            bg-[#0A0A0A] border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] 
            overflow-hidden transition-all duration-200
            ${dropUp 
                ? 'bottom-[calc(100%+6px)] origin-bottom' 
                : 'top-[calc(100%+6px)] origin-top'}
            ${isOpen 
                ? 'opacity-100 scale-100 translate-y-0' 
                : 'opacity-0 scale-95 pointer-events-none ' + (dropUp ? 'translate-y-2' : '-translate-y-2')}
        `}
      >
        <div className="max-h-56 overflow-y-auto py-1 custom-scrollbar">
            {options.map((option) => (
                <button
                    key={option}
                    onClick={() => {
                        onChange(option);
                        setIsOpen(false);
                    }}
                    className={`
                        w-full flex items-center justify-between px-3 py-2 text-[11px] text-left transition-all
                        ${option === value ? 'bg-white/10 text-white font-medium' : 'text-white/60 hover:bg-white/5 hover:text-white'}
                    `}
                >
                    <div className="flex items-center gap-2.5">
                        {optionIcons && optionIcons[option] && (
                            <img 
                                src={optionIcons[option]} 
                                alt={option} 
                                className="w-3.5 h-3.5 object-contain rounded-sm" 
                            />
                        )}
                        <span>{option}</span>
                    </div>
                    {option === value && <Check className="w-2.5 h-2.5 text-emerald-400" />}
                </button>
            ))}
        </div>
      </div>
    </div>
  );
};

export const InputPanel: React.FC<InputPanelProps> = ({ onGenerate, isBusy, initialValues }) => {
  const [idea, setIdea] = useState(initialValues?.idea || '');
  const [target, setTarget] = useState(initialValues?.target || TARGETS[0]);
  const [type, setType] = useState(initialValues?.type || TYPES[0]);

  // Load from Draft if no initialValues
  useEffect(() => {
    if (!initialValues) {
        const draft = loadDraft();
        if (draft) {
            if (draft.idea) setIdea(draft.idea);
            if (draft.target) setTarget(draft.target);
            if (draft.type) setType(draft.type);
        }
    }
  }, [initialValues]);

  // Sync state when initialValues change (history load)
  useEffect(() => {
    if (initialValues) {
        setIdea(initialValues.idea);
        setTarget(initialValues.target);
        setType(initialValues.type);
    }
  }, [initialValues]);

  // Auto-Save Draft
  useEffect(() => {
     // Save draft if we are not in read-only/history mode (implied by absence of explicit initialValues override context, 
     // though here we just save whatever is being typed as the current draft)
     const timer = setTimeout(() => {
         saveDraft({ idea, target, type });
     }, 500);
     return () => clearTimeout(timer);
  }, [idea, target, type]);

  const handleSubmit = () => {
    if (!idea.trim()) return;
    onGenerate(idea, target, type);
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6 md:gap-8 animate-[fadeIn_0.8s_cubic-bezier(0.2,0.8,0.2,1)]">
      <div className="text-center space-y-4 px-2 md:px-0 mt-4 md:mt-0">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 tracking-tight leading-tight pb-1">
          Line up your idea<br className="md:hidden" /> into a real plan
        </h2>
        <p className="text-white/40 text-sm font-light max-w-[300px] sm:max-w-md mx-auto leading-relaxed">
          Describe what you want to build. Lined will organize it into a clear, ready-to-use project outline.
        </p>
      </div>

      <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 transition-all hover:border-white/15 hover:bg-white/[0.03] group mx-2 md:mx-0">
        
        {/* Text Area */}
        <div className="p-1 relative z-10">
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            disabled={isBusy}
            className="w-full h-32 md:h-32 bg-transparent text-base font-light text-white placeholder-white/20 p-5 resize-none outline-none selection:bg-white/20 custom-scrollbar"
            placeholder="e.g. A personal finance dashboard that tracks subscription services..."
          />
        </div>

        {/* Action Bar & Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between px-4 py-3 border-t border-white/5 bg-white/[0.02] relative z-20 rounded-b-2xl gap-3 md:gap-0">
            
            {/* Dropdowns */}
            <div className="flex items-center gap-2 w-full md:w-auto">
                 <div className="flex-1 md:flex-none">
                     <CustomSelect 
                        value={target} 
                        options={TARGETS} 
                        onChange={setTarget} 
                        icon={Cpu} 
                        disabled={isBusy} 
                        dropUp={true}
                        optionIcons={TARGET_LOGOS}
                        className="w-full md:w-auto"
                     />
                 </div>
                 <div className="flex-1 md:flex-none">
                     <CustomSelect 
                        value={type} 
                        options={TYPES} 
                        onChange={setType} 
                        icon={Layers} 
                        disabled={isBusy}
                        dropUp={true}
                        optionIcons={TYPE_ICONS}
                        className="w-full md:w-auto"
                     />
                 </div>
            </div>

            {/* Initialize Button */}
            <button 
                onClick={handleSubmit}
                disabled={!idea.trim() || isBusy}
                className={`
                    w-full md:w-auto
                    flex items-center justify-center gap-2 px-5 py-2 rounded-full 
                    bg-white text-black text-[10px] font-bold uppercase tracking-wide 
                    transition-all duration-300
                    hover:scale-105 active:scale-95 
                    disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed 
                    shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.25)]
                `}
            >
                {isBusy ? 'Processing' : 'Generate Outline'}
                {!isBusy && <ArrowRight className="w-3 h-3" />}
            </button>
        </div>
      </div>
    </div>
  );
};