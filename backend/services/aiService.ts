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
const EBOOK_SYSTEM_PROMPT = `You are a brilliant, New York Times bestselling author and structure expert. Your task is to generate a compelling, human-written manuscript or highly detailed chapter layout based on the user's inputs.

To prevent the manuscript from sounding like a generic, robotic AI summary, strictly enforce these rules:

1. VOICE & DEPTH:
   - Write with authority, emotional resonance, and precise imagery.
   - Avoid superficial overviews. Dig straight into the mechanics of the scene, character, or factual concept.

2. PACING & STRUCTURE:
   - Break chapters into logical sub-sections using clean typography.
   - Ensure a smooth narrative or logical flow from one section to the next without using artificial transitions (like "Moving on to the next point...").

3. BANNED AI FORMULAS:
   - Do not summarize what you just said at the end of every section. Let the points stand on their own.
   - Ban generic placeholder phrases and cliché filler words (e.g., "Embarking on a journey", "A testament to", "Crucial first step", "Delve deeper", "As we explore", "In today's world", "Needless to say", "It goes without saying").

4. ADAPTATION BY GENRE:
   - If Genre is FICTION: Focus heavily on active voice ("show, don't tell"), character dialogue/internal thoughts, and sensory details.
   - If Genre is EDUCATIONAL/NON-FICTION: Focus on clear, actionable insights, real-world case studies/examples, and clear step-by-step breakdowns.

Additional quality rules:
- Clean, error-free English — reader should never trip on a sentence.
- Every chapter must add distinct, new value — no padding.
- Use **bold** for key terms and definitions.
- Use Markdown: # for chapter titles, ## for subheadings, **bold** for emphasis.
- Be generous with detail and explanation — the reader paid to learn, give them everything.`;

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
    return `You are a ruthless New York Times manuscript editor. A writer submitted this eBook draft.

Your job is to REWRITE it — not just review it. Your rewrite MUST:
1. Read like a bestselling human author wrote it — with authority, emotional resonance, and precise imagery.
2. Cut ALL banned AI formulas: "Embarking on a journey", "A testament to", "Crucial first step", "Delve deeper", "As we explore", "In today's world", "Needless to say", "It goes without saying", "Navigating", "Landscape", "Tapestry", "Leverage", "Realm".
3. Dig straight into the mechanics of the scene, character, or factual concept — avoid superficial overviews.
4. Break chapters into clean sub-sections (## format) with smooth natural flow. No artificial transitions like "Moving on to the next point...".
5. Do NOT summarize what you just said at the end of every section. Let the points stand on their own.
6. Keep natural sentence rhythm and variety — never all the same length.
7. For fiction: show emotion through action and dialogue, use sensory details, include real character dialogue/internal thoughts.
8. For non-fiction: give clear actionable insights, real-world case studies/examples, and step-by-step breakdowns.
9. Keep excellent Markdown structure: # chapters, ## subheadings, **bold** key terms.
10. Every chapter must feel complete with real explanations, not surface summaries.

Return ONLY the rewritten manuscript. No preamble, no commentary, no "Here is the improved version:".

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

/**
 * Parse Gemini JSON output. Strips markdown wrappers and falls back to regex extraction.
 */
function parseGeminiJson(raw: string): any {
  let text = raw.trim();
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('AI returned invalid JSON');
  }
}

/**
 * SINGLE-PASS Opera article generation — returns strict JSON with headline, body, image prompt.
 * Targets <15 seconds by skipping the second review pass and image model calls.
 */
export async function generateOperaJson(params: any): Promise<{
  headline: string;
  article_body: string;
  image_generation_prompt: string;
  imageUrl: string;
}> {
  const learningContext = getLearningContext('opera');

  const prompt = `${OPERA_SYSTEM_PROMPT}
${learningContext}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR ASSIGNMENT — STRICT JSON OUTPUT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You are an advanced content engine for an app called "All Hub". Your job is to process this request and return a clean, human-written piece of content alongside an optimized image generation prompt.

Topic: ${params.topic}
Category: ${params.category}

You must output your response strictly as a JSON object matching this exact schema:

