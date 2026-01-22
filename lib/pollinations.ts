import { GoogleGenAI } from "@google/genai";

// ────────────────────────────────────────────────────────
// API CONFIGURATION
// ────────────────────────────────────────────────────────

export interface StreamCallbacks {
  onChunk: (content: string) => void;
  onThinking: (content: string) => void;
  onError: (error: string) => void;
  onComplete: () => void;
}

export const streamGeneration = async (
  messages: Array<{ role: string; content: string }>,
  callbacks: StreamCallbacks
) => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("process.env.API_KEY is not set.");
    }

    const ai = new GoogleGenAI({ apiKey });

    // Extract system instruction and user prompt from messages
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessage = messages.find(m => m.role === 'user');

    if (!userMessage) {
        throw new Error("No user message found.");
    }

    const prompt = userMessage.content;
    const systemInstruction = systemMessage?.content;

    const responseStream = await ai.models.generateContentStream({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
            systemInstruction: systemInstruction,
            // thinkingConfig: { thinkingBudget: 1024 } // Optional: Enable if using a model that supports it explicitly and you want to consume thoughts
        }
    });

    for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
            callbacks.onChunk(text);
        }
    }
    callbacks.onComplete();

  } catch (err) {
    callbacks.onError(err instanceof Error ? err.message : "Unknown error during generation");
  }
};
