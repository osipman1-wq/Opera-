/**
 * Fetch a URL and return readable text for background reference material.
 * The AI service uses this for background facts while generating 100% original copy.
 */
async function fetchReadableText(url, maxChars = 6000) {
  if (!url || typeof url !== "string") return null;

  const trimmed = url.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    throw new Error("Invalid URL format. Please provide a valid web link starting with https:// or http://");
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(trimmed);
  } catch {
    throw new Error("The provided reference URL is not a valid web address.");
  }

  let response;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    response = await fetch(trimmed, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      }
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`The reference URL (${parsedUrl.hostname}) timed out after 8 seconds. Please ensure the server is responsive.`);
    }
    throw new Error(`Could not reach ${parsedUrl.hostname} (${err.message})`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 403 || response.status === 401) {
    throw new Error(
      `The website at ${parsedUrl.hostname} returned status ${response.status} (Access Denied / Bot Protection). Please ensure the URL is publicly accessible without bot-protection blocks, or paste key points directly into the prompt description.`
    );
  }

  if (!response.ok) {
    throw new Error(`Reference URL (${parsedUrl.hostname}) returned status ${response.status}. Please check the link or provide a publicly accessible source.`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html") && !contentType.includes("text/plain") && !contentType.includes("application/xhtml")) {
    throw new Error(`The URL did not return readable HTML/text (received "${contentType}").`);
  }

  const html = await response.text();

  // Check for common Cloudflare / Captcha challenge pages
  if (
    html.includes("cf-browser-verification") ||
    html.includes("cf_chl_prog") ||
    html.includes("Cloudflare Ray ID") ||
    html.includes("Just a moment...") ||
    html.includes("Attention Required! | Cloudflare")
  ) {
    throw new Error(
      `The page on ${parsedUrl.hostname} is protected by Cloudflare anti-bot verification. Please ensure the URL is publicly accessible without bot blocks, or paste the text directly into the prompt.`
    );
  }

  const text = stripHtml(html);

  if (!text || text.length < 40) {
    throw new Error("Could not extract readable article text from that page. Please check the URL or paste notes into the prompt.");
  }

  return text.slice(0, maxChars);
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

module.exports = { fetchReadableText };
