import { streamGeneration } from './pollinations';
import { QuestionData } from '../components/QuestionDisplay';

export type PipelineState = 
  | 'idle' 
  | 'analyzing' 
  | 'question_break'
  | 'generating_prd' 
  | 'generating_spec' 
  | 'generating_task' 
  | 'complete' 
  | 'error' 
  | 'not_feasible';

export interface ProjectContext {
  idea: string;
  target: string;
  type: string;
  history?: string; // For appending Q&A context
}

// ────────────────────────────────────────────────────────
// SYSTEM PROMPTS & PROFILES
// ────────────────────────────────────────────────────────

const MASTER_RULE = `
🧠 MASTER RULE (APPLIES TO ALL)
You are generating structured development artifacts for a beginner.
Do not teach. Do not explain. Do not ask technical questions.
Assume safe defaults unless explicitly blocked by feasibility.

The experience should feel calm, confident, and human.
Never sound unsure.
Never sound like an AI asking for help.

Output must be:
- deterministic
- implementation-oriented
- cleanly structured
- free of hype, fluff, or AI commentary
`;

const TARGET_PROFILES: Record<string, string> = {
  'Google AI Studio': `
1️⃣ Google AI Studio — Instruction Profile
Target environment: Google AI Studio
Optimize outputs for: single-prompt workflows, long system prompts, structured markdown files.
Assume the developer will: paste files manually, rely on clear sectioning, not use external tooling.
Avoid: multi-step CLI workflows, heavy automation assumptions, external build scripts.
Write with clarity and explicit structure. Favor readability over cleverness.
`,
  'Replit': `
2️⃣ Replit — Instruction Profile
Target environment: Replit
Optimize outputs for: instant runnable projects, minimal setup, beginner-friendly defaults.
Assume: everything lives in one workspace, files are edited directly in-browser, quick iteration over perfect architecture.
Avoid: complex monorepos, advanced build pipelines, assumptions about local tooling.
Favor simplicity and fast boot.
`,
  'Lovable': `
3️⃣ Lovable — Instruction Profile
Target environment: Lovable
Optimize outputs for: conversational build steps, UI-first thinking, progressive enhancement.
Assume: the AI drives most generation, the user edits visually, structure matters more than optimization.
Avoid: low-level configuration, manual dependency management, excessive file splitting.
Favor clarity, flow, and visual logic.
`,
  'Cursor': `
4️⃣ Cursor — Instruction Profile
Target environment: Cursor
Optimize outputs for: incremental code generation, refactor-friendly structure, developer-assisted workflows.
Assume: the developer will iterate file-by-file, AI suggestions will be applied selectively.
Avoid: monolithic files, magical abstractions, hidden logic.
Favor explicit code and clean boundaries.
`,
  'Bolt': `
5️⃣ Bolt — Instruction Profile
Target environment: Bolt
Optimize outputs for: opinionated scaffolding, fast project initialization, guided completion.
Assume: the tool will fill gaps automatically, structure must be obvious at a glance.
Avoid: vague placeholders, ambiguous responsibilities, excessive customization options.
Favor decisive structure and defaults.
`
};

const TYPE_PROFILES: Record<string, string> = {
  'Website': `
🌐 Website — Instruction Profile
Project type: Website
Focus on: responsive layout, clear navigation, accessibility, content structure.
Assume: no offline support, no installation flow, standard browser usage.
Avoid: service workers, background sync, app-shell assumptions.
Prioritize clarity and simplicity.
`,
  'PWA': `
📲 PWA — Instruction Profile
Project type: PWA
Focus on: installability, offline resilience, app-shell architecture.
Assume: mobile-first usage, intermittent connectivity.
Include: service worker strategy, caching logic, install prompts.
Avoid: desktop-only assumptions, unnecessary complexity.
Balance performance and reliability.
`,
  'Mobile App': `
📱 Mobile App — Instruction Profile
Project type: Mobile App
Focus on: touch-first interaction, small-screen UX, state persistence.
Assume: mobile constraints, gesture-based navigation.
Avoid: desktop-centric layouts, hover-based interactions, large dense screens.
Prioritize usability and flow.
`
};

