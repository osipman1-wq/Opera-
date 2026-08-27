let gemini;
let Type;

async function getGemini() {
  if (!gemini) {
    if (!process.env.GEMINI_API_KEY) {
      const err = new Error("GEMINI_API_KEY is not configured in project settings. Please ensure GEMINI_API_KEY is properly set in your environment.");
      err.status = 500;
      throw err;
    }
    const genaiModule = await import("@google/genai");
    const { GoogleGenAI } = genaiModule;
    Type = genaiModule.Type;
    gemini = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } }
    });
  }
  return gemini;
}

const FALLBACK_MODELS = ["gemini-3.7-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const HUMAN_STYLE_RULES = `
Write like an experienced human writer producing finished, professional copy for publication — not like an AI assistant answering a prompt.

Grammar and mechanics:
- Correct, standard grammar throughout. No run-on sentences, no comma splices, no fragment errors.
- Every question ends in a question mark. Every statement ends in a period. Check this before finishing.
- Consistent verb tense and point of view within each section.
- Vary sentence length and rhythm — do not write a string of same-length sentences.

Voice:
- Never use these stock AI phrases or close variants of them: "in conclusion", "it is important to note", "in today's world", "delve into", "moreover" as a crutch, "furthermore" as a crutch, "unlock", "landscape" as a metaphor, "in the realm of", "when it comes to", "at the end of the day", "navigating the world of".
- Do not open by restating the topic or throat-clearing before getting started.
- Write in full paragraphs that build an idea or scene forward, not lists of facts back to back.
- Sound like a specific person with a point of view wrote this, not a neutral summarizer.

Originality and sourcing:
- If text appears below under REFERENCE MATERIAL, it is background only — it exists so you understand facts and context, nothing more.
- Never copy sentences, phrases, or distinctive wording from it. Read it, understand it, then write in entirely original language and structure.
- Do not mirror its paragraph order, headings, or argument shape.
- If a fact, statistic, quote, or attribution can't be confirmed from the reference material or from what you reliably know, leave it out rather than inventing it.
`.trim();

function buildReferenceBlock(referenceText) {
  if (!referenceText) return "";
  return `\n\nREFERENCE MATERIAL (background only — do not copy, see rules above):\n"""\n${referenceText}\n"""`;
}

function parseJsonSafely(rawText) {
  if (!rawText) throw new Error("Empty response from AI");
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/```$/, "").trim();
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/```$/, "").trim();
  }
  
  // Try direct parse
  try {
    return JSON.parse(cleaned);
  } catch {
    // Attempt to extract JSON block between first { and last }
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const extracted = cleaned.slice(firstBrace, lastBrace + 1);
      return JSON.parse(extracted);
    }
    throw new Error("Unable to parse AI response into JSON format");
  }
}

async function chat(systemPrompt, userPrompt, { json = false, schema = null } = {}) {
  const ai = await getGemini();
  const baseConfig = {
    systemInstruction: systemPrompt,
    temperature: 0.7,
    maxOutputTokens: 8192,
  };

  if (json) {
    baseConfig.responseMimeType = "application/json";
    if (schema) {
      baseConfig.responseSchema = schema;
    }
  }

  let lastError;

  for (const model of FALLBACK_MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: userPrompt,
          config: baseConfig
        });

        if (response && response.text) {
          return response.text;
        }
      } catch (error) {
        lastError = error;
        const status = error?.status || error?.response?.status || error?.statusCode;
        const msg = String(error?.message || "");
        const isTransient =
          status === 503 ||
          status === 429 ||
          msg.includes("503") ||
          msg.includes("UNAVAILABLE") ||
          msg.includes("high demand") ||
          msg.includes("429") ||
          msg.includes("RESOURCE_EXHAUSTED") ||
          msg.includes("INTERNAL") ||
          msg.includes("overloaded");

        if (isTransient && attempt < 2) {
          await sleep(800 * (attempt + 1));
          continue;
        }
        break;
      }
    }
  }

  if (lastError) {
    const msg = String(lastError?.message || "");
    if (msg.includes("503") || msg.includes("high demand") || msg.includes("UNAVAILABLE") || msg.includes("overloaded")) {
      const friendlyErr = new Error("The AI model endpoint is temporarily experiencing high traffic. Please retry in a few seconds.");
      friendlyErr.status = 503;
      throw friendlyErr;
    }
    if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
      const quotaError = new Error(
        "Gemini API quota is exhausted. Check the Google AI billing or quota settings for this key, then try again."
      );
      quotaError.status = 429;
      throw quotaError;
    }
    throw lastError;
  }

  throw new Error("Unable to generate response from AI models.");
}

async function generateArticle({ topic, keywords, tone, referenceText }) {
  const toneInstruction = tone ? `\nTone & Style: ${tone}.` : "";
  const systemPrompt = `You are a professional news and feature writer.${toneInstruction}

