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
  refineProject,
  PipelineState 
} from './lib/projectPipeline';
import { saveProject, loadProjects, deleteProject, ProjectData } from './utils/storage';
import { AlertCircle, RotateCcw, Sparkles, ArrowDown, ArrowRight, Copy, Check } from 'lucide-react';

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
  
  // Refinement Buffer
  const [refinementBuffer, setRefinementBuffer] = useState('');
  
  // Terminal UI
  const [isCopied, setIsCopied] = useState(false);

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
      if (pipelineState === 'refining') return refinementBuffer;

      switch(activeTab) {
          case 'prd': return prdContent || (pipelineState === 'generating_prd' ? '' : 'Generating project files...');
          case 'spec': return specContent || 'Waiting for PRD completion...';
          case 'task': return taskContent || 'Waiting for Spec completion...';
          default: return '';
      }
  };

  const currentTerminalContent = getTerminalContent();

  const handleCopyTerminal = () => {
      navigator.clipboard.writeText(currentTerminalContent);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
  };

  // BUTTERY SMOOTH SCROLLING
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
  }, [currentTerminalContent, activeTab, pipelineState]);

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

  // Improved Refine Handler with local variable accumulation and Robust Regex Parsing
  const handleSmartRefine = async (instruction: string) => {
      setPipelineState('refining');
      setRefinementBuffer('> Request: ' + instruction + '\n> Analyzing files...\n\n');
      setThinkingContent('');
      shouldAutoScrollRef.current = true;

      let fullResponse = '';

      await refineProject(
          { prd: prdContent, spec: specContent, task: taskContent },
          instruction,
          (chunk) => {
              fullResponse += chunk;
              setRefinementBuffer(prev => prev + chunk);
          },
          (think) => setThinkingContent(prev => prev + "\n" + think),
          () => {
              // Parse Logic using Regex for better robustness
              // Matches <<<FILE: PRD>>> content <<<END>>> (case insensitive, loose spacing)
              const parseFileRegex = (tagName: string) => {
                  const regex = new RegExp(`<<<\\s*FILE:\\s*${tagName}\\s*>>>([\\s\\S]*?)<<<\\s*END\\s*>>>`, 'i');
                  const match = fullResponse.match(regex);
                  return match ? match[1].trim() : null;
              };

              const newPrd = parseFileRegex('PRD');
              const newSpec = parseFileRegex('SPEC');
              const newTask = parseFileRegex('TASK');

              let updatesCount = 0;
              if (newPrd) { setPrdContent(newPrd); updatesCount++; }
              if (newSpec) { setSpecContent(newSpec); updatesCount++; }
              if (newTask) { setTaskContent(newTask); updatesCount++; }

              // If no valid tags found but we have content, it might be a general reply or failure
              // In a production app, we would handle this "messy" response better.
              
              setPipelineState('complete');
              
              // Auto-save the update
              if (projectInputs && updatesCount > 0) {
                 const updatedProject = {
                    id: Date.now().toString(),
                    name: projectInputs.idea.slice(0, 30) + " (Refined)",
                    timestamp: Date.now(),
                    inputs: projectInputs,
                    files: { 
                        prd: newPrd || prdContent, 
                        spec: newSpec || specContent, 
                        task: newTask || taskContent 
                    }
                 };
                 // Allow immediate download of refined files
              }
          }
      );
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

  // Helper for filename
  const getProjectSlug = () => {
      if (!projectInputs?.idea) return 'lined-project';
      return 'lined-' + projectInputs.idea
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 30);
  };

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
              <div className="mt-8 rounded-xl border border-white/10 bg-[#050505] shadow-2xl transition-all duration-300 relative overflow-hidden group">
                 
                 {/* Terminal Header */}
                 <div className="absolute top-0 left-0 w-full h-9 bg-[#0f0f0f]/90 backdrop-blur-md flex items-center justify-between px-4 border-b border-white/5 z-20">
                    <div className="flex items-center gap-2">
                        <div className="flex gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
                        </div>
                        <span className="ml-3 text-[10px] text-white/30 font-mono">
                            {pipelineState === 'refining' ? 'pipeline/refine_stream' : `output/${activeTab}.md`}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Copy Button */}
                        <button 
                            onClick={handleCopyTerminal}
                            className="p-1 hover:bg-white/10 rounded transition-colors text-white/30 hover:text-white"
                            title="Copy output"
                        >
                            {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                        
                        <div className={`flex items-center gap-1 transition-opacity duration-300 ${!isAutoScrolling ? 'opacity-100' : 'opacity-0'}`}>
                            <span className="text-[9px] text-white/30 uppercase">Paused</span>
                            <ArrowDown className="w-3 h-3 text-white/20" />
                        </div>
                    </div>
                 </div>
                 
                 <div 
                    ref={terminalRef}
                    onScroll={handleTerminalScroll}
                    className="p-6 pt-14 h-96 overflow-y-auto relative custom-scrollbar scroll-smooth bg-black/40"
                 >
                    <pre 
                        className="text-xs font-mono text-gray-300 whitespace-pre-wrap font-light leading-relaxed pb-8 break-words max-w-full"
                    >
                        {currentTerminalContent}
                        <span className="animate-pulse text-blue-400 inline-block w-2 h-4 bg-blue-400/50 align-middle ml-1"> </span>
                    </pre>
                 </div>
              </div>
           </div>
        )}

        {pipelineState === 'complete' && (
           <div className="w-full flex flex-col gap-6 animate-[fadeIn_0.5s_ease-out]">
              <div className="w-full flex justify-between items-center mb-4 px-2">
                  <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-white/60" />
                      <div>
                        <h2 className="text-lg font-medium text-white tracking-tight">Your outline is ready</h2>
                        <p className="text-sm text-white/40">You now have everything needed to start building.</p>
                      </div>
                  </div>
                  <button onClick={handleReset} className="group flex items-center gap-2 text-xs text-white/40 hover:text-white transition-colors px-4 py-2 rounded-full border border-transparent hover:border-white/10 hover:bg-white/5">
                      <RotateCcw className="w-3 h-3 group-hover:-rotate-180 transition-transform duration-500" /> 
                      Start New Project
                  </button>
              </div>
              
              <OutputView 
                files={{ prd: prdContent, spec: specContent, task: taskContent }} 
                projectName={getProjectSlug()}
                onRefine={handleSmartRefine}
              />
           </div>
        )}

        {(pipelineState === 'not_feasible' || pipelineState === 'error') && (
            <div className="max-w-md mx-auto mt-12 p-8 rounded-2xl bg-red-900/10 border border-red-500/20 flex flex-col gap-4 text-center backdrop-blur-xl animate-[fadeIn_0.5s_ease-out]">
                {/* Error UI kept same */}
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
    </div>
  );
};

export default App;