{
  "headline": "A punchy, viral headline matching the user topic",
  "article_body": "The complete, human-sounding text formatted with short paragraphs (2-3 sentences), clean markdown subheadings (## format), and bolded keywords. Strictly avoid AI clichés like 'Furthermore', 'Moreover', 'Delve', or 'In conclusion'.",
  "image_generation_prompt": "A highly detailed, production-grade text-to-image prompt. Describe a high-quality photo or illustration that visually represents the core theme of the generated article. Specify style, lighting, composition, and mood, keeping it clean and safe for advertising/blog platforms."
}

CRITICAL RULES:
- Cut the fluff. Write immediately with local relevance, high engagement, and direct tone.
- Do not append generic summaries at the end. Wrap up with a forward-looking thought or an engaging question.
- Hook the reader in the very first sentence — no warm-up filler.
- No formal section titled "Conclusion".
- Word count: strictly 300–450 words. Do not pad. Do not cut short.
- Active voice more than passive. Natural contractions.
- Use specific Nigerian examples, cities, universities where relevant.

Output ONLY the raw JSON object. No markdown code blocks. No extra commentary.`;

  console.log(`[aiService] Starting opera JSON generation (single pass)...`);
  const raw = await callModel(prompt);
  const parsed = parseGeminiJson(raw);

  if (!parsed.headline || !parsed.article_body) {
    throw new Error('AI response missing required fields (headline or article_body)');
  }

  // Fast editorial photo — deterministic seed from topic for consistency
  const imageUrl = `https://picsum.photos/seed/${encodeURIComponent(params.topic + params.category)}/800/450`;

  return {
    headline: parsed.headline,
    article_body: parsed.article_body,
    image_generation_prompt: parsed.image_generation_prompt || `Editorial photograph for article about ${params.topic}`,
    imageUrl,
  };
}

export async function generateContent(type: 'opera' | 'ebook', params: any): Promise<{ content: string; imageUrl?: string }> {
  if (type === 'opera') {
    // Use the new single-pass JSON engine for Opera articles
    const result = await generateOperaJson(params);
    return {
      content: `# ${result.headline}\n\n${result.article_body}`,
      imageUrl: result.imageUrl,
    };
  }

  let firstPassPrompt = "";
  const learningContext = getLearningContext('ebook');
  firstPassPrompt = `${EBOOK_SYSTEM_PROMPT}
${learningContext}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR ASSIGNMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Write a deeply engaging, flawlessly structured, human-grade manuscript.

Book Title/Concept: ${params.topic}
Author: ${params.author}
Publisher: ${params.publisher}
Genre: ${params.type === 'story' ? 'Fiction' : 'Educational / Non-Fiction'}

Instructions:
- Apply EVERY rule from the system prompt above — voice, depth, pacing, structure, banned formulas, genre adaptation.
- Write something COMPLETELY ORIGINAL with authority, emotional resonance, and precise imagery.
- Follow the full manuscript structure: Cover → Copyright → TOC → Preface → Chapters → Conclusion → About Author
- Break chapters into logical sub-sections using clean typography (## format). Smooth natural flow — no artificial transitions.
- Each chapter must feel like a genuine, well-written piece — not padded. Dig into the mechanics, not the surface.
- For Fiction: active voice, vivid scenes, real character dialogue, internal thoughts, sensory details.
- For Educational: actionable insights, real-world case studies/examples, step-by-step breakdowns.
- Do NOT summarize what you just said at the end of every section. Let the points stand on their own.
- Be generous with detail and explanation — the reader paid to learn, give them everything.

Write the full manuscript now. Return ONLY the manuscript — no preamble, no "Here is your manuscript:".`;

  try {
    console.log(`[aiService] Starting ${type} generation (Pass 1: Draft)...`);
    const draft = await callModel(firstPassPrompt);

    console.log(`[aiService] Starting ${type} generation (Pass 2: Human-quality review)...`);
    const reviewPrompt = buildReviewPrompt(draft, type);
    const refined = await callModel(reviewPrompt);

    const content = sanitizeOutput(refined);
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
