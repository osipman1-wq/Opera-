import { GoogleGenAI } from "@google/genai";
import { getLearningContext } from './webLearner.js';

let genAI: GoogleGenAI | null = null;

function getGenAI() {
  if (!genAI) {
    const rawApiKey = process.env.GEMINI_API_KEY;
    if (!rawApiKey || rawApiKey.trim() === '') {
      throw new Error("GEMINI_API_KEY environment variable is missing on the server.");
    }
    genAI = new GoogleGenAI({ apiKey: rawApiKey.trim() });
  }
  return genAI;
}

const OPERA_SYSTEM_PROMPT = `You are a professional Nigerian content writer and editor specialized in Opera News Hub. You write content that consistently gets APPROVED and MONETIZED.

OPERA NEWS HUB RULES YOU MUST FOLLOW:

CONTENT QUALITY:
- Write 700–1200 words for maximum performance (minimum 300 words)
- Use clear structure: Strong headline → Hook introduction → Organized body with subheadings → Conclusion
- Write in clean, readable English — no slang overload, no broken English, no SMS-style writing
- Short paragraphs for mobile readers
- Add real insight, not just information

APPROVED NICHES: News (fact-based), Education, Technology, Health (basic, no medical claims), Relationships (clean/respectful), Finance (basic advice)

CONTENT FORMAT:
- Use Markdown for formatting (## for subheadings, **bold** for emphasis)
- Include 2–4 subheadings in the body
- Write factual, honest headlines — no exaggeration
- Example of good headline: "5 Ways Students Can Earn Money Online in Nigeria"
- Example of bad headline: "You Won't Believe What Happened Next!!!"

STRICTLY FORBIDDEN (INSTANT REJECTION):
- Plagiarism or copied content
- Generic, robotic, or repetitive AI patterns
- Clickbait or misleading titles that don't match content
- Adult/sexual content of any kind
- Hate speech, tribal or religious attacks, political incitement
- Violence, gore, or sensational crime coverage
- "Get rich quick" schemes, fake investments, scam content
- Keyword stuffing or spam writing
- Content under 300 words
- Fake news, rumors, or unverified claims

WINNING STRATEGY:
- Focus on "How-to" articles, Top 5/Top 10 lists, educational breakdowns, trending safe topics
- Write human-like content with original perspective
- Every article must feel written by a knowledgeable person, not a generic AI`;

const EBOOK_SYSTEM_PROMPT = `You are a professional author and manuscript architect. You create structured, well-written eBook manuscripts with real depth and original voice.

MANUSCRIPT REQUIREMENTS:
- Write compelling, original content with genuine insight
- Use clear chapter structure with proper headings
- Include practical examples and actionable advice
- Write in clean, professional English
- Format using Markdown (# for chapters, ## for sections, **bold** for key terms)

STRUCTURE TO FOLLOW:
1. Cover Page (Title, Author, Publisher)
2. Copyright Notice
3. Table of Contents
4. Preface or Introduction
5. Main Chapters (minimum 3, each 400–800 words)
6. Conclusion
7. About the Author`;

export async function generateContent(type: 'opera' | 'ebook', params: any) {
  const ai = getGenAI();
  
  let promptText = "";
  let modelName = "gemini-2.0-flash";

  if (type === 'opera') {
    const learningContext = getLearningContext('opera');
    promptText = `${OPERA_SYSTEM_PROMPT}
${learningContext}
Now write a professional Opera News Hub article:
Topic: ${params.topic}
Category: ${params.category}
Focus on the "${params.category}" angle. Study the real examples above for natural tone and structure — then write something completely original in that same human voice.`;
  } else if (type === 'ebook') {
    modelName = "gemini-2.0-flash";
    const learningContext = getLearningContext('ebook');
    promptText = `${EBOOK_SYSTEM_PROMPT}
${learningContext}
Now write a complete eBook manuscript:
Title: ${params.topic}
Author: ${params.author}
Publisher: ${params.publisher}
Genre: ${params.type === 'story' ? 'Fiction / Story' : 'Educational / Non-Fiction'}

Study the real examples above for authentic narrative voice — then write something completely original with that same human depth.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: promptText
    });

    const text = response.text || "";
    if (!text) {
      throw new Error("AI returned empty response");
    }
    
    return sanitizeOutput(text);
  } catch (error: any) {
    console.error(`[aiService] ${type.toUpperCase()} Generation Failed:`, error);
    throw new Error(`AI Service Error (${type}): ${error.message || "Unknown error"}`);
  }
}

function sanitizeOutput(text: string): string {
  if (!text) return "";
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```markdown\n?/, "").replace(/\n?```$/, "");
  cleaned = cleaned.replace(/^```\n?/, "").replace(/\n?```$/, "");
  cleaned = cleaned.replace(/^(Here is the article you requested:?|Sure, here's the content:?|Here's the manuscript:?)/i, "").trim();
  cleaned = cleaned.replace(/\n\s*\n/g, "\n\n");
  cleaned = cleaned.replace(/[ \t]{3,}/g, "  ");
  return cleaned;
}
