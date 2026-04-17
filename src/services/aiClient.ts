
const BACKEND_URL = (import.meta as any).env.VITE_BACKEND_URL || "";

console.log(`[aiClient] Backend URL configured as: "${BACKEND_URL}" (empty means relative to current origin)`);
console.log(`[aiClient] Current Origin: ${typeof window !== 'undefined' ? window.location.origin : 'N/A'}`);

/**
 * Calls the backend API to generate content via Gemini.
 * Ensuring no direct AI calls or keys exist in the frontend.
 */
export const generateOperaArticle = async (topic: string, category: string) => {
  try {
    const url = "/api/generate";
    console.log(`[aiClient] POST ${url}`, { topic, category });
    
    const response = await fetch(url, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        type: 'opera',
        params: { topic, category }
      })
    });

    if (!response.ok) {
      const text = await response.text();
      const status = response.status;
      const contentType = (response.headers.get("content-type") || "unknown").toLowerCase();
      
      console.warn(`[aiClient] Request failed with status ${status} (${contentType})`);
      
      let errorMsg = `Server error (${status})`;
      try {
        if (contentType.includes("application/json")) {
          const err = JSON.parse(text);
          errorMsg = err.message || err.error || errorMsg;
          if (err.detail) errorMsg += `: ${err.detail}`;
        } else {
          const titleMatch = text.match(/<title>(.*?)<\/title>/i);
          const title = titleMatch ? titleMatch[1] : "Error Response";
          errorMsg = `API Error (${status}): ${title}. Body prefix: ${text.slice(0, 50)}`;
        }
      } catch (e) {
        errorMsg = `Request failed (${status}): ${text.slice(0, 30)}...`;
      }
      throw new Error(errorMsg);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      console.error("[aiClient] Network Error: Failed to fetch. Possible causes: Server is starting, CORS issue, or disconnected.");
      throw new Error("Network Error: Could not reach the server. Please wait a moment and try again.");
    }
    console.error("API Client Error:", error);
    throw error;
  }
};

export const generateEbook = async (topic: string, publisher: string, author: string, type: 'story' | 'educational') => {
  try {
    const url = "/api/generate";
    console.log(`[aiClient] POST ${url}`, { topic, publisher, author, type });
    
    const response = await fetch(url, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        type: 'ebook',
        params: { topic, publisher, author, type }
      })
    });

    if (!response.ok) {
      const text = await response.text();
      const status = response.status;
      const contentType = (response.headers.get("content-type") || "unknown").toLowerCase();
      
      console.warn(`[aiClient] Request failed with status ${status} (${contentType})`);
      
      let errorMsg = `Server error (${status})`;
      try {
        if (contentType.includes("application/json")) {
          const err = JSON.parse(text);
          errorMsg = err.message || err.error || errorMsg;
          if (err.detail) errorMsg += `: ${err.detail}`;
        } else {
          const titleMatch = text.match(/<title>(.*?)<\/title>/i);
          const title = titleMatch ? titleMatch[1] : "Error Response";
          errorMsg = `API Error (${status}): ${title}. Body prefix: ${text.slice(0, 50)}`;
        }
      } catch (e) {
        errorMsg = `Request failed (${status}): ${text.slice(0, 30)}...`;
      }
      throw new Error(errorMsg);
    }

    const data = await response.json();
    return data.content;
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      console.error("[aiClient] Network Error: Failed to fetch. Possible causes: Server down or CORS.");
      throw new Error("Network Error: Could not reach the server. Check your connection.");
    }
    console.error("API Client Error:", error);
    throw error;
  }
};
