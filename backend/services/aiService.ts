import { GoogleGenAI } from "@google/genai";

let genAI: GoogleGenAI | null = null;

function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

const SYSTEM_PROMPT = `You are a professional Nigerian news and content writer.
Rules:
1. Write clear, factual, neutral content.
2. No clickbait headlines.
3. No fake information - strictly verify logic or stick to general facts.
4. Short paragraphs for mobile reading (Opera News Hub users predominantly use mobile).
5. Opera News Hub compliant format: Engaging yet professional.
6. Include headline + subheadings + conclusion.

Task: Generate content based on user input.`;

export async function generateContent(type: 'opera' | 'ebook', params: any) {
  const ai = getGenAI();
  
  let promptText = "";
  let modelName = "gemini-3-flash-preview"; 

  if (type === 'opera') {
    promptText = `${SYSTEM_PROMPT}
    
    Topic: ${params.topic}
    Category: ${params.category}
    
    Please write a professional Nigerian-focused news article. Formatted in Markdown.`;
  } else if (type === 'ebook') {
    modelName = "gemini-3.1-pro-preview"; 
    promptText = `${SYSTEM_PROMPT} (Adjusted for E-Book context)
    
    Generate a professional eBook manuscript.
    Title: ${params.topic}
    Author: ${params.author}
    Publisher: ${params.publisher}
    Type: ${params.type === 'story' ? 'Fiction/Story' : 'Educational/Non-Fiction'}
    
    Structure:
    1. Cover Detail
    2. Copyright Page (Publisher: ${params.publisher})
    3. Detailed Table of Contents
    4. Comprehensive Chapters (at least 3 chapters)
    5. Conclusion`;
  }

  const response = await ai.models.generateContent({
    model: modelName,
    contents: promptText
  });

  return sanitizeOutput(response.text || "");
}

export async function generateImage(title: string, content: string) {
  const ai = getGenAI();
  const promptText = `A professional, high-quality editorial photograph for a news article titled: "${title}". 
  Context: ${content.slice(0, 300)}. 
  No text in the image. Professional journalism style.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: promptText,
      config: {
        imageConfig: { aspectRatio: "16:9" }
      }
    });

    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    return part ? `data:image/png;base64,${part.inlineData.data}` : null;
  } catch (err) {
    console.error("Image generation failed:", err);
    return null;
  }
}

function sanitizeOutput(text: string): string {
  if (!text) return "";
  
  // Remove markdown block backticks if AI wrapped the whole thing
  let cleaned = text.trim();
  if (cleaned.startsWith("```markdown")) {
    cleaned = cleaned.replace(/^```markdown\n?/, "").replace(/\n?```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\n?/, "").replace(/\n?```$/, "");
  }

  // Ensure double newlines for paragraphs
  cleaned = cleaned.replace(/\n(?!\n)/g, "\n\n");
  
  // Fix minor spacing issues
  cleaned = cleaned.replace(/\s{3,}/g, "  ");

  return cleaned;
}
