import { GoogleGenAI } from "@google/genai";

let genAI: GoogleGenAI | null = null;

function getGenAI() {
  if (!genAI) {
    const rawApiKey = process.env.GEMINI_API_KEY;
    console.log(`[aiService] Checking GEMINI_API_KEY environment variable... (Present: ${!!rawApiKey})`);
    
    if (!rawApiKey || rawApiKey.trim() === '') {
      console.error("[aiService] GEMINI_API_KEY is unset or empty.");
      throw new Error("GEMINI_API_KEY environment variable is missing on the server. Please ensure it is set in the environment or .env file.");
    }

    const apiKey = rawApiKey.trim();
    
    // Safety check: Log the first and last 2 characters to verify presence and basic format
    const maskedKey = apiKey.length > 5 
      ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` 
      : "***";
    console.log(`[aiService] Initializing GoogleGenAI with masked key: ${maskedKey}`);

    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

const SYSTEM_PROMPT = `You are a professional Nigerian news and content writer specialized in Opera News Hub content and educational eBooks.
Rules:
1. Write clear, factual, neutral content.
2. No clickbait headlines.
3. No fake information - strictly verify logic or stick to general facts.
4. Short paragraphs for mobile reading (Opera News Hub users predominantly use mobile).
5. Opera News Hub compliant format: Engaging yet professional.
6. Include headline + subheadings + conclusion.
7. Use Markdown for formatting.

Task: Generate high-quality, sanitized content based on user input.`;

export async function generateContent(type: 'opera' | 'ebook', params: any) {
  const ai = getGenAI();
  
  let promptText = "";
  let modelName = "gemini-3-flash-preview"; // Basic text tasks

  if (type === 'opera') {
    promptText = `${SYSTEM_PROMPT}
    
    Topic: ${params.topic}
    Category: ${params.category}
    
    Please write a professional Nigerian-focused news article suitable for Opera News Hub. Focus on the "${params.category}" perspective.`;
  } else if (type === 'ebook') {
    modelName = "gemini-3.1-pro-preview"; // Complex text tasks
    promptText = `${SYSTEM_PROMPT}
    
    Generate a professional eBook manuscript.
    Title: ${params.topic}
    Author: ${params.author}
    Publisher: ${params.publisher}
    Type: ${params.type === 'story' ? 'Fiction/Story' : 'Educational/Non-Fiction'}
    
    Structure:
    1. Cover Page Title
    2. Copyright Notice
    3. Detailed Table of Contents
    4. Comprehensive Chapters (at least 3 detailed chapters)
    5. Conclusion and References`;
  }

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: promptText
    });

    const text = response.text || "";
    if (!text) {
      console.error(`[aiService] ${type} generation returned empty text.`);
      throw new Error("AI returned empty response");
    }
    
    return sanitizeOutput(text);
  } catch (error: any) {
    console.error(`[aiService] ${type.toUpperCase()} Generation Failed:`, error);
    // Preserving the original message but making it more descriptive
    throw new Error(`AI Service Error (${type}): ${error.message || "Unknown error"}`);
  }
}

export async function generateImage(title: string, content: string) {
  const ai = getGenAI();
  const promptText = `Professional, high-quality editorial photograph for a news article titled: "${title}". 
  Context: ${content.slice(0, 300)}. 
  Style: Photojournalism, cinematic lighting, realistic. No text overlay.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: promptText,
      config: {
        imageConfig: { aspectRatio: "16:9" }
      }
    });

    // The image part is in response.candidates[0].content.parts
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    return part ? `data:image/png;base64,${part.inlineData.data}` : null;
  } catch (err) {
    console.error("Image generation failed:", err);
    return null;
  }
}

function sanitizeOutput(text: string): string {
  if (!text) return "";
  
  let cleaned = text.trim();
  
  // Remove markdown block wraps if present
  cleaned = cleaned.replace(/^```markdown\n?/, "").replace(/\n?```$/, "");
  cleaned = cleaned.replace(/^```\n?/, "").replace(/\n?```$/, "");

  // Remove potential AI "meta" talk at beginning
  cleaned = cleaned.replace(/^(Here is the article you requested:?|Sure, here's the content:?|Title:)/i, "").trim();

  // Normalize newlines but preserve lists and headers
  // We want double newlines for paragraphs for better rendering in many MD viewers
  // But we don't want to break existing double+ newlines
  cleaned = cleaned.replace(/\n\s*\n/g, "\n\n"); 
  
  // Optional: check for excessive whitespace
  cleaned = cleaned.replace(/[ \t]{3,}/g, "  ");

  return cleaned;
}
