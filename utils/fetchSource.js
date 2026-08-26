/**
 * Fetch a URL and return readable text for background reference material.
 * The AI service is instructed to write original copy rather than reproduce it.
 */
async function fetchReadableText(url, maxChars = 6000) {
  if (!url) return null;

  let response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AllHubReader/1.0)" }
    });
  } catch (err) {
    throw new Error(`could not reach that URL (${err.message})`);
  }

  if (!response.ok) {
    throw new Error(`URL returned status ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
    throw new Error(`URL did not return readable HTML/text (got "${contentType}")`);
  }

  const html = await response.text();
  const text = stripHtml(html);

  if (!text || text.length < 40) {
    throw new Error("could not extract readable text from that page");
  }

  return text.slice(0, maxChars);
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

module.exports = { fetchReadableText };