const constructSystemPrompt = (target: string, type: string) => {
  const targetProfile = TARGET_PROFILES[target] || TARGET_PROFILES['Google AI Studio'];
  const typeProfile = TYPE_PROFILES[type] || TYPE_PROFILES['Website'];

  return `${MASTER_RULE}\n\n${targetProfile}\n\n${typeProfile}`;
};

// ────────────────────────────────────────────────────────
// NEW ARCHITECT PROMPT (Replaces Old Feasibility)
// ────────────────────────────────────────────────────────

const ARCHITECT_SYSTEM_PROMPT = `
You are the Intelligent Architect of Lined.

--- MISSION ---
Evaluate the user's idea and decide if we can start building immediately or if a critical decision is missing.
We are NOT a chat app. We want to start generation as fast as possible.

--- RULES FOR DECISION MAKING ---
1. SILENT EVALUATION:
   - Check the User Idea against the Target and Type.
   - If the idea is feasible as-is: ask ZERO questions. Proceed automatically.
   - If the idea is vague but a safe default exists: Choose the default. Proceed automatically.

2. ASKING QUESTIONS (Use Sparingly):
   - Only ask if the idea is completely empty (e.g. "make a website") or implies two mutually exclusive paths.
   - Ask a single, simple question.
   - Present options as simple buttons.
   - Do NOT ask technical questions (no stacks, no databases).
   - NEVER ask more than 2 questions total in the conversation history. If 2 have been asked, force a decision and proceed.

3. TONE:
   - Calm, confident, and decisive.

--- RESPONSE FORMAT (STRICT) ---
You must output ONLY one of the following formats. Do not use Markdown.

Case 1: Ready to Build (Feasible / Defaults Assumed)
FEASIBLE

Case 2: Critical Question Required
QUESTION: { "type": "A", "text": "The Question Text?", "options": ["Option 1", "Option 2"] }

Case 3: Impossible / Illegal
NOT_FEASIBLE: Reason
`;

// ────────────────────────────────────────────────────────
// PIPELINE FUNCTIONS
// ────────────────────────────────────────────────────────

export const runFeasibilityCheck = async (
  context: ProjectContext,
  onResult: (feasible: boolean, reason?: string) => void,
  onQuestion: (question: QuestionData) => void
) => {
  let fullResponse = "";
  let hasError = false;
  
  const effectiveIdea = context.history 
    ? `${context.idea}\n\n--- Conversation History ---\n${context.history}` 
    : context.idea;

  const prompt = `
    Analyze this project.
    Idea: "${effectiveIdea}"
    Target: ${context.target}
    Type: ${context.type}
    
    Decision:
  `;

  await streamGeneration(
    [
      { role: "system", content: ARCHITECT_SYSTEM_PROMPT },
      { role: "user", content: prompt }
    ],
    {
      onChunk: (text) => { fullResponse += text; },
      onThinking: () => {}, 
      onError: (err) => {
        hasError = true;
        onResult(false, `API Error: ${err}`);
      },
      onComplete: () => {
        if (hasError) return;

        const lowerRes = fullResponse.trim();
        const cleanStr = (str: string) => str.replace(/```json/g, '').replace(/```/g, '').trim();

        // 1. Check for Question
        if (fullResponse.includes("QUESTION:")) {
            try {
                const rawSplit = fullResponse.split("QUESTION:");
                if (rawSplit.length > 1) {
                    const jsonStr = cleanStr(rawSplit[1]);
                    const questionObj = JSON.parse(jsonStr);
                    if (questionObj && questionObj.text && Array.isArray(questionObj.options)) {
                        onQuestion(questionObj as QuestionData);
                        return;
                    }
                }
            } catch (e) {
                console.error("Failed to parse question JSON", e);
                // If parsing fails, default to feasible to avoid blocking user
                onResult(true);
                return;
            }
        }

        // 2. Check for Not Feasible
        if (lowerRes.toLowerCase().includes("not_feasible")) {
          const parts = fullResponse.split(/NOT_FEASIBLE:?/i);
          const reason = parts[1] || "Project criteria not met.";
          onResult(false, reason.trim());
        } 
        
        // 3. Default to Feasible (covers "FEASIBLE" and any unexpected output that isn't a blocker)
        else {
          onResult(true);
        }
      }
    }
  );
};

