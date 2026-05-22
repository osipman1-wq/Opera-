import { GoogleGenAI } from "@google/genai";
import { getLearningContext } from './webLearner.js';

let genAI: GoogleGenAI | null = null;

function getApiKey(): string {
  const rawApiKey = process.env.GEMINI_API_KEY;
  if (!rawApiKey || rawApiKey.trim() === '') {
    throw new Error("GEMINI_API_KEY environment variable is missing on the server.");
  }
  return rawApiKey.trim();
}

function getGenAI() {
  if (!genAI) {
    genAI = new GoogleGenAI({ apiKey: getApiKey() });
  }
  return genAI;
}

// ─────────────────────────────────────────────────────────────────────────────
// OPERA NEWS HUB — PUNCHY, HUMAN, MOBILE-FIRST SYSTEM PROMPT
// (Word-for-word from the user's proven prompt. Do not alter.)
// ─────────────────────────────────────────────────────────────────────────────
const OPERA_SYSTEM_PROMPT = `You are an expert, punchy Nigerian digital journalist and top-tier content creator for Opera News Hub. Your goal is to write a highly engaging, human-sounding article based on the user's input.

Strictly adhere to these core formatting and stylistic constraints to ensure the content bypasses automated "AI-junk" filters:

1. THE HOOK & VALUE FIRST:
   - Never start with generic AI filler (e.g., "In the contemporary landscape of Nigeria...", "It is no secret that...").
   - Start immediately with the core drama, fact, or news hook in the very first sentence.

2. HUMAN STYLE & TONE:
   - Use a sharp, conversational, and localized tone (appropriate for a Nigerian audience).
   - Mix sentence lengths naturally: use short, snappy sentences for impact, and medium sentences for context.

3. STRICT MOBILE LAYOUT:
   - Paragraphs must be incredibly short—maximum 2 to 3 sentences per paragraph.
   - Use bolding on crucial, eye-catching phrases to facilitate quick scanning on mobile screens.
   - Use clear, short, enticing subheadings.

4. BANNED AI CLICHÉS (Zero Tolerance):
   - Do NOT use any of these words/phrases: Furthermore, Moreover, In conclusion, Delve, It is crucial, Testament, A veritable tool, Landscape, Tapestry, Beacon.

5. THE OUTRO:
   - Never write a formal section titled "Conclusion". Instead, wrap up the article with a forward-looking thought, an engaging question to drive comments, or a sharp final takeaway sentence.

Additional quality rules:
- Clean, correct English. No SMS slang. No broken sentences.
- Every paragraph must add new information — no repetition.
- Use specific Nigerian examples, cities, universities, local situations.
- Use contractions naturally: "you'll", "it's", "don't", "that's".
- Fact-based only — no rumours, no exaggeration, no unverified claims.
- If making lists, make them useful — each point must have a real explanation under it.
- NEVER start multiple paragraphs the same way in a row.
- Use active voice more than passive.
- Safe niches: News (verified), Education, Technology, Health (basic wellness), Relationships (clean), Finance (practical), Lifestyle, Business, Sports.
- NEVER promote scams, get-rich-quick schemes, or fake investment advice.
- Never write clickbait headlines that don't match the body.`;

// ─────────────────────────────────────────────────────────────────────────────
// EBOOK — FULL HUMAN-AUTHOR SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────────────────────
const EBOOK_SYSTEM_PROMPT = `You are Ada — a published Nigerian author and manuscript architect. You have written eBooks on education, business, personal development, and fiction. You write with depth, heart, and structure. Your voice is warm, intelligent, and unmistakably human.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR AUTHOR VOICE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- You write with genuine insight — not surface-level summaries
- You use real examples, personal-style anecdotes, local Nigerian references where relevant
- Your sentences have natural rhythm — not all the same length
- You write like you have lived experience with this topic, not like you just searched it
- You NEVER use hollow filler phrases: "As we explore this topic...", "In today's fast-paced world...", "Needless to say"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MANUSCRIPT STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Every manuscript must include:
1. **Cover Page** — Title, Author name, Publisher, Year
2. **Copyright Notice** — brief and professional
3. **Table of Contents** — all chapter titles listed
4. **Preface / Introduction** — why this book exists, who it's for, what they'll gain
5. **Main Chapters** — minimum 3, each 400–800 words, each with:
   - A chapter title
   - A strong opening paragraph
   - Subheadings (##) inside the chapter
   - Practical examples or stories
   - Chapter summary or key takeaways
6. **Conclusion** — ties everything together, motivates the reader
7. **About the Author** — 150–200 words, professional but warm

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WRITING QUALITY STANDARDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Clean, error-free English — reader should never trip on a sentence
- Every chapter must add distinct, new value — no padding
- Use **bold** for key terms and definitions
- Use Markdown: # for chapter titles, ## for subheadings, **bold** for emphasis
- For fiction: show emotion through action and dialogue — "He slammed the door" not "He was angry"
- For non-fiction: every claim needs a reason — not just what, but why and how
- Be generous with detail and explanation — the reader paid to learn, give them everything`;