${HUMAN_STYLE_RULES}

Structure:
- Title/Headline (formatted with markdown # Headline)
- Lead paragraph that immediately hooks the reader and frames the context
- Well-organized body sections (use ## Section Headings where appropriate)
- A compelling closing thought that lands smoothly — not a repetitive summary.`;

  const userPrompt = `Write a complete, publication-ready article.

Topic: ${topic}
Keywords to weave in naturally, without listing or forcing them: ${keywords || "none given"}${buildReferenceBlock(referenceText)}`;

  return chat(systemPrompt, userPrompt);
}

async function generateEbook({ title, authorName, genre, chapters, description, tone, referenceText }) {
  await getGemini();
  const chapterCount = Math.min(Math.max(parseInt(chapters, 10) || 4, 1), 12);
  const year = new Date().getFullYear();
  const toneInstruction = tone ? `\nTarget Tone: ${tone}.` : "";

  const ebookSchema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "The final book title." },
      author: { type: Type.STRING, description: "The author name." },
      publisher: { type: Type.STRING, description: "The publishing imprint." },
      copyright: { type: Type.STRING, description: "Copyright line." },
      legal: { type: Type.STRING, description: "Standard rights reservation and disclaimer text." },
      dedication: { type: Type.STRING, description: "Book dedication." },
      introduction: { type: Type.STRING, description: "Introduction setting up the book theme and context." },
      chapters: {
        type: Type.ARRAY,
        description: "The chapters of the book.",
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Chapter title." },
            content: { type: Type.STRING, description: "Detailed multi-paragraph chapter prose." }
          },
          required: ["title", "content"]
        }
      },
      conclusion: { type: Type.STRING, description: "Concluding chapter or afterword." }
    },
    required: ["title", "author", "publisher", "copyright", "legal", "dedication", "introduction", "chapters", "conclusion"]
  };

  const systemPrompt = `You are a professional ebook ghostwriter and author.${toneInstruction}

${HUMAN_STYLE_RULES}

Generate a comprehensive, publication-ready ebook matching the requested JSON schema.
The "chapters" array must contain exactly ${chapterCount} entries.
Each chapter's "content" must contain rich, engaging, multi-paragraph prose.`;

  const userPrompt = `Write a complete ebook.

Title: ${title}
Author: ${authorName}
Genre: ${genre || "general non-fiction"}
Description / brief: ${description || "not provided — infer an insightful angle from the title and genre"}
Number of chapters: ${chapterCount}${buildReferenceBlock(referenceText)}

For "publisher", use "${authorName} Publishing". For "copyright", use "© ${year} ${authorName}. All rights reserved." For "legal", write a standard rights reservation notice.`;

  const raw = await chat(systemPrompt, userPrompt, { json: true, schema: ebookSchema });
  
  let book;
  try {
    book = parseJsonSafely(raw);
  } catch (err) {
    console.error("Failed to parse ebook response:", raw, err);
    throw new Error("The AI returned an invalid ebook response. Please try again.");
  }
  
  book.isbn = "Not yet assigned — obtain via your publishing platform (e.g. KDP, IngramSpark, StreetLib) prior to distribution.";
  return book;
}

async function generateStory({ title, authorName, genre, length, characters, plot, tone, referenceText }) {
  await getGemini();
  const partsByLength = { short: 3, medium: 5, long: 8 };
  const partCount = partsByLength[length] || 3;
  const year = new Date().getFullYear();
  const toneInstruction = tone ? `\nAtmospheric Tone: ${tone}.` : "";

  const storySchema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "Story title." },
      author: { type: Type.STRING, description: "Author name." },
      copyright: { type: Type.STRING, description: "Copyright line." },
      dedication: { type: Type.STRING, description: "Optional dedication." },
      tableOfContents: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of part titles."
      },
      parts: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Part title." },
            content: { type: Type.STRING, description: "Full narrative prose for this part." }
          },
          required: ["title", "content"]
        }
      }
    },
    required: ["title", "author", "copyright", "parts"]
  };

  const systemPrompt = `You are a professional fiction author and editor.${toneInstruction}

${HUMAN_STYLE_RULES}

Generate an immersive, multi-part fiction story matching the requested JSON schema.
The "parts" array must contain exactly ${partCount} entries. Each part's "content" must be complete narrative prose with scenes, dialogue, and descriptive pacing.`;

  const userPrompt = `Write a complete ${genre || "fiction"} story in ${partCount} parts.

Title: ${title}
Author: ${authorName}
Main characters: ${characters || "invent characters that fit the genre and plot"}
Plot: ${plot || "not provided — invent a compelling plot that fits the genre"}${buildReferenceBlock(referenceText)}

For "copyright", use "© ${year} ${authorName}. All rights reserved."`;

  const raw = await chat(systemPrompt, userPrompt, { json: true, schema: storySchema });
  
  try {
    return parseJsonSafely(raw);
  } catch (err) {
    console.error("Failed to parse story response:", raw, err);
    throw new Error("The AI returned an invalid story response. Please try again.");
  }
}