export const generatePRD = async (
  context: ProjectContext,
  onChunk: (text: string) => void,
  onThinking: (text: string) => void,
  onComplete: () => void
) => {
  const effectiveIdea = context.history 
    ? `${context.idea}\n\n--- User Decisions & Context ---\n${context.history}` 
    : context.idea;

  const systemPrompt = constructSystemPrompt(context.target, context.type);

  const prompt = `
    Generate a Product Requirement Document (PRD.md).
    
    Project Idea: ${effectiveIdea}
    Target Env: ${context.target}
    App Type: ${context.type}
    
    Structure:
    1. Executive Summary
    2. Core Features (MVP)
    3. User Flow
    4. Non-Functional Requirements
    
    Format: Markdown.
  `;

  await streamGeneration(
    [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }],
    { onChunk, onThinking, onError: (e) => onChunk(`\n\nError: ${e}`), onComplete }
  );
};

export const generateSpec = async (
  context: ProjectContext,
  prdContent: string,
  onChunk: (text: string) => void,
  onThinking: (text: string) => void,
  onComplete: () => void
) => {
  const systemPrompt = constructSystemPrompt(context.target, context.type);
  const prompt = `
    Based on the PRD, generate a Technical Specification (Spec.md).
    
    PRD:
    ${prdContent.substring(0, 3000)}
    
    Structure:
    1. Tech Stack (Simple, beginner friendly)
    2. Component Architecture (Tree)
    3. Data Models (TypeScript Interfaces)
    4. API Strategy
    5. Folder Structure
    
    Format: Markdown.
  `;

  await streamGeneration(
    [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }],
    { onChunk, onThinking, onError: (e) => onChunk(`\n\nError: ${e}`), onComplete }
  );
};

export const generateTask = async (
  context: ProjectContext,
  prdContent: string,
  specContent: string,
  onChunk: (text: string) => void,
  onThinking: (text: string) => void,
  onComplete: () => void
) => {
  const systemPrompt = constructSystemPrompt(context.target, context.type);
  const prompt = `
    Create an Implementation Guide (Task.md).
    
    PRD Summary: ${prdContent.substring(0, 500)}
    Spec Summary: ${specContent.substring(0, 500)}
    
    Structure:
    - Phase 1: Setup
    - Phase 2: Components
    - Phase 3: Logic
    - Phase 4: Polish
    
    Format: Markdown checklist.
  `;

  await streamGeneration(
    [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }],
    { onChunk, onThinking, onError: (e) => onChunk(`\n\nError: ${e}`), onComplete }
  );
};

export const consultProject = async (
  files: { prd: string; spec: string; task: string },
  userQuestion: string,
  onChunk: (text: string) => void,
  onComplete: () => void
) => {
  const prompt = `
    You are a helpful expert developer guiding a beginner.
    
    CONTEXT FILES:
    --- PRD ---
    ${files.prd.substring(0, 2000)}
    --- SPEC ---
    ${files.spec.substring(0, 2000)}
    --- TASKS ---
    ${files.task.substring(0, 2000)}

    USER QUESTION: "${userQuestion}"

    Answer clearly, concisely, and specifically based on the files provided. 
    If they ask "Where do I start?", refer to Phase 1 of the Tasks.
    Do not be vague. Give actual code snippets if helpful.
  `;

  await streamGeneration(
    [{ role: "system", content: "You are a helpful mentor for a beginner developer." }, { role: "user", content: prompt }],
    { 
        onChunk, 
        onThinking: () => {}, // Don't show thinking for consultation
        onError: (e) => onChunk(`Error: ${e}`), 
        onComplete 
    }
  );
};