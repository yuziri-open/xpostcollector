const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3050;
const DATA_DIR = path.join(__dirname, 'data');

// Ensure data dir
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ─── Helpers ───

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function dataFile(date) {
  return path.join(DATA_DIR, `${date}.json`);
}

function readDay(date) {
  const f = dataFile(date);
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); }
  catch { return []; }
}

function writeDay(date, posts) {
  fs.writeFileSync(dataFile(date), JSON.stringify(posts, null, 2), 'utf8');
}

/** List all YYYY-MM-DD.json files sorted desc */
function listDays() {
  return fs.readdirSync(DATA_DIR)
    .filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .map(f => f.replace('.json', ''))
    .sort((a, b) => b.localeCompare(a));
}

/** Read posts across multiple days */
function readAll() {
  const days = listDays();
  let all = [];
  for (const d of days) all = all.concat(readDay(d));
  return all;
}

// ─── URL Index (global dedup across all days) ───
const URL_INDEX = path.join(DATA_DIR, '.url-index.json');

function loadUrlIndex() {
  try { return new Set(JSON.parse(fs.readFileSync(URL_INDEX, 'utf8'))); }
  catch { return rebuildUrlIndex(); }
}

function rebuildUrlIndex() {
  const urls = new Set();
  for (const day of listDays()) {
    for (const p of readDay(day)) {
      if (p.url) urls.add(p.url);
    }
  }
  saveUrlIndex(urls);
  return urls;
}

function saveUrlIndex(urlSet) {
  fs.writeFileSync(URL_INDEX, JSON.stringify([...urlSet]), 'utf8');
}

// Load index on startup
let globalUrls = loadUrlIndex();
console.log(`🔑 URL index: ${globalUrls.size} unique URLs tracked`);

// CORS for Chrome extension
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── API ───

// Receive posts from extension (global dedup)
app.post('/api/posts', (req, res) => {
  const incoming = req.body.posts || [];
  if (!incoming.length) return res.json({ ok: true, added: 0, skipped: 0 });

  const today = todayStr();
  const existing = readDay(today);

  let added = 0;
  let skipped = 0;
  for (const post of incoming) {
    if (!post.url) continue;
    // Check against global index (all days)
    if (globalUrls.has(post.url)) { skipped++; continue; }
    globalUrls.add(post.url);
    existing.unshift({
      ...post,
      collectedAt: new Date().toISOString(),
      id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    });
    added++;
  }

  if (added > 0) {
    writeDay(today, existing);
    saveUrlIndex(globalUrls);
  }
  if (added > 0 || skipped > 0) {
    console.log(`📥 +${added} new, ${skipped} dupes skipped (today: ${existing.length})`);
  }
  res.json({ ok: true, added, skipped, total: existing.length, date: today });
});

// Get posts with filters
app.get('/api/posts', (req, res) => {
  const { q, handle, highlighted, sort, limit, offset, date } = req.query;

  // date param: "today", "YYYY-MM-DD", or "all" (default: today)
  let posts;
  if (date === 'all') {
    posts = readAll();
  } else if (date && date !== 'today') {
    posts = readDay(date);
  } else {
    posts = readDay(todayStr());
  }

  // Search
  if (q) {
    const lower = q.toLowerCase();
    posts = posts.filter(p =>
      (p.text || '').toLowerCase().includes(lower) ||
      (p.handle || '').toLowerCase().includes(lower) ||
      (p.displayName || '').toLowerCase().includes(lower)
    );
  }

  // Filter by handle
  if (handle) {
    posts = posts.filter(p => (p.handle || '').toLowerCase() === handle.toLowerCase());
  }

  // Filter highlighted
  if (highlighted === 'true') {
    posts = posts.filter(p => p.highlighted);
  }

  // Sort
  if (sort === 'likes') {
    posts.sort((a, b) => parseMetric(b.likes) - parseMetric(a.likes));
  } else if (sort === 'views') {
    posts.sort((a, b) => parseMetric(b.views) - parseMetric(a.views));
  } else if (sort === 'retweets') {
    posts.sort((a, b) => parseMetric(b.retweets) - parseMetric(a.retweets));
  }

  const total = posts.length;
  const off = parseInt(offset) || 0;
  const lim = parseInt(limit) || 50;
  posts = posts.slice(off, off + lim);

  res.json({ ok: true, posts, total, offset: off, limit: lim });
});

// Stats
app.get('/api/stats', (req, res) => {
  const posts = readAll();
  const handles = {};
  let highlightedCount = 0;
  let withMedia = 0;
  const dailyCounts = {};

  for (const p of posts) {
    const h = p.handle || 'unknown';
    handles[h] = (handles[h] || 0) + 1;
    if (p.highlighted) highlightedCount++;
    if (p.hasMedia) withMedia++;
    const day = (p.collectedAt || '').slice(0, 10);
    if (day) dailyCounts[day] = (dailyCounts[day] || 0) + 1;
  }

  const topHandles = Object.entries(handles)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([handle, count]) => ({ handle, count }));

  res.json({
    ok: true,
    total: posts.length,
    todayCount: readDay(todayStr()).length,
    highlighted: highlightedCount,
    withMedia,
    topHandles,
    dailyCounts,
    days: listDays()
  });
});

