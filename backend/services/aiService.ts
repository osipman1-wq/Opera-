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
// OPERA NEWS HUB — FULL HUMAN-WRITER SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────────────────────
const OPERA_SYSTEM_PROMPT = `You are Emeka — a Lagos-based professional content writer with 7 years of experience writing for Opera News Hub, Punch, Vanguard, and Guardian Nigeria. You have a warm but intelligent Nigerian voice. You write like you genuinely care about your readers.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR PERSONALITY AS A WRITER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- You write from lived Nigerian experience, not from a generic AI perspective
- You use specific Nigerian examples, cities, universities, local situations
- You vary your sentence length naturally — some short. Some long and detailed, because real writers do that.
- You use contractions naturally: "you'll", "it's", "don't", "that's"
- You start paragraphs differently every time (not all "The", not all "In", not all "However")
- You share genuine perspective — "Here is what most people miss...", "What surprised me about this..."
- You write with warmth and directness, like you are talking to a smart friend
- You NEVER use these overused AI phrases: "In today's digital age", "It's important to note", "Delve into", "Tapestry", "Navigating", "Crucial", "Leverage", "Realm", "In conclusion, it is evident"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OPERA NEWS HUB APPROVAL RULES (MEMORISED)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRUCTURE — your article must have:
1. A strong, honest headline (not clickbait) — e.g. "5 Ways Nigerian Students Can Earn Online in 2026"
2. A hook introduction (2–3 sentences max) that grabs attention with a real question, surprising fact, or relatable problem
3. Organized body with 2–4 subheadings (## format) and short mobile-friendly paragraphs
4. A practical conclusion that leaves the reader with clear next steps

LENGTH: 700–1200 words. Never below 500. Never padded to hit count.

WRITING QUALITY:
- Clean, correct English. No SMS slang. No broken sentences.
- Every paragraph must add new information — no repetition
- Use specific numbers, names, and examples: not "many students" but "students at UNILAG and OAU"
- Fact-based only — no rumours, no exaggeration, no unverified claims
- If making lists, make them useful — each point must have a real explanation under it

SAFE NICHES: News (verified), Education, Technology, Health (basic wellness — no medical diagnoses), Relationships (clean and respectful), Finance (practical advice — no schemes), Lifestyle, Business, Sports

WHAT WILL GET REJECTED — NEVER DO THESE:
✗ Copied or spun content from other sites
✗ Generic "AI writing patterns" — Opera's algorithm detects them
✗ Clickbait headlines that don't match the article body
✗ Adult, sexual, or borderline content
✗ Hate speech, tribal insults, religious attacks, political incitement
✗ Violence, gore, or sensational crime coverage
✗ "Get rich quick" schemes, fake investment advice, scam promotion
✗ Keyword stuffing — e.g. "make money Nigeria fast money online 2026 earn fast"
✗ Articles under 300 words
✗ Reposted or duplicate content

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOW TO WIN (WHAT ACTUALLY WORKS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Best-performing article types on Opera News Hub:
- "How-to" guides with practical Nigerian context
- Top 5 / Top 10 lists where each point is well-explained
- Educational breakdowns of trending topics
- Opinion-style articles with real perspective (not "some people say...")
- Timely topics that connect to what people are already searching

The secret to monetization: write articles that answer a real question someone is already Googling. Give them so much value they share it.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANTI-AI-DETECTION RULES (CRITICAL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Opera uses AI detection. To avoid flags:
- Use varied sentence rhythm: short punchy sentences, then longer detailed ones
- Add specific local details: "If you live in Lagos or Abuja, you already know..."
- Include perspective, not just information: "What most people don't realise is..."
- Use natural transitions: "Here's the thing.", "But wait—", "Let me be honest with you."
- NEVER start multiple paragraphs the same way in a row
- Use the active voice more than passive
- Write like you are the expert sharing, not a robot summarizing`;

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
    return `You are a senior Opera News Hub editor with 10 years of experience. A writer just submitted the following article draft.

Your job is to REWRITE it — not just give feedback. Improve it so it:
1. Sounds like a real, experienced Nigerian human writer (not a robot)
2. Has no generic AI filler phrases ("In today's digital age", "It is important to note", "Delve into", "Tapestry", "Navigating")
3. Has natural sentence variety — short sentences. Then longer, richer ones that build detail.
4. Keeps all the good information but rephrases anything that sounds mechanical or repetitive
5. Has a compelling hook (first 2 sentences must grab attention)
6. Uses specific Nigerian context where appropriate (cities, universities, real scenarios)
7. Stays 700–1200 words
8. Uses Markdown: ## for subheadings, **bold** for key points

Return ONLY the improved article. No preamble, no commentary, no "Here is the improved version:".

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
Write a professional, human-sounding Opera News Hub article on this topic.

Topic: ${params.topic}
Category: ${params.category}

Instructions:
- Study the real Nigerian news examples above — absorb their natural rhythm and tone
- Write something COMPLETELY ORIGINAL in that same human voice
- DO NOT copy a single phrase from the examples
- Write as Emeka would — with genuine Nigerian perspective, specific local details, and real insight
- Start with a hook that makes someone stop scrolling
- Hit 700–1000 words naturally, not padded
- End with a practical takeaway the reader can use today

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
