const DEFAULT_FILTER_KEYWORDS = [
  'claude','codex','claude code','ai','chatgpt','perplexity',
  'openai','anthropic','gemini','gpt','llm','cursor',
  'copilot','midjourney','stable diffusion','sora','devin',
  'vibe coding','agent','agi'
];
const DEFAULT_HIGHLIGHT_KEYWORDS = ['openclaw','manus','genspark'];

const DEFAULTS = {
  enabled: true,
  collectedCount: 0,
  recentLogs: [],
  filterKeywords: DEFAULT_FILTER_KEYWORDS,
  highlightKeywords: DEFAULT_HIGHLIGHT_KEYWORDS
};

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get(null);
  // Only set defaults for keys that don't exist yet
  const toSet = {};
  for (const [key, val] of Object.entries(DEFAULTS)) {
    if (!(key in current)) toSet[key] = val;
  }
  if (Object.keys(toSet).length > 0) {
    await chrome.storage.local.set(toSet);
    console.log("[X-Collector] Initialized defaults:", Object.keys(toSet));
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return;

  if (message.type === "submit-posts") {
    handleSubmitPosts(message.posts || [])
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => {
        console.warn("submit-posts error", error);
        sendResponse({ ok: false, error: String(error) });
      });
    return true;
  }

  if (message.type === "settings-updated" || message.type === "keywords-updated") {
    sendResponse({ ok: true });
    return;
  }
});

async function handleSubmitPosts(posts) {
  if (!Array.isArray(posts) || !posts.length) return { accepted: 0 };

  const settings = await chrome.storage.local.get(DEFAULTS);
  if (!settings.enabled) return { accepted: 0 };

  const accepted = posts.filter((p) => p && p.url);
  if (!accepted.length) return { accepted: 0 };

  // Save to local server (primary storage, daily JSON files)
  let serverTotal = 0;
  try {
    const result = await sendToLocal(accepted);
    serverTotal = result.total || 0;
  } catch (e) {
    console.debug("[X-Collector] Local server not available:", e.message);
  }

  // Sync count with server's today count; fallback to local increment
  const todayCount = serverTotal || (Number(settings.collectedCount || 0) + accepted.length);
  const mergedLogs = [...accepted, ...(settings.recentLogs || [])].slice(0, 50);

  await chrome.storage.local.set({
    collectedCount: todayCount,
    collectedDate: new Date().toISOString().slice(0, 10),
    recentLogs: mergedLogs
  });

  return { accepted: accepted.length };
}

async function sendToLocal(posts) {
  const res = await fetch("http://localhost:3050/api/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    mode: "cors",
    body: JSON.stringify({ posts })
  });
  if (!res.ok) throw new Error(`Server ${res.status}`);
  const data = await res.json();
  console.log("[X-Collector] Saved", data.added, "posts (today:", data.total, ")");
  return data;
}


