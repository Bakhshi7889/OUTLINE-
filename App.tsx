import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { InputPanel } from './components/InputPanel';
import { ThinkingPanel } from './components/ThinkingPanel';
import { ProgressView } from './components/ProgressView';
import { OutputView } from './components/OutputView';
import { QuestionDisplay, QuestionData } from './components/QuestionDisplay';
import { HistoryDrawer } from './components/HistoryDrawer';
import { 
  runFeasibilityCheck, 
  generatePRD, 
  generateSpec, 
  generateTask,
  PipelineState 
} from './lib/projectPipeline';
import { saveProject, loadProjects, deleteProject, ProjectData } from './utils/storage';
import { AlertCircle, RotateCcw, Sparkles, ArrowDown, ArrowRight } from 'lucide-react';

const App: React.FC = () => {
  const [pipelineState, setPipelineState] = useState<PipelineState>('idle');
  const [projectInputs, setProjectInputs] = useState<{ idea: string, target: string, type: string } | null>(null);
  
  // Question System State
  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null);
  const [contextHistory, setContextHistory] = useState<string>('');

  // History State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [savedProjects, setSavedProjects] = useState<ProjectData[]>([]);

  // Content Buffers
  const [prdContent, setPrdContent] = useState('');
  const [specContent, setSpecContent] = useState('');
  const [taskContent, setTaskContent] = useState('');
  const [thinkingContent, setThinkingContent] = useState('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // UI State
  const [activeTab, setActiveTab] = useState<'prd' | 'spec' | 'task'>('prd');
  const [userArgument, setUserArgument] = useState('');
  
  // Scroll State
  const terminalRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<number | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);

  // Load history on mount and when changed
  const refreshHistory = () => {
      setSavedProjects(loadProjects());
  };

  useEffect(() => {
      refreshHistory();
  }, [pipelineState]); // Refresh when pipeline completes

  // Determine what text to show in terminal
  const getTerminalContent = () => {
      switch(activeTab) {
          case 'prd': return prdContent || (pipelineState === 'generating_prd' ? '' : 'Waiting for generation...');
          case 'spec': return specContent || 'Waiting for PRD completion...';
          case 'task': return taskContent || 'Waiting for Spec completion...';
          default: return '';
      }
  };

  const currentTerminalContent = getTerminalContent();

  // BUTTERY SMOOTH SCROLLING
  // Instead of scrolling on every render, we request an animation frame if content changed.
  useEffect(() => {
    if (!shouldAutoScrollRef.current || !terminalRef.current) return;

    if (scrollTimeoutRef.current) {
        cancelAnimationFrame(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = requestAnimationFrame(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTo({
                top: terminalRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    });

    return () => {
        if (scrollTimeoutRef.current) cancelAnimationFrame(scrollTimeoutRef.current);
    };
  }, [currentTerminalContent, activeTab]);

  const handleTerminalScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 60; // slightly larger buffer
    
    if (shouldAutoScrollRef.current !== isAtBottom) {
        shouldAutoScrollRef.current = isAtBottom;
        setIsAutoScrolling(isAtBottom);
    }
  };

  const startGeneration = async (idea: string, target: string, type: string, history: string = '') => {
    setProjectInputs({ idea, target, type });
    setPipelineState('analyzing');
    setErrorMessage('');
    setThinkingContent('');
    
    if (!history) {
        setPrdContent('');
        setSpecContent('');
        setTaskContent('');
        setContextHistory('');
    }

    shouldAutoScrollRef.current = true;
    setIsAutoScrolling(true);

    // Pass 0: Feasibility & Questions
    runFeasibilityCheck(
        { idea, target, type, history }, 
        async (feasible, reason) => {
            if (!feasible) {
                setPipelineState('not_feasible');
                setErrorMessage(reason || "Project deemed not feasible.");
                return;
            }
            
            // Success: Move to Generation
            await new Promise(r => setTimeout(r, 800));
            setPipelineState('generating_prd');
            setActiveTab('prd');
        },
        (question) => {
            setCurrentQuestion(question);
            setPipelineState('question_break');
        }
    );
  };

  const handleQuestionAnswer = (answer: string) => {
    if (!projectInputs || !currentQuestion) return;
    setCurrentQuestion(null);
    const newEntry = `Q: ${currentQuestion.text}\nA: ${answer}`;
    const updatedHistory = contextHistory ? `${contextHistory}\n\n${newEntry}` : newEntry;
    setContextHistory(updatedHistory);
    startGeneration(projectInputs.idea, projectInputs.target, projectInputs.type, updatedHistory);
  };

  const loadProjectFromHistory = (p: ProjectData) => {
      setProjectInputs(p.inputs);
      setPrdContent(p.files.prd);
      setSpecContent(p.files.spec);
      setTaskContent(p.files.task);
      setPipelineState('complete');
      setIsHistoryOpen(false);
      setActiveTab('prd');
  };

  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      deleteProject(id);
      refreshHistory();
  };

  // Pipeline Execution Effect
  useEffect(() => {
    if (!projectInputs) return;

    const executePipeline = async () => {
        if (pipelineState === 'generating_prd') {
            await generatePRD(
                { ...projectInputs, history: contextHistory },
                (chunk) => setPrdContent(prev => prev + chunk),
                (think) => setThinkingContent(prev => prev + "\n" + think),
                async () => {
                    await new Promise(r => setTimeout(r, 1000)); 
                    setPipelineState('generating_spec');
                    setActiveTab('spec');
                    shouldAutoScrollRef.current = true;
                }
            );
        }
        else if (pipelineState === 'generating_spec') {
            await generateSpec(
                { ...projectInputs, history: contextHistory },
                prdContent,
                (chunk) => setSpecContent(prev => prev + chunk),
                (think) => setThinkingContent(prev => prev + "\n" + think),
                async () => {
                    await new Promise(r => setTimeout(r, 1000)); 
                    setPipelineState('generating_task');
                    setActiveTab('task');
                    shouldAutoScrollRef.current = true;
                }
            );
        }
        else if (pipelineState === 'generating_task') {
            await generateTask(
                { ...projectInputs, history: contextHistory },
                prdContent,
                specContent,
                (chunk) => setTaskContent(prev => prev + chunk),
                (think) => setThinkingContent(prev => prev + "\n" + think),
                () => {
                    setPipelineState('complete');
                    saveProject({
                        id: Date.now().toString(),
                        name: projectInputs.idea.slice(0, 30),
                        timestamp: Date.now(),
                        inputs: projectInputs,
                        files: { prd: prdContent, spec: specContent, task: taskContent }
                    } as any);
                    refreshHistory();
                }
            );
        }
    };

    executePipeline();
  }, [pipelineState, projectInputs]);

  const handleReset = () => {
    setPipelineState('idle');
    setPrdContent('');
    setSpecContent('');
    setTaskContent('');
    setThinkingContent('');
    setErrorMessage('');
    setProjectInputs(null);
    setUserArgument('');
    setContextHistory('');
    setActiveTab('prd');
  };

  const handleArgue = () => {
    if (!projectInputs || !userArgument.trim()) return;
    const modifiedIdea = `${projectInputs.idea}\n\n[User Clarification]: ${userArgument}`;
    startGeneration(modifiedIdea, projectInputs.target, projectInputs.type);
    setUserArgument('');
  };

  const isIdle = pipelineState === 'idle';

  return (
    <div className="min-h-screen w-full flex flex-col items-center relative bg-black selection:bg-white/20 selection:text-white overflow-hidden">
      
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-white/[0.03] blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/[0.02] blur-[100px]" />
      </div>

      <Header onShowHistory={() => setIsHistoryOpen(true)} />
      
      <HistoryDrawer 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)}
        projects={savedProjects}
        onSelect={loadProjectFromHistory}
        onDelete={handleDeleteProject}
      />

      {pipelineState === 'question_break' && currentQuestion && (
        <QuestionDisplay 
            question={currentQuestion} 
            onAnswer={handleQuestionAnswer} 
        />
      )}

      <main 
        className={`
          flex-1 w-full max-w-4xl flex flex-col items-center px-4 md:px-6 z-10 transition-all duration-700 ease-in-out
          ${isIdle ? 'justify-center pb-40' : 'pt-8 pb-48'} 
        `}
      >
        
        {pipelineState === 'idle' && (
          <InputPanel 
            onGenerate={(idea, target, type) => startGeneration(idea, target, type)} 
            isBusy={false} 
            initialValues={projectInputs}
          />
        )}

        {(pipelineState !== 'idle' && pipelineState !== 'complete' && pipelineState !== 'not_feasible' && pipelineState !== 'error') && (
           <div className="w-full max-w-2xl animate-[fadeIn_0.5s_ease-out]">
              <ProgressView 
                state={pipelineState} 
                activeTab={activeTab}
                onTabSelect={(tab) => setActiveTab(tab)}
              />
              <ThinkingPanel content={thinkingContent} />
              
              {/* Terminal View */}
              <div className="mt-8 rounded-xl border border-white/10 bg-[#050505] shadow-2xl transition-all duration-300 relative overflow-hidden">
                 
                 {/* Terminal Header with Solid-ish Background */}
                 <div className="absolute top-0 left-0 w-full h-9 bg-[#0f0f0f]/90 backdrop-blur-md flex items-center justify-between px-4 border-b border-white/5 z-20">
                    <div className="flex items-center gap-2">
                        <div className="flex gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
                        </div>
                        <span className="ml-3 text-[10px] text-white/30 font-mono">
                            output/{activeTab}.md
                        </span>
                    </div>
                    <div className={`flex items-center gap-1 transition-opacity duration-300 ${!isAutoScrolling ? 'opacity-100' : 'opacity-0'}`}>
                        <span className="text-[9px] text-white/30 uppercase">Paused</span>
                        <ArrowDown className="w-3 h-3 text-white/20" />
                    </div>
                 </div>
                 
                 <div 
                    ref={terminalRef}
                    onScroll={handleTerminalScroll}
                    className="p-6 pt-14 h-96 overflow-y-auto relative custom-scrollbar scroll-smooth bg-black/40"
                 >
                    <pre 
                        className="text-xs font-mono text-white/70 whitespace-pre-wrap font-light leading-relaxed pb-8 break-words max-w-full"
                    >
                        {currentTerminalContent}
                        <span className="animate-pulse text-white inline-block w-2 h-4 bg-white/50 align-middle ml-1"> </span>
                    </pre>
                 </div>
                 
                 {!isAutoScrolling && (
                    <button 
                        onClick={() => {
                            shouldAutoScrollRef.current = true;
                            setIsAutoScrolling(true);
                            if (terminalRef.current) {
                                terminalRef.current.scrollTo({
                                    top: terminalRef.current.scrollHeight,
                                    behavior: 'smooth'
                                });
                            }
                        }}
                        className="absolute bottom-4 right-4 bg-white/10 hover:bg-white/20 text-white/60 p-2 rounded-full backdrop-blur-md transition-all z-30 animate-bounce"
                    >
                        <ArrowDown className="w-4 h-4" />
                    </button>
                 )}
              </div>
           </div>
        )}

        {pipelineState === 'complete' && (
           <div className="w-full flex flex-col gap-6 animate-[fadeIn_0.5s_ease-out]">
              <div className="w-full flex justify-between items-center mb-4 px-2">
                  <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-white/60" />
                      <h2 className="text-lg font-medium text-white tracking-tight">Your outline is ready</h2>
                  </div>
                  <button onClick={handleReset} className="group flex items-center gap-2 text-xs text-white/40 hover:text-white transition-colors px-4 py-2 rounded-full border border-transparent hover:border-white/10 hover:bg-white/5">
                      <RotateCcw className="w-3 h-3 group-hover:-rotate-180 transition-transform duration-500" /> 
                      Start New Project
                  </button>
              </div>
              <OutputView files={{ prd: prdContent, spec: specContent, task: taskContent }} />
           </div>
        )}

        {(pipelineState === 'not_feasible' || pipelineState === 'error') && (
            <div className="max-w-md mx-auto mt-12 p-8 rounded-2xl bg-red-900/10 border border-red-500/20 flex flex-col gap-4 text-center backdrop-blur-xl animate-[fadeIn_0.5s_ease-out]">
                <AlertCircle className="w-10 h-10 text-red-500/80 mx-auto" />
                <h3 className="text-lg font-medium text-red-200">
                    {pipelineState === 'not_feasible' ? 'Feasibility Check Failed' : 'Generation Error'}
                </h3>
                <p className="text-sm text-red-200/60 leading-relaxed">{errorMessage}</p>
                
                <div className="mt-4 flex flex-col gap-2 text-left w-full">
                    <label className="text-[10px] uppercase tracking-wider text-red-200/40 font-semibold ml-1">
                        Argue your case
                    </label>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={userArgument}
                            onChange={(e) => setUserArgument(e.target.value)}
                            placeholder="Explain why this is feasible..."
                            className="flex-1 bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2 text-sm text-red-100 placeholder-red-200/20 focus:outline-none focus:border-red-500/30 transition-all"
                            onKeyDown={(e) => e.key === 'Enter' && handleArgue()}
                        />
                        <button 
                            onClick={handleArgue}
                            disabled={!userArgument.trim()}
                            className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="w-full h-px bg-red-500/10 my-2" />

                <button 
                    onClick={() => {
                        setPipelineState('idle');
                        setErrorMessage('');
                    }}
                    className="px-6 py-2.5 bg-transparent border border-red-500/20 rounded-full text-red-200 text-sm font-medium hover:bg-red-500/10 transition-all"
                >
                    Edit Original Prompt
                </button>
            </div>
        )}

      </main>

      {/* Footer Removed */}
    </div>
  );
};

export default App;