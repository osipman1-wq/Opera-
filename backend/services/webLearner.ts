import { XMLParser } from 'fast-xml-parser';

interface LearnedSample {
  title: string;
  excerpt: string;
  source: string;
}

interface LearnerCache {
  newsSamples: LearnedSample[];
  storySamples: LearnedSample[];
  lastFetched: number;
  status: 'idle' | 'learning' | 'ready' | 'error';
  lastError?: string;
}

const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // Refresh every 4 hours

const NEWS_FEEDS = [
  { url: 'https://www.vanguardngr.com/feed/', source: 'Vanguard Nigeria' },
  { url: 'https://www.premiumtimesng.com/feed/', source: 'Premium Times' },
  { url: 'https://punchng.com/feed/', source: 'Punch Nigeria' },
  { url: 'https://guardian.ng/feed/', source: 'Guardian Nigeria' },
  { url: 'https://businessday.ng/feed/', source: 'BusinessDay' },
];

const STORY_FEEDS = [
  { url: 'https://writersinspire.org/feed/', source: 'Writers Inspire' },
  { url: 'https://brittle-paper.com/feed/', source: 'Brittle Paper (African Literature)' },
  { url: 'https://www.naijastories.com/feed/', source: 'Naija Stories' },
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
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function extractSamples(xml: string, source: string, maxItems = 5): LearnedSample[] {
  try {
    const parsed = parser.parse(xml);
    const items = parsed?.rss?.channel?.item || parsed?.feed?.entry || [];
    const list = Array.isArray(items) ? items : [items];
    return list.slice(0, maxItems).map((item: any) => {
      const title = stripHtml(String(item.title || '')).slice(0, 120);
      const rawDesc = item.description || item.summary || item['content:encoded'] || '';
      const excerpt = stripHtml(String(rawDesc)).slice(0, 300);
      return { title, excerpt, source };
    }).filter((s: LearnedSample) => s.title.length > 5);
  } catch {
    return [];
  }
}

async function fetchFeed(url: string, source: string, maxItems = 5): Promise<LearnedSample[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AllHub/1.0)' }
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const xml = await res.text();
    return extractSamples(xml, source, maxItems);
  } catch {
    return [];
  }
}

async function runLearningCycle() {
  console.log('[WebLearner] Starting learning cycle...');
  cache.status = 'learning';

  const newsResults = await Promise.allSettled(
    NEWS_FEEDS.map(f => fetchFeed(f.url, f.source, 4))
  );
  const storyResults = await Promise.allSettled(
    STORY_FEEDS.map(f => fetchFeed(f.url, f.source, 5))
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

  console.log(`[WebLearner] Learned from ${newsSamples.length} news articles, ${storySamples.length} story samples.`);
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
  }, 60 * 60 * 1000); // Check every hour
}

export function getLearningContext(type: 'opera' | 'ebook'): string {
  if (cache.status !== 'ready') return '';

  if (type === 'opera' && cache.newsSamples.length > 0) {
    const picked = cache.newsSamples
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);
    const examples = picked.map(s =>
      `Source: ${s.source}\nHeadline: "${s.title}"\nOpening: "${s.excerpt.slice(0, 200)}..."`
    ).join('\n\n');
    return `\n\nREAL EXAMPLES FROM TODAY'S NIGERIAN NEWS (use these as style and tone reference — do NOT copy them, write original content):\n${examples}\n`;
  }

  if (type === 'ebook' && cache.storySamples.length > 0) {
    const picked = cache.storySamples
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    const examples = picked.map(s =>
      `Source: ${s.source}\nTitle: "${s.title}"\nStyle sample: "${s.excerpt.slice(0, 250)}..."`
    ).join('\n\n');
    return `\n\nREAL EXAMPLES FROM AFRICAN LITERATURE SITES (use these as style and narrative tone reference — do NOT copy, write original):\n${examples}\n`;
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
