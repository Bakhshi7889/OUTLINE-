import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Download, FileText, ChevronDown, ChevronRight, Package, Copy, MessageSquare } from 'lucide-react';
import { createZip } from '../utils/zip';

interface OutputViewProps {
  files: {
    prd: string;
    spec: string;
    task: string;
  };
}

const ITEMS = [
    { id: 'prd', label: 'Product Requirements', desc: 'Executive Summary & MVP Scope' },
    { id: 'spec', label: 'Technical Spec', desc: 'Architecture, Stack, & Data Models' },
    { id: 'task', label: 'Implementation Tasks', desc: 'Phase-by-phase Build Instructions' }
] as const;

export const OutputView: React.FC<OutputViewProps> = ({ files }) => {
  // Accordion state - allows one open at a time
  const [openSection, setOpenSection] = useState<'prd' | 'spec' | 'task'>('prd');
  const [question, setQuestion] = useState('');

  const handleDownloadSingle = (filename: string, content: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = async () => {
    const zipBlob = await createZip([
      { name: 'PRD.md', content: files.prd },
      { name: 'Spec.md', content: files.spec },
      { name: 'Task.md', content: files.task }
    ]);
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gen-prompt-kit.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (content: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(content);
  };

  const handleQuestionSubmit = () => {
      // For now, this is a placeholder for the interaction logic
      // In a full implementation, this would call the API
      if (!question.trim()) return;
      alert("Consultation feature coming in next update: " + question);
      setQuestion('');
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-4 pb-20">
      
      {/* Top Action Bar */}
      <div className="flex justify-between items-center mb-2 px-2">
         <div className="flex items-center gap-2">
            {/* Placeholder for future chat history or status */}
         </div>
         <button 
            onClick={handleDownloadAll}
            className="flex items-center gap-2 px-6 py-3 bg-white text-black text-xs font-bold uppercase tracking-widest rounded-full hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.15)]"
          >
            <Package className="w-4 h-4" />
            Download Kit (.ZIP)
          </button>
      </div>

      {/* Accordion List */}
      <div className="flex flex-col gap-4">
        {ITEMS.map((item) => {
            const isOpen = openSection === item.id;
            const content = files[item.id as keyof typeof files];

            return (
                <div 
                    key={item.id}
                    className={`
                        group flex flex-col rounded-2xl border transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] overflow-hidden w-full
                        ${isOpen 
                            ? 'bg-white/[0.03] border-white/20 shadow-[0_10px_40px_rgba(0,0,0,0.5)]' 
                            : 'bg-black/40 border-white/5 hover:border-white/10 hover:bg-white/[0.02]'}
                    `}
                >
                    {/* Header */}
                    <div 
                        onClick={() => setOpenSection(item.id as any)}
                        className="flex items-center justify-between p-6 cursor-pointer select-none"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg border transition-colors ${isOpen ? 'bg-white/10 border-white/10' : 'bg-transparent border-white/5 text-white/20'}`}>
                                <FileText className={`w-5 h-5 ${isOpen ? 'text-white' : 'text-white/40'}`} />
                            </div>
                            <div>
                                <h3 className={`text-base font-medium transition-colors ${isOpen ? 'text-white' : 'text-white/60'}`}>
                                    {item.label}
                                </h3>
                                <p className="text-xs text-white/30 font-light mt-0.5">{item.desc}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {isOpen && (
                                <div className="flex gap-2 animate-[fadeIn_0.3s_ease-out]">
                                    <button 
                                        onClick={(e) => copyToClipboard(content, e)}
                                        className="p-2 hover:bg-white/10 rounded-md text-white/40 hover:text-white transition-colors"
                                        title="Copy"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={(e) => handleDownloadSingle(`${item.id.toUpperCase()}.md`, content, e)}
                                        className="p-2 hover:bg-white/10 rounded-md text-white/40 hover:text-white transition-colors"
                                        title="Download Markdown"
                                    >
                                        <Download className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                            {isOpen ? <ChevronDown className="w-5 h-5 text-white/60" /> : <ChevronRight className="w-5 h-5 text-white/20" />}
                        </div>
                    </div>

                    {/* Content (Expandable) */}
                    <div className={`
                        overflow-hidden transition-[max-height] duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]
                        ${isOpen ? 'max-h-[800px]' : 'max-h-0'}
                    `}>
                        <div className="p-8 pt-0 border-t border-white/5">
                            <div className="h-full max-h-[600px] overflow-y-auto custom-scrollbar pr-4">
                                <div className="prose prose-invert prose-sm max-w-none break-words overflow-x-hidden">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {content || "_No content generated_"}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        })}
      </div>
      
      {/* Question / Clarification Area (The missing feature) */}
      <div className="mt-8 pt-8 border-t border-white/5">
         <h4 className="text-sm font-medium text-white/60 mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Have questions about this kit?
         </h4>
         <div className="flex gap-2">
             <input 
                type="text" 
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask LINED to clarify a specific task or spec..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-all"
             />
             <button 
                onClick={handleQuestionSubmit}
                disabled={!question.trim()}
                className="px-6 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
             >
                Ask
             </button>
         </div>
      </div>
    </div>
  );
};