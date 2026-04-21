import { XMLParser } from 'fast-xml-parser';

interface LearnedSample {
  title: string;
  excerpt: string;
  fullText: string;
  source: string;
  category?: string;
  wordCount?: number;
}

interface LearnerCache {
  newsSamples: LearnedSample[];
  storySamples: LearnedSample[];
  lastFetched: number;
  status: 'idle' | 'learning' | 'ready' | 'error';
  lastError?: string;
}

const CACHE_TTL_MS = 4 * 60 * 60 * 1000;

const NEWS_FEEDS = [
  { url: 'https://www.vanguardngr.com/feed/', source: 'Vanguard Nigeria', category: 'News' },
  { url: 'https://www.premiumtimesng.com/feed/', source: 'Premium Times', category: 'News' },
  { url: 'https://punchng.com/feed/', source: 'Punch Nigeria', category: 'News' },
  { url: 'https://guardian.ng/feed/', source: 'Guardian Nigeria', category: 'Opinion/Analysis' },
  { url: 'https://businessday.ng/feed/', source: 'BusinessDay', category: 'Finance/Business' },
  { url: 'https://techcabal.com/feed/', source: 'TechCabal', category: 'Technology' },
  { url: 'https://www.pulse.ng/entertainment/feed', source: 'Pulse Nigeria', category: 'Entertainment/Lifestyle' },
  { url: 'https://news.google.com/rss/search?q=Nigeria&hl=en-NG&gl=NG&ceid=NG:en', source: 'Google News Nigeria', category: 'News' },
  { url: 'https://news.google.com/rss/search?q=Nigeria+education+business&hl=en-NG&gl=NG&ceid=NG:en', source: 'Google News Nigeria (Education/Business)', category: 'Education/Business' },
  { url: 'https://news.google.com/rss/search?q=Nigeria+technology+startup&hl=en-NG&gl=NG&ceid=NG:en', source: 'Google News Nigeria (Tech)', category: 'Technology' },
  { url: 'https://www.channelstv.com/feed/', source: 'Channels TV', category: 'News' },
  { url: 'https://www.thecable.ng/feed', source: 'The Cable Nigeria', category: 'News/Opinion' },
];

const STORY_FEEDS = [
  { url: 'https://brittle-paper.com/feed/', source: 'Brittle Paper (African Literature)', category: 'Fiction' },
  { url: 'https://www.naijastories.com/feed/', source: 'Naija Stories', category: 'Nigerian Fiction' },
  { url: 'https://writersinspire.org/feed/', source: 'Writers Inspire', category: 'Creative Writing' },
];

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });

let cache: LearnerCache = {
  newsSamples: [],
  storySamples: [],
  lastFetched: 0,
  status: 'idle',
};

function stripHtml(html: string): string {
  return html
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&hellip;/g, '...')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function extractSamples(xml: string, source: string, category: string, maxItems = 5): LearnedSample[] {
  try {
    const parsed = parser.parse(xml);
    const items = parsed?.rss?.channel?.item || parsed?.feed?.entry || [];
    const list = Array.isArray(items) ? items : [items];

    return list
      .slice(0, maxItems)
      .map((item: any) => {
        const title = stripHtml(String(item.title || '')).slice(0, 150);
        const rawDesc = item['content:encoded'] || item.description || item.summary || item.content || '';
        const fullText = stripHtml(String(rawDesc)).slice(0, 800);
        const excerpt = fullText.slice(0, 350);
        const wordCount = countWords(fullText);
        return { title, excerpt, fullText, source, category, wordCount };
      })
      .filter((s: LearnedSample) => s.title.length > 10 && s.excerpt.length > 50);
  } catch {
    return [];
  }
}

async function fetchFeed(url: string, source: string, category: string, maxItems = 5): Promise<LearnedSample[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AllHub/2.0; Nigerian Content Tool)',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      }
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const xml = await res.text();
    return extractSamples(xml, source, category, maxItems);
  } catch {
    return [];
  }
}

