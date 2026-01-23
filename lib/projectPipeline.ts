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

const SYSTEM_PROMPT = `You are a senior technical product manager and architect.
Your output must be strictly professional, technical, and formatted in Markdown.
Do not use conversational filler. Do not apologize. Do not explain your process.
`;

const FEASIBILITY_SYSTEM_PROMPT = `
You are the Gatekeeper of Aether.
Your goal is to ensure the project is strictly defined before generation starts.

────────────────────────
RULES FOR ASKING QUESTIONS
────────────────────────
1. MANDATORY: If the user input is under 20 words, YOU MUST ASK a question.
2. MISSING DETAILS: If the user hasn't specified core features, ASK about them.
3. AMBIGUITY: If the target (e.g., Mobile App) conflicts with the idea (e.g., Chrome Extension), ASK for clarification.
4. LIMIT: Ask ONLY ONE question at a time.
5. EXCEPTION: Only return FEASIBLE if the requirements are crystal clear and detailed.

────────────────────────
RESPONSE FORMAT (STRICT)
────────────────────────
You must output ONLY raw JSON. Do not wrap in markdown blocks. Do not use <think> tags in the final output.

If a question is needed:
QUESTION: { "type": "A", "text": "Specific question text?", "options": ["Option A", "Option B", "Option C"] }

If feasible (detailed enough):
FEASIBLE

If impossible/illegal:
NOT_FEASIBLE: Reason
`;

export const runFeasibilityCheck = async (
  context: ProjectContext,
  onResult: (feasible: boolean, reason?: string) => void,
  onQuestion: (question: QuestionData) => void
) => {
  let fullResponse = "";
  
  // Combine original idea with any history (Q&A)
  const effectiveIdea = context.history 
    ? `${context.idea}\n\n--- Context ---\n${context.history}` 
    : context.idea;

  const prompt = `
    Analyze this project.
    Idea: "${effectiveIdea}"
    Target: ${context.target}
    Type: ${context.type}
    
    Is this detailed enough to build a SPECIFIC production-grade app?
    If vague, ask a question.
  `;

  await streamGeneration(
    [
      { role: "system", content: FEASIBILITY_SYSTEM_PROMPT },
      { role: "user", content: prompt }
    ],
    {
      onChunk: (text) => { fullResponse += text; },
      onThinking: () => {}, // Feasibility check thinking is internal, we don't display it to avoid clutter
      onError: () => onResult(false, "API Error during analysis"),
      onComplete: () => {
        const lowerRes = fullResponse.trim();
        
        // Cleanup potential markdown wrapping (```json ... ```) or artifacts
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
                // Fallback: If we can't parse the question, we proceed to generation to avoid getting stuck.
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
        // 3. Default to Feasible
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
    
    Tone: Strict, Professional.
    Format: Markdown.
  `;

  await streamGeneration(
    [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: prompt }],
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
  const prompt = `
    Based on the PRD, generate a Technical Specification (Spec.md).
    
    PRD:
    ${prdContent.substring(0, 2000)}
    
    Target: ${context.target}
    
    Structure:
    1. Tech Stack (React, Tailwind, Lucide, LocalStorage)
    2. Component Architecture (Tree)
    3. Data Models (TypeScript Interfaces)
    4. API Strategy
    5. Folder Structure
    
    Format: Markdown.
  `;

  await streamGeneration(
    [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: prompt }],
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
  const prompt = `
    Create an Implementation Guide (Task.md).
    
    PRD Summary: ${prdContent.substring(0, 500)}
    Spec Summary: ${specContent.substring(0, 500)}
    
    Target: ${context.target}
    
    Structure:
    - Phase 1: Setup
    - Phase 2: Components
    - Phase 3: Logic
    - Phase 4: Polish
    
    Format: Markdown checklist.
  `;

  await streamGeneration(
    [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: prompt }],
    { onChunk, onThinking, onError: (e) => onChunk(`\n\nError: ${e}`), onComplete }
  );
};