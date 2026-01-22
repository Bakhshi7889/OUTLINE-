import React from 'react';
import { Check, CircleDashed, Loader2, Eye } from 'lucide-react';
import { PipelineState } from '../lib/projectPipeline';

interface ProgressViewProps {
  state: PipelineState;
  activeTab: string;
  onTabSelect: (tab: 'prd' | 'spec' | 'task') => void;
}

const STEPS = [
  { id: 'analyzing', label: 'Feasibility', viewId: null },
  { id: 'generating_prd', label: 'Product Requirements', viewId: 'prd' },
  { id: 'generating_spec', label: 'Technical Spec', viewId: 'spec' },
  { id: 'generating_task', label: 'Task Breakdown', viewId: 'task' }
];

export const ProgressView: React.FC<ProgressViewProps> = ({ state, activeTab, onTabSelect }) => {
  const getCurrentStepIndex = () => {
    switch (state) {
      case 'analyzing': return 0;
      case 'generating_prd': return 1;
      case 'generating_spec': return 2;
      case 'generating_task': return 3;
      case 'complete': return 4;
      default: return -1;
    }
  };

  const currentIndex = getCurrentStepIndex();

  return (
    <div className="w-full max-w-2xl mx-auto py-6">
      <div className="flex flex-col gap-3">
        {STEPS.map((step, idx) => {
          const isActiveProcess = idx === currentIndex;
          const isCompleted = idx < currentIndex;
          const isPending = idx > currentIndex;
          
          const isViewActive = step.viewId === activeTab;
          const canView = step.viewId && (isCompleted || isActiveProcess || (idx === currentIndex && step.viewId));

          return (
            <div 
              key={step.id}
              onClick={() => canView && step.viewId && onTabSelect(step.viewId as any)}
              className={`
                relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 ease-out overflow-hidden
                ${canView ? 'cursor-pointer hover:bg-white/[0.08]' : 'cursor-default'}
                ${isViewActive 
                    ? 'bg-white/[0.06] border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.05)]' 
                    : 'bg-transparent border-transparent opacity-50 hover:opacity-80'}
              `}
            >
              {/* Active Tab Marker */}
              {isViewActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-white" />
              )}

              <div className="w-6 flex-shrink-0 flex items-center justify-center">
                {isActiveProcess && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                {isCompleted && <Check className="w-4 h-4 text-emerald-400" />}
                {isPending && <CircleDashed className="w-4 h-4 text-white/20" />}
              </div>
              
              <div className="flex-1 flex justify-between items-center">
                <div className="flex flex-col">
                    <span className={`text-sm tracking-wide ${isViewActive ? 'font-semibold text-white' : 'font-light text-white/70'}`}>
                    {step.label}
                    </span>
                    {canView && !isViewActive && (
                        <span className="text-[10px] text-white/30 flex items-center gap-1 mt-0.5">
                            Click to view
                        </span>
                    )}
                </div>
                
                <div className="flex items-center gap-3">
                    {isViewActive && <Eye className="w-3.5 h-3.5 text-white/60" />}
                    {isActiveProcess && (
                        <span className="text-[10px] font-mono text-white/30 animate-pulse">
                            PROCESSING
                        </span>
                    )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};