async function runLearningCycle() {
  console.log('[WebLearner] Starting learning cycle...');
  cache.status = 'learning';

  const newsResults = await Promise.allSettled(
    NEWS_FEEDS.map(f => fetchFeed(f.url, f.source, f.category, 5))
  );
  const storyResults = await Promise.allSettled(
    STORY_FEEDS.map(f => fetchFeed(f.url, f.source, f.category, 4))
  );

  const newsSamples: LearnedSample[] = [];
  const storySamples: LearnedSample[] = [];

  newsResults.forEach(r => {
    if (r.status === 'fulfilled') newsSamples.push(...r.value);
  });
  storyResults.forEach(r => {
    if (r.status === 'fulfilled') storySamples.push(...r.value);
  });

  cache.newsSamples = newsSamples;
  cache.storySamples = storySamples;
  cache.lastFetched = Date.now();
  cache.status = 'ready';

  const newsSourcesLearned = [...new Set(newsSamples.map(s => s.source))];
  const storySourcesLearned = [...new Set(storySamples.map(s => s.source))];
  console.log(`[WebLearner] Learned from ${newsSamples.length} news articles (${newsSourcesLearned.join(', ')})`);
  console.log(`[WebLearner] Learned from ${storySamples.length} story samples (${storySourcesLearned.join(', ')})`);
}

export function initWebLearner() {
  runLearningCycle().catch(err => {
    cache.status = 'error';
    cache.lastError = err.message;
    console.error('[WebLearner] Initial cycle failed:', err.message);
  });

  setInterval(() => {
    if (Date.now() - cache.lastFetched > CACHE_TTL_MS) {
      runLearningCycle().catch(err => {
        console.error('[WebLearner] Refresh cycle failed:', err.message);
      });
    }
  }, 60 * 60 * 1000);
}

export function getLearningContext(type: 'opera' | 'ebook'): string {
  if (cache.status !== 'ready' || (type === 'opera' && cache.newsSamples.length === 0) || (type === 'ebook' && cache.storySamples.length === 0)) {
    return '';
  }

  if (type === 'opera') {
    const picked = [...cache.newsSamples]
      .sort(() => Math.random() - 0.5)
      .slice(0, 6);

    const examples = picked.map(s => {
      const lines = [
        `━━ SOURCE: ${s.source} [${s.category}] ━━`,
        `HEADLINE: "${s.title}"`,
        `OPENING PARAGRAPHS:`,
        `"${s.excerpt}..."`,
      ];
      return lines.join('\n');
    }).join('\n\n');

    return `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LIVE LEARNING FEED — TODAY'S REAL NIGERIAN NEWS
(Study these for tone, rhythm, and natural Nigerian writing style.
DO NOT copy any of these. Write something completely original.
Use them to understand how real Nigerian writers open articles, structure thoughts, and connect with readers.)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${examples}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT YOU LEARNED FROM THESE:
- Notice how they open with immediate context or a strong statement
- Notice the sentence variety — some short, some detailed
- Notice how they use specific names, numbers, and Nigerian references
- Now apply that same energy to your original article below
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
  }

  if (type === 'ebook') {
    const picked = [...cache.storySamples]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const examples = picked.map(s => {
      return [
        `━━ SOURCE: ${s.source} [${s.category}] ━━`,
        `TITLE: "${s.title}"`,
        `WRITING SAMPLE:`,
        `"${s.fullText.slice(0, 500)}..."`,
      ].join('\n');
    }).join('\n\n');

    return `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LIVE LEARNING FEED — REAL AFRICAN LITERATURE SAMPLES
(Study the writing quality, voice, and depth of these published pieces.
DO NOT copy. Let them inspire the same human depth in your manuscript.)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${examples}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT YOU LEARNED FROM THESE:
- Notice the specificity and emotional depth
- Notice how scenes are built with detail, not just told
- Apply that same richness of voice to your manuscript
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
  }

  return '';
}

export function getLearnerStatus() {
  return {
    status: cache.status,
    newsSamplesCount: cache.newsSamples.length,
    storySamplesCount: cache.storySamples.length,
    lastFetched: cache.lastFetched ? new Date(cache.lastFetched).toISOString() : null,
    nextRefresh: cache.lastFetched
      ? new Date(cache.lastFetched + CACHE_TTL_MS).toISOString()
      : null,
    sources: {
      news: [...new Set(cache.newsSamples.map(s => s.source))],
      stories: [...new Set(cache.storySamples.map(s => s.source))],
    }
  };
}
