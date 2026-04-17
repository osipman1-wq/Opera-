
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export const generateOperaArticle = async (topic: string, category: string) => {
  const response = await fetch(`${API_BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: 'opera',
      params: { topic, category }
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Failed to generate article");
  }

  const data = await response.json();
  return data; // Returns { content, imageUrl }
};

export const generateEbook = async (topic: string, publisher: string, author: string, type: 'story' | 'educational') => {
  const response = await fetch(`${API_BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: 'ebook',
      params: { topic, publisher, author, type }
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Failed to generate eBook");
  }

  const data = await response.json();
  return data.content;
};
