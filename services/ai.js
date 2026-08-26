const OpenAI = require("openai");

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured on the server.");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const MODEL = "gpt-4o-mini";

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

async function chat(systemPrompt, userPrompt, { json = false } = {}) {
  const response = await getOpenAI().chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.8,
    max_tokens: 4000,
    ...(json ? { response_format: { type: "json_object" } } : {})
  });

  return response.choices[0]?.message?.content || "";
}

async function generateArticle({ topic, keywords, referenceText }) {
  const systemPrompt = `You are a professional news and feature writer.

${HUMAN_STYLE_RULES}

Structure: a strong headline, a lead paragraph that earns the read, a well-organized body, and a close that lands — not a summary that just restates the headline.`;

  const userPrompt = `Write a complete, publication-ready article.

Topic: ${topic}
Keywords to weave in naturally, without listing or forcing them: ${keywords || "none given"}${buildReferenceBlock(referenceText)}`;

  return chat(systemPrompt, userPrompt);
}

async function generateEbook({ title, authorName, genre, chapters, description, referenceText }) {
  const chapterCount = Math.min(Math.max(parseInt(chapters, 10) || 5, 1), 15);
  const year = new Date().getFullYear();

  const systemPrompt = `You are a professional ebook ghostwriter and editor.

${HUMAN_STYLE_RULES}

Return ONLY a JSON object, no commentary, matching exactly this shape:
{
  "title": string,
  "author": string,
  "publisher": string,
  "copyright": string,
  "legal": string,
  "dedication": string,
  "introduction": string,
  "chapters": [ { "title": string, "content": string } ],
  "conclusion": string
}
The "chapters" array must contain exactly ${chapterCount} entries. Each chapter's "content" must be several full paragraphs of real prose, not an outline or a bullet list.`;

  const userPrompt = `Write a complete ebook.

Title: ${title}
Author: ${authorName}
Genre: ${genre || "general non-fiction"}
Description / brief: ${description || "not provided — infer a sensible angle from the title and genre"}
Number of chapters: ${chapterCount}${buildReferenceBlock(referenceText)}

For "publisher", use "${authorName} Publishing" unless the genre clearly suggests something better. For "copyright", use the form "© ${year} ${authorName}. All rights reserved." For "legal", write a short standard rights-reserved notice. Do not include an ISBN — a real ISBN can only be assigned through the author's publishing platform, not generated here.`;

  const raw = await chat(systemPrompt, userPrompt, { json: true });
  let book;
  try {
    book = JSON.parse(raw);
  } catch {
    throw new Error("The AI returned an invalid ebook response.");
  }
  book.isbn = "Not yet assigned — get one from your publishing platform (e.g. KDP, StreetLib) before final release.";
  return book;
}

async function generateStory({ title, authorName, genre, length, characters, plot, referenceText }) {
  const partsByLength = { short: 3, medium: 5, long: 8 };
  const partCount = partsByLength[length] || 3;
  const year = new Date().getFullYear();

  const systemPrompt = `You are a professional fiction writer and editor.

${HUMAN_STYLE_RULES}

Return ONLY a JSON object, no commentary, matching exactly this shape:
{
  "title": string,
  "author": string,
  "copyright": string,
  "dedication": string,
  "tableOfContents": [string],
  "parts": [ { "title": string, "content": string } ]
}
The "parts" array must contain exactly ${partCount} entries, and "tableOfContents" must list each part's title in order. Each part's "content" must be full narrative prose — scenes, dialogue, description — not a summary of what happens.`;

  const userPrompt = `Write a complete ${genre || "fiction"} story in ${partCount} parts.

Title: ${title}
Author: ${authorName}
Main characters: ${characters || "invent characters that fit the genre and plot"}
Plot: ${plot || "not provided — invent a compelling plot that fits the genre"}${buildReferenceBlock(referenceText)}

For "copyright", use the form "© ${year} ${authorName}. All rights reserved."`;

  const raw = await chat(systemPrompt, userPrompt, { json: true });
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("The AI returned an invalid story response.");
  }
}

module.exports = { generateArticle, generateEbook, generateStory };