const DEFAULTS = {
  enabled: true,
  collectedCount: 0,
  recentLogs: [],
  webhookUrl: "",
  spreadsheetId: "",
  apiKey: "",
  useGasWebhook: true
};

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get(DEFAULTS);
  await chrome.storage.local.set({ ...DEFAULTS, ...current });
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

  // Always save locally first
  const nextCount = Number(settings.collectedCount || 0) + accepted.length;
  const mergedLogs = [...accepted, ...(settings.recentLogs || [])].slice(0, 50);

  await chrome.storage.local.set({
    collectedCount: nextCount,
    recentLogs: mergedLogs
  });

  // Send to GAS Webhook
  if (settings.webhookUrl) {
    sendToGasWebhook(settings.webhookUrl, accepted).catch(e => console.warn("webhook failed", e));
  }

  return { accepted: accepted.length };
}

async function sendToGasWebhook(webhookUrl, posts) {
  if (!webhookUrl) {
    console.warn("Webhook URL is not configured.");
    return false;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ posts })
    });

    if (!res.ok) {
      console.warn("GAS webhook failed", res.status);
      return false;
    }

    return true;
  } catch (error) {
    console.warn("GAS webhook error", error);
    return false;
  }
}


