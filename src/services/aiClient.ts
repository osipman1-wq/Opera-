const BACKEND_URL = (import.meta as any).env.VITE_BACKEND_URL || "";

console.log(`[aiClient] Backend URL configured as: "${BACKEND_URL}" (empty means relative to current origin)`);
console.log(`[aiClient] Current Origin: ${typeof window !== 'undefined' ? window.location.origin : 'N/A'}`);

async function safePost(url: string, body: object): Promise<any> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(body),
  });

  const contentType = (response.headers.get("content-type") || "").toLowerCase();

  if (!response.ok) {
    const text = await response.text();
    if (contentType.includes("application/json")) {
      const err = JSON.parse(text);
      throw new Error(err.message || err.error || `Server error (${response.status})`);
    }
    throw new Error(`Server error (${response.status}). Please try again in a moment.`);
  }

  if (!contentType.includes("application/json")) {
    throw new Error("Unexpected response from server. Please try again.");
  }

  return response.json();
}

export const generateOperaArticle = async (topic: string, category: string) => {
  try {
    console.log(`[aiClient] Generating opera article: "${topic}" [${category}]`);
    const data = await safePost("/api/generate", {
      type: 'opera',
      params: { topic, category },
    });
    return data;
  } catch (error: any) {
    if (error.name === 'TypeError') {
      throw new Error("Could not reach the server. Please wait a moment and try again.");
    }
    console.error("[aiClient] Opera error:", error.message);
    throw error;
  }
};

export const generateEbook = async (
  topic: string,
  publisher: string,
  author: string,
  type: 'story' | 'educational'
) => {
  try {
    console.log(`[aiClient] Generating ebook: "${topic}" [${type}]`);
    const data = await safePost("/api/generate", {
      type: 'ebook',
      params: { topic, publisher, author, type },
    });
    return data.content;
  } catch (error: any) {
    if (error.name === 'TypeError') {
      throw new Error("Could not reach the server. Please wait a moment and try again.");
    }
    console.error("[aiClient] Ebook error:", error.message);
    throw error;
  }
};
