const DEFAULTS = {
  enabled: true,
  filterKeywords: [],
  highlightKeywords: []
};

let filterKeywords = [];
let highlightKeywords = [];

function matchesFilter(text) {
  if (!text || !filterKeywords.length) return false;
  const lower = text.toLowerCase();
  return filterKeywords.some(kw => lower.includes(kw));
}

function isHighlighted(text) {
  if (!text || !highlightKeywords.length) return false;
  const lower = text.toLowerCase();
  return highlightKeywords.some(kw => lower.includes(kw));
}

const processedArticles = new WeakSet();
const seenUrls = new Set();
const batchQueue = [];
let flushTimer = null;
let enabled = true;

console.log("[X-Collector] loaded on", location.href);
init().catch((e) => console.warn("[X-Collector] init error", e));

async function init() {
  const settings = await chrome.storage.local.get(DEFAULTS);
  enabled = settings.enabled !== false;
  filterKeywords = (settings.filterKeywords || []).map(k => k.toLowerCase());
  highlightKeywords = (settings.highlightKeywords || []).map(k => k.toLowerCase());
  console.log("[X-Collector] Keywords loaded:", filterKeywords.length, "filter,", highlightKeywords.length, "highlight");

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.enabled) enabled = changes.enabled.newValue !== false;
    if (changes.filterKeywords) filterKeywords = (changes.filterKeywords.newValue || []).map(k => k.toLowerCase());
    if (changes.highlightKeywords) highlightKeywords = (changes.highlightKeywords.newValue || []).map(k => k.toLowerCase());
  });

  const observer = new MutationObserver((mutations) => {
    if (!enabled) return;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        scanNode(node);
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  const existing = document.querySelectorAll("article");
  console.log("[X-Collector] Initial articles found:", existing.length);
  existing.forEach((article) => handleArticle(article));
  console.log("[X-Collector] Observer started, queue:", batchQueue.length);
}

function scanNode(node) {
  if (node.matches && node.matches("article")) {
    handleArticle(node);
  }
  node.querySelectorAll?.("article").forEach((article) => handleArticle(article));
}

function handleArticle(article) {
  if (!(article instanceof HTMLElement)) return;
  if (processedArticles.has(article)) return;
  processedArticles.add(article);

  const post = extractPost(article);
  if (!post || !post.url) return;
  if (seenUrls.has(post.url)) return;
  if (!matchesFilter(post.text)) return;

  seenUrls.add(post.url);
  post.highlighted = isHighlighted(post.text);
  batchQueue.push(post);
  console.log("[X-Collector] Queued:", post.handle, post.text?.substring(0, 50), "| queue:", batchQueue.length);

  if (batchQueue.length >= 5) {
    flushBatch();
    return;
  }

  if (!flushTimer) {
    flushTimer = setTimeout(flushBatch, 10000);
  }
}

async function flushBatch() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (!batchQueue.length) return;
  const posts = batchQueue.splice(0, batchQueue.length);

  try {
    console.log("[X-Collector] Flushing", posts.length, "posts");
    const result = await chrome.runtime.sendMessage({ type: "submit-posts", posts });
    console.log("[X-Collector] Flush result:", result);
  } catch (error) {
    console.warn("[X-Collector] flushBatch error", error);
  }
}

function extractPost(article) {
  try {
    const statusLink = article.querySelector('a[href*="/status/"]');
    if (!statusLink) return null;

    const href = statusLink.getAttribute("href") || "";
    const url = toAbsoluteUrl(href);

    const timeEl = article.querySelector("time");
    const timestamp = timeEl?.getAttribute("datetime") || "";

    const userAnchor = article.querySelector('a[href^="/"][role="link"]');
    const handleTextCandidates = Array.from(article.querySelectorAll("span"))
      .map((el) => (el.textContent || "").trim())
      .filter(Boolean);
    const handle =
      handleTextCandidates.find((t) => /^@[A-Za-z0-9_]{1,15}$/.test(t)) ||
      extractHandleFromHref(userAnchor?.getAttribute("href") || "") ||
      "";

    const displayName = extractDisplayName(article, handle);
    const text = extractFullText(article);

    const metrics = extractMetrics(article);
    const hasMedia = Boolean(article.querySelector('[data-testid="tweetPhoto"], video'));

    return {
      handle,
      displayName,
      text,
      url,
      timestamp,
      likes: metrics.likes,
      retweets: metrics.retweets,
      replies: metrics.replies,
      views: metrics.views,
      hasMedia
    };
  } catch (error) {
    console.warn("extractPost error", error);
    return null;
  }
}

function extractDisplayName(article, handle) {
  const nameContainer = article.querySelector('[data-testid="User-Name"]');
  if (nameContainer) {
    const firstSpan = nameContainer.querySelector("span");
    const maybeName = (firstSpan?.textContent || "").trim();
    if (maybeName && maybeName !== handle) return maybeName;
  }

  const spans = Array.from(article.querySelectorAll("span"))
    .map((el) => (el.textContent || "").trim())
    .filter(Boolean)
    .filter((t) => t !== handle && !t.startsWith("@"));

  return spans[0] || "";
}

function extractFullText(article) {
  const textEl = article.querySelector('[data-testid="tweetText"]');
  if (textEl) return normalizeText(textEl.innerText || textEl.textContent || "");

  const langEl = article.querySelector("div[lang]");
  if (langEl) return normalizeText(langEl.innerText || langEl.textContent || "");

  return "";
}

function extractMetrics(article) {
  const metricLabels = Array.from(article.querySelectorAll('[role="group"][aria-label]'))
    .map((el) => el.getAttribute("aria-label") || "")
    .filter(Boolean);

  const metrics = { likes: "0", retweets: "0", replies: "0", views: "0" };

  for (const label of metricLabels) {
    const chunks = label.split(/[,、]/).map((s) => s.trim()).filter(Boolean);
    for (const chunk of chunks) {
      const value = extractNumber(chunk);
      if (!value) continue;
      const low = chunk.toLowerCase();
      if (/返信|repl/.test(low)) metrics.replies = value;
      if (/リポスト|retweet|repost/.test(low)) metrics.retweets = value;
      if (/いいね|like/.test(low)) metrics.likes = value;
      if (/表示|view/.test(low)) metrics.views = value;
    }
  }

  return metrics;
}

function extractNumber(text) {
  const m = text.match(/([\d,.]+\s*[KM万億]?)/i);
  return m ? m[1].replace(/\s+/g, "") : "0";
}

function extractHandleFromHref(href) {
  const m = href.match(/^\/([A-Za-z0-9_]{1,15})(?:\/|$)/);
  return m ? `@${m[1]}` : "";
}

function toAbsoluteUrl(href) {
  try {
    return new URL(href, location.origin).toString();
  } catch {
    return "";
  }
}

function normalizeText(text) {
  return text.replace(/\s+\n/g, "\n").trim();
}