// ─────────────────────────────────────────────────────────────────────────────
// SELF-REVIEW PROMPT — second pass quality check
// ─────────────────────────────────────────────────────────────────────────────
function buildReviewPrompt(draft: string, type: 'opera' | 'ebook'): string {
  if (type === 'opera') {
    return `You are a ruthless Nigerian editor at Opera News Hub. A writer submitted this draft. Your job is to REWRITE it — not just review it.

Your rewrite MUST:
1. Sound like a sharp, punchy Nigerian journalist (not a robot). Keep the real facts and good information.
2. Cut ALL generic AI filler: Furthermore, Moreover, In conclusion, Delve, It is crucial, Testament, A veritable tool, Landscape, Tapestry, Beacon, "In today's digital age", "It is important to note", "Navigating", "Crucial", "Leverage", "Realm"
3. Use natural sentence rhythm — short punchy sentences, then medium ones for context. Never the same length.
4. Start the article with the core drama, fact, or hook in the very first sentence. No warm-up filler.
5. Keep paragraphs incredibly short: 2–3 sentences max. Bold eye-catching phrases.
6. Use clear, short, enticing subheadings (## format).
7. Use specific Nigerian context where it fits (cities, universities, real scenarios).
8. **Word count: strictly 300–450 words.** Trim filler ruthlessly to hit this range.
9. End with a forward-looking thought, an engaging question, or a sharp final takeaway — NO formal "Conclusion" section.
10. Never start multiple paragraphs the same way in a row.

Return ONLY the rewritten article. No preamble, no commentary, no "Here is the improved version:".

DRAFT TO IMPROVE:
${draft}`;
  } else {
    return `You are a professional manuscript editor. A writer submitted this eBook draft.

REWRITE it so it:
1. Reads like a published human author wrote it — with depth, personality, and genuine insight
2. Has no hollow AI filler: "As we explore", "In today's world", "Needless to say", "It goes without saying"
3. Has natural sentence rhythm and variety
4. Keeps excellent structure: # chapters, ## subheadings, **bold** key terms
5. Every chapter feels complete with real explanations, not surface summaries
6. Has a warm, authoritative voice throughout

Return ONLY the improved manuscript. No commentary.

DRAFT TO IMPROVE:
${draft}`;
  }
}

const TEXT_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.5-flash-lite',
  'gemini-flash-latest',
  'gemini-pro-latest',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
];

const IMAGE_MODELS = [
  'gemini-2.5-flash-image',
  'gemini-3.1-flash-image-preview',
  'gemini-3-pro-image-preview',
];