async function generateLearningModule({ topic, targetLevel, modulesCount, tone, referenceText }) {
  await getGemini();
  const count = Math.min(Math.max(parseInt(modulesCount, 10) || 3, 1), 8);
  const toneInstruction = tone ? `\nPedagogical Style: ${tone}.` : "";

  const learningSchema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "Title of the learning curriculum / course." },
      overview: { type: Type.STRING, description: "Executive summary and why this subject matters." },
      targetLevel: { type: Type.STRING, description: "Target audience / proficiency level (Beginner, Intermediate, Advanced)." },
      estimatedDuration: { type: Type.STRING, description: "Estimated completion time." },
      learningObjectives: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Core takeaways and actionable outcomes."
      },
      modules: {
        type: Type.ARRAY,
        description: "Structured progressive learning modules.",
        items: {
          type: Type.OBJECT,
          properties: {
            moduleNumber: { type: Type.INTEGER },
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            inDepthContent: { type: Type.STRING, description: "Multi-paragraph comprehensive instructional prose with examples." },
            practicalExercise: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                instructions: { type: Type.STRING },
                solutionOrAnswer: { type: Type.STRING }
              },
              required: ["title", "instructions", "solutionOrAnswer"]
            }
          },
          required: ["moduleNumber", "title", "summary", "inDepthContent", "practicalExercise"]
        }
      },
      quiz: {
        type: Type.ARRAY,
        description: "Knowledge check questions with multiple choice options.",
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            correctIndex: { type: Type.INTEGER, description: "Zero-based index of correct option (0-3)." },
            explanation: { type: Type.STRING }
          },
          required: ["question", "options", "correctIndex", "explanation"]
        }
      },
      summaryAndNextSteps: { type: Type.STRING, description: "Synthesis and recommended next milestones for mastery." }
    },
    required: ["title", "overview", "targetLevel", "learningObjectives", "modules", "quiz", "summaryAndNextSteps"]
  };

  const systemPrompt = `You are a world-class instructional designer and educator.${toneInstruction}

${HUMAN_STYLE_RULES}

Generate a clear, highly educational, practical learning course and interactive study guide matching the requested JSON schema.
The "modules" array must contain exactly ${count} structured lessons.
Each module must have rich instructional content with practical application exercises, and include an assessment quiz with 3-5 multiple-choice questions.`;

  const userPrompt = `Create a comprehensive learning curriculum and study guide.

Subject / Topic: ${topic}
Proficiency Level: ${targetLevel || "Intermediate"}
Number of Modules: ${count}${buildReferenceBlock(referenceText)}`;

  const raw = await chat(systemPrompt, userPrompt, { json: true, schema: learningSchema });

  try {
    return parseJsonSafely(raw);
  } catch (err) {
    console.error("Failed to parse learning response:", raw, err);
    throw new Error("The AI returned an invalid learning curriculum response. Please try again.");
  }
}

async function refinePrompt({ prompt, type = "article" }) {
  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    throw new Error("Prompt text is required for refinement.");
  }

  await getGemini();

  const refineSchema = {
    type: Type.OBJECT,
    properties: {
      refinedTopic: { type: Type.STRING, description: "Clear, punchy, publication-grade topic title or concept." },
      suggestedKeywords: { type: Type.STRING, description: "3-5 high-value comma-separated keywords." },
      suggestedTone: { type: Type.STRING, description: "Best editorial or narrative tone." },
      descriptionOrContext: { type: Type.STRING, description: "One concise sentence summarizing the core focus or angle." }
    },
    required: ["refinedTopic", "suggestedKeywords", "suggestedTone"]
  };

  const systemPrompt = `You are an expert editor, author, and prompt engineer. Your task is to take raw, messy, or simple user topics and refine them into concise, compelling, high-quality publication concepts suitable for a professional ${type}. Return clean JSON only.`;

  const userPrompt = `Refine and polish this ${type} prompt:
"${prompt.trim()}"`;

  const raw = await chat(systemPrompt, userPrompt, { json: true, schema: refineSchema });

  try {
    return parseJsonSafely(raw);
  } catch (err) {
    console.error("Failed to parse refine response:", raw, err);
    // Fallback object if parsing fails
    return {
      refinedTopic: prompt.trim(),
      suggestedKeywords: "",
      suggestedTone: "Engaging Journalism",
      descriptionOrContext: ""
    };
  }
}

module.exports = {
  generateArticle,
  generateEbook,
  generateStory,
  generateLearningModule,
  refinePrompt
};