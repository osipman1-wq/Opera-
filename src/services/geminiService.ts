import { GoogleGenAI } from "@google/genai";

// AI Studio Build explicitly requires Gemini calls from the frontend for stability.
const API_KEY = process.env.GEMINI_API_KEY || "";

const SYSTEM_PROMPT = `You are a professional Nigerian news and content writer specialized in Opera News Hub content and educational eBooks.
Rules:
1. Write clear, factual, neutral content.
2. No clickbait headlines.
3. No fake information - strictly verify logic or stick to general facts.
4. Short paragraphs for mobile reading.
5. Opera News Hub compliant format: Engaging yet professional.
6. Include headline + subheadings + conclusion.
7. Use Markdown for formatting.`;

let genAI: GoogleGenAI | null = null;

function getGenAI() {
  if (!genAI) {
    if (!API_KEY) {
      console.warn("GEMINI_API_KEY is missing. AI features may not work until set in Settings.");
    }
    genAI = new GoogleGenAI({ apiKey: API_KEY });
  }
  return genAI;
}

export async function generateOperaArticle(topic: string, category: string) {
  const ai = getGenAI();

  const prompt = `${SYSTEM_PROMPT}
  
  Topic: ${topic}
  Category: ${category}
  
  Please write a professional Nigerian-focused news article suitable for Opera News Hub. Focus on the "${category}" perspective.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });

    const text = response.text || "";
    if (!text) throw new Error("AI returned no content");

    return { content: sanitizeOutput(text), imageUrl: `https://picsum.photos/seed/${encodeURIComponent(topic)}/800/450` };
  } catch (error: any) {
    console.error("Gemini Frontend Error:", error);
    throw new Error(`AI Generation Failed: ${error.message || "Unknown error"}`);
  }
}

export async function generateEbook(topic: string, publisher: string, author: string, type: 'story' | 'educational') {
  const ai = getGenAI();

  const prompt = `${SYSTEM_PROMPT}
  
  Generate a professional eBook manuscript.
  Title: ${topic}
  Author: ${author}
  Publisher: ${publisher}
  Type: ${type === 'story' ? 'Fiction/Story' : 'Educational/Non-Fiction'}
  
  Structure:
  1. Cover Page Title
  2. Copyright Notice
  3. Detailed Table of Contents
  4. Comprehensive Chapters (at least 3 detailed chapters)
  5. Conclusion and References`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview", // Using pro for depth and length
      contents: prompt
    });

    const text = response.text || "";
    if (!text) throw new Error("AI returned no content");
    return sanitizeOutput(text);
  } catch (error: any) {
    console.error("Gemini Frontend Error (Ebook):", error);
    throw new Error(`Ebook Generation Failed: ${error.message || "Unknown error"}`);
  }
}

function sanitizeOutput(text: string): string {
  if (!text) return "";
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```markdown\n?/, "").replace(/\n?```$/, "");
  cleaned = cleaned.replace(/^```\n?/, "").replace(/\n?```$/, "");
  cleaned = cleaned.replace(/^(Here is the article you requested:?|Sure, here's the content:?|Title:)/i, "").trim();
  cleaned = cleaned.replace(/\n\s*\n/g, "\n\n"); 
  cleaned = cleaned.replace(/[ \t]{3,}/g, "  ");
  return cleaned;
}