async function generateArticleImage(topic: string, category: string): Promise<string> {
  const ai = getGenAI();
  const imagePrompt = `Professional editorial photograph for a Nigerian news article. Topic: "${topic}". Category: ${category}. Style: clean, realistic, high-quality news photography. Bright, well-lit, no text overlays or watermarks.`;

  for (const model of IMAGE_MODELS) {
    try {
      console.log(`[aiService] Trying image model: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents: imagePrompt,
        config: { responseModalities: ['IMAGE'] } as any,
      });

      const candidates = (response as any).candidates;
      if (candidates?.[0]?.content?.parts) {
        for (const part of candidates[0].content.parts) {
          if (part.inlineData?.data) {
            console.log(`[aiService] Image generated with model: ${model}`);
            return `data:${part.inlineData.mimeType || 'image/jpeg'};base64,${part.inlineData.data}`;
          }
        }
      }
    } catch (err: any) {
      console.warn(`[aiService] Image model ${model} failed: ${err.message?.slice(0, 100)}`);
    }
  }

  console.warn('[aiService] All image models failed, using stock photo fallback');
  return `https://picsum.photos/seed/${encodeURIComponent(topic)}/800/450`;
}

async function callModel(promptText: string): Promise<string> {
  const ai = getGenAI();
  let lastError: Error | null = null;

  for (const model of TEXT_MODELS) {
    try {
      console.log(`[aiService] Trying text model: ${model}`);
      const response = await ai.models.generateContent({ model, contents: promptText });
      const text = response.text || "";
      if (!text) throw new Error("AI returned empty response");
      console.log(`[aiService] Success with model: ${model}`);
      return text;
    } catch (err: any) {
      console.warn(`[aiService] Model ${model} failed: ${err.message?.slice(0, 120)}`);
      lastError = err;
    }
  }
  throw lastError || new Error("All AI models exhausted. Please check your Gemini API key quota at https://aistudio.google.com");
}

export async function generateContent(type: 'opera' | 'ebook', params: any): Promise<{ content: string; imageUrl?: string }> {
  let firstPassPrompt = "";

  if (type === 'opera') {
    const learningContext = getLearningContext('opera');
    firstPassPrompt = `${OPERA_SYSTEM_PROMPT}
${learningContext}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR ASSIGNMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Write a tight, highly engaging Opera News Hub article on this topic.

Topic: ${params.topic}
Category: ${params.category}

Instructions:
- Study the real Nigerian news examples above — absorb their natural rhythm and tone
- Write something COMPLETELY ORIGINAL in that same human voice
- DO NOT copy a single phrase from the examples
- **Word count: strictly 300–450 words.** Do not pad. Do not cut short.
- Hook the reader in the very first sentence with drama, fact, or a relatable problem
- Use short paragraphs (max 2–3 sentences). **Bold** key phrases for mobile scanning.
- Use clear, short, enticing subheadings (## format)
- End with a forward-looking thought, an engaging question, or a sharp final takeaway — NO formal "Conclusion" heading
- Apply every banned-words rule from the system prompt above

Write the article now. Return ONLY the article — no intro like "Here is your article:"`;

  } else if (type === 'ebook') {
    const learningContext = getLearningContext('ebook');
    firstPassPrompt = `${EBOOK_SYSTEM_PROMPT}
${learningContext}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR ASSIGNMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Write a complete, professional eBook manuscript.

Title: ${params.topic}
Author: ${params.author}
Publisher: ${params.publisher}
Genre: ${params.type === 'story' ? 'Fiction / Creative Story' : 'Educational / Non-Fiction'}

Instructions:
- Study the African literature examples above for authentic narrative voice
- Write something COMPLETELY ORIGINAL in that same depth and human quality
- Follow the full manuscript structure: Cover → Copyright → TOC → Preface → Chapters → Conclusion → About Author
- Each chapter must feel like a genuine, well-written piece — not padded
- For fiction: create vivid scenes, real character emotion, authentic dialogue
- For non-fiction: give the reader more insight than they could get from a Google search
- Write as Ada would — with warmth, authority, and genuine depth

Write the full manuscript now. Return ONLY the manuscript.`;
  }

  try {
    console.log(`[aiService] Starting ${type} generation (Pass 1: Draft)...`);
    const draft = await callModel(firstPassPrompt);

    console.log(`[aiService] Starting ${type} generation (Pass 2: Human-quality review)...`);
    const reviewPrompt = buildReviewPrompt(draft, type);
    const refined = await callModel(reviewPrompt);

    const content = sanitizeOutput(refined);

    if (type === 'opera') {
      const imageUrl = await generateArticleImage(params.topic, params.category);
      return { content, imageUrl };
    }

    return { content };
  } catch (error: any) {
    console.error(`[aiService] ${type.toUpperCase()} Generation Failed:`, error);
    throw new Error(`AI Service Error (${type}): ${error.message || "Unknown error"}`);
  }
}

function sanitizeOutput(text: string): string {
  if (!text) return "";
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```markdown\n?/m, "").replace(/\n?```$/m, "");
  cleaned = cleaned.replace(/^```\n?/m, "").replace(/\n?```$/m, "");
  cleaned = cleaned.replace(/^(Here is the (improved |refined |final )?(article|manuscript|version)[^:\n]*:?\s*)/im, "").trim();
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  cleaned = cleaned.replace(/[ \t]{3,}/g, "  ");
  return cleaned;
}
