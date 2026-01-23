// ────────────────────────────────────────────────────────
// POLLINATIONS API CONFIGURATION
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

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // Using text.pollinations.ai with deepseek model
    // This endpoint streams raw text which we parse for <think> tags
    const response = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        messages: messages,
        model: 'deepseek', 
        stream: true,      
        jsonMode: false,
        seed: Math.floor(Math.random() * 10000)
      }),
    });

    if (!response.ok) {
      throw new Error(`Pollinations API Error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("Response body is empty");
    
    const decoder = new TextDecoder();
    let isThinking = false;
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      
      // Basic state machine to separate <think> content from real content
      let processChunk = chunk;
      
      if (processChunk.includes('<think>')) {
        isThinking = true;
        const parts = processChunk.split('<think>');
        if (parts[0]) callbacks.onChunk(parts[0]); // Content before tag
        processChunk = parts[1] || ''; // Continue processing after tag
      }

      if (processChunk.includes('</think>')) {
        isThinking = false;
        const parts = processChunk.split('</think>');
        if (parts[0]) callbacks.onThinking(parts[0]); // Content inside tag
        if (parts[1]) callbacks.onChunk(parts[1]);    // Content after tag
        continue;
      }

      if (isThinking) {
        callbacks.onThinking(processChunk);
      } else {
        callbacks.onChunk(processChunk);
      }
    }
    
    callbacks.onComplete();

  } catch (err) {
    callbacks.onError(err instanceof Error ? err.message : "Unknown network error");
  }
};