// Extract trending keywords from posts
app.get('/api/keywords', (req, res) => {
  const posts = readDay(todayStr());
  const stopWords = new Set([
    'the','a','an','is','are','was','were','be','been','being','have','has','had',
    'do','does','did','will','would','could','should','may','might','shall','can',
    'to','of','in','for','on','with','at','by','from','as','into','about','like',
    'after','between','through','during','before','above','below','up','down','out',
    'off','over','under','again','further','then','once','here','there','when','where',
    'why','how','all','each','every','both','few','more','most','other','some','such',
    'no','nor','not','only','own','same','so','than','too','very','just','because',
    'but','and','or','if','while','that','this','these','those','it','its','my','your',
    'his','her','our','their','what','which','who','whom','me','him','them','i','you',
    'he','she','we','they','http','https','com','co','jp','www','t','s','re','don',
    'rt','via','amp','gt','lt','の','は','が','を','に','で','と','も','や','から','まで',
    'て','た','だ','です','ます','する','いる','ある','こと','この','その','これ','それ',
    'など','という','として','について','ない','なる','れる','られる','よう','ため',
    'さん','的','化','中','後','前','上','下','新','大','小','日','月','年','人','方',
    'お','ご','って','じゃ','けど','から','ので','のに','だけ','でも','しか','より',
  ]);

  const freq = {};
  for (const p of posts) {
    const text = (p.text || '').toLowerCase();
    // Extract meaningful tokens (2+ chars, not URLs, not stopwords)
    const tokens = text
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[^\w\u3000-\u9fff\uff00-\uffef]+/g, ' ')
      .split(/\s+/)
      .filter(t => t.length >= 2 && !stopWords.has(t) && !/^\d+$/.test(t));
    const seen = new Set();
    for (const t of tokens) {
      if (seen.has(t)) continue;
      seen.add(t);
      freq[t] = (freq[t] || 0) + 1;
    }
  }

  const keywords = Object.entries(freq)
    .filter(([, c]) => c >= 2) // appears in 2+ posts
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word, count]) => ({ word, count }));

  res.json({ ok: true, keywords });
});

// Send post to OpenClaw inbox
app.post('/api/send-to-openclaw', (req, res) => {
  const post = req.body.post;
  if (!post) return res.status(400).json({ ok: false, error: 'no post' });

  const inboxDir = path.join(DATA_DIR, 'openclaw-inbox');
  if (!fs.existsSync(inboxDir)) fs.mkdirSync(inboxDir, { recursive: true });

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${ts}.md`;

  const md = [
    `# X Post → OpenClaw`,
    ``,
    `**From**: ${post.displayName || ''} (${post.handle || ''})`,
    `**URL**: ${post.url || ''}`,
    `**Collected**: ${post.collectedAt || ''}`,
    `**Likes**: ${post.likes || 0} | **Retweets**: ${post.retweets || 0} | **Views**: ${post.views || 0}`,
    ``,
    `## Content`,
    ``,
    post.text || '',
    ``,
    `---`,
    `*Sent from X Post Collector*`,
  ].join('\n');

  fs.writeFileSync(path.join(inboxDir, filename), md, 'utf8');
  console.log(`🦁 Sent to OpenClaw inbox: ${filename}`);
  res.json({ ok: true, file: filename });
});

// Delete a post
app.delete('/api/posts/:id', (req, res) => {
  // Search across all days
  for (const day of listDays()) {
    let posts = readDay(day);
    const before = posts.length;
    posts = posts.filter(p => p.id !== req.params.id);
    if (posts.length < before) {
      writeDay(day, posts);
      return res.json({ ok: true });
    }
  }
  res.json({ ok: false, error: 'not found' });
});

function parseMetric(v) {
  if (!v) return 0;
  const s = String(v).replace(/,/g, '');
  if (/k$/i.test(s)) return parseFloat(s) * 1000;
  if (/m$/i.test(s)) return parseFloat(s) * 1000000;
  return parseFloat(s) || 0;
}

function onListen() {
  const today = readDay(todayStr());
  const allDays = listDays();
  console.log(`📋 X Post Collector running at http://localhost:${PORT}`);
  console.log(`📊 Today: ${today.length} posts | ${allDays.length} day(s) in archive`);
}

function startWithRetry(retries = 5) {
  app.listen(PORT, '0.0.0.0', onListen).on('error', (e) => {
    if (e.code === 'EADDRINUSE' && retries > 0) {
      console.log(`⚠️  Port ${PORT} busy (TIME_WAIT), retrying in 3s... (${retries} left)`);
      setTimeout(() => startWithRetry(retries - 1), 3000);
    } else {
      throw e;
    }
  });
}

startWithRetry();
