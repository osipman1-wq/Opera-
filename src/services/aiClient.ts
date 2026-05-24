const BACKEND_URL = (import.meta as any).env.VITE_BACKEND_URL || "";

const GENERATE_TIMEOUT_MS = 120_000;
const MAX_RETRIES = 2;

function extractErrorMessage(data: any, status: number): string {
  if (!data || typeof data !== 'object') return `Server error (${status})`;
  if (typeof data.message === 'string') return data.message;
  if (typeof data.error === 'string') return data.error;
  if (typeof data.error === 'object' && data.error !== null) {
    if (typeof data.error.message === 'string') return data.error.message;
    if (typeof data.error.code === 'string') return `Error ${data.error.code}: ${JSON.stringify(data.error)}`;
  }
  if (typeof data.detail === 'string') return data.detail;
  return JSON.stringify(data).slice(0, 200);
}

async function safePost(url: string, body: object, timeoutMs = GENERATE_TIMEOUT_MS): Promise<any> {
  const fullUrl = `${BACKEND_URL}${url}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(fullUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error("Request timed out. The AI is taking too long — please try again.");
    }
    throw new Error("Could not reach the server. Check your connection and try again.");
  }
  clearTimeout(timer);

  const contentType = (response.headers.get("content-type") || "").toLowerCase();

  if (!response.ok) {
    const text = await response.text();
    if (contentType.includes("application/json")) {
      try {
        const err = JSON.parse(text);
        throw new Error(extractErrorMessage(err, response.status));
      } catch (e: any) {
        if (e.message && !e.message.startsWith('JSON')) throw e;
        throw new Error(text.slice(0, 200) || `Server error (${response.status})`);
      }
    }
    if (response.status === 404) {
      throw new Error("API route not found. The server may still be starting — please try again in a moment.");
    }
    if (response.status === 503 || response.status === 502) {
      throw new Error("Server is temporarily unavailable. Please try again in a moment.");
    }
    throw new Error(`Server error (${response.status}). Please try again.`);
  }

  if (!contentType.includes("application/json")) {
    throw new Error("Unexpected response from server. Please try again.");
  }

  return response.json();
}

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
  label = "request"
): Promise<T> {
  let lastError: Error = new Error("Unknown error");
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const isRetryable =
        err.message?.includes("timed out") ||
        err.message?.includes("Could not reach") ||
        err.message?.includes("starting") ||
        err.message?.includes("temporarily unavailable") ||
        err.name === "TypeError";

      if (!isRetryable || attempt > retries) break;

      const delay = attempt * 2000;
      console.warn(`[aiClient] ${label} attempt ${attempt} failed, retrying in ${delay}ms:`, err.message);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
}

export const generateOperaArticle = async (topic: string, category: string): Promise<{
  content: string;
  imageUrl: string;
  headline?: string;
  image_generation_prompt?: string;
}> => {
  console.log(`[aiClient] Generating opera article: "${topic}" [${category}]`);
  const data = await withRetry(
    () => safePost("/api/generate-v2", { topic, category }),
    MAX_RETRIES,
    "opera article"
  );

  if (!data.article_body) {
    throw new Error("AI returned an empty article. Please try again with a different topic.");
  }

  return {
    content: data.article_body,
    imageUrl: data.imageUrl || "",
    headline: data.headline,
    image_generation_prompt: data.image_generation_prompt,
  };
};

export const generateEbook = async (
  topic: string,
  publisher: string,
  author: string,
  type: 'story' | 'educational'
): Promise<string> => {
  console.log(`[aiClient] Generating ebook: "${topic}" [${type}]`);
  const data = await withRetry(
    () => safePost("/api/generate", { type: 'ebook', params: { topic, publisher, author, type } }),
    MAX_RETRIES,
    "ebook"
  );

  if (!data.content) {
    throw new Error("AI returned empty content. Please try again.");
  }

  return data.content;
};
