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
    const apiKey = "sk_2qBbXsu31elnkK2rhJ2jC5zyuDHElBjt";

    const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek',
        messages: messages,
        stream: true,
        max_tokens: 8000, // Ensure enough tokens for long documents
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body available");
    
    const decoder = new TextDecoder();
    let buffer = '';
    let isThinking = false; // Legacy fallback for tag-based thinking
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep the last incomplete line

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        
        const dataStr = trimmed.slice(6);
        if (dataStr === '[DONE]') continue;

        try {
          const json = JSON.parse(dataStr);
          const choice = json.choices?.[0];
          
          if (!choice) continue;

          // 1. Handle Native Reasoning Field (if supported by provider)
          const reasoning = choice.delta?.reasoning_content;
          if (reasoning) {
            callbacks.onThinking(reasoning);
          }

          // 2. Handle Content Field (mixed with tags or pure content)
          const content = choice.delta?.content;
          if (content) {
            // Simple state machine for <think> tags in content
            // This handles cases where deepseek outputs tags inline
            let processChunk = content;

            if (processChunk.includes('<think>')) {
              isThinking = true;
              const parts = processChunk.split('<think>');
              if (parts[0]) callbacks.onChunk(parts[0]);
              processChunk = parts[1] || '';
            }

            if (processChunk.includes('</think>')) {
              isThinking = false;
              const parts = processChunk.split('</think>');
              if (parts[0]) callbacks.onThinking(parts[0]);
              if (parts[1]) callbacks.onChunk(parts[1]);
              continue;
            }

            if (isThinking) {
              callbacks.onThinking(processChunk);
            } else {
              callbacks.onChunk(processChunk);
            }
          }

        } catch (e) {
          console.warn("Failed to parse SSE JSON:", e);
        }
      }
    }
    
    callbacks.onComplete();

  } catch (err) {
    console.error("Stream Generation Error:", err);
    callbacks.onError(err instanceof Error ? err.message : "Unknown network error");
  }
};