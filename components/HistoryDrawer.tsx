import React from 'react';
import { X, Clock, ArrowRight, Trash2 } from 'lucide-react';
import { ProjectData } from '../utils/storage';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projects: ProjectData[];
  onSelect: (project: ProjectData) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({ 
  isOpen, onClose, projects, onSelect, onDelete 
}) => {
  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        className={`
          fixed top-0 right-0 h-full w-full max-w-sm bg-[#050505] border-l border-white/10 shadow-2xl z-[70] 
          transform transition-transform duration-500 cubic-bezier(0.22, 1, 0.36, 1)
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <h2 className="text-lg font-medium text-white tracking-tight">Project History</h2>
                <button 
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                {projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-center">
                        <Clock className="w-8 h-8 text-white/20 mb-3" />
                        <p className="text-sm text-white/40">No projects saved yet.</p>
                    </div>
                ) : (
                    projects.map((p) => (
                        <div 
                            key={p.id}
                            onClick={() => onSelect(p)}
                            className="group relative p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all cursor-pointer overflow-hidden"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-sm font-medium text-white/90 truncate pr-8">{p.name || "Untitled Project"}</h3>
                                <button
                                    onClick={(e) => onDelete(p.id, e)}
                                    className="p-1.5 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            
                            <p className="text-[11px] text-white/40 line-clamp-2 mb-3 font-light">
                                {p.inputs.idea}
                            </p>
                            
                            <div className="flex items-center justify-between text-[10px] text-white/30 uppercase tracking-wider">
                                <span>{new Date(p.timestamp).toLocaleDateString()}</span>
                                <div className="flex items-center gap-1 group-hover:text-white transition-colors">
                                    Load <ArrowRight className="w-3 h-3" />
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
            
            <div className="p-4 border-t border-white/5 bg-white/[0.02]">
                <p className="text-[10px] text-center text-white/30">
                    Projects are stored locally in your browser.
                </p>
            </div>
        </div>
      </div>
    </>
